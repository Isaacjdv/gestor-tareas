// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

// Buscar usuarios por nombre o email
// GET /api/users/search?q=pepito
router.get('/search', authMiddleware, userController.searchUsers);

// Actualizar perfil
// PUT /api/users/:id
router.put('/:id', authMiddleware, userController.updateProfile);
// Si quieres probar sin auth de momento, podrías usar:
// router.put('/:id', userController.updateProfile);

module.exports = router;
