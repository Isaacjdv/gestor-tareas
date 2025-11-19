// frontend/src/services/authService.js
import axios from 'axios';

const API_ROOT =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL) ||
  'https://gestor-tareas-backend-11hi.onrender.com';

const API_URL = `${API_ROOT}/api/auth`;

// --- FUNCIÓN AUXILIAR PARA OBTENER EL TOKEN ---
const getAuthHeader = () => {
  const token = localStorage.getItem('user_token');
  return token ? { Authorization: 'Bearer ' + token } : {};
};

// Función para registrar un nuevo usuario
const register = (nombre, email, password, whatsapp_number) => {
  return axios.post(`${API_URL}/register`, {
    nombre,
    email,
    password,
    whatsapp_number,
  });
};

// Función para iniciar sesión
const login = async (email, password) => {
  const response = await axios.post(`${API_URL}/login`, {
    email,
    password,
  });

  // Si el login es exitoso, guarda el token del usuario en el localStorage
  if (response.data?.token) {
    localStorage.setItem('user_token', response.data.token);
  }

  return response.data;
};

// Función para cerrar sesión
const logout = () => {
  localStorage.removeItem('user_token');
};

// Obtiene los datos del usuario actualmente logueado
const getSelf = () => {
  return axios.get(`${API_URL}/me`, { headers: getAuthHeader() });
};

// Cambiar contraseña del usuario logueado
const changePassword = (data) => {
  return axios.post(`${API_URL}/change-password`, data, {
    headers: getAuthHeader(),
  });
};

// --- OBJETO FINAL EXPORTADO ---
const authService = {
  register,
  login,
  logout,
  getSelf,
  changePassword,
};

export default authService;
