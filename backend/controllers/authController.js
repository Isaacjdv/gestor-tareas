// backend/controllers/authController.js
const userModel = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

/* ============ REGISTER ============ */
const register = async (req, res) => {
  try {
    const body = req.body || {};
    const nombre = body.nombre ?? body.name ?? body.usuario ?? null;
    const email = body.email ?? body.correo ?? null;
    let password = body.password ?? body.pass ?? body.contraseña ?? body.pwd ?? undefined;
    const whatsapp_number = body.whatsapp_number ?? body.whatsapp ?? body.phone ?? null;

    if (!nombre || !email || password == null) {
      return res.status(400).json({ message: 'Faltan campos: nombre, email o password.' });
    }

    if (typeof password !== 'string') password = String(password);
    if (password.length < 8) {
      return res.status(400).json({ message: 'El password debe tener al menos 8 caracteres.' });
    }

    const existingUser = await userModel.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'El correo electrónico ya está registrado.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await userModel.create({ nombre, email, password: hashedPassword, whatsapp_number });

    return res.status(201).json({ message: 'Usuario registrado con éxito.' });
  } catch (error) {
    console.error('Error en el registro:', error);
    return res.status(500).json({
      message: 'Error en el servidor al registrar el usuario.',
      error: error.message,
    });
  }
};

/* ============ LOGIN ============ */
const login = async (req, res) => {
  try {
    const body = req.body || {};
    const email = body.email ?? body.correo ?? null;
    let password = body.password ?? body.pass ?? body.contraseña ?? body.pwd ?? undefined;

    console.log('🟦 /login body:', body);

    if (!email || password == null) {
      return res.status(400).json({ message: 'Faltan email o password.' });
    }
    if (typeof password !== 'string') password = String(password);

    const user = await userModel.findByEmail(email);
    console.log('🟦 Usuario encontrado por email:', user);

    if (!user) {
      console.log('🟥 No se encontró usuario con email:', email);
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    console.log('🟦 ¿Password coincide?:', isMatch);

    if (!isMatch) {
      console.log('🟥 Password incorrecta para email:', email);
      return res.status(401).json({ message: 'Credenciales inválidas.' });
    }

    const payload = { userId: user.id, email: user.email, nombre: user.nombre };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    return res.status(200).json({
      message: 'Inicio de sesión exitoso.',
      token,
      userId: user.id,
    });
  } catch (error) {
    console.error('Error en el login:', error);
    return res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

/* ============ GET ME ============ */
const getMe = async (req, res) => {
  try {
    // authMiddleware debe poner el payload en req.user
    return res.status(200).json({
      id: req.user.userId,
      nombre: req.user.nombre,
      email: req.user.email,
    });
  } catch (error) {
    console.error('Error en getMe:', error);
    return res.status(500).json({ message: 'Error al obtener los datos del usuario.' });
  }
};

/* ============ CHANGE PASSWORD ============ */
const changePassword = async (req, res) => {
  try {
    // IMPORTANTE: authMiddleware debe decodificar el token y poner { userId, ... } en req.user
    const userId = req.user?.userId;

    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: 'Debe enviar la contraseña actual y la nueva' });
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res
        .status(400)
        .json({ message: 'La nueva contraseña debe tener al menos 8 caracteres.' });
    }

    const result = await pool.query(
      'SELECT id, password FROM usuarios WHERE id = $1',
      [userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const user = result.rows[0];

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res
        .status(400)
        .json({ message: 'La contraseña actual no es correcta' });
    }

    const hashed = await bcrypt.hash(newPassword, 12);

    await pool.query('UPDATE usuarios SET password = $1 WHERE id = $2', [
      hashed,
      userId,
    ]);

    return res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    return res
      .status(500)
      .json({ message: 'Error al cambiar la contraseña' });
  }
};

/* ============ EXPORTS ============ */
module.exports = {
  register,
  login,
  getMe,
  changePassword,
};
