const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// Ruta: POST /api/auth/register
router.post('/register', authController.register);

// Ruta: POST /api/auth/login
router.post('/login', authController.login);

// Ruta: GET /api/auth/me
// Devuelve los datos del usuario logueado usando su token
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;

