// models/messageModel.js
const pool = require('../config/db');

/**
 * Limpia caracteres invisibles que rompen el parser de PostgreSQL.
 * - NBSP \u00A0
 * - ZWSP \u200B
 * - BOM \uFEFF
 * Además compacta espacios repetidos antes de saltos de línea.
 */
function cleanSQL(sql) {
  return sql
    .replace(/\u00A0|\u200B|\uFEFF/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

/**
 * Obtiene el historial entre dos usuarios (privado).
 * @param {object} params
 * @param {number} params.userId       - ID del usuario actual
 * @param {number} params.friendId     - ID del otro usuario
 * @param {number} [params.limit=50]
 * @param {number} [params.offset=0]
 */
exports.getHistory = async ({ userId, friendId, limit = 50, offset = 0 }) => {
  try {
    const sql = cleanSQL(`
      SELECT id, sender_id, receiver_id, contenido, created_at
      FROM mensajes
      WHERE (sender_id = $1 AND receiver_id = $2)
         OR (sender_id = $2 AND receiver_id = $1)
      ORDER BY created_at ASC
      LIMIT $3 OFFSET $4
    `);

    const { rows } = await pool.query(sql, [userId, friendId, limit, offset]);
    return rows;
  } catch (err) {
    // Log de diagnóstico para detectar caracteres raros al inicio
    console.error('Error en messageModel.getHistory:', err);
    return [];
  }
};
