const userModel = require('../models/userModel');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Lógica para registrar un usuario
exports.register = async (req, res) => {
    try {
        const { nombre, email, password, whatsapp_number } = req.body;

        // Validar que el usuario no exista
        const existingUser = await userModel.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ message: 'El correo electrónico ya está registrado.' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        // Crear usuario en la base de datos con el número
        await userModel.create(nombre, email, hashedPassword, whatsapp_number);

        res.status(201).json({ message: 'Usuario registrado con éxito.' });
    } catch (error) {
        console.error("Error en el registro:", error);
        res.status(500).json({ message: 'Error en el servidor al registrar el usuario.', error: error.message });
    }
};

// Lógica para iniciar sesión
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Buscar al usuario
        const user = await userModel.findByEmail(email);
        if (!user) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        // Comparar contraseñas
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        // Crear y firmar el token JWT
        // ¡IMPORTANTE! Añadimos el 'nombre' al token para que 'getMe' funcione
        const payload = {
            userId: user.id,
            email: user.email,
            nombre: user.nombre 
        };
        
        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' } // El token expira en 1 hora
        );

        res.status(200).json({ 
            message: 'Inicio de sesión exitoso.',
            token: token,
            userId: user.id
        });
    } catch (error) {
        console.error("Error en el login:", error);
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};

// --- FUNCIÓN PARA OBTENER DATOS DEL USUARIO LOGUEADO ---
exports.getMe = async (req, res) => {
    try {
        // req.user es inyectado por el authMiddleware y contiene el payload del token
        res.status(200).json({
            id: req.user.userId,
            nombre: req.user.nombre,
            email: req.user.email
        });
    } catch (error) {
        console.error("Error en getMe:", error);
        res.status(500).json({ message: 'Error al obtener los datos del usuario.' });
    }
};