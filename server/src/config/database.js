const Database = require('better-sqlite3');

const db = new Database('./data.db');

db.pragma('foreign_keys = ON');

// Students table
db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    studentName TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )
`);

// Courses table
db.exec(`
  CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    courseId TEXT NOT NULL UNIQUE,
    username TEXT NOT NULL,
    courseName TEXT NOT NULL,
    color TEXT,
    FOREIGN KEY (username) REFERENCES students(username)
  )
`);

// Tasks table
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    courseId TEXT NOT NULL,
    taskName TEXT NOT NULL,
    description TEXT DEFAULT '',
    deadline TEXT NOT NULL,
    importance TEXT NOT NULL DEFAULT 'medium',
    estimatedDuration REAL,
    currentProgress INTEGER NOT NULL DEFAULT 0,
    completed INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (courseId) REFERENCES courses(courseId)
  )
`);

if (!db.prepare('PRAGMA table_info(tasks)').all().some((column) => column.name === 'completed')) {
  db.exec('ALTER TABLE tasks ADD COLUMN completed INTEGER NOT NULL DEFAULT 0');
  db.exec('UPDATE tasks SET completed = 1 WHERE currentProgress = 100');
}

// Indexes
db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_course_id ON tasks(courseId)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_courses_username ON courses(username)`);

module.exports = db;
