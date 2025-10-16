const db = require('../config/db');

// Crear un nuevo usuario
exports.create = async (nombre, email, password, whatsapp_number) => {
    const [result] = await db.query(
        'INSERT INTO usuarios (nombre, email, password, whatsapp_number) VALUES (?, ?, ?, ?)',
        [nombre, email, password, whatsapp_number]
    );
    return { id: result.insertId };
};

// Encontrar un usuario por su email
exports.findByEmail = async (email) => {
    const [rows] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    return rows[0];
};

// Encontrar un usuario por su número de WhatsApp
exports.findByWhatsapp = async (whatsapp_number) => {
    const [rows] = await db.query('SELECT * FROM usuarios WHERE whatsapp_number = ?', [whatsapp_number]);
    return rows[0];
};