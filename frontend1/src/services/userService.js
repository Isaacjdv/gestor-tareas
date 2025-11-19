import axios from 'axios';

// ====== BASE URL DEL BACKEND ======
const API_ROOT =
  (typeof import.meta !== 'undefined' &&
    import.meta?.env?.VITE_API_URL) ||
  (typeof process !== 'undefined' &&
    process.env?.REACT_APP_API_URL) ||
  'https://gestor-tareas-backend-11hi.onrender.com';

// Base para usuarios
const API_BASE_URL = `${API_ROOT}/api/users`;

// --- FUNCIÓN AUXILIAR: HEADER AUTH ---
const getAuthHeader = () => {
  const token = localStorage.getItem('user_token');
  return token ? { Authorization: 'Bearer ' + token } : {};
};

/**
 * Buscar usuarios por término de búsqueda (q)
 * GET /api/users/search?q=pepito
 */
const search = (query) => {
  // Si la consulta está vacía, no llamamos a la API
  if (!query.trim()) {
    return Promise.resolve({ data: [] });
  }

  return axios.get(`${API_BASE_URL}/search`, {
    headers: getAuthHeader(),
    params: { q: query },
  });
};

/**
 * Actualizar perfil de usuario
 * PUT /api/users/:id
 */
const updateProfile = (userId, data) =>
  axios.put(`${API_BASE_URL}/${userId}`, data, {
    headers: getAuthHeader(),
  });

// === EXPORT ÚNICO ===
const userService = {
  search,
  updateProfile,
};

export default userService;
