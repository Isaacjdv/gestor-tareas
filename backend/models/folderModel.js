const db = require('../config/db');

// Crear una nueva carpeta
exports.create = async (nombre, usuario_id, parent_id = null) => {
    const { rows } = await db.query(
        'INSERT INTO carpetas (nombre, usuario_id, parent_id) VALUES ($1, $2, $3) RETURNING id',
        [nombre, usuario_id, parent_id]
    );
    return { id: rows[0].id, nombre, usuario_id, parent_id };
};

// Encontrar todas las carpetas de un usuario
exports.findByUserId = async (usuario_id) => {
    const { rows } = await db.query('SELECT * FROM carpetas WHERE usuario_id = $1 ORDER BY created_at DESC', [usuario_id]);
    return rows;
};

// Encontrar carpetas por su parent_id
exports.findByParentId = async (usuario_id, parent_id) => {
    if (parent_id === null) {
        const { rows } = await db.query('SELECT * FROM carpetas WHERE usuario_id = $1 AND parent_id IS NULL ORDER BY created_at DESC', [usuario_id]);
        return rows;
    } else {
        const { rows } = await db.query('SELECT * FROM carpetas WHERE usuario_id = $1 AND parent_id = $2 ORDER BY created_at DESC', [usuario_id, parent_id]);
        return rows;
    }
};

// ... (Aquí irían el resto de funciones de este archivo, todas traducidas a la sintaxis de '$')
// Actualizar el nombre de una carpeta
exports.update = async (id, nombre) => {
    const { rowCount } = await db.query('UPDATE carpetas SET nombre = $1 WHERE id = $2', [nombre, id]);
    return rowCount > 0;
};

// Eliminar una carpeta por su ID
exports.remove = async (id) => {
    const { rowCount } = await db.query('DELETE FROM carpetas WHERE id = $1', [id]);
    return rowCount > 0;
};

// Encontrar una carpeta por su nombre y el ID del usuario
exports.findByNameAndUserId = async (nombre, usuario_id) => {
    const { rows } = await db.query('SELECT * FROM carpetas WHERE nombre = $1 AND usuario_id = $2', [nombre, usuario_id]);
    return rows[0];
};