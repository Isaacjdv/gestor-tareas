const db = require('../config/db');

/**
 * @desc    Obtiene todas las notificaciones NO LEÍDAS de un usuario,
 * agrupadas por el remitente.
 * @param   {number} recipientId - El ID del usuario (tú) que recibe las notificaciones.
 */
exports.getUnreadGrouped = async (recipientId) => {
    const query = `
        SELECT
            n.sender_id,
            u.nombre AS sender_nombre,
            u.foto_perfil_url AS sender_foto,
            COUNT(n.id) AS count,
            
            /* Usamos MAX para obtener el contenido del último mensaje en el grupo */
            /* (Esto asume que el ID más alto es el mensaje más reciente) */
            (SELECT contenido FROM mensajes WHERE id = MAX(n.message_id)) AS ultimo_mensaje,
            
            MAX(n.created_at) AS ultimo_mensaje_fecha
        FROM notifications n
        JOIN usuarios u ON n.sender_id = u.id
        WHERE n.recipient_id = $1 AND n.is_read = false
        GROUP BY n.sender_id, u.nombre, u.foto_perfil_url
        ORDER BY ultimo_mensaje_fecha DESC;
    `;
    try {
        const { rows } = await db.query(query, [recipientId]);
        return rows;
    } catch (error) {
        console.error("Error en notificationModel.getUnreadGrouped:", error);
        throw error;
    }
};

/**
 * @desc    Marca todas las notificaciones de un remitente específico
 * (para un destinatario) como LEÍDAS.
 * @param   {number} recipientId - El ID del usuario (tú).
 * @param   {number} senderId - El ID del usuario del chat que estás abriendo.
 */
exports.markAsRead = async (recipientId, senderId) => {
    const query = `
        UPDATE notifications
        SET is_read = true
        WHERE recipient_id = $1 AND sender_id = $2 AND is_read = false;
    `;
    try {
        await db.query(query, [recipientId, senderId]);
    } catch (error) {
        console.error("Error en notificationModel.markAsRead:", error);
        throw error;
    }
};