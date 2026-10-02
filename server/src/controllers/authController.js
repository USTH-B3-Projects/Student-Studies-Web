const crypto = require('crypto');
const db = require('../config/database');
const firebaseAuth = require('../firebaseAdmin');
const { createSession, destroySession, publicStudent } = require('../middleware/authenticate');

const generateId = (prefix) => `${prefix}-${crypto.randomUUID()}`;
const validEmail = (email) => !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

exports.register = (req, res) => {
  const { studentName, username, password, confirmPassword, email = '' } = req.body;

  if (![studentName, username, password, confirmPassword, email].every((value) => typeof value === 'string')) {
    return res.status(400).json({ error: 'Invalid registration data' });
  }
  const normalizedEmail = email.trim();
  if (!studentName || !username || !password || !confirmPassword) return res.status(400).json({ error: 'All fields are required' });
  if (!studentName.trim()) return res.status(400).json({ error: 'studentName must not be empty' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (password !== confirmPassword) return res.status(400).json({ error: 'Passwords must match' });
  if (!validEmail(normalizedEmail)) return res.status(400).json({ error: 'Email is invalid' });

  try {
    if (db.prepare('SELECT 1 FROM students WHERE username = ?').get(username)) {
      return res.status(409).json({ error: 'User ID already registered' });
    }
    const id = generateId('student');
    db.prepare('INSERT INTO students (id, studentName, username, password, email) VALUES (?, ?, ?, ?, ?)')
      .run(id, studentName.trim(), username, password, normalizedEmail || null);
    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
    res.status(201).json({ success: true, user: publicStudent(student) });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.login = (req, res) => {
  const { username, password } = req.body;
  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const student = db.prepare('SELECT * FROM students WHERE username = ?').get(username);
    if (!student || student.password !== password) return res.status(401).json({ error: 'Invalid credentials' });
    createSession(res, student.id);
    res.json({ success: true, user: publicStudent(student) });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.resetPassword = (req, res) => {
  const { username, newPassword, confirmPassword } = req.body;
  if (!username || !newPassword || !confirmPassword) return res.status(400).json({ error: 'All fields are required' });
  if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });
  if (newPassword !== confirmPassword) return res.status(400).json({ error: 'New passwords must match' });

  try {
    const result = db.prepare('UPDATE students SET password = ? WHERE username = ?').run(newPassword, username);
    if (result.changes === 0) return res.status(404).json({ error: 'Username or email not found' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.googleSync = async (req, res) => {
  const { idToken } = req.body;
  if (typeof idToken !== 'string' || !idToken) return res.status(400).json({ error: 'Firebase ID token is required' });

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
      const id = generateId('student');
      db.prepare('INSERT INTO students (id, studentName, username, password, email, firebaseUid) VALUES (?, ?, ?, NULL, ?, ?)')
        .run(id, identity.name || email || 'Student', username, email, identity.uid);
      student = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
    }

    createSession(res, student.id);
    res.json({ success: true });
  } catch (error) {
    res.status(401).json({ error: 'Invalid Firebase ID token' });
  }
};

exports.me = (req, res) => res.json({ user: publicStudent(req.student) });

exports.updateMe = (req, res) => {
  const { studentName, email = '' } = req.body;
  if (typeof studentName !== 'string' || typeof email !== 'string') {
    return res.status(400).json({ error: 'Invalid profile data' });
  }
  const name = studentName?.trim();
  const normalizedEmail = email.trim();
  if (!name) return res.status(400).json({ error: 'studentName must not be empty' });
  if (!validEmail(normalizedEmail)) return res.status(400).json({ error: 'Email is invalid' });

  try {
    db.prepare('UPDATE students SET studentName = ?, email = ? WHERE id = ?')
      .run(name, normalizedEmail || null, req.student.id);
    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(req.student.id);
    res.json({ user: publicStudent(student) });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.logout = (req, res) => {
  destroySession(req, res);
  res.json({ success: true });
};
