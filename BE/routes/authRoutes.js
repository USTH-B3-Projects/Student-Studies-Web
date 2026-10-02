const express = require('express');
const auth = require('../services/authService');
const { authenticate, createSession, destroySession } = require('../middleware/authenticate');
const router = express.Router();

router.post('/register', (req, res) => res.status(201).json(auth.register(req.body)));
router.post('/login', (req, res) => {
  const student = auth.login(req.body);
  createSession(res, student.id);
  res.json({ success: true, user: auth.publicStudent(student) });
});
router.post('/reset', (req, res) => res.json(auth.resetPassword(req.body)));
router.post('/google', async (req, res) => {
  // Preserve the original 401 mapping, including failures when creating a session.
  try {
    const student = await auth.googleSync(req.body);
    createSession(res, student.id);
    res.json({ success: true });
  } catch (error) {
    res.status(error.status === 400 ? 400 : 401).json({ error: error.status === 400 ? error.message : 'Invalid Firebase ID token' });
  }
});
router.get('/me', authenticate, (req, res) => res.json({ user: auth.publicStudent(req.student) }));
router.patch('/me', authenticate, (req, res) => res.json(auth.updateMe(req.student.id, req.body)));
router.post('/logout', (req, res) => {
  destroySession(req, res);
  res.json({ success: true });
});

module.exports = router;
