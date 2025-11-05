const db = require('../config/db');

/**
 * @desc    Obtiene todas las notificaciones NO LEÍDAS de un usuario,
 * agrupadas por el remitente.
 * @param   {number} recipientId - El ID del usuario (tú) que recibe las notificaciones.
 */
exports.getUnreadGrouped = async (recipientId) => {
    // [INICIO DE CORRECCIÓN] Consulta SQL reescrita para evitar el error '42803'
    const query = `
        WITH RankedMessages AS (
            -- Paso 1: Obtener todas las notificaciones no leídas y rankearlas
            -- (rn = 1 es la más reciente de cada remitente)
            SELECT
                n.id AS notification_id,
                n.recipient_id,
                n.sender_id,
                m.contenido,
                n.created_at,
                ROW_NUMBER() OVER(PARTITION BY n.sender_id ORDER BY n.created_at DESC) as rn
            FROM notifications n
            JOIN mensajes m ON n.message_id = m.id
            WHERE n.recipient_id = $1 AND n.is_read = false
	),
	AggregatedCounts AS (
		-- Paso 2: Contar el total de notificaciones no leídas por remitente
		SELECT
			sender_id,
			COUNT(id) as count
		FROM notifications
		WHERE recipient_id = $1 AND is_read = false
		GROUP BY sender_id
	)
	-- Paso 3: Unir los datos del remitente, el conteo total, y el ÚLTIMO mensaje
	SELECT 
		r.sender_id,
		u.nombre AS sender_nombre,
		u.foto_perfil_url AS sender_foto,
		a.count,
		r.contenido AS ultimo_mensaje,
		r.created_at AS ultimo_mensaje_fecha
	FROM RankedMessages r
	JOIN usuarios u ON r.sender_id = u.id
	JOIN AggregatedCounts a ON r.sender_id = a.sender_id
	WHERE r.rn = 1 -- Seleccionar solo el mensaje más reciente de cada grupo
	ORDER BY r.created_at DESC;
    `;
    // [FIN DE CORRECCIÓN]

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