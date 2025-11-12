/* eslint-disable react/prop-types */
import React from 'react';

/**
 * Lista de tareas en Grid:
 * - 3 columnas: [titulo 1fr] [acciones auto] [semáforo auto]
 * - Ancho 100% uniforme por fila
 * - Wrap natural del texto (sin cortar letra x letra)
 *
 * Props:
 *  - showHeader?: boolean  (opcional; por defecto false)
 *  - headerLabel?: string  (si showHeader = true, texto del encabezado)
 */
const QuickTasksContent = ({
  t,
  tasks,
  editingId,
  editingTitle,
  setEditingId,
  setEditingTitle,
  onStartEdit,
  onSaveEdit,
  onDelete,
  onSetStatus,
  showHeader = false,
  headerLabel = null,
}) => {
  return (
    <div>
      {showHeader && (
        <h5 style={{ margin: '6px 0 8px', color: 'var(--font-color)' }}>
          {headerLabel || t('tasks')}
        </h5>
      )}

      {!tasks || tasks.length === 0 ? (
        <div className="empty-state-small">{t('emptyTasks')}</div>
      ) : (
        <ul
          className="file-list list-view"
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '.35rem',
            width: '100%',
          }}
        >
          {tasks.map((task) => (
            <li
              key={task.id}
              className={`file-item status-${task.status || 'pending'}`}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '.6rem .75rem',
                display: 'grid',
                gridTemplateColumns: '1fr auto auto', // título | acciones | semáforo
                alignItems: 'center',
                gap: '.5rem',
              }}
            >
              {/* Columna 1: Título / Edición */}
              <div
                style={{
                  minWidth: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '.5rem',
                }}
              >
                <i className="fas fa-check-square" />
                {editingId === task.id ? (
                  <form
                    onSubmit={onSaveEdit}
                    className="edit-form"
                    style={{ margin: 0, width: '100%', display: 'flex', gap: '.35rem' }}
                  >
                    <input
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      autoFocus
                      style={{ width: '100%' }}
                    />
                    <button type="submit" title="Guardar">✔️</button>
                    <button type="button" onClick={() => setEditingId(null)} title="Cancelar">✖️</button>
                  </form>
                ) : (
                  <span
                    style={{
                      display: 'inline-block',
                      minWidth: 0,
                      whiteSpace: 'normal',
                      wordBreak: 'normal',
                      overflowWrap: 'break-word',
                      lineHeight: 1.3,
                    }}
                  >
                    {task.titulo}
                  </span>
                )}
              </div>

              {/* Columna 2: Acciones (editar / eliminar) */}
              <div
                className="actions"
                style={{ display: 'flex', gap: '.35rem', justifyContent: 'flex-end' }}
              >
                {editingId !== task.id && (
                  <>
                    <button onClick={() => onStartEdit(task)} title={t('editTask')}>✏️</button>
                    <button onClick={() => onDelete(task.id)} title={t('deleteTask')}>🗑️</button>
                  </>
                )}
              </div>

              {/* Columna 3: Semaforización */}
              <div
                className="file-status-actions"
                style={{ display: 'flex', gap: '.25rem', justifyContent: 'flex-end' }}
              >
                <button
                  className="status-btn pending"
                  title={t('markPending')}
                  onClick={() => onSetStatus(task, 'pending')}
                >
                  ⛔
                </button>
                <button
                  className="status-btn in-process"
                  title={t('markInProcess')}
                  onClick={() => onSetStatus(task, 'in_process')}
                >
                  📝
                </button>
                <button
                  className="status-btn done"
                  title={t('markDone')}
                  onClick={() => onSetStatus(task, 'done')}
                >
                  ✅
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default QuickTasksContent;
