const Database = require('better-sqlite3');

const db = new Database(process.env.STUDYFLOW_DB_PATH || './data.db');

db.pragma('foreign_keys = ON');

// Students table
db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    studentName TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT
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
    progressBeforeCompletion INTEGER,
    completedAt TEXT,
    createdAt TEXT NOT NULL,
    FOREIGN KEY (courseId) REFERENCES courses(courseId)
  )
`);

const migrateTaskCompletion = db.transaction(() => {
  let columns = db.prepare('PRAGMA table_info(tasks)').all().map((column) => column.name);
  if (!columns.includes('progressBeforeCompletion')) {
    db.exec('ALTER TABLE tasks ADD COLUMN progressBeforeCompletion INTEGER');
  }
  if (!columns.includes('completedAt')) {
    db.exec('ALTER TABLE tasks ADD COLUMN completedAt TEXT');
  }

  columns = db.prepare('PRAGMA table_info(tasks)').all().map((column) => column.name);
  if (columns.includes('completed')) {
    db.exec(`
      UPDATE tasks
      SET progressBeforeCompletion = currentProgress,
          currentProgress = 100,
          completedAt = COALESCE(completedAt, createdAt)
      WHERE completed = 1 AND currentProgress < 100
    `);
    db.exec(`
      UPDATE tasks
      SET completedAt = COALESCE(completedAt, createdAt)
      WHERE currentProgress = 100
    `);
    db.exec('ALTER TABLE tasks DROP COLUMN completed');
  }
});

migrateTaskCompletion();

// Migrate students.password from NOT NULL to nullable (for Google auth)
// PRAGMA foreign_keys cannot be toggled inside a transaction, so we
// temporarily disable it around the table-rebuild migration.
{
  const passwordCol = db.prepare('PRAGMA table_info(students)').all()
    .find((col) => col.name === 'password');
  if (passwordCol && passwordCol.notnull === 1) {
    db.pragma('foreign_keys = OFF');
    db.transaction(() => {
      db.exec(`
        CREATE TABLE students_new (
          id TEXT PRIMARY KEY,
          studentName TEXT NOT NULL,
          username TEXT UNIQUE NOT NULL,
          password TEXT
        )
      `);
      db.exec('INSERT INTO students_new SELECT * FROM students');
      db.exec('DROP TABLE students');
      db.exec('ALTER TABLE students_new RENAME TO students');
    })();
    db.pragma('foreign_keys = ON');
  }
}

// Indexes
db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_course_id ON tasks(courseId)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_courses_username ON courses(username)`);

module.exports = db;
