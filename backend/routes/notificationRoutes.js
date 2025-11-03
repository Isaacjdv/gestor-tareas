const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * @desc    Obtener todas las notificaciones NO LEÍDAS del usuario,
 * agrupadas por remitente (para el panel de notificaciones)
 * @route   GET /api/notifications/unread
 * @access  Private
 */
router.get('/unread', authMiddleware, notificationController.getUnreadNotifications);

/**
 * @desc    Marcar las notificaciones de un remitente específico como LEÍDAS
 * @route   POST /api/notifications/read
 * @access  Private
 */
router.post('/read', authMiddleware, notificationController.markNotificationsAsRead);

module.exports = router;