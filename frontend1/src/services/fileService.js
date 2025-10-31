import axios from 'axios';

const API_URL = 'https://gestor-tareas-backend-11hi.onrender.com/api/files/';

const getAuthHeader = () => {
    // Asegúrate de que 'user_token' sea la llave correcta que usas en localStorage
    const token = localStorage.getItem('user_token'); 
    return token ? { Authorization: 'Bearer ' + token } : {};
};

// Obtener archivos de una carpeta
const getFilesByFolder = (folderId) => {
    return axios.get(API_URL + folderId, { headers: getAuthHeader() });
};

// [NUEVO] Obtener TODOS los archivos del usuario
const getAllFiles = () => {
    // Llama a la nueva ruta /api/files/user/all
    return axios.get(API_URL + 'user/all', { headers: getAuthHeader() });
};

// Subir un archivo
const uploadFile = (folderId, file) => {
    const formData = new FormData();
    formData.append('file', file);

    return axios.post(API_URL + folderId + '/upload', formData, {
        headers: {
            ...getAuthHeader(),
            'Content-Type': 'multipart/form-data'
        }
    });
};

// Actualizar el nombre de un archivo
const updateFile = (id, nombre_original) => {
    return axios.put(API_URL + id, { nombre_original }, { headers: getAuthHeader() });
};

// Eliminar un archivo
const deleteFile = (id) => {
    return axios.delete(API_URL + id, { headers: getAuthHeader() });
};

// [NUEVO] Actualizar estado y nota de un archivo
const updateFileDetails = (fileId, details) => {
    // Llama a la nueva ruta /api/files/:id/details
    return axios.put(API_URL + fileId + '/details', details, {
        headers: getAuthHeader()
    });
};


// Creamos UN SOLO objeto con TODAS las funciones
const fileService = {
    getFilesByFolder,
    getAllFiles, // <--- NUEVO
    uploadFile,
    updateFile,
    deleteFile,
    updateFileDetails // <--- NUEVO
};

// Exportamos ese único objeto
export default fileService;
