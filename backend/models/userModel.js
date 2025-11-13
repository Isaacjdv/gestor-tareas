// backend/models/userModel.js
'use strict';

const pool = require('../config/db');
const bcrypt = require('bcryptjs');

/**
 * Crea usuario.
 * - Hasheamos la contraseña aquí. Si YA la hasheas en el controller,
 *   comenta la línea del hash y pasa directamente passwordHash = password.
 */
async function create({ nombre, email, password, whatsapp_number }) {
  // 🔐 Si ya hasheas en el controller, reemplaza esta línea por:
  // const passwordHash = password;
  const passwordHash = await bcrypt.hash(password, 10);

  const query = `
    INSERT INTO usuarios (nombre, email, password, whatsapp_number)
    VALUES ($1, $2, $3, $4)
    RETURNING id, nombre, email, whatsapp_number, created_at
  `;
  const values = [nombre, email, passwordHash, whatsapp_number || null];

  const { rows } = await pool.query(query, values);
  return rows[0];
}

/** Busca por email (case-sensitive by default) */
async function findByEmail(email) {
  const { rows } = await pool.query(
    'SELECT * FROM usuarios WHERE email = $1 LIMIT 1',
    [email]
  );
  return rows[0] || null;
}

/** Busca por número de WhatsApp exacto */
async function findByWhatsapp(whatsapp_number) {
  const { rows } = await pool.query(
    'SELECT * FROM usuarios WHERE whatsapp_number = $1 LIMIT 1',
    [whatsapp_number]
  );
  return rows[0] || null;
}

/** Busca un usuario por nombre con ILIKE (case-insensitive, parcial) */
async function findByName(name) {
  const { rows } = await pool.query(
    'SELECT * FROM usuarios WHERE nombre ILIKE $1 LIMIT 1',
    [name]
  );
  return rows[0] || null;
}

/**
 * search: listar usuarios por nombre o email (parcial, case-insensitive),
 * excluyendo al usuario actual. Devuelve solo datos públicos.
 */
async function search(searchTerm, currentUserId) {
  const query = `
    SELECT id, nombre, email, foto_perfil_url
    FROM usuarios
    WHERE (nombre ILIKE $1 OR email ILIKE $1)
      AND id <> $2
    ORDER BY nombre ASC
    LIMIT 10
  `;
  const values = [`%${searchTerm}%`, currentUserId];
  const { rows } = await pool.query(query, values);
  return rows;
}

module.exports = {
  create,
  findByEmail,
  findByWhatsapp,
  findByName,
  search,
};
