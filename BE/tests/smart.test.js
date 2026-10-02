const assert = require('node:assert/strict');
const test = require('node:test');

test('API smart results preserve rolling-day urgency, overdue warnings and response fields', () => {
  process.env.STUDYFLOW_DB_PATH = ':memory:';
  const db = require('../models/database');
  const tasks = require('../services/taskService');
  const RealDate = Date;
  global.Date = class extends RealDate {
    constructor(...args) { super(...(args.length ? args : ['2026-10-02T12:00:00.000Z'])); }
  };
  try {
    db.prepare('INSERT INTO students (id, studentName, username) VALUES (?, ?, ?)').run('s', 'Student', 'student');
    db.prepare('INSERT INTO courses (id, courseId, username, courseName) VALUES (?, ?, ?, ?)').run('c', 'course', 'student', 'Math');
    const first = tasks.create('student', { courseId: 'course', taskName: 'Task', deadline: '2026-10-03T10:00:00.000Z', importance: 'high', estimatedDuration: 6, currentProgress: 50 });
    assert.equal(first.name, 'Task');
    assert.equal(Object.hasOwn(first, 'taskName'), false, 'create shape must remain distinct from update shape');
    const [smart] = tasks.smart('student').recommendations;
    assert.equal(smart.urgencyScore, 90);
    assert.equal(smart.priorityScore, 81);
    assert.equal(smart.hasWorkloadWarning, true);
    const updated = tasks.update('student', first.taskId, { deadline: '2026-10-01T10:00:00.000Z' });
    assert.equal(updated.taskName, 'Task');
    assert.equal(updated.name, 'Task');
    assert.equal(tasks.smart('student').recommendations[0].hasWorkloadWarning, true);
    tasks.update('student', first.taskId, { estimatedDuration: null });
    assert.equal(tasks.smart('student').recommendations[0].hasWorkloadWarning, false);
    assert.equal(tasks.setCompletion('student', first.taskId, { completed: true }).currentProgress, 100);
    assert.deepEqual(tasks.smart('student').recommendations, []);
    assert.equal(tasks.setCompletion('student', first.taskId, { completed: false }).currentProgress, 50);
  } finally {
    global.Date = RealDate;
    db.close();
  }
});
