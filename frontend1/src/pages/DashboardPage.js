/* eslint-disable react/prop-types */
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import '../styles/ChatComponent.css'; // <--- AGREGA ESTO SI NO ESTÁ
import folderService from '../services/folderService';
import fileService from '../services/fileService';
import authService from '../services/authService';
import userService from '../services/userService';
import notificationService from '../services/notificationService';
import tasksService from '../services/tasksService';

import { UserContext } from '../App';
import '../styles/DashboardPage.css';

// 🟢 IMPORTAMOS AMBOS COMPONENTES (CHAT Y VOZ)
import ChatComponent from '../components/ChatComponent';
import Gesia from '../components/Gesia'; 

import UserChatWindow from '../components/UserChatWindow';
import QuickTasksContent from '../components/QuickTasksContent';

// Vistas separadas
import AnalyticsView from '../components/AnalyticsView';
import ReportsView from '../components/ReportsView';
import Lestat from '../components/lestat'; 
import Perfil from '../components/Perfil'; 

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
const RENDER_BACKEND_URL = getApiBase();
const socket = io(RENDER_BACKEND_URL);

/* ====================== TRADUCCIONES ====================== */
const translations = {
  es: {
    searchPlaceholder: 'Buscar...',
    hello: 'Hola',
    logout: 'Cerrar Sesión',
    root: 'Inicio',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    rename: 'Renombrar',
    delete: 'Eliminar',
    noteModalTitle: 'Nota para',
    notePlaceholder: 'Escribe una nota o instrucciones...',
    saveNote: 'Guardar nota',
    welcomeTitle: 'Bienvenido a tu Espacio',
    welcomeMessage: 'Monitorea tus tareas, sube archivos y organiza tu flujo de trabajo.',
    homeCardAnalyticsTitle: 'Analítica',
    homeCardReportsTitle: 'Reportes',
    homeCardSettingsTitle: 'Ajustes',
    advantagesTitle: 'Ventajas del flujo',
    advantagesDesc: 'Automatiza procesos, colabora con tu equipo y mantén todo organizado.',
    myArea: 'Mi Área de Trabajo',
    pending: 'Pendiente',
    in_process: 'En proceso',
    done: 'Terminado',
    tasks: 'Tareas',
    tasks_pending_title: 'Sin hacer',
    tasks_in_process_title: 'En proceso',
    tasks_done_title: 'Realizadas',
    emptyFolderMessage: 'Esta carpeta está vacía. Sube un archivo para comenzar.',
    emptyFolderTitle: 'Sin archivos',
    noResultsTitle: 'Sin resultados',
    noResultsMessage: 'No se encontraron archivos que coincidan con "{searchTerm}".',
    myFolders: 'Mis Carpetas',
    goBackTo: 'Volver a',
    newFolderPlaceholder: 'Nueva carpeta...',
    selectFile: 'Selecciona un archivo',
    uploading: 'Subiendo...',
    uploadFile: 'Subir',
    folderCreated: 'Carpeta creada',
    folderUpdated: 'Carpeta actualizada',
    folderDeleted: 'Carpeta eliminada',
    errorCreateFolder: 'No se pudo crear la carpeta',
    errorUpdateFolder: 'No se pudo actualizar',
    errorDeleteFolder: 'No se pudo eliminar',
    errorLoadFolders: 'No se pudieron cargar las carpetas',
    errorLoadFiles: 'No se pudieron cargar los archivos',
    fileUploaded: 'Archivo subido',
    fileUpdated: 'Archivo actualizado',
    fileDeleted: 'Archivo eliminado',
    errorUploadFile: 'No se pudo subir el archivo',
    deleteFolderTitle: 'Eliminar carpeta',
    confirmDeleteFolder: '¿Seguro que deseas eliminar esta carpeta?',
    deleteFileTitle: 'Eliminar archivo',
    confirmDeleteFile: '¿Seguro que deseas eliminar este archivo?',
    addNote: 'Agregar nota',
    editNote: 'Editar nota',
    noFoldersFound: 'No se encontraron carpetas.',
    search_files: 'Archivos',
    search_folders: 'Carpetas',
    search_users: 'Amigos',
    quickTasksTitle: 'Tareas rápidas',
    quickTasksSubtitle: 'Crea tareas de texto (una por línea) o individuales.',
    quickTasksPlaceholder: 'Ejemplos:\n- Hacer tarea de matemáticas\n- Imprimir imágenes de computadoras',
    addTasks: 'Crear en lote',
    addOne: 'Agregar',
    creating: 'Creando...',
    emptyTasks: 'Sin tareas por ahora.',
    markPending: 'Poner Pendiente',
    markInProcess: 'Marcar En Proceso',
    markDone: 'Marcar Hecho',
    editTask: 'Editar tarea',
    deleteTask: 'Eliminar tarea',
    updateTaskOk: 'Tarea actualizada',
    deleteTaskOk: 'Tarea eliminada',
    createTasksOk: 'Tareas creadas',
    createTaskOk: 'Tarea creada',
    errorTasks: 'No se pudieron cargar las tareas',
    profile: 'Perfil',
    profileUpdated: 'Perfil actualizado',
    errorProfileUpdate: 'No se pudo actualizar el perfil',
    passwordUpdated: 'Contraseña actualizada',
    errorPasswordUpdate: 'No se pudo cambiar la contraseña',
    currentPassword: 'Contraseña anterior',
    newPassword: 'Contraseña nueva',
    changePassword: 'Cambiar contraseña',
    saveChanges: 'Guardar cambios',
    savePassword: 'Guardar contraseña',
    uploadNewAvatar: 'Cambiar foto',
    userSince: 'Usuario desde',
    name: 'Nombre',
    email: 'Correo',
    whatsapp: 'WhatsApp',
    saving: 'Guardando...',
    chooseAvatar: 'Elige tu avatar',
  },
  en: {
    searchPlaceholder: 'Search...',
    hello: 'Hello',
    logout: 'Log out',
    root: 'Home',
    cancel: 'Cancel',
    confirm: 'Confirm',
    rename: 'Rename',
    delete: 'Delete',
    noteModalTitle: 'Note for',
    notePlaceholder: 'Write a note or instructions...',
    saveNote: 'Save note',
    welcomeTitle: 'Welcome to your Space',
    welcomeMessage: 'Monitor your tasks, upload files and organize your workflow.',
    homeCardAnalyticsTitle: 'Analytics',
    homeCardReportsTitle: 'Reports',
    homeCardSettingsTitle: 'Settings',
    advantagesTitle: 'Workflow advantages',
    advantagesDesc: 'Automate processes, collaborate with your team and keep everything organized.',
    myArea: 'My Workspace',
    pending: 'Pending',
    in_process: 'In progress',
    done: 'Done',
    tasks: 'Tasks',
    tasks_pending_title: 'To do',
    tasks_in_process_title: 'In progress',
    tasks_done_title: 'Completed',
    emptyFolderMessage: 'This folder is empty. Upload a file to get started.',
    emptyFolderTitle: 'No files',
    noResultsTitle: 'No results',
    noResultsMessage: 'No files found matching "{searchTerm}".',
    myFolders: 'My Folders',
    goBackTo: 'Back to',
    newFolderPlaceholder: 'New folder...',
    selectFile: 'Select a file',
    uploading: 'Uploading...',
    uploadFile: 'Upload',
    folderCreated: 'Folder created',
    folderUpdated: 'Folder updated',
    folderDeleted: 'Folder deleted',
    errorCreateFolder: 'Could not create folder',
    errorUpdateFolder: 'Could not update',
    errorDeleteFolder: 'Could not delete',
    errorLoadFolders: 'Could not load folders',
    errorLoadFiles: 'Could not load files',
    fileUploaded: 'File uploaded',
    fileUpdated: 'File updated',
    fileDeleted: 'File deleted',
    errorUploadFile: 'Could not upload file',
    deleteFolderTitle: 'Delete folder',
    confirmDeleteFolder: 'Are you sure you want to delete this folder?',
    deleteFileTitle: 'Delete file',
    confirmDeleteFile: 'Are you sure you want to delete this file?',
    addNote: 'Add note',
    editNote: 'Edit note',
    noFoldersFound: 'No folders found.',
    search_files: 'Files',
    search_folders: 'Folders',
    search_users: 'Friends',
    quickTasksTitle: 'Quick tasks',
    quickTasksSubtitle: 'Create text tasks (one per line) or single ones.',
    quickTasksPlaceholder: 'Examples:\n- Do math homework\n- Print computer images',
    addTasks: 'Create batch',
    addOne: 'Add',
    creating: 'Creating...',
    emptyTasks: 'No tasks for now.',
    markPending: 'Set Pending',
    markInProcess: 'Mark In Progress',
    markDone: 'Mark Done',
    editTask: 'Edit task',
    deleteTask: 'Delete task',
    updateTaskOk: 'Task updated',
    deleteTaskOk: 'Task deleted',
    createTasksOk: 'Tasks created',
    createTaskOk: 'Task created',
    errorTasks: 'Could not load tasks',
    profile: 'Profile',
    profileUpdated: 'Profile updated',
    errorProfileUpdate: 'Could not update profile',
    passwordUpdated: 'Password updated',
    errorPasswordUpdate: 'Could not change password',
    currentPassword: 'Current password',
    newPassword: 'New password',
    changePassword: 'Change password',
    saveChanges: 'Save changes',
    savePassword: 'Save password',
    uploadNewAvatar: 'Change picture',
    userSince: 'User since',
    name: 'Nombre',
    email: 'Email',
    whatsapp: 'WhatsApp',
    saving: 'Saving...',
    chooseAvatar: 'Choose your avatar',
  },
};


/* ===================== UTILIDADES PARA RESÚMENES EN TARJETAS ===================== */
const dateKey = (d) => {
  const dt = new Date(d); dt.setHours(0,0,0,0);
  return dt.toISOString().slice(0,10);
};
const daysAgo = (n) => {
  const d = new Date(); d.setDate(d.getDate()-n); d.setHours(0,0,0,0); return d;
};
function computeMiniAnalytics(tasks) {
  const total = tasks.length || 1;
  const done = tasks.filter(t => t.status === 'done').length;
  const pending = tasks.filter(t => (t.status||'pending') === 'pending').length;
  const inproc = tasks.filter(t => t.status === 'in_process').length;
  const completion = Math.round((done/total)*100);

  const createdMap = new Map();
  tasks.forEach(t => {
    const k = dateKey(t.created_at || new Date());
    createdMap.set(k, (createdMap.get(k)||0)+1);
  });
  const trend = [];
  for (let i=6;i>=0;i--) {
    const k = dateKey(daysAgo(i));
    trend.push(createdMap.get(k)||0);
  }
  return { pending, inproc, done, completion, trend };
}

/* ===================== MODALES Y COMPONENTES PEQUEÑOS ===================== */
const ConfirmModal = ({ isOpen, title, message, onConfirm, onClose, t }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button onClick={onClose} className="modal-close-btn" title={t('cancel')}>&times;</button>
        </div>
        <div className="modal-body"><p>{message}</p></div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">{t('cancel')}</button>
          <button onClick={onConfirm} className="btn btn-danger">{t('confirm')}</button>
        </div>
      </div>
    </div>
  );
};

const NoteModal = ({ file, onClose, onSave, t }) => {
  const [noteText, setNoteText] = useState(file?.nota || '');
  const handleSave = () => { onSave(file, noteText); onClose(); };
  if (!file) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{t('noteModalTitle')} "{file.nombre_original}"</h3>
          <button onClick={onClose} className="modal-close-btn" title={t('cancel')}>&times;</button>
        </div>
        <div className="modal-body">
          <textarea
            className="note-textarea"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder={t('notePlaceholder')}
          />
        </div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">{t('cancel')}</button>
          <button onClick={handleSave} className="btn btn-primary">{t('saveNote')}</button>
        </div>
      </div>
    </div>
  );
};

const LanguageSwitcher = ({ language, setLanguage }) => {
  const toggleLanguage = () => setLanguage((lang) => (lang === 'es' ? 'en' : 'es'));
  return (
    <div className="language-switcher">
      <button onClick={toggleLanguage} className="btn btn-secondary btn-lang" title="Change Language">
        {language === 'es' ? 'EN' : 'ES'}
      </button>
    </div>
  );
};

const Breadcrumbs = ({ path, currentFolder, onCrumbClick, t }) => {
  const crumbs = [...path.filter((p) => p), currentFolder].filter((p) => p);
  return (
    <nav className="breadcrumbs">
      <span className="crumb" onClick={() => onCrumbClick(null)}><i className="fas fa-home"></i> {t('root')}</span>
      {crumbs.map((crumb, index) => (
        <React.Fragment key={crumb.id}>
          <span className="separator">&gt;</span>
          <span className="crumb" onClick={() => onCrumbClick(crumb, index)}>{crumb.nombre}</span>
        </React.Fragment>
      ))}
    </nav>
  );
};

const DashboardNavbar = ({
  user,
  language,
  setLanguage,
  t,
  searchTerm,
  setSearchTerm,
  searchFilter,
  setSearchFilter,
  hasUnread,
  onToggleNotificationPanel,
  onOpenProfile,
}) => {
  const navigate = useNavigate();
  const handleLogout = () => { authService.logout(); navigate('/'); };

  const handleProfileClick = () => {
    if (onOpenProfile) onOpenProfile();
  };

  return (
   <nav className="dashboard-navbar">
  <div className="navbar-logo">
    <a href="/dashboard">
      <img
        src="https://i.ibb.co/G4JcrC0v/852ae06c-511e-4480-8441-afd340897585.png"
        alt="Gesia IA"
        className="navbar-logo-img"
      />
    </a>
  </div>

      <div className="navbar-search">
        <select className="search-filter" value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)}>
          <option value="files">{t('search_files')}</option>
          <option value="folders">{t('search_folders')}</option>
          <option value="users">{t('search_users')}</option>
        </select>
        <i className="fas fa-search"></i>
        <input
          type="text"
          placeholder={
            searchFilter === 'files'
              ? t('searchPlaceholder')
              : searchFilter === 'folders'
              ? t('search_folders')
              : t('search_users')
          }
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="navbar-user">
        <LanguageSwitcher language={language} setLanguage={setLanguage} />
        <div className="notification-bell bell-blue" onClick={onToggleNotificationPanel} title="Notificaciones" role="button" aria-label="Notificaciones">
          <svg className="bell-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M12 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 006 14h12a1 1 0 00.707-1.707L18 11.586V8a6 6 0 00-6-6zm0 20a3 3 0 002.995-2.824L15 19h-6a3 3 0 002.824 2.995L12 22z"></path>
          </svg>
          {hasUnread && <div className="blinking-dot"></div>}
        </div>

        {/* Avatar + nombre que abre el perfil */}
        <div
          className="navbar-profile"
          onClick={handleProfileClick}
          title={t('profile')}
        >
          <img
            src={user?.foto_perfil_url || 'https://placehold.co/40x40/E0E0E0/121212?text=U'}
            alt={user ? user.nombre : 'Usuario'}
            className="navbar-avatar"
          />
          <span className="welcome-text">{t('hello')}, {user ? user.nombre : 'Usuario'}</span>
        </div>

        <button onClick={handleLogout} className="btn btn-primary">{t('logout')}</button>
      </div>
    </nav>
  );
};

/* ====== TARJETA TAREAS RÁPIDAS (con botón "Ver tareas") ====== */
const QuickTasksCard = ({ userId, t, tasks, setTasks, loading, setLoading, onToast, onOpenSection }) => {
  const [oneTask, setOneTask] = useState('');
  const [bulkText, setBulkText] = useState('');

  const handleCreateOne = async (e) => {
    e.preventDefault();
    const title = (oneTask || '').trim();
    if (!userId || !title) return;
    try {
      setLoading(true);
      const created = await tasksService.create({ usuario_id: userId, titulo: title });
      setTasks((cur) => [created, ...cur]);
      setOneTask('');
      onToast(t('createTaskOk'), 'success');
      socket.emit('tasks_updated', { user_id: userId });
    } catch {
      onToast(t('errorTasks'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkCreate = async () => {
    const lines = (bulkText || '').split('\n').map(s => s.trim()).filter(Boolean);
    if (!userId || lines.length === 0) return;
    try {
      setLoading(true);
      const { created } = await tasksService.bulkCreate({ usuario_id: userId, items: lines });
      setTasks((cur) => [...created, ...cur]);
      setBulkText('');
      onToast(t('createTasksOk'), 'success');
      socket.emit('tasks_updated', { user_id: userId });
    } catch {
      onToast(t('errorTasks'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="home-card home-card--white"
      style={{
        position: 'relative',
        // sin overlay ni efecto oscuro
        cursor: 'default'
      }}
    >
      <i className="fas fa-list-check card-icon"></i>

      <div className="card-footer">
        <h4>{t('quickTasksTitle')}</h4>
        <p style={{ color: 'var(--font-color-light)', marginTop: '6px' }}>
          {t('quickTasksSubtitle')}
        </p>
      </div>

      <div style={{ padding: '0 1rem 1rem 1rem' }}>
        {/* Crear 1 */}
        <form onSubmit={handleCreateOne} style={{ display: 'flex', gap: '.5rem', marginBottom: '.75rem' }}>
          <input
            type="text"
            placeholder="Ej: Hacer tarea de matemáticas"
            value={oneTask}
            onChange={(e) => setOneTask(e.target.value)}
            style={{
              flex: 1,
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '.6rem .75rem'
            }}
          />
          <button className="btn btn-success" type="submit" disabled={loading}>
            {loading ? t('creating') : `${t('addOne')} ➕`}
          </button>
        </form>

        {/* Crear en lote */}
        <div>
          <textarea
            placeholder={t('quickTasksPlaceholder')}
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            style={{
              width: '100%',
              minHeight: '90px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '.6rem .75rem',
              color: 'var(--font-color)'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '.5rem' }}>
            <button
              className="btn btn-primary"
              onClick={handleBulkCreate}
              disabled={loading || !bulkText.trim()}
              type="button"
            >
              {loading ? t('creating') : `${t('addTasks')} 📚`}
            </button>

            {/* Botón de accesibilidad: ir a pestaña de tareas */}
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => onOpenSection?.('tasks')}
              title="Ver todas las tareas"
            >
              Ver tareas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


/* ====== TARJETAS HOME (con RESÚMENES) + VENTAJAS (clickable a Lestat) + MI ÁREA ====== */
const HomePageCards = ({ onNavigate, t, tasks, groupedFiles, fileListHandlers, quickTasksProps }) => {
  const totalFiles = (groupedFiles.pending || []).length + (groupedFiles.in_process || []).length + (groupedFiles.done || []).length;

  const { completion, trend } = computeMiniAnalytics(tasks);
  const maxTrend = Math.max(1, ...trend);
  const spark = trend.map(v => ' ▂▃▄▅▆▇'[Math.min(6, Math.round((v/maxTrend)*6))]).join('');

  const pending = (groupedFiles.pending || []).length;
  const inproc = (groupedFiles.in_process || []).length;
  const done = (groupedFiles.done || []).length;

  return (
    <div className="home-hub">
      <h2>{t('welcomeTitle')}</h2>
      <p className="home-subtitle">{t('welcomeMessage')}</p>

     {/* Fila de tarjetas */}
    <div className="home-card-row">
  {/* Analítica */}
  <div
    className="home-card home-card--analytics"
    onClick={() => onNavigate('analytics')}
  >
    <i className="fas fa-chart-line card-icon"></i>
    <div className="card-overlay">
      <h3>✔️ {completion}% · {spark}</h3>
    </div>
    <div className="card-footer">
      <h4>{t('homeCardAnalyticsTitle')}</h4>
      <p style={{ marginTop: 6, opacity: .85 }}>Tendencia 7d y tasa de finalización</p>
    </div>
  </div>

  {/* Reportes */}
  <div
    className="home-card home-card--reports"
    onClick={() => onNavigate('reports')}
  >
    <i className="fas fa-file-alt card-icon"></i>
    <div className="card-overlay">
      <h3>⛔ {pending} · 📝 {inproc} · ✅ {done}</h3>
    </div>
    <div className="card-footer">
      <h4>{t('homeCardReportsTitle')}</h4>
      <p style={{ marginTop: 6, opacity: .85 }}>{totalFiles} archivos totales</p>
    </div>
  </div>


        {/* Tareas rápidas (abre pestaña de Tareas) */}
        <QuickTasksCard {...quickTasksProps} onOpenSection={(name)=>onNavigate(name)} />
      </div>

      {/* === VENTAJAS DEL FLUJO / WORKFLOW (CLICK -> Lestat) === */}
      <div
        className="advantages-section"
        onClick={() => onNavigate('workflow')}   // 👈 al clic, abre la vista Lestat
        style={{ cursor: 'pointer' }}
      >
        <div className="advantages-text">
          <h3>{t('advantagesTitle')}</h3>
          <p>{t('advantagesDesc')}</p>
        </div>
        <div className="advantages-image">
          <img
            src="https://placehold.co/600x400/2C2C2C/E0E0E0?text=Workflow"
            alt="Workflow Advantages"
          />
        </div>
      </div>

      {/* === MI ÁREA (como lo tenías) === */}
      <div className="mi-area-section">
        <h3 className="file-group-header">{t('myArea')}</h3>
        <FileListGroup title={t('pending')} files={groupedFiles.pending} {...fileListHandlers} />
        <FileListGroup title={t('in_process')} files={groupedFiles.in_process} {...fileListHandlers} />
        <FileListGroup title={t('done')} files={groupedFiles.done} {...fileListHandlers} />
        {totalFiles === 0 && (
          <div className="empty-state-small">
            <i className="fas fa-box-open" style={{ fontSize: '2rem', marginBottom: '1rem' }}></i>
            <p>{t('emptyFolderMessage')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

/* ======== HELPERS ARCHIVOS ======== */
const getFileIcon = (fileName) => {
  if (!fileName) return 'fas fa-file';
  const extension = fileName.split('.').pop().toLowerCase();
  switch (extension) {
    case 'pdf': return 'fas fa-file-pdf';
    case 'png': case 'jpg': case 'jpeg': return 'fas fa-file-image';
    case 'doc': case 'docx': return 'fas fa-file-word';
    case 'xls': case 'xlsx': return 'fas fa-file-excel';
    case 'ppt': case 'pptx': return 'fas fa-file-powerpoint';
    case 'zip': case 'rar': return 'fas fa-file-archive';
    case 'txt': return 'fas fa-file-alt';
    case 'mp3': case 'wav': return 'fas fa-file-audio';
    case 'mp4': case 'mov': return 'fas fa-file-video';
    default: return 'fas fa-file';
  }
};

const FileListGroup = ({
  title, files, onStatusChange, onNoteClick, editingFile, onUpdateFile, onSetEditingFile, onDeleteFile, t
}) => {
  if (!files || files.length === 0) return null;

  return (
    <div className="file-group-container">
      <h3 className="file-group-header">{title} ({files.length})</h3>
      <ul className="file-list">
        {files.map((file, index) => (
          <li key={file.id} className={`file-item status-${file.status || 'pending'}`} style={{ animationDelay: `${index * 30}ms` }}>
            {editingFile?.id === file.id ? (
              <form onSubmit={onUpdateFile} className="edit-form">
                <input
                  type="text"
                  value={editingFile.nombre_original}
                  onChange={(e) => onSetEditingFile({ ...editingFile, nombre_original: e.target.value })}
                  autoFocus
                />
                <button type="submit" title="Guardar">✔️</button>
                <button type="button" onClick={() => onSetEditingFile(null)} title="Cancelar">✖️</button>
              </form>
            ) : (
              <>
                <a
                  href={`${RENDER_BACKEND_URL}/${file.path_archivo?.replace(/\\/g, '/')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="item-name"
                >
                  <i className={getFileIcon(file.nombre_original)}></i>
                  <span>{file.nombre_original}</span>
                </a>

                {file.status === 'in_process' && file.nota && (
                  <div className="note-tooltip">
                    <i className="fas fa-info-circle"></i>
                    <div className="note-tooltip-text">{file.nota}</div>
                  </div>
                )}

                <div className="actions">
                  <button onClick={() => onSetEditingFile(file)} title={t('editTask')}>✏️</button>
                  <button onClick={() => onDeleteFile(file.id)} title={t('delete')}>🗑️</button>
                </div>

                <div className="file-status-actions">
                  <button className="status-btn pending" title="Poner Pendiente" onClick={() => onStatusChange(file, { status: 'pending', nota: '' })}>⛔</button>
                  <button className="status-btn in-process" title={file.nota ? 'Editar nota' : 'Agregar nota'} onClick={() => onNoteClick(file)}>📝</button>
                  <button className="status-btn done" title="Marcar Terminado" onClick={() => onStatusChange(file, { status: 'done' })}>✅</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

const UserSearchResults = ({ query, results, onOpenChat }) => (
  <div className="user-search-results">
    <div className="main-content-header">
      <h2>Resultados de Amigos para: "{query}"</h2>
    </div>
    <ul className="user-result-list">
      {results.length > 0 ? results.map(user => (
        <li className="user-result-item" key={user.id}>
          <img src={user.foto_perfil_url} alt={user.nombre} />
          <div className="user-info">
            <span className="user-name">{user.nombre}</span>
            <span className="user-email">{user.email}</span>
          </div>
          <button className="btn btn-primary" onClick={() => onOpenChat(user)}>
            <i className="fas fa-paper-plane"></i> Enviar Mensaje
          </button>
        </li>
      )) : (
        <div className="empty-state-small"><p>No se encontraron usuarios con ese nombre o correo.</p></div>
      )}
    </ul>
  </div>
);

const NotificationPanel = ({ notifications, onOpenChat, onClearNotifications }) => (
  <div className="notification-panel">
    <div className="notification-header">
      <h3>Notificaciones</h3>
      <button onClick={onClearNotifications}>Limpiar</button>
    </div>
    <div className="notification-list">
      {notifications.length === 0 ? (
        <div className="notification-empty">No tienes notificaciones nuevas.</div>
      ) : (
        notifications.map((noti, index) => (
          <div className="notification-item" key={index} onClick={() => onOpenChat(noti.sender)}>
            <img src={noti.sender.foto_perfil_url} alt={noti.sender.nombre} />
            <div className="notification-content">
              <strong>{noti.sender.nombre}</strong>
              <span>{noti.message?.contenido || 'Nuevo mensaje'}</span>
              {noti.count > 1 ? <span className="notification-count">({noti.count} nuevos)</span> : null}
            </div>
          </div>
        ))
      )}
    </div>
  </div>
);

/* ======================== DASHBOARD PAGE ======================== */
const DashboardPage = () => {
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [allFiles, setAllFiles] = useState([]);
  const [message, setMessage] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [newFolderRename, setNewFolderRename] = useState('');
  const [editingFile, setEditingFile] = useState(null);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [path, setPath] = useState([]);
  const [language, setLanguage] = useState('es');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFilter, setSearchFilter] = useState('users');
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [openChats, setOpenChats] = useState([]);
  const [modalState, setModalState] = useState({ isOpen: false });
  const [mainView, setMainView] = useState('home'); // home | tasks | analytics | reports | workflow | profile
  const [noteModalFile, setNoteModalFile] = useState(null);

  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [hasUnread, setHasUnread] = useState(false);

  // TAREAS
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  
  // 🟢 ESTADO DEL TOGGLE CHAT/GESIA
  const [chatTab, setChatTab] = useState('gesia');

  const { user } = useContext(UserContext);

  const t = (key, params = {}) => {
    let text = translations[language][key] || translations['es'][key] || key;
    if (text) Object.keys(params).forEach(k => { text = text.replace(`{${k}}`, params[k]); });
    return text;
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  /* -------------------- NOTIFICACIONES -------------------- */
  useEffect(() => {
    if (!user?.id) return;
    try {
      const raw = window.localStorage.getItem(`gestoria:notifications:${user.id}`);
      const local = raw ? JSON.parse(raw) : [];
      setNotifications(local);
      setHasUnread(local.length > 0);
    } catch { /* ignore */ }

    (async () => {
      try {
        const summary = await notificationService.getUnreadSummary(user.id);
        const fromBackend = (summary || []).map(row => ({
          sender: { id: row.sender_id, nombre: row.nombre || `Usuario ${row.sender_id}`, foto_perfil_url: row.foto_perfil_url || 'https://placehold.co/50x50/E0E0E0/121212?text=?' },
          message: { contenido: row.last_message, created_at: row.last_created_at },
          count: row.unread_count
        }));
        const map = new Map();
        const addAll = (arr) => arr.forEach(n => {
          const id = n.sender.id;
          if (!map.has(id)) map.set(id, n);
          else {
            const cur = map.get(id);
            map.set(id, { ...cur, count: (cur.count || 0) + (n.count || 1), message: n.message || cur.message });
          }
        });
        addAll(fromBackend);
        const merged = Array.from(map.values());
        setNotifications(merged);
        setHasUnread(merged.length > 0);
        window.localStorage.setItem(`gestoria:notifications:${user.id}`, JSON.stringify(merged));
      } catch { /* ignore */ }
    })();
  }, [user?.id]);

  /* ------------------------------ EFECTOS ----------------------------- */
  useEffect(() => {
    if (user) {
      // 🟢 SIEMPRE CARGAR LA RAIZ PARA EL SIDEBAR
      loadFolders(null);
      
      if (currentFolder) {
         loadFiles(currentFolder.id);
      } else {
         loadAllUserFiles();
         tasksService.listByUser(user.id, { limit: 50 }).then(setTasks).catch(()=>{});
      }
    }
  }, [user, currentFolder]);

  useEffect(() => {
    if (searchFilter === 'users' && searchTerm.trim() !== '') {
      const searchUsers = async () => {
        try { const response = await userService.search(searchTerm); setUserSearchResults(response.data); }
        catch { setUserSearchResults([]); }
      };
      const timer = setTimeout(searchUsers, 300);
      return () => clearTimeout(timer);
    } else {
      setUserSearchResults([]);
    }
  }, [searchTerm, searchFilter]);

  useEffect(() => {
    if (!user?.id) return;
    socket.emit('join_room', user.id);

    const fileListener = () => { currentFolder ? loadFiles(currentFolder.id) : loadAllUserFiles(); };
    const folderListener = () => loadFolders(null); // 🟢 Siempre refrescar root
    const tasksListener = async () => {
      try { const data = await tasksService.listByUser(user.id, { limit: 50 }); setTasks(data); }
      catch { /* ignore */ }
    };

    const notificationListener = (data) => {
      const senderId = data.sender?.id ?? data.sender_id;
      if (!user?.id || senderId === user.id) return;
      const nombre = data.sender?.nombre || `Usuario ${senderId}`;
      const foto = data.sender?.foto_perfil_url || 'https://placehold.co/50x50/E0E0E0/121212?text=?';
      const lastMessage = {
        contenido: data.message?.contenido ?? data.contenido ?? '',
        created_at: data.message?.created_at ?? new Date().toISOString()
      };
      setNotifications(prev => {
        const arr = [
          { sender: { id: senderId, nombre, foto_perfil_url: foto }, message: lastMessage, count: 1 },
          ...prev
        ];
        window.localStorage.setItem(`gestoria:notifications:${user.id}`, JSON.stringify(arr));
        return arr;
      });
      setHasUnread(true);
    };

    socket.on('files_updated', fileListener);
    socket.on('folders_updated', folderListener);
    socket.on('tasks_updated', tasksListener);
    socket.on('new_notification', notificationListener);
    return () => {
      socket.off('files_updated', fileListener);
      socket.off('folders_updated', folderListener);
      socket.off('tasks_updated', tasksListener);
      socket.off('new_notification', notificationListener);
    };
  }, [user?.id, currentFolder]);

  useEffect(() => {
    const fetchTasks = async () => {
      if (!user?.id) return;
      try { setTasksLoading(true); const data = await tasksService.listByUser(user.id, { limit: 50 }); setTasks(data); }
      catch { showMessage(translations.es.errorTasks, 'error'); }
      finally { setTasksLoading(false); }
    };
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, language]);

  /* ------------------------------ LOADERS ----------------------------- */
  const loadFolders = async (parentId) => {
    try { const response = await folderService.getFolders(parentId); setFolders(response.data); }
    catch { showMessage(translations.es.errorLoadFolders, 'error'); }
  };
  const loadFiles = async (folderId) => {
    try { const response = await fileService.getFilesByFolder(folderId); setFiles(response.data); }
    catch { showMessage(translations.es.errorLoadFiles, 'error'); }
  };
  const loadAllUserFiles = async () => {
    try { const response = await fileService.getAllFiles(); setAllFiles(response.data); }
    catch { showMessage(translations.es.errorLoadFiles, 'error'); }
  };

  /* ------------------------------ HANDLERS ----------------------------- */
  const handleFolderClick = (folder) => {
    setPath(prev => [...prev, currentFolder].filter(Boolean));
    setCurrentFolder(folder);
    setMainView('home');
    setSearchTerm('');
  };
  const handleGoBack = () => {
    const newPath = [...path]; const parent = newPath.pop();
    setPath(newPath); setCurrentFolder(parent || null); setSearchTerm('');
    if (!parent) setMainView('home');
  };
  const handleCrumbClick = (folder, index) => {
    setSearchTerm('');
    if (folder === null) { setPath([]); setCurrentFolder(null); setMainView('home'); }
    else { const newPath = path.slice(0, index); setPath(newPath); setCurrentFolder(folder); }
  };
  
  // 🟢 FUNCIÓN DE VOZ CORREGIDA (PLURAL/SINGULAR)
  const handleVoiceFolderOpen = (folderName) => {
    if (!folderName) return;
    const cleanTarget = folderName.replace(/['".,]/g, '').trim().toLowerCase();
    const cleanTargetSingular = cleanTarget.endsWith('s') ? cleanTarget.slice(0, -1) : cleanTarget;

    // Buscamos en la lista de carpetas (que ahora siempre está cargada)
    const target = folders.find(f => {
       const fName = f.nombre.toLowerCase().trim();
       const fNameSingular = fName.endsWith('s') ? fName.slice(0, -1) : fName;
       return fName === cleanTarget || fName === cleanTargetSingular || cleanTarget.includes(fName) || fName.includes(cleanTarget);
    });

    if (target) {
        showMessage(`📂 Voz: Abriendo "${target.nombre}"...`, 'success');
        handleFolderClick(target); 
    } else {
        showMessage(`⚠️ No veo la carpeta "${cleanTarget}" aquí.`, 'error');
    }
  };

  const handleOpenChat = async (userToChat) => {
    if (!openChats.find(c => c.id === userToChat.id)) setOpenChats(prev => [userToChat, ...prev.slice(0,2)]);
    try { if (user?.id) await notificationService.markFromSender(user.id, userToChat.id); } catch {}
    setNotifications(prev => {
      const filtered = prev.filter(n => n.sender.id !== userToChat.id);
      window.localStorage.setItem(`gestoria:notifications:${user?.id}`, JSON.stringify(filtered));
      setHasUnread(filtered.length > 0);
      return filtered;
    });
  };
  const toggleNotificationPanel = () => setIsNotificationOpen(prev => !prev);
  const handleClearNotifications = async () => {
    try { if (user?.id) await notificationService.markAllRead(user.id); } catch {}
    window.localStorage.setItem(`gestoria:notifications:${user?.id}`, JSON.stringify([]));
    setNotifications([]); setHasUnread(false);
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault(); if (!newFolderName.trim()) return;
    try { 
      await folderService.createFolder(newFolderName, currentFolder?.id); 
      setNewFolderName(''); 
      loadFolders(null); // 🟢 Recargamos raíz para que aparezca en sidebar
      setMessage({ text: translations.es.folderCreated, type:'success' }); 
    } catch { setMessage({ text: translations.es.errorCreateFolder, type:'error' }); }
  };
  const handleStartFolderRename = (folder) => { setEditingFolder(folder); setNewFolderRename(folder.nombre); };
  const handleUpdateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderRename.trim() || !editingFolder || newFolderRename.trim() === editingFolder.nombre) { setEditingFolder(null); return; }
    try { await folderService.updateFolder(editingFolder.id, newFolderRename); setEditingFolder(null); setNewFolderRename(''); loadFolders(null); setMessage({ text: translations.es.folderUpdated, type:'success' }); } 
    catch { setMessage({ text: translations.es.errorUpdateFolder, type:'error' }); }
  };
  const handleDeleteFolder = (folderId) => setModalState({ isOpen: true, title: translations.es.deleteFolderTitle, message: translations.es.confirmDeleteFolder, onConfirm: () => confirmDeleteFolder(folderId) });
  const confirmDeleteFolder = async (folderId) => {
    try { await folderService.deleteFolder(folderId); loadFolders(null); setMessage({ text: translations.es.folderDeleted, type:'success' }); }
    catch { setMessage({ text: translations.es.errorDeleteFolder, type:'error' }); }
    setModalState({ isOpen:false });
  };

  const handleFileChange = (e) => setSelectedFile(e.target.files[0]);
  const handleUploadFile = async (e) => {
    e.preventDefault();
    if (!selectedFile || !currentFolder) { setMessage({ text: translations.es.selectFile, type:'error' }); return; }
    setUploading(true); setMessage({ text: translations.es.uploading, type:'info' });
    try {
      await fileService.uploadFile(currentFolder.id, selectedFile);
      setSelectedFile(null); const input = document.getElementById('fileInput'); if (input) input.value='';
      loadFiles(currentFolder.id); setMessage({ text: translations.es.fileUploaded, type:'success' });
    } catch (error) { setMessage({ text: error.response?.data?.message || translations.es.errorUploadFile, type:'error' }); }
    finally { setUploading(false); }
  };
  const handleUpdateFile = async (e) => {
    e.preventDefault();
    if (!editingFile) return;
    try {
      await fileService.updateFile(editingFile.id, editingFile.nombre_original);
      setEditingFile(null);
      currentFolder ? loadFiles(currentFolder.id) : loadAllUserFiles();
      setMessage({ text: translations.es.fileUpdated, type:'success' });
    } catch { setMessage({ text: translations.es.errorUpdateFolder, type:'error' }); }
  };
  const handleDeleteFile = (fileId) => setModalState({ isOpen:true, title: translations.es.deleteFileTitle, message: translations.es.confirmDeleteFile, onConfirm: () => confirmDeleteFile(fileId) });
  const confirmDeleteFile = async (fileId) => {
    try { await fileService.deleteFile(fileId); currentFolder ? loadFiles(currentFolder.id) : loadAllUserFiles(); setMessage({ text: translations.es.fileDeleted, type:'success' }); }
    catch { setMessage({ text: translations.es.errorDeleteFile, type:'error' }); }
    setModalState({ isOpen:false });
  };
  const handleUpdateFileDetails = async (file, details) => {
    try {
      const { data: updatedFile } = await fileService.updateFileDetails(file.id, details);
      setFiles((cur) => cur.map((f) => (f.id === updatedFile.id ? updatedFile : f)));
      setAllFiles((cur) => cur.map((f) => (f.id === updatedFile.id ? updatedFile : f)));
    } catch { setMessage({ text: translations.es.errorUpdateFolder, type:'error' }); }
  };
  const handleSaveNote = (file, noteText) => handleUpdateFileDetails(file, { status:'in_process', nota: noteText });

  /* ------------------- FILTROS ------------------- */
  const filteredFiles = useMemo(() => {
    const sourceFiles = currentFolder ? files : allFiles;
    if (searchFilter !== 'files' || !searchTerm) return sourceFiles;
    return sourceFiles.filter(f => f.nombre_original?.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [files, allFiles, searchTerm, currentFolder, searchFilter]);

  const filteredFolders = useMemo(() => {
    if (searchFilter === 'users') return folders;
    if (!searchTerm) return folders;
    return folders.filter(folder => folder.nombre?.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [folders, searchTerm, searchFilter]);

  const groupedFiles = useMemo(() => {
    const pending = [], in_process = [], done = [];
    filteredFiles.forEach((f) => {
      if (f.status === 'done') done.push(f);
      else if (f.status === 'in_process') in_process.push(f);
      else pending.push(f);
    });
    return { pending, in_process, done };
  }, [filteredFiles]);

  const globalGroupedFiles = useMemo(() => {
    const pending = [], in_process = [], done = [];
    const filesToGroup = (searchFilter === 'files' && searchTerm) ? allFiles.filter((file) => file.nombre_original?.toLowerCase().includes(searchTerm.toLowerCase())) : allFiles;
    filesToGroup.forEach((f) => {
      if (f.status === 'done') done.push(f);
      else if (f.status === 'in_process') in_process.push(f);
      else pending.push(f);
    });
    return { pending, in_process, done };
  }, [allFiles, searchTerm, searchFilter]);

  const fileListHandlers = { onStatusChange: handleUpdateFileDetails, onNoteClick: setNoteModalFile, editingFile, onUpdateFile: handleUpdateFile, onSetEditingFile: setEditingFile, onDeleteFile: handleDeleteFile, t: (k,p)=>t(k,p) };

  const quickTasksProps = {
    userId: user?.id,
    t: (k)=>t(k),
    tasks, setTasks,
    loading: tasksLoading, setLoading: setTasksLoading,
    onToast: showMessage
  };

  /* --------------------------- RENDER -------------------------- */
  return (
    <div className="dashboard-layout">
      {message && (
        <div className={`toast-message ${message.type || 'info'}`}>
          <i className={message.type === 'success' ? 'fas fa-check-circle' : message.type === 'error' ? 'fas fa-exclamation-circle' : 'fas fa-info-circle'}></i>
          {message.text}
        </div>
      )}

      <ConfirmModal isOpen={modalState.isOpen} title={modalState.title} message={modalState.message} onConfirm={modalState.onConfirm} onClose={() => setModalState({ isOpen:false })} t={(k)=>t(k)} />
      {noteModalFile && <NoteModal file={noteModalFile} onClose={() => setNoteModalFile(null)} onSave={handleSaveNote} t={(k)=>t(k)} />}

      <DashboardNavbar user={user} language={language} setLanguage={setLanguage} t={(k)=>t(k)} searchTerm={searchTerm} setSearchTerm={setSearchTerm} searchFilter={searchFilter} setSearchFilter={setSearchFilter} hasUnread={hasUnread} onToggleNotificationPanel={toggleNotificationPanel} onOpenProfile={() => setMainView('profile')} />

      <div className="dashboard-body">
        {/* Sidebar carpetas - 🟢 SIEMPRE MUESTRA RAÍZ */}
        <div className="sidebar">
          <h3>{t('myFolders')}</h3>
          {path.length > 0 && (
            <button onClick={handleGoBack} className="back-button">
              <i className="fas fa-arrow-left"></i> {t('goBackTo')} {path[path.length - 1]?.nombre || t('root')}
            </button>
          )}
          <form onSubmit={handleCreateFolder} className="folder-form">
            <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder={t('newFolderPlaceholder')} />
            <button type="submit" disabled={!newFolderName.trim()}><i className="fas fa-plus"></i></button>
          </form>

          <ul className="folder-list">
            {filteredFolders.map((folder, index) => (
              <li key={folder.id} className={currentFolder?.id === folder.id ? 'active' : ''} style={{ animationDelay: `${index * 30}ms` }}>
                {editingFolder?.id === folder.id ? (
                  <form onSubmit={handleUpdateFolder} className="edit-form-folder">
                    <input type="text" value={newFolderRename} onChange={(e) => setNewFolderRename(e.target.value)} autoFocus />
                    <button type="submit" title={t('rename')}>✔️</button>
                    <button type="button" onClick={() => setEditingFolder(null)} title={t('cancel')}>✖️</button>
                  </form>
                ) : (
                  <span className="item-name" onClick={() => handleFolderClick(folder)}>
                    <i className="fas fa-folder"></i> {folder.nombre}
                  </span>
                )}
                <div className="actions">
                  <button onClick={() => handleStartFolderRename(folder)} title={t('rename')}>✏️</button>
                  <button onClick={() => handleDeleteFolder(folder.id)} title={t('delete')}>🗑️</button>
                </div>
              </li>
            ))}
            {folders.length > 0 && filteredFolders.length === 0 && <div className="empty-state-small"><p>{t('noFoldersFound')}</p></div>}
          </ul>
        </div>

        {/* Contenido principal */}
        <div className="main-content">
          {(searchFilter === 'users' && searchTerm) ? (
            <UserSearchResults query={searchTerm} results={userSearchResults} onOpenChat={handleOpenChat} />
          ) : (
            <>
              {currentFolder ? (
                <>
                  <div className="main-content-header">
                    <h2><i className="fas fa-folder-open"></i> {currentFolder.nombre}</h2>
                    <Breadcrumbs path={path} currentFolder={currentFolder} onCrumbClick={handleCrumbClick} t={(k)=>t(k)} />
                  </div>

                  <form onSubmit={handleUploadFile} className="upload-form">
                    <label htmlFor="fileInput" className="custom-file-upload">
                      <i className="fas fa-cloud-upload-alt"></i> {selectedFile ? selectedFile.name : t('selectFile')}
                    </label>
                    <input type="file" id="fileInput" onChange={handleFileChange} />
                    <button type="submit" disabled={!selectedFile || uploading} className="btn btn-success">{uploading ? t('uploading') : t('uploadFile')}</button>
                  </form>

                  <FileListGroup title={t('pending')} files={groupedFiles.pending} {...fileListHandlers} />
                  <FileListGroup title={t('in_process')} files={groupedFiles.in_process} {...fileListHandlers} />
                  <FileListGroup title={t('done')} files={groupedFiles.done} {...fileListHandlers} />

                  {files.length === 0 && !uploading && !searchTerm && (
                    <div className="empty-state">
                      <i className="fas fa-box-open"></i><h3>{t('emptyFolderTitle')}</h3><p>{t('emptyFolderMessage')}</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {mainView === 'home' ? (
                    <HomePageCards onNavigate={setMainView} t={(k)=>t(k)} tasks={tasks} groupedFiles={globalGroupedFiles} fileListHandlers={fileListHandlers} quickTasksProps={quickTasksProps} />
                  ) : mainView === 'tasks' ? (
                    <div className="apartado-view">
                      <nav className="breadcrumbs apartado-breadcrumbs"><span className="crumb" onClick={()=>setMainView('home')}><i className="fas fa-home"></i> {t('root')}</span><span className="separator">&gt;</span><span className="crumb">{t('tasks')}</span></nav>
                      <div className="apartado-content">
                        <h2>{t('tasks')}</h2>
                        <h3 className="file-group-header">{t('tasks_pending_title')}</h3>
                        <QuickTasksContent t={(k)=>t(k)} tasks={(tasks||[]).filter(x => (x.status||'pending')==='pending')} editingId={editingId} editingTitle={editingTitle} setEditingId={setEditingId} setEditingTitle={setEditingTitle} onStartEdit={(task)=>{ setEditingId(task.id); setEditingTitle(task.titulo); }} onSaveEdit={async (e)=>{ e.preventDefault(); if (!editingId) return; try { const updated = await tasksService.update(editingId, { titulo: editingTitle }); setTasks(cur => cur.map(tk => tk.id===updated.id?updated:tk)); setEditingId(null); setEditingTitle(''); socket.emit('tasks_updated',{user_id:user?.id}); } catch {} }} onDelete={async (id)=>{ try { await tasksService.remove(id); setTasks(cur => cur.filter(tk=>tk.id!==id)); socket.emit('tasks_updated',{user_id:user?.id}); } catch {} }} onSetStatus={async (task, status)=>{ try { const updated = await tasksService.update(task.id, { status }); setTasks(cur => cur.map(tk => tk.id===updated.id?updated:tk)); socket.emit('tasks_updated',{user_id:user?.id}); } catch {} }} />
                        <h3 className="file-group-header" style={{ marginTop:'1rem' }}>{t('tasks_in_process_title')}</h3>
                        <QuickTasksContent t={(k)=>t(k)} tasks={(tasks||[]).filter(x => x.status==='in_process')} editingId={editingId} editingTitle={editingTitle} setEditingId={setEditingId} setEditingTitle={setEditingTitle} onStartEdit={(task)=>{ setEditingId(task.id); setEditingTitle(task.titulo); }} onSaveEdit={async (e)=>{ e.preventDefault(); if (!editingId) return; try { const updated = await tasksService.update(editingId, { titulo: editingTitle }); setTasks(cur => cur.map(tk => tk.id===updated.id?updated:tk)); setEditingId(null); setEditingTitle(''); socket.emit('tasks_updated',{user_id:user?.id}); } catch {} }} onDelete={async (id)=>{ try { await tasksService.remove(id); setTasks(cur => cur.filter(tk=>tk.id!==id)); socket.emit('tasks_updated',{user_id:user?.id}); } catch {} }} onSetStatus={async (task, status)=>{ try { const updated = await tasksService.update(task.id, { status }); setTasks(cur => cur.map(tk => tk.id===updated.id?updated:tk)); socket.emit('tasks_updated',{user_id:user?.id}); } catch {} }} />
                        <h3 className="file-group-header" style={{ marginTop:'1rem' }}>{t('tasks_done_title')}</h3>
                        <QuickTasksContent t={(k)=>t(k)} tasks={(tasks||[]).filter(x => x.status==='done')} editingId={editingId} editingTitle={editingTitle} setEditingId={setEditingId} setEditingTitle={setEditingTitle} onStartEdit={(task)=>{ setEditingId(task.id); setEditingTitle(task.titulo); }} onSaveEdit={async (e)=>{ e.preventDefault(); if (!editingId) return; try { const updated = await tasksService.update(editingId, { titulo: editingTitle }); setTasks(cur => cur.map(tk => tk.id===updated.id?updated:tk)); setEditingId(null); setEditingTitle(''); socket.emit('tasks_updated',{user_id:user?.id}); } catch {} }} onDelete={async (id)=>{ try { await tasksService.remove(id); setTasks(cur => cur.filter(tk=>tk.id!==id)); socket.emit('tasks_updated',{user_id:user?.id}); } catch {} }} onSetStatus={async (task, status)=>{ try { const updated = await tasksService.update(task.id, { status }); setTasks(cur => cur.map(tk => tk.id===updated.id?updated:tk)); socket.emit('tasks_updated',{user_id:user?.id}); } catch {} }} />
                      </div>
                    </div>
                  ) : mainView === 'analytics' ? (
                    <AnalyticsView onGoHome={() => setMainView('home')} t={(k)=>t(k)} tasks={tasks} files={allFiles} />
                  ) : mainView === 'reports' ? (
                    <ReportsView onGoHome={() => setMainView('home')} t={(k)=>t(k)} tasks={tasks} files={allFiles} folders={folders} />
                  ) : mainView === 'workflow' ? (
                    <div className="apartado-view">
                      <nav className="breadcrumbs apartado-breadcrumbs"><span className="crumb" onClick={()=>setMainView('home')}><i className="fas fa-home"></i> {t('root')}</span><span className="separator">&gt;</span><span className="crumb">{t('advantagesTitle')}</span></nav>
                      <div className="apartado-content"><Lestat t={t} /></div>
                    </div>
                  ) : mainView === 'profile' ? (
                    <Perfil t={(k)=>t(k)} user={user} onGoHome={() => setMainView('home')} />
                  ) : null}
                </>
              )}
            </>
          )}
        </div>

       {/* 🟢 CHAT SIDEBAR: LÓGICA CENTRALIZADA EN EL DASHBOARD 🟢 */}
<div className="chat-sidebar">
  {/* Usamos la clase 'chat-container' para aprovechar tus estilos existentes */}
  <div className="chat-container" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
    
    {/* HEADER DE PESTAÑAS (Controlado por Dashboard) */}
    <div className="chat-header">
      <button 
        className={`tab-button ${chatTab === 'chat' ? 'active' : ''}`} 
        onClick={() => setChatTab('chat')}
      >
        Chat AI
      </button>
      <button 
        className={`tab-button ${chatTab === 'gesia' ? 'active' : ''}`} 
        onClick={() => setChatTab('gesia')}
      >
        Gesia AI
      </button>
    </div>

    {/* CUERPO: Renderizado Condicional */}
    <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
      {chatTab === 'chat' ? (
        <ChatComponent 
          onReloadFolders={() => loadFolders(null)}
          onReloadFiles={() => { currentFolder ? loadFiles(currentFolder.id) : loadAllUserFiles(); }}
        />
      ) : (
        <div className="panel gesia-panel" style={{ height: '100%' }}>
          <Gesia 
            onReloadFolders={() => loadFolders(null)}
            onReloadFiles={() => { currentFolder ? loadFiles(currentFolder.id) : loadAllUserFiles(); }}
            onOpenFolder={handleVoiceFolderOpen}
          />
        </div>
      )}
    </div>

  </div>
</div>

      </div>

      {isNotificationOpen && (
        <NotificationPanel
          notifications={notifications}
          onOpenChat={handleOpenChat}
          onClearNotifications={handleClearNotifications}
        />
      )}

      <div className="chat-dock-container">
        {openChats.map(chatUser => (
          <UserChatWindow 
            key={chatUser.id}
            friend={chatUser}
            onClose={() => setOpenChats(chats => chats.filter(c => c.id !== chatUser.id))}
          />
        ))}
      </div>
    </div>
  );
};

export default DashboardPage;