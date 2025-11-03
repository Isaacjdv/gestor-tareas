const notificationModel = require('../models/notificationModel');

/**
 * @desc    Obtener todas las notificaciones NO LEÍDAS del usuario,
 * agrupadas por remitente (para el panel de notificaciones)
 * @route   GET /api/notifications/unread
 * @access  Private
 */
exports.getUnreadNotifications = async (req, res) => {
    try {
        const recipientId = req.user.userId; // ID del usuario logueado (tú)
        
        // 1. Llama al modelo que creamos
        const notifications = await notificationModel.getUnreadGrouped(recipientId);
        
        // 2. Formatear los datos para que el frontend (DashboardPage) los entienda
        // (Esto soluciona el problema de "Usuario undefined" al cargar la página)
        const formattedNotifications = notifications.map(n => ({
            count: parseInt(n.count, 10), // Asegurar que sea número
            message: {
                contenido: n.ultimo_mensaje,
                created_at: n.ultimo_mensaje_fecha
            },
            sender: { // El objeto 'sender' que el frontend espera
                id: n.sender_id,
                nombre: n.sender_nombre,
                foto_perfil_url: n.sender_foto
            }
        }));

        res.status(200).json(formattedNotifications);

    } catch (error) {
        console.error("Error en getUnreadNotifications:", error);
        res.status(500).json({ message: 'Error al obtener notificaciones.' });
    }
};

/**
 * @desc    Marcar las notificaciones de un chat específico como LEÍDAS
 * @route   POST /api/notifications/read
 * @access  Private
 */
exports.markNotificationsAsRead = async (req, res) => {
    try {
        const recipientId = req.user.userId; // ID del usuario logueado
        const { senderId } = req.body; // ID del remitente (de quién abriste el chat)

        if (!senderId) {
            return res.status(400).json({ message: 'Se requiere senderId.' });
        }

        await notificationModel.markAsRead(recipientId, senderId);
        res.status(200).json({ message: 'Notificaciones marcadas como leídas.' });

G   } catch (error) {
        console.error("Error en markNotificationsAsRead:", error);
        res.status(500).json({ message: 'Error al marcar notificaciones como leídas.' });
    }
};