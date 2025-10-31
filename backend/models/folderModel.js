const db = require('../config/db');

// Crear una nueva carpeta (versión para PostgreSQL)
exports.create = async (nombre, usuario_id, parent_id = null) => {
    const { rows } = await db.query(
        'INSERT INTO carpetas (nombre, usuario_id, parent_id) VALUES ($1, $2, $3) RETURNING *',
        [nombre, usuario_id, parent_id]
    );
    // Devuelve el objeto completo
    return rows[0];
};

// Encontrar todas las carpetas de un usuario (no se usa actualmente, pero es útil)
exports.findByUserId = async (usuario_id) => {
    const { rows } = await db.query('SELECT * FROM carpetas WHERE usuario_id = $1 ORDER BY created_at DESC', [usuario_id]);
    return rows;
};

// Encontrar carpetas por su parent_id (para ver el contenido de una carpeta)
exports.findByParentId = async (usuario_id, parent_id) => {
    // Si parent_id es null, busca las carpetas raíz
    if (parent_id === null) {
        const { rows } = await db.query('SELECT * FROM carpetas WHERE usuario_id = $1 AND parent_id IS NULL ORDER BY created_at DESC', [usuario_id]);
        return rows;
    } else {
        // Si tiene un ID, busca las subcarpetas de ese ID
        const { rows } = await db.query('SELECT * FROM carpetas WHERE usuario_id = $1 AND parent_id = $2 ORDER BY created_at DESC', [usuario_id, parent_id]);
        return rows;
    }
};

// [NUEVA FUNCIÓN AÑADIDA]
// Encontrar una carpeta específica por su ID
exports.findById = async (id) => {
    const { rows } = await db.query('SELECT * FROM carpetas WHERE id = $1', [id]);
    return rows[0]; // Devuelve la carpeta (o undefined si no se encuentra)
};

// Actualizar el nombre de una carpeta
exports.update = async (id, nombre) => {
    const { rows } = await db.query(
        'UPDATE carpetas SET nombre = $1 WHERE id = $2 RETURNING *', 
        [nombre, id]
    );
    return rows[0]; // Devuelve la carpeta actualizada
};

// Eliminar una carpeta por su ID
exports.remove = async (id) => {
    const { rowCount } = await db.query('DELETE FROM carpetas WHERE id = $1', [id]);
    return rowCount > 0;
};

// Encontrar una carpeta por su nombre y el ID del usuario (insensible a mayúsculas)
exports.findByNameAndUserId = async (nombre, usuario_id) => {
    const { rows } = await db.query(
        'SELECT * FROM carpetas WHERE nombre ILIKE $1 AND usuario_id = $2',
        [nombre, usuario_id]
    );
    return rows[0];
};
