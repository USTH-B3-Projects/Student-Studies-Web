const db = require("../models/database");
const crypto = require("crypto");

function create(username, data) {
  const { courseName, color } = data;

  if (typeof courseName !== "string" || !courseName.trim()) {
    throw Object.assign(new Error("courseName is required"), { status: 400 });
  }
  if (
    color != null &&
    (typeof color !== "string" || !/^#[0-9A-Fa-f]{6}$/.test(color))
  ) {
    throw Object.assign(new Error("Invalid course color"), { status: 400 });
  }

  const courseId = `course-${crypto.randomUUID()}`;
  const id = crypto.randomUUID();

  db.prepare(
    `
    INSERT INTO courses (id, courseId, username, courseName, color)
    VALUES (?, ?, ?, ?, ?)
  `,
  ).run(id, courseId, username, courseName.trim(), color || null);

  return {
    courseId,
    userId: username,
    courseName: courseName.trim(),
    color: color || null,
  };
}

function getAll(username) {
  const courses = db
    .prepare(
      `
    SELECT courseId, username, courseName, color
    FROM courses
    WHERE username = ?
    ORDER BY courseName
  `,
    )
    .all(username);

  return courses;
}

function getById(username, id) {
  const course = db
    .prepare(
      `
    SELECT courseId, username, courseName, color
    FROM courses
    WHERE courseId = ? AND username = ?
  `,
    )
    .get(id, username);

  if (!course) {
    throw Object.assign(new Error("Course not found"), { status: 404 });
  }

  return course;
}

function update(username, id, data) {
  const { courseName, color } = data;

  const course = db
    .prepare("SELECT * FROM courses WHERE courseId = ? AND username = ?")
    .get(id, username);
  if (!course) {
    throw Object.assign(new Error("Course not found"), { status: 404 });
  }

  if (
    courseName !== undefined &&
    (typeof courseName !== "string" || !courseName.trim())
  ) {
    throw Object.assign(new Error("Course name is required"), { status: 400 });
  }
  if (
    color != null &&
    (typeof color !== "string" || !/^#[0-9A-Fa-f]{6}$/.test(color))
  ) {
    throw Object.assign(new Error("Invalid course color"), { status: 400 });
  }

  db.prepare(
    `
    UPDATE courses SET courseName = ?, color = ? WHERE courseId = ?
  `,
  ).run(
    courseName !== undefined ? courseName.trim() : course.courseName,
    color !== undefined ? color : course.color,
    id,
  );

  return { success: true };
}

function remove(username, id) {
  const course = db
    .prepare("SELECT * FROM courses WHERE courseId = ? AND username = ?")
    .get(id, username);
  if (!course) {
    throw Object.assign(new Error("Course not found"), { status: 404 });
  }

  db.transaction(() => {
    db.prepare("DELETE FROM tasks WHERE courseId = ?").run(id);
    db.prepare("DELETE FROM courses WHERE courseId = ?").run(id);
  })();

  return { success: true };
}

module.exports = { create, getAll, getById, update, remove };
