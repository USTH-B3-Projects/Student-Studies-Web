const express = require('express');
const authController = require('../controllers/authController');
const router = express.Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/reset', authController.resetPassword);
router.post('/google', authController.googleSync);

module.exports = router;
