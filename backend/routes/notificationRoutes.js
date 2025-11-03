// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * Resumen de no leídas agrupadas por remitente.
 * Devuelve: [{ sender_id, nombre, foto_perfil_url, unread_count, last_message, last_created_at }]
 */
router.get('/unread/summary/:recipientId', async (req, res) => {
  const { recipientId } = req.params;
  try {
    const q = `
      SELECT
        n.sender_id,
        u.nombre,
        u.foto_perfil_url,
        COUNT(*)::int AS unread_count,
        MAX(n.created_at) AS last_created_at,
        (
          SELECT m.contenido
          FROM mensajes m
          WHERE m.id = n.message_id
          ORDER BY m.created_at DESC
          LIMIT 1
        ) AS last_message
      FROM notifications n
      JOIN usuarios u ON u.id = n.sender_id
      WHERE n.recipient_id = $1 AND n.is_read = false
      GROUP BY n.sender_id, u.nombre, u.foto_perfil_url
      ORDER BY last_created_at DESC
    `;
    const { rows } = await pool.query(q, [recipientId]);
    res.json(rows);
  } catch (err) {
    console.error('GET /unread/summary error:', err);
    res.status(500).json({ message: 'Error obteniendo notificaciones' });
  }
});

/** Marcar TODAS como leídas para un usuario */
router.put('/mark-all-read/:recipientId', async (req, res) => {
  const { recipientId } = req.params;
  try {
    await pool.query(
      `UPDATE notifications SET is_read = true WHERE recipient_id = $1 AND is_read = false`,
      [recipientId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('PUT /mark-all-read error:', err);
    res.status(500).json({ message: 'Error marcando notificaciones' });
  }
});

/** Marcar como leídas SOLO de un remitente */
router.put('/mark-from/:recipientId/:senderId', async (req, res) => {
  const { recipientId, senderId } = req.params;
  try {
    await pool.query(
      `UPDATE notifications SET is_read = true WHERE recipient_id = $1 AND sender_id = $2 AND is_read = false`,
      [recipientId, senderId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('PUT /mark-from error:', err);
    res.status(500).json({ message: 'Error marcando notificaciones' });
  }
});

module.exports = router;
