const userModel = require('../models/userModel');

/**
 * @desc    Buscar usuarios por nombre o email (para "Amigos")
 * @route   GET /api/users/search?q=...
 * @access  Private
 */
exports.searchUsers = async (req, res) => {
    try {
        const { q } = req.query; // Obtener el término de búsqueda (ej: "pepito")
        const currentUserId = req.user.userId; // ID del usuario que realiza la búsqueda (del token)

        // Si no hay término de búsqueda, devolver un array vacío
        if (!q || q.trim() === '') {
            return res.json([]);
        }

        // Llamamos a la función 'search' en el modelo (la crearemos a continuación)
        // Le pasamos tu ID para excluirte a ti mismo de los resultados
        const users = await userModel.search(q, currentUserId);

        res.status(200).json(users);

    } catch (error) {
        console.error('Error en searchUsers:', error);
        res.status(500).json({ message: 'Error en el servidor al buscar usuarios.' });
    }
};



// backend/controllers/userController.js
const pool = require('../config/db');

/**
 * Actualiza datos de perfil del usuario
 * PUT /api/users/:id
 */
const updateProfile = async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  const { nombre, email, whatsapp_number, foto_perfil_url } = req.body;

  if (!userId) {
    return res.status(400).json({ message: 'ID de usuario inválido' });
  }

  try {
    const result = await pool.query(
      `
      UPDATE usuarios
      SET
        nombre = COALESCE($1, nombre),
        email = COALESCE($2, email),
        whatsapp_number = COALESCE($3, whatsapp_number),
        foto_perfil_url = COALESCE($4, foto_perfil_url)
      WHERE id = $5
      RETURNING id, nombre, email, whatsapp_number, foto_perfil_url, created_at
      `,
      [nombre, email, whatsapp_number, foto_perfil_url, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    return res
      .status(500)
      .json({ message: 'Error al actualizar el perfil del usuario' });
  }
};

/**
 * Ejemplo de búsqueda de usuarios (si no la tenías)
 * GET /api/users/search?q=...
 */
const searchUsers = async (req, res) => {
  const { q } = req.query;
  try {
    const result = await pool.query(
      `
      SELECT id, nombre, email, foto_perfil_url
      FROM usuarios
      WHERE
        LOWER(nombre) LIKE LOWER($1) OR
        LOWER(email) LIKE LOWER($1)
      ORDER BY nombre ASC
      LIMIT 20
      `,
      [`%${q || ''}%`]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error al buscar usuarios:', error);
    res.status(500).json({ message: 'Error al buscar usuarios' });
  }
};

module.exports = {
  updateProfile,
  searchUsers, // y cualquier otra función que ya tengas
};
