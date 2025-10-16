const db = require('../config/db');

// Crear una nueva carpeta (versión final que soporta subcarpetas)
exports.create = async (nombre, usuario_id, parent_id = null) => {
    const [result] = await db.query(
        'INSERT INTO carpetas (nombre, usuario_id, parent_id) VALUES (?, ?, ?)',
        [nombre, usuario_id, parent_id]
    );
    return { id: result.insertId, nombre, usuario_id, parent_id };
};

// Encontrar todas las carpetas de un usuario (se mantiene para compatibilidad, aunque usaremos más findByParentId)
exports.findByUserId = async (usuario_id) => {
    const [rows] = await db.query(
        'SELECT * FROM carpetas WHERE usuario_id = ? ORDER BY created_at DESC', 
        [usuario_id]
    );
    return rows;
};

// Encontrar carpetas por su parent_id (para ver el contenido de una carpeta)
exports.findByParentId = async (usuario_id, parent_id) => {
    // Si parent_id es null, busca las carpetas raíz
    if (parent_id === null) {
        const [rows] = await db.query('SELECT * FROM carpetas WHERE usuario_id = ? AND parent_id IS NULL ORDER BY created_at DESC', [usuario_id]);
        return rows;
    } else {
        // Si tiene un ID, busca las subcarpetas de ese ID
        const [rows] = await db.query('SELECT * FROM carpetas WHERE usuario_id = ? AND parent_id = ? ORDER BY created_at DESC', [usuario_id, parent_id]);
        return rows;
    }
};

// Actualizar el nombre de una carpeta
exports.update = async (id, nombre) => {
    const [result] = await db.query(
        'UPDATE carpetas SET nombre = ? WHERE id = ?',
        [nombre, id]
    );
    return result.affectedRows > 0;
};

// Eliminar una carpeta por su ID
exports.remove = async (id) => {
    const [result] = await db.query(
        'DELETE FROM carpetas WHERE id = ?', 
        [id]
    );
    return result.affectedRows > 0;
};

// Encontrar una carpeta por su nombre y el ID del usuario
exports.findByNameAndUserId = async (nombre, usuario_id) => {
    const [rows] = await db.query(
        'SELECT * FROM carpetas WHERE nombre = ? AND usuario_id = ?',
        [nombre, usuario_id]
    );
    return rows[0];
};

// Encontrar carpetas por su parent_id
exports.findByParentId = async (usuario_id, parent_id) => {
    let query, params;
    if (parent_id === null) {
        query = 'SELECT * FROM carpetas WHERE usuario_id = ? AND parent_id IS NULL ORDER BY created_at DESC';
        params = [usuario_id];
    } else {
        query = 'SELECT * FROM carpetas WHERE usuario_id = ? AND parent_id = ? ORDER BY created_at DESC';
        params = [usuario_id, parent_id];
    }
    const [rows] = await db.query(query, params);
    return rows;
};