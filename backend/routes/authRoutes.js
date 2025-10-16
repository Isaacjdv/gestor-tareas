const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Ruta: POST /api/auth/register
router.post('/register', authController.register);

// Ruta: POST /api/auth/login
router.post('/login', authController.login);

module.exports = router;