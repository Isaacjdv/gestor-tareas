const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * @desc    Buscar usuarios por nombre o email (para la búsqueda de "Amigos")
 * @route   GET /api/users/search
 * @access  Private (solo usuarios logueados)
 *
 * Ejemplo de cómo se usará en el frontend:
 * /api/users/search?q=pepito
 */
router.get('/search', authMiddleware, userController.searchUsers);

module.exports = router;