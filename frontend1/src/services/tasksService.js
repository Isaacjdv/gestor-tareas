// frontend/src/services/tasksService.js
import axios from 'axios';

/* ====================== URL BACKEND UNIVERSAL ====================== */
function getApiBase() {
  const viteUrl =
    (typeof import.meta !== 'undefined' &&
      import.meta &&
      import.meta.env &&
      import.meta.env.VITE_API_URL) ||
    null;
  const craUrl = typeof process !== 'undefined' ? process.env?.REACT_APP_API_URL : null;
  const windowUrl = typeof window !== 'undefined' ? window.__API_URL__ : null;
  return viteUrl || craUrl || windowUrl || 'https://gestor-tareas-backend-11hi.onrender.com';
}

const API_BASE = getApiBase();
const api = axios.create({
  baseURL: `${API_BASE}/api/tasks`,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Listar tareas por usuario con filtros y paginación
 * @param {number} userId
 * @param {object} opts { status, q, limit=50, offset=0, order='desc' }
 */
async function listByUser(userId, opts = {}) {
  const params = new URLSearchParams();
  if (opts.status) params.set('status', opts.status);
  if (opts.q) params.set('q', opts.q);
  params.set('limit', Number.isFinite(opts.limit) ? opts.limit : 50);
  params.set('offset', Number.isFinite(opts.offset) ? opts.offset : 0);
  params.set('order', opts.order === 'asc' ? 'asc' : 'desc');
  const { data } = await api.get(`/${userId}?${params.toString()}`);
  return data;
}

/**
 * Resumen por estado para un usuario
 * @param {number} userId
 * @returns {{pending:number,in_process:number,done:number,total:number}}
 */
async function getSummary(userId) {
  const { data } = await api.get(`/${userId}/summary`);
  return data;
}

/**
 * Crear una tarea
 * @param {{usuario_id:number, titulo:string, descripcion?:string, status?:'pending'|'in_process'|'done'}} payload
 */
async function create(payload) {
  const { data } = await api.post('/', payload);
  return data;
}

/**
 * Crear tareas en lote desde una lista de strings
 * @param {{usuario_id:number, items:string[], status?:'pending'|'in_process'|'done'}} payload
 * @returns {{created: Array}}
 */
async function bulkCreate(payload) {
  const { data } = await api.post('/bulk', payload);
  return data;
}

/**
 * Actualizar parcialmente una tarea
 * @param {number} id
 * @param {{titulo?:string, descripcion?:string, status?:'pending'|'in_process'|'done'}} patch
 */
async function update(id, patch) {
  const { data } = await api.patch(`/${id}`, patch);
  return data;
}

/**
 * Cambiar status en lote para un usuario
 * @param {number} userId
 * @param {{ids:number[], status:'pending'|'in_process'|'done'}} payload
 * @returns {{updated:number[]}}
 */
async function bulkUpdateStatus(userId, payload) {
  const { data } = await api.patch(`/bulk/${userId}/status`, payload);
  return data;
}

/**
 * Eliminar una tarea
 * @param {number} id
 * @returns {{ok:boolean,id:number}}
 */
async function remove(id) {
  const { data } = await api.delete(`/${id}`);
  return data;
}

export default {
  listByUser,
  getSummary,
  create,
  bulkCreate,
  update,
  bulkUpdateStatus,
  remove,
};
