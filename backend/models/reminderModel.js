const db = require('../config/db');

// Crea un nuevo recordatorio
exports.create = async (userId, message, triggerAt, recipientNumber, userName, taskType = 'simple') => {
    const query = `
        INSERT INTO reminders (usuario_id, message, trigger_at, recipient_whatsapp_number, user_name, task_type) 
        VALUES ($1, $2, $3, $4, $5, $6) 
        RETURNING *;
    `;
    const values = [userId, message, triggerAt, recipientNumber, userName, taskType];
    const { rows } = await db.query(query, values);
    return rows[0];
};

// Busca todos los recordatorios que están pendientes de ser enviados
exports.findPending = async () => {
    const query = `
        SELECT *
        FROM reminders
        WHERE status = 'pending' AND trigger_at <= NOW();
    `;
    const { rows } = await db.query(query);
    return rows;
};

// Actualiza el estado de un recordatorio
exports.updateStatus = async (id, status) => {
    const query = 'UPDATE reminders SET status = $1 WHERE id = $2;';
    const values = [status, id];
    const { rowCount } = await db.query(query, values);
    return rowCount > 0;
};