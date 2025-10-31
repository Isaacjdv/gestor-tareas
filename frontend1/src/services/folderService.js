import axios from 'axios';

// URL de tu backend en Render
const API_URL = 'https://gestor-tareas-backend-11hi.onrender.com/api/folders/';

// --- FUNCIÓN AUXILIAR ---
const getAuthHeader = () => {
    const token = localStorage.getItem('user_token');
    return token ? { Authorization: 'Bearer ' + token } : {};
};

// Obtener carpetas (principales o subcarpetas)
// Ruta: GET /api/folders/?parentId=ID
const getFolders = (parentId) => {
    // Si se provee un parentId, se añade como parámetro a la URL
    const url = parentId ? `${API_URL}?parentId=${parentId}` : API_URL;
    return axios.get(url, { headers: getAuthHeader() });
};

// Crear una nueva carpeta (principal o subcarpeta)
// Ruta: POST /api/folders/
const createFolder = (nombre, parentId) => {
    return axios.post(API_URL, { nombre, parentId }, { headers: getAuthHeader() });
};

// Actualizar el nombre de una carpeta
// Ruta: PUT /api/folders/:id
const updateFolder = (id, nombre) => {
    return axios.put(API_URL + id, { nombre }, { headers: getAuthHeader() });
};

// Eliminar una carpeta
// Ruta: DELETE /api/folders/:id
const deleteFolder = (id) => {
    return axios.delete(API_URL + id, { headers: getAuthHeader() });
};

const folderService = {
    getFolders,
    createFolder,
    updateFolder,
    deleteFolder,
};

export default folderService;
    