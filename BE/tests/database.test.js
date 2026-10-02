const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const Database = require('better-sqlite3');

test('legacy student migration retains email, Firebase identity and related records', () => {
  const databasePath = path.join(os.tmpdir(), `studyflow-migration-${process.pid}.db`);
  process.env.STUDYFLOW_DB_PATH = databasePath;
  const legacy = new Database(databasePath);
  legacy.exec(`
    CREATE TABLE students (id TEXT PRIMARY KEY, studentName TEXT NOT NULL, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL, email TEXT, firebaseUid TEXT);
    INSERT INTO students VALUES ('student-1', 'Student', 'student', 'password1', 'student@example.com', 'firebase-1');
    CREATE TABLE courses (id TEXT PRIMARY KEY, courseId TEXT NOT NULL UNIQUE, username TEXT NOT NULL, courseName TEXT NOT NULL, color TEXT, FOREIGN KEY (username) REFERENCES students(username));
    INSERT INTO courses VALUES ('id-1', 'course-1', 'student', 'Math', NULL);
  `);
  legacy.close();
  const db = require('../models/database');
  try {
    const student = db.prepare('SELECT * FROM students').get();
    assert.equal(student.email, 'student@example.com');
    assert.equal(student.firebaseUid, 'firebase-1');
    assert.equal(db.prepare('SELECT username FROM courses').get().username, 'student');
    assert.deepEqual(db.pragma('foreign_key_check'), []);
    assert.equal(db.pragma('foreign_keys', { simple: true }), 1);
  } finally {
    db.close();
    for (const suffix of ['', '-shm', '-wal']) fs.rmSync(`${databasePath}${suffix}`, { force: true });
  }
});
