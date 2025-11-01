import axios from 'axios';

// URL de tu backend en Render
const API_BASE_URL = 'https://gestor-tareas-backend-11hi.onrender.com/api/users/';

// --- FUNCIÓN AUXILIAR ---
const getAuthHeader = () => {
    const token = localStorage.getItem('user_token');
    return token ? { Authorization: 'Bearer ' + token } : {};
};

/**
 * @desc    Buscar usuarios por término de búsqueda (q)
 * @route   GET /api/users/search?q=pepito
 */
const search = (query) => {
    // Si la consulta está vacía, no llamamos a la API
    if (!query.trim()) {
        return Promise.resolve({ data: [] }); // Devuelve una promesa resuelta con un array vacío
    }
    
    return axios.get(`${API_BASE_URL}search`, {
        headers: getAuthHeader(),
        params: { q: query } // Envía la consulta como parámetro de URL (ej: ?q=pepito)
    });
};

const userService = {
    search,
};

export default userService;