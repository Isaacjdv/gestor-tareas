const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    // Obtener el token del header
    const token = req.header('Authorization');

    // Verificar si no hay token
    if (!token) {
        return res.status(401).json({ message: 'No hay token, permiso denegado.' });
    }

    // El token usualmente viene como "Bearer <token>", lo separamos
    const tokenParts = token.split(' ');
    if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
        return res.status(401).json({ message: 'Formato de token inválido.' });
    }
    const actualToken = tokenParts[1];

    // Verificar el token
    try {
        const decoded = jwt.verify(actualToken, process.env.JWT_SECRET);
        req.user = decoded; // Agregamos los datos del usuario (ej. userId) a la request
        next(); // Continuamos a la siguiente función (el controlador)
    } catch (err) {
        res.status(401).json({ message: 'El token no es válido.' });
    }
};