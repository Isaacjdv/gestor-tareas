const db = require('../config/db');

/**
 * Crea un nuevo recordatorio en la base de datos.
 * @param {number} userId - El ID del usuario.
 * @param {string} message - El mensaje del recordatorio.
 * @param {Date} triggerAt - La fecha y hora en que se debe enviar el recordatorio.
 * @returns {Promise<object>} - El objeto del recordatorio creado.
 */
exports.create = async (userId, message, triggerAt) => {
    const query = `
        INSERT INTO reminders (usuario_id, message, trigger_at) 
        VALUES ($1, $2, $3) 
        RETURNING *;
    `;
    const values = [userId, message, triggerAt];
    const { rows } = await db.query(query, values);
    return rows[0];
};

/**
 * Busca todos los recordatorios que están pendientes de ser enviados.
 * @returns {Promise<Array>} - Un array de objetos de recordatorios pendientes.
 */
exports.findPending = async () => {
    const query = `
        SELECT r.*, u.whatsapp_number 
        FROM reminders r
        JOIN usuarios u ON r.usuario_id = u.id
        WHERE r.status = 'pending' AND r.trigger_at <= NOW();
    `;
    const { rows } = await db.query(query);
    return rows;
};

/**
 * Actualiza el estado de un recordatorio (ej: de 'pending' a 'sent').
 * @param {number} id - El ID del recordatorio.
 * @param {string} status - El nuevo estado ('sent', 'error', etc.).
 * @returns {Promise<boolean>} - True si la actualización fue exitosa.
 */
exports.updateStatus = async (id, status) => {
    const query = 'UPDATE reminders SET status = $1 WHERE id = $2;';
    const values = [status, id];
    const { rowCount } = await db.query(query, values);
    return rowCount > 0;
};