// controllers/authController.js
const userModel = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  try {
    // Normaliza posibles nombres alternativos del frontend
    const body = req.body || {};
    const nombre = body.nombre ?? body.name ?? body.usuario ?? null;
    const email = body.email ?? body.correo ?? null;
    let password = body.password ?? body.pass ?? body.contraseña ?? body.pwd ?? undefined;
    const whatsapp_number = body.whatsapp_number ?? body.whatsapp ?? body.phone ?? null;

    // Validación básica
    if (!nombre || !email || password == null) {
      return res.status(400).json({ message: 'Faltan campos: nombre, email o password.' });
    }

    // Asegura que password sea string (por si llega número)
    if (typeof password !== 'string') password = String(password);

    if (password.length < 8) {
      return res.status(400).json({ message: 'El password debe tener al menos 8 caracteres.' });
    }

    // Evita duplicados
    const existingUser = await userModel.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'El correo electrónico ya está registrado.' });
    }

    // Hash seguro
    const hashedPassword = await bcrypt.hash(password, 12);

    // IMPORTANTE: verifica que tu modelo reciba los argumentos en este orden
    // o usa un objeto para evitar desorden
    await userModel.create({ nombre, email, password: hashedPassword, whatsapp_number });

    return res.status(201).json({ message: 'Usuario registrado con éxito.' });
  } catch (error) {
    console.error('Error en el registro:', error);
    return res.status(500).json({ message: 'Error en el servidor al registrar el usuario.', error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const body = req.body || {};
    const email = body.email ?? body.correo ?? null;
    let password = body.password ?? body.pass ?? body.contraseña ?? body.pwd ?? undefined;

    if (!email || password == null) {
      return res.status(400).json({ message: 'Faltan email o password.' });
    }
    if (typeof password !== 'string') password = String(password);

    const user = await userModel.findByEmail(email);
    if (!user) return res.status(401).json({ message: 'Credenciales inválidas.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Credenciales inválidas.' });

    const payload = { userId: user.id, email: user.email, nombre: user.nombre };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    return res.status(200).json({ message: 'Inicio de sesión exitoso.', token, userId: user.id });
  } catch (error) {
    console.error('Error en el login:', error);
    return res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    return res.status(200).json({ id: req.user.userId, nombre: req.user.nombre, email: req.user.email });
  } catch (error) {
    console.error('Error en getMe:', error);
    return res.status(500).json({ message: 'Error al obtener los datos del usuario.' });
  }
};
exports.login = async (req, res) => {
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

    return res.status(200).json({ message: 'Inicio de sesión exitoso.', token, userId: user.id });
  } catch (error) {
    console.error('Error en el login:', error);
    return res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};
