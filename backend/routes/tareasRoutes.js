// routes/tareasRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');

/**
 * GET /api/tareas/:userId
 * Lista todas las tareas personales del usuario (ordenadas por fecha desc)
 */
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  if (!userId) return res.status(400).json({ message: 'userId requerido' });

  try {
    const { rows } = await pool.query(
      `SELECT id, usuario_id, titulo, descripcion, status, created_at
       FROM tareas_personales
       WHERE usuario_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    res.json(rows);
  } catch (e) {
    console.error('Error obteniendo tareas personales:', e);
    res.status(500).json({ message: 'Error al cargar las tareas' });
  }
});

/**
 * POST /api/tareas
 * Crea una tarea personal
 * Body: { usuario_id, titulo, descripcion? }
 */
router.post('/', async (req, res) => {
  try {
    const { usuario_id, titulo, descripcion } = req.body || {};
    if (!usuario_id || !titulo?.trim()) {
      return res.status(400).json({ message: 'usuario_id y titulo son obligatorios' });
    }

    const { rows } = await pool.query(
      `INSERT INTO tareas_personales (usuario_id, titulo, descripcion)
       VALUES ($1, $2, $3)
       RETURNING id, usuario_id, titulo, descripcion, status, created_at`,
      [usuario_id, titulo.trim(), descripcion || null]
    );

    res.json(rows[0]);
  } catch (e) {
    console.error('Error creando tarea personal:', e);
    res.status(500).json({ message: 'Error al crear tarea' });
  }
});

/**
 * PUT /api/tareas/:id
 * Actualiza título, descripción o estado
 * Body: { titulo?, descripcion?, status? }  // status: pending | in_process | done
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { titulo, descripcion, status } = req.body || {};

  const allowedStatus = new Set(['pending', 'in_process', 'done']);
  if (status && !allowedStatus.has(status)) {
    return res.status(400).json({ message: "status inválido (usa 'pending' | 'in_process' | 'done')" });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE tareas_personales
       SET titulo = COALESCE($1, titulo),
           descripcion = COALESCE($2, descripcion),
           status = COALESCE($3, status)
       WHERE id = $4
       RETURNING id, usuario_id, titulo, descripcion, status, created_at`,
      [titulo?.trim() || null, descripcion ?? null, status ?? null, id]
    );

    if (rows.length === 0) return res.status(404).json({ message: 'Tarea no encontrada' });
    res.json(rows[0]);
  } catch (e) {
    console.error('Error actualizando tarea personal:', e);
    res.status(500).json({ message: 'Error al actualizar tarea' });
  }
});

/**
 * DELETE /api/tareas/:id
 * Elimina una tarea personal
 */
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM tareas_personales WHERE id = $1',
      [req.params.id]
    );
    if (rowCount === 0) return res.status(404).json({ message: 'Tarea no encontrada' });
    res.json({ ok: true });
  } catch (e) {
    console.error('Error eliminando tarea personal:', e);
    res.status(500).json({ message: 'Error al eliminar tarea' });
  }
});

module.exports = router;
