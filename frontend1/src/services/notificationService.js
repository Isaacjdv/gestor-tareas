// src/services/notificationService.js
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'https://gestor-tareas-backend-11hi.onrender.com';

export default {
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
  }
};
