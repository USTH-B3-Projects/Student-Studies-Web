const express = require('express');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authenticate');
const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/reset', authController.resetPassword);
router.post('/google', authController.googleSync);
router.get('/me', authenticate, authController.me);
router.patch('/me', authenticate, authController.updateMe);
router.post('/logout', authController.logout);

module.exports = router;
