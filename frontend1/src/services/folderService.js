import axios from 'axios';

const API_URL = 'https://gestor-tareas-backend.onrender.com/api/folders/';

// Función para crear el header de autorización
const getAuthHeader = () => {
    const token = localStorage.getItem('user_token');
    if (token) {
        return { Authorization: 'Bearer ' + token };
    } else {
        return {};
    }
};

// Obtener carpetas (principales o subcarpetas)
const getFolders = (parentId) => {
    // Si se provee un parentId, se añade como parámetro a la URL
    const url = parentId ? `${API_URL}?parentId=${parentId}` : API_URL;
    return axios.get(url, { headers: getAuthHeader() });
};

// Crear una nueva carpeta (principal o subcarpeta)
const createFolder = (nombre, parentId) => {
    return axios.post(API_URL, { nombre, parentId }, { headers: getAuthHeader() });
};

// Actualizar una carpeta
const updateFolder = (id, nombre) => {
    return axios.put(API_URL + id, { nombre }, { headers: getAuthHeader() });
};

// Eliminar una carpeta
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