const crypto = require('crypto');
const db = require('../models/database');
const firebaseAuth = require('../firebaseAdmin');

function publicStudent(student) {
  return {
    id: student.id,
    studentName: student.studentName,
    username: student.username,
    email: student.email || '',
  };
}

const validEmail = (email) => !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

function register(data) {
  const { studentName, username, password, confirmPassword, email = '' } = data;

  if (![studentName, username, password, confirmPassword, email].every((value) => typeof value === 'string')) {
    throw Object.assign(new Error('Invalid registration data'), { status: 400 });
  }
  const normalizedEmail = email.trim();
  if (!studentName || !username || !password || !confirmPassword) throw Object.assign(new Error('All fields are required'), { status: 400 });
  if (!studentName.trim()) throw Object.assign(new Error('studentName must not be empty'), { status: 400 });
  if (password.length < 8) throw Object.assign(new Error('Password must be at least 8 characters'), { status: 400 });
  if (password !== confirmPassword) throw Object.assign(new Error('Passwords must match'), { status: 400 });
  if (!validEmail(normalizedEmail)) throw Object.assign(new Error('Email is invalid'), { status: 400 });

  if (db.prepare('SELECT 1 FROM students WHERE username = ?').get(username)) {
    throw Object.assign(new Error('User ID already registered'), { status: 409 });
  }
  const id = `student-${crypto.randomUUID()}`;
  db.prepare('INSERT INTO students (id, studentName, username, password, email) VALUES (?, ?, ?, ?, ?)')
    .run(id, studentName.trim(), username, password, normalizedEmail || null);
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
  return { success: true, user: publicStudent(student) };
}

function login(data) {
  const { username, password } = data;
  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
    throw Object.assign(new Error('Username and password are required'), { status: 400 });
  }

  const student = db.prepare('SELECT * FROM students WHERE username = ?').get(username);
  if (!student || student.password !== password) throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  return student;
}

function resetPassword(data) {
  const { username, newPassword, confirmPassword } = data;
  if (!username || !newPassword || !confirmPassword) throw Object.assign(new Error('All fields are required'), { status: 400 });
  if (newPassword.length < 8) throw Object.assign(new Error('New password must be at least 8 characters'), { status: 400 });
  if (newPassword !== confirmPassword) throw Object.assign(new Error('New passwords must match'), { status: 400 });

  const result = db.prepare('UPDATE students SET password = ? WHERE username = ?').run(newPassword, username);
  if (result.changes === 0) throw Object.assign(new Error('Username or email not found'), { status: 404 });
  return { success: true };
}

async function googleSync(data) {
  const { idToken } = data;
  if (typeof idToken !== 'string' || !idToken) throw Object.assign(new Error('Firebase ID token is required'), { status: 400 });

  try {
    const identity = await firebaseAuth.verifyIdToken(idToken);
    const email = identity.email_verified ? identity.email : null;
    let student = db.prepare('SELECT * FROM students WHERE firebaseUid = ?').get(identity.uid);

    if (!student && email) {
      const legacy = db.prepare('SELECT * FROM students WHERE username = ?').get(email);
      if (legacy && legacy.password == null && !legacy.firebaseUid) {
        db.prepare('UPDATE students SET firebaseUid = ?, email = COALESCE(email, ?) WHERE id = ?')
          .run(identity.uid, email, legacy.id);
        student = db.prepare('SELECT * FROM students WHERE id = ?').get(legacy.id);
      }
    }

    if (!student) {
      let username = email || identity.uid;
      if (db.prepare('SELECT 1 FROM students WHERE username = ?').get(username)) username = `${username}-${identity.uid.slice(0, 8)}`;
      const id = `student-${crypto.randomUUID()}`;
      db.prepare('INSERT INTO students (id, studentName, username, password, email, firebaseUid) VALUES (?, ?, ?, NULL, ?, ?)')
        .run(id, identity.name || email || 'Student', username, email, identity.uid);
      student = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
    }

    return student;
  } catch (error) {
    throw Object.assign(new Error('Invalid Firebase ID token'), { status: 401 });
  }
}

function updateMe(studentId, data) {
  const { studentName, email = '' } = data;
  if (typeof studentName !== 'string' || typeof email !== 'string') {
    throw Object.assign(new Error('Invalid profile data'), { status: 400 });
  }
  const name = studentName?.trim();
  const normalizedEmail = email.trim();
  if (!name) throw Object.assign(new Error('studentName must not be empty'), { status: 400 });
  if (!validEmail(normalizedEmail)) throw Object.assign(new Error('Email is invalid'), { status: 400 });

  db.prepare('UPDATE students SET studentName = ?, email = ? WHERE id = ?')
    .run(name, normalizedEmail || null, studentId);
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId);
  return { user: publicStudent(student) };
}

module.exports = { register, login, resetPassword, googleSync, updateMe, publicStudent };
