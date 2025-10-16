import axios from 'axios';

const API_URL = 'https://gestor-tareas-backend.onrender.com/api/auth/';
// Función para registrar un usuario
const register = (nombre, email, password, whatsapp_number) => {
    return axios.post(API_URL + 'register', {
        nombre,
        email,
        password,
        whatsapp_number, // <-- AÑADIDO
    });
};

// Función para iniciar sesión
const login = async (email, password) => {
    const response = await axios.post(API_URL + 'login', {
        email,
        password,
    });
    // Si el login es exitoso, guarda el token del usuario en el localStorage
    if (response.data.token) {
        localStorage.setItem('user_token', response.data.token);
    }
    return response.data;
};

// Función para cerrar sesión
const logout = () => {
    localStorage.removeItem('user_token');
};

const authService = {
    register,
    login,
    logout,
};

export default authService;