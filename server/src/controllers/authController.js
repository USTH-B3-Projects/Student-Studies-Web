const db = require('../config/database');
const crypto = require('crypto');

function generateId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function isValidDate(value) {
  return !isNaN(Date.parse(value));
}

exports.register = (req, res) => {
  const { studentName, username, password, confirmPassword } = req.body;

  // Validation
  if (!studentName || !username || !password || !confirmPassword) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (studentName.trim().length === 0) {
    return res.status(400).json({ error: 'studentName must not be empty' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords must match' });
  }

  try {
    const existing = db.prepare('SELECT * FROM students WHERE username = ?').get(username);
    if (existing) {
      return res.status(409).json({ error: 'User ID already registered' });
    }

    const id = generateId('student');
    db.prepare(`
      INSERT INTO students (id, studentName, username, password)
      VALUES (?, ?, ?, ?)
    `).run(id, studentName.trim(), username, password);

    res.status(201).json({
      success: true,
      user: { userId: username, name: studentName.trim(), email: '' }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.login = (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const student = db.prepare('SELECT * FROM students WHERE username = ?').get(username);
    if (!student || student.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({
      success: true,
      user: { userId: student.username, name: student.studentName, email: '' }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.resetPassword = (req, res) => {
  const { username, newPassword, confirmPassword } = req.body;

  if (!username || !newPassword || !confirmPassword) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'New passwords must match' });
  }

  try {
    const result = db.prepare('UPDATE students SET password = ? WHERE username = ?').run(newPassword, username);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Username or email not found' });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.googleSync = (req, res) => {
  const { username, studentName } = req.body;

  if (!username || !studentName) {
    return res.status(400).json({ error: 'username and studentName are required' });
  }
  if (studentName.trim().length === 0) {
    return res.status(400).json({ error: 'studentName must not be empty' });
  }

  try {
    const existing = db.prepare('SELECT * FROM students WHERE username = ?').get(username);
    if (existing) {
      // User already synced — return success with existing data
      return res.json({
        success: true,
        user: { userId: existing.username, name: existing.studentName, email: existing.username }
      });
    }

    const id = generateId('student');
    db.prepare(`
      INSERT INTO students (id, studentName, username, password)
      VALUES (?, ?, ?, NULL)
    `).run(id, studentName.trim(), username);

    res.status(201).json({
      success: true,
      user: { userId: username, name: studentName.trim(), email: username }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
