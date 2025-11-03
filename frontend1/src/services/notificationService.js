// src/services/notificationService.js
import axios from 'axios';

// Resolver la URL base de la API para Vite o CRA, con fallbacks seguros
function getApiBase() {
  // Vite: import.meta.env?.VITE_API_URL
  const viteUrl =
    (typeof import.meta !== 'undefined' &&
      import.meta &&
      import.meta.env &&
      import.meta.env.VITE_API_URL) ||
    null;

  // CRA: process.env.REACT_APP_API_URL
  const craUrl = typeof process !== 'undefined' ? process.env?.REACT_APP_API_URL : null;

  // También permitimos inyectar por window.__API_URL__ si quieres
  const windowUrl = typeof window !== 'undefined' ? window.__API_URL__ : null;

  return (
    viteUrl ||
    craUrl ||
    windowUrl ||
    // fallback por si no hay env configurado
    'https://gestor-tareas-backend-11hi.onrender.com'
  );
}

const API = getApiBase();

const notificationService = {
  getUnreadSummary: async (recipientId) => {
    const { data } = await axios.get(`${API}/api/notifications/unread/summary/${recipientId}`);
    return data;
  },
  markAllRead: async (recipientId) => {
    const { data } = await axios.put(`${API}/api/notifications/mark-all-read/${recipientId}`);
    return data;
  },
  markFromSender: async (recipientId, senderId) => {
    const { data } = await axios.put(`${API}/api/notifications/mark-from/${recipientId}/${senderId}`);
    return data;
  },
};

export default notificationService;
