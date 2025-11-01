const db = require('../config/db');

/**
 * @desc    Obtener el historial de chat entre dos usuarios
 * @param   {number} userId1 - ID del usuario 1 (usualmente el usuario logueado)
 * @param   {number} userId2 - ID del usuario 2 (con quien se está chateando)
 * @returns {Promise<Array>} - Un array de mensajes
 */
exports.getHistory = async (userId1, userId2) => {
    // Consulta SQL limpiada de caracteres invisibles
    const query = `
        SELECT * FROM mensajes
        WHERE 
            (sender_id = $1 AND receiver_id = $2) 
            OR 
            (sender_id = $2 AND receiver_id = $1)
        ORDER BY created_at ASC; 
    `;
    const values = [userId1, userId2];
    try {
        const { rows } = await db.query(query, values);
        return rows;
    } catch (error) {
        console.error("Error en messageModel.getHistory:", error);
        throw error; // Dejamos que el controlador maneje el error
    }
};