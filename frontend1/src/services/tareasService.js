// frontend1/src/services/tareasService.js
import api from './api'; // Tu instancia base de axios (ya usada en otros services)

const tareasService = {
  /**
   * Obtiene todas las tareas del usuario
   * @param {number|string} userId
   */
  getTareas(userId) {
    return api.get(`/tareas/${userId}`);
  },

  /**
   * Crea una nueva tarea personal
   * @param {{ usuario_id: number, titulo: string, descripcion?: string }} data
   */
  createTarea(data) {
    return api.post('/tareas', data);
  },

  /**
   * Actualiza una tarea (título, descripción o estado)
   * @param {number|string} id
   * @param {{ titulo?: string, descripcion?: string, status?: 'pending'|'in_process'|'done' }} data
   */
  updateTarea(id, data) {
    return api.put(`/tareas/${id}`, data);
  },

  /**
   * Elimina una tarea personal
   * @param {number|string} id
   */
  deleteTarea(id) {
    return api.delete(`/tareas/${id}`);
  },
};

export default tareasService;
