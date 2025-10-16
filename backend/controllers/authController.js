const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

// Lógica para registrar un usuario
exports.register = async (req, res) => {
    try {
        // Se añade whatsapp_number
        const { nombre, email, password, whatsapp_number } = req.body;
        // ... (validación de usuario existente) ...
        const hashedPassword = await bcrypt.hash(password, 12);

        // Crear usuario en la base de datos con el número
        await userModel.create(nombre, email, hashedPassword, whatsapp_number);

        res.status(201).json({ message: 'Usuario registrado con éxito.' });
    } catch (error) {
        // ... (manejo de errores) ...
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
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' } // El token expira en 1 hora
        );

        res.status(200).json({ 
            message: 'Inicio de sesión exitoso.',
            token: token,
            userId: user.id
        });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor', error: error.message });
    }
};