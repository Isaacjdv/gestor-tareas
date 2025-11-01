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