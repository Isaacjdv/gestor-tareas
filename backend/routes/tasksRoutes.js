// routes/tasksRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * Util: emite un evento a un usuario concreto (room = userId)
 */
function emitToUser(io, userId, event, payload) {
  if (!io || !userId) return;
  io.to(userId.toString()).emit(event, payload || {});
}

/**
 * Validaciones mínimas
 */
function assertInt(value, name = 'id') {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    const err = new Error(`Parámetro ${name} inválido`);
    err.status = 400;
    throw err;
  }
  return num;
}

function sanitizeStatus(status) {
  if (!status) return null;
  const allowed = ['pending', 'in_process', 'done'];
  if (!allowed.includes(status)) {
    const err = new Error(`status inválido. Usa: ${allowed.join(', ')}`);
    err.status = 400;
    throw err;
  }
  return status;
}

/**
 * GET /api/tasks/:userId
 * Listado con filtros y paginación:
 *  - ?status=pending|in_process|done
 *  - ?q=texto (busca en título/descripcion)
 *  - ?limit, ?offset
 *  - ?order=desc|asc (por updated_at)
 */
router.get('/:userId', async (req, res) => {
  try {
    const userId = assertInt(req.params.userId, 'userId');
    const { status, q, limit = 50, offset = 0, order = 'desc' } = req.query;

    const clauses = ['usuario_id = $1'];
    const values = [userId];
    let idx = values.length;

    if (status) {
      sanitizeStatus(status);
      clauses.push(`status = $${++idx}`);
      values.push(status);
    }
    if (q && q.trim() !== '') {
      clauses.push(`(titulo ILIKE $${++idx} OR descripcion ILIKE $${idx})`);
      values.push(`%${q}%`);
    }

    const ord = String(order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const off = Math.max(parseInt(offset, 10) || 0, 0);

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const sql = `
      SELECT id, usuario_id, titulo, descripcion, status, created_at, updated_at
      FROM tasks
      ${where}
      ORDER BY updated_at ${ord}, id ${ord}
      LIMIT ${lim} OFFSET ${off};
    `;
    const { rows } = await pool.query(sql, values);
    res.json(rows);
  } catch (err) {
    console.error('GET /tasks/:userId error:', err);
    res.status(err.status || 500).json({ message: err.message || 'Error listando tareas' });
  }
});

/**
 * GET /api/tasks/:userId/summary
 * Resumen por estado (conteo)
 */
router.get('/:userId/summary', async (req, res) => {
  try {
    const userId = assertInt(req.params.userId, 'userId');
    const { rows } = await pool.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending')::int   AS pending,
        COUNT(*) FILTER (WHERE status = 'in_process')::int AS in_process,
        COUNT(*) FILTER (WHERE status = 'done')::int       AS done,
        COUNT(*)::int AS total
      FROM tasks
      WHERE usuario_id = $1;
      `,
      [userId]
    );
    res.json(rows[0] || { pending: 0, in_process: 0, done: 0, total: 0 });
  } catch (err) {
    console.error('GET /tasks/:userId/summary error:', err);
    res.status(500).json({ message: 'Error obteniendo resumen de tareas' });
  }
});

/**
 * POST /api/tasks
 * Crea una tarea
 * body: { usuario_id, titulo, descripcion?, status? }
 */
router.post('/', async (req, res) => {
  try {
    const { usuario_id, titulo, descripcion = '', status } = req.body || {};
    const userId = assertInt(usuario_id, 'usuario_id');
    if (!titulo || !titulo.trim()) {
      return res.status(400).json({ message: 'titulo es requerido' });
    }
    const stat = status ? sanitizeStatus(status) : 'pending';

    const { rows } = await pool.query(
      `
      INSERT INTO tasks (usuario_id, titulo, descripcion, status)
      VALUES ($1, $2, $3, $4)
      RETURNING id, usuario_id, titulo, descripcion, status, created_at, updated_at;
      `,
      [userId, titulo.trim(), descripcion, stat]
    );

    // Notificar al usuario (socket)
    emitToUser(req.io, userId, 'tasks_updated', { reason: 'created', task: rows[0] });

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /tasks error:', err);
    res.status(err.status || 500).json({ message: err.message || 'Error creando la tarea' });
  }
});

/**
 * POST /api/tasks/bulk
 * Crea múltiples tareas a partir de una lista de strings
 * body: { usuario_id, items: ["hacer tarea de matemáticas", "imprimir imágenes de computadoras", ...], status? }
 */
router.post('/bulk', async (req, res) => {
  const client = await pool.connect();
  try {
    const { usuario_id, items, status } = req.body || {};
    const userId = assertInt(usuario_id, 'usuario_id');
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'items debe ser un arreglo con al menos 1 elemento' });
    }
    const stat = status ? sanitizeStatus(status) : 'pending';

    await client.query('BEGIN');
    const created = [];

    for (const raw of items) {
      const titulo = String(raw || '').trim();
      if (!titulo) continue;
      const { rows } = await client.query(
        `
        INSERT INTO tasks (usuario_id, titulo, status)
        VALUES ($1, $2, $3)
        RETURNING id, usuario_id, titulo, descripcion, status, created_at, updated_at;
        `,
        [userId, titulo, stat]
      );
      created.push(rows[0]);
    }
    await client.query('COMMIT');

    emitToUser(req.io, userId, 'tasks_updated', { reason: 'bulk_created', count: created.length });

    res.status(201).json({ created });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POST /tasks/bulk error:', err);
    res.status(err.status || 500).json({ message: err.message || 'Error creando tareas en lote' });
  } finally {
    client.release();
  }
});

/**
 * PATCH /api/tasks/:id
 * Actualiza campos (parcial) de una tarea
 * body: { titulo?, descripcion?, status? }
 */
router.patch('/:id', async (req, res) => {
  try {
    const id = assertInt(req.params.id, 'id');
    const { titulo, descripcion, status } = req.body || {};

    const updates = [];
    const values = [];
    let i = 0;

    if (titulo !== undefined) {
      updates.push(`titulo = $${++i}`);
      values.push(String(titulo).trim());
    }
    if (descripcion !== undefined) {
      updates.push(`descripcion = $${++i}`);
      values.push(descripcion);
    }
    if (status !== undefined) {
      sanitizeStatus(status);
      updates.push(`status = $${++i}`);
      values.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No hay campos para actualizar' });
    }

    updates.push(`updated_at = NOW()`);

    const sql = `
      UPDATE tasks
      SET ${updates.join(', ')}
      WHERE id = $${++i}
      RETURNING id, usuario_id, titulo, descripcion, status, created_at, updated_at;
    `;
    values.push(id);

    const { rows } = await pool.query(sql, values);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Tarea no encontrada' });
    }

    // Notificar a ese usuario
    emitToUser(req.io, rows[0].usuario_id, 'tasks_updated', { reason: 'updated', task: rows[0] });

    res.json(rows[0]);
  } catch (err) {
    console.error('PATCH /tasks/:id error:', err);
    res.status(err.status || 500).json({ message: err.message || 'Error actualizando la tarea' });
  }
});

/**
 * PATCH /api/tasks/bulk/:userId/status
 * Cambia el status de varias tareas de un usuario
 * body: { ids: [1,2,3], status: 'done' }
 */
router.patch('/bulk/:userId/status', async (req, res) => {
  try {
    const userId = assertInt(req.params.userId, 'userId');
    const { ids, status } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'ids debe ser un arreglo con al menos 1 elemento' });
    }
    sanitizeStatus(status);

    const placeholders = ids.map((_, idx) => `$${idx + 2}`).join(',');
    const values = [userId, ...ids];

    const sql = `
      UPDATE tasks
      SET status = $1, updated_at = NOW()
      WHERE usuario_id = $2 AND id IN (${placeholders})
      RETURNING id;
    `;
    const { rows } = await pool.query(sql, [status, ...values]);

    emitToUser(req.io, userId, 'tasks_updated', { reason: 'bulk_status', status, count: rows.length });

    res.json({ updated: rows.map(r => r.id) });
  } catch (err) {
    console.error('PATCH /tasks/bulk/:userId/status error:', err);
    res.status(err.status || 500).json({ message: err.message || 'Error actualizando estado en lote' });
  }
});

/**
 * DELETE /api/tasks/:id
 * Elimina una tarea
 */
router.delete('/:id', async (req, res) => {
  try {
    const id = assertInt(req.params.id, 'id');

    const { rows } = await pool.query(
      `DELETE FROM tasks
       WHERE id = $1
       RETURNING id, usuario_id;`,
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Tarea no encontrada' });
    }

    emitToUser(req.io, rows[0].usuario_id, 'tasks_updated', { reason: 'deleted', id });

    res.json({ ok: true, id });
  } catch (err) {
    console.error('DELETE /tasks/:id error:', err);
    res.status(500).json({ message: 'Error eliminando la tarea' });
  }
});

module.exports = router;
