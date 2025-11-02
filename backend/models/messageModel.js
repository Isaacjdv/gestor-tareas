const db = require('../config/db');

// --- Función para limpiar caracteres invisibles problemáticos ---
const cleanseSQL = (s) =>
  s
    .replace(/\uFEFF/g, '')                 // BOM (Byte Order Mark)
    .replace(/\u00A0/g, ' ')                // NBSP -> espacio normal
    .replace(/[\u200B-\u200D\u2060]/g, ''); // Zero-width characters

/**
 * @desc    Obtener el historial de chat entre dos usuarios
 * @param   {number} userId1 - ID del usuario 1 (usualmente el usuario logueado)
 * @param   {number} userId2 - ID del usuario 2 (con quien se está chateando)
 * @param   {object} [opts]
 * @param   {number} [opts.limit=50] - Límite de mensajes
 * @param   {number} [opts.offset=0] - Desplazamiento (paginación)
 * @returns {Promise<Array>} - Un array de mensajes
 */
exports.getHistory = async (userId1, userId2, { limit = 50, offset = 0 } = {}) => {
  try {
    // Consulta SQL limpia, SIN saltos o espacios antes del SELECT
    let query =
'SELECT id, sender_id, receiver_id, contenido, created_at \
FROM mensajes \
WHERE (sender_id = $1 AND receiver_id = $2) \
   OR (sender_id = $2 AND receiver_id = $1) \
ORDER BY created_at ASC \
LIMIT $3 OFFSET $4;';

    // Limpieza de caracteres invisibles antes de ejecutar
    query = cleanseSQL(query);

    const values = [userId1, userId2, limit, offset];
    const { rows } = await db.query(query, values);
    return rows;
  } catch (error) {
    console.error("Error en messageModel.getHistory:", error);
    throw error; // Se deja al controlador manejar el error
  }
};
