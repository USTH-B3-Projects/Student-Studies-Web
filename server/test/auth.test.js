const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const databasePath = path.join(os.tmpdir(), `studyflow-auth-${process.pid}.db`);
process.env.STUDYFLOW_DB_PATH = databasePath;

const app = require('../src/app');
const db = require('../src/config/database');
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}/api/v1`;

async function request(endpoint, options = {}) {
  const response = await fetch(`${base}${endpoint}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const body = await response.json();
  return { response, body };
}

test('session restores and updates the SQLite profile', async () => {
  await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ studentName: 'Student', username: 'student1', email: 'old@example.com', password: 'password1', confirmPassword: 'password1' }),
  });
  const login = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'student1', password: 'password1' }),
  });
  assert.equal(login.response.status, 200);
  const cookie = login.response.headers.get('set-cookie').split(';')[0];

  const me = await request('/auth/me', { headers: { Cookie: cookie } });
  assert.equal(me.body.user.studentName, 'Student');
  assert.equal(me.body.user.email, 'old@example.com');

  const updated = await request('/auth/me', {
    method: 'PATCH',
    headers: { Cookie: cookie },
    body: JSON.stringify({ studentName: 'New Name', email: 'new@example.com' }),
  });
  assert.equal(updated.body.user.studentName, 'New Name');
  assert.equal(db.prepare('SELECT studentName FROM students WHERE username = ?').get('student1').studentName, 'New Name');

  assert.equal((await request('/courses')).response.status, 401);
  const course = await request('/courses', {
    method: 'POST',
    headers: { Cookie: cookie },
    body: JSON.stringify({ username: 'forged-user', courseName: 'Secure course' }),
  });
  assert.equal(course.body.userId, 'student1');

  const logout = await request('/auth/logout', { method: 'POST', headers: { Cookie: cookie }, body: '{}' });
  assert.equal(logout.response.status, 200);
  assert.equal((await request('/auth/me', { headers: { Cookie: cookie } })).response.status, 401);
});

test('course and task CRUD validates input and preserves ownership and completion history', async () => {
  const account = { studentName: 'Planner', username: 'planner', password: 'password1', confirmPassword: 'password1' };
  assert.equal((await request('/auth/register', { method: 'POST', body: JSON.stringify(account) })).response.status, 201);
  const login = await request('/auth/login', { method: 'POST', body: JSON.stringify(account) });
  const headers = { Cookie: login.response.headers.get('set-cookie').split(';')[0] };
  const send = (endpoint, method, body) => request(endpoint, { method, headers, body: JSON.stringify(body) });
  for (const body of [{ courseName: 123 }, { courseName: ' ' }, { courseName: 'Math', color: {} }, []]) {
    assert.equal((await send('/courses', 'POST', body)).response.status, 400);
  }
  const malformed = await request('/courses', { method: 'POST', headers, body: '{' });
  assert.equal(malformed.response.status, 400);
  assert.ok(malformed.body.error);
  const course = await send('/courses', 'POST', { courseName: 'Math', color: '#123456' });
  const courseId = course.body.courseId;
  assert.equal(course.response.status, 201);
  const valid = { courseId, taskName: 'Homework', deadline: '2026-12-01T10:00:00.000Z', currentProgress: 50 };
  for (const invalid of [{ taskName: {} }, { description: 2 }, { deadline: 2 }, { estimatedDuration: 'oops' }, { estimatedDuration: -1 }, { currentProgress: 13 }]) {
    assert.equal((await send('/tasks', 'POST', { ...valid, ...invalid })).response.status, 400);
  }
  const task = await send('/tasks', 'POST', valid);
  assert.equal(task.response.status, 201);
  const endpoint = `/tasks/${task.body.taskId}`;
  assert.equal((await send(endpoint, 'PUT', { estimatedDuration: 'oops' })).response.status, 400);
  assert.equal((await send(endpoint, 'PUT', { description: null })).response.status, 400);
  assert.equal((await send(endpoint, 'PUT', { taskName: 'Updated', estimatedDuration: 2 })).response.status, 200);
  const completed = await send(`${endpoint}/completion`, 'PATCH', { completed: true });
  assert.equal(completed.body.currentProgress, 100);
  assert.equal(completed.body.progressBeforeCompletion, 50);
  assert.equal((await send(`${endpoint}/completion`, 'PATCH', { completed: false })).body.currentProgress, 50);
  assert.equal((await request('/smart', { headers })).response.status, 200);

  await request('/auth/register', { method: 'POST', body: JSON.stringify({ ...account, username: 'other-planner' }) });
  const otherLogin = await request('/auth/login', { method: 'POST', body: JSON.stringify({ ...account, username: 'other-planner' }) });
  const otherHeaders = { Cookie: otherLogin.response.headers.get('set-cookie').split(';')[0] };
  assert.equal((await request(endpoint, { headers: otherHeaders })).response.status, 404);
  assert.equal((await request(`/courses/${courseId}`, { method: 'DELETE', headers: otherHeaders })).response.status, 404);
  assert.equal((await request(`/courses/${courseId}`, { method: 'DELETE', headers })).response.status, 200);
  assert.equal((await request(endpoint, { headers })).response.status, 404);
  assert.deepEqual((await request('/tasks', { headers })).body, []);
});

test.after(() => {
  server.close();
  db.close();
  for (const suffix of ['', '-shm', '-wal']) fs.rmSync(`${databasePath}${suffix}`, { force: true });
});
