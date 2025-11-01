import axios from 'axios';

// URL de tu backend en Render
const API_BASE_URL = 'https://gestor-tareas-backend-11hi.onrender.com/api/chat/';

// --- FUNCIÓN AUXILIAR ---
const getAuthHeader = () => {
    const token = localStorage.getItem('user_token');
    return token ? { Authorization: 'Bearer ' + token } : {};
};

/**
 * @desc    Obtener el historial de chat con otro usuario
 * @route   GET /api/chat/history/:otherUserId
 */
const getHistory = (otherUserId) => {
    return axios.get(`${API_BASE_URL}history/${otherUserId}`, {
        headers: getAuthHeader()
    });
};

const chatService = {
    getHistory,
};

export default chatService;