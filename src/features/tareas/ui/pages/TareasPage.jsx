import React, { useState, useEffect, useCallback } from 'react';
import { ModalPortal, deferClose } from '../../../../shared/ui/components/ModalPortal.jsx';
import {
  getTareas,
  getMisTareas,
  createTarea,
  updateTarea,
  deleteTarea,
  getTareasStats,
  getUsers,
} from '../../application/tareasService';
import { confirmDialog } from '../../../../shared/ui/components/ConfirmModal';
import { notifyNotificationsUpdated } from '../../../notificaciones/application/notificationsService';
import './TareasPage.css';

const PRIORIDAD_CONFIG = {
  alta:  { label: 'Alta',  class: 'prioridad-alta' },
  media: { label: 'Media', class: 'prioridad-media' },
  baja:  { label: 'Baja',  class: 'prioridad-baja' },
};

const ESTADO_CONFIG = {
  pendiente:   { label: 'Generada',    class: 'estado-pendiente' },
  en_progreso: { label: 'En Proceso',  class: 'estado-progreso' },
  completada:  { label: 'Finalizada',  class: 'estado-completada' },
  cancelada:   { label: 'Cancelada',   class: 'estado-cancelada' },
};

export default function TareasPage() {
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = storedUser?.permissions?.includes('gestion_tareas') ||
    ['admin', 'administrador'].includes((storedUser?.rol || '').toLowerCase());

  // ── State ──────────────────────────────────────────────────────────────────
  const [tareas, setTareas] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroPrioridad, setFiltroPrioridad] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingTarea, setEditingTarea] = useState(null);

  // Form state
  const [formTitulo, setFormTitulo] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formPrioridad, setFormPrioridad] = useState('media');
  const [formFechaLimite, setFormFechaLimite] = useState('');
  const [formAsignados, setFormAsignados] = useState([]);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Search state inside assignee list
  const [searchUserQuery, setSearchUserQuery] = useState('');

  const [activeTab, setActiveTab] = useState(isAdmin ? 'todas' : 'mis-tareas');

  const LIMIT = 10;

  // ── Fetch Data ─────────────────────────────────────────────────────────────
  const fetchTareas = useCallback(async () => {
    setLoading(true);
    try {
      const filters = { page, limit: LIMIT };
      
      if (filtroEstado) {
        filters.estado = filtroEstado;
      } else {
        if (activeTab === 'historial') {
          filters.estado = 'history';
        } else {
          filters.estado = 'active';
        }
      }

      if (filtroPrioridad) filters.prioridad = filtroPrioridad;

      let data;
      if (activeTab === 'todas' && isAdmin) {
        if (searchQuery) filters.search = searchQuery;
        data = await getTareas(filters);
      } else if (activeTab === 'mis-tareas') {
        data = await getMisTareas(filters);
      } else if (activeTab === 'historial') {
        if (isAdmin) {
          if (searchQuery) filters.search = searchQuery;
          data = await getTareas(filters);
        } else {
          data = await getMisTareas(filters);
        }
      }
      setTareas(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Error loading tareas:', err);
    } finally {
      setLoading(false);
    }
  }, [page, filtroEstado, filtroPrioridad, searchQuery, activeTab, isAdmin]);

  const fetchStats = useCallback(async () => {
    try {
      const userId = (activeTab === 'mis-tareas' || (activeTab === 'historial' && !isAdmin)) ? storedUser.id : undefined;
      const data = await getTareasStats(userId);
      setStats(data);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  }, [activeTab, storedUser.id, isAdmin]);

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const data = await getUsers();
      setUsers(data || []);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  }, [isAdmin]);

  useEffect(() => { fetchTareas(); }, [fetchTareas]);
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // ── Modal Handlers ─────────────────────────────────────────────────────────
  const openCreateModal = () => {
    setEditingTarea(null);
    setFormTitulo('');
    setFormDescripcion('');
    setFormPrioridad('media');
    setFormFechaLimite('');
    setFormAsignados([]);
    setFormError('');
    setSearchUserQuery('');
    setShowModal(true);
  };

  const openEditModal = (tarea) => {
    setEditingTarea(tarea);
    setFormTitulo(tarea.titulo);
    setFormDescripcion(tarea.descripcion || '');
    setFormPrioridad(tarea.prioridad);
    setFormFechaLimite(tarea.fechaLimite ? tarea.fechaLimite.split('T')[0] : '');
    setFormAsignados(tarea.asignaciones?.map(a => a.userId) || []);
    setFormError('');
    setSearchUserQuery('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formTitulo.trim()) {
      setFormError('El título es requerido.');
      return;
    }
    if (formAsignados.length === 0) {
      setFormError('Debes asignar al menos un usuario.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        titulo: formTitulo.trim(),
        descripcion: formDescripcion.trim() || undefined,
        prioridad: formPrioridad,
        fechaLimite: formFechaLimite || null,
        asignadoA: formAsignados,
      };

      if (editingTarea) {
        await updateTarea(editingTarea.id, payload);
      } else {
        await createTarea(payload);
      }
      setShowModal(false);
      fetchTareas();
      fetchStats();
      notifyNotificationsUpdated();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (tarea, newEstado) => {
    if (newEstado === 'en_progreso') {
      const confirmed = await confirmDialog(
        'Iniciar Tarea',
        `¿Estás seguro de iniciar la tarea "${tarea.titulo}"?`,
        {
          type: 'info',
          confirmLabel: 'Iniciar',
          cancelLabel: 'Cancelar',
        }
      );
      if (!confirmed) return;
    } else if (newEstado === 'completada') {
      const confirmed = await confirmDialog(
        'Finalizar Tarea',
        `¿Estás seguro de finalizar la tarea "${tarea.titulo}"?`,
        {
          type: 'warning',
          confirmLabel: 'Finalizar',
          cancelLabel: 'Cancelar',
        }
      );
      if (!confirmed) return;
    }

    try {
      await updateTarea(tarea.id, { estado: newEstado });
      fetchTareas();
      fetchStats();
      notifyNotificationsUpdated();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (tarea) => {
    const confirmed = await confirmDialog(
      'Eliminar Tarea',
      `¿Eliminar la tarea "${tarea.titulo}"?`,
      {
        type: 'danger',
        confirmLabel: 'Eliminar',
        cancelLabel: 'Cancelar',
      }
    );
    if (!confirmed) return;
    try {
      await deleteTarea(tarea.id);
      fetchTareas();
      fetchStats();
    } catch (err) {
      alert(err.message);
    }
  };

  const toggleAsignado = (userId) => {
    setFormAsignados(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const totalPages = Math.ceil(total / LIMIT);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-EC', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  const isOverdue = (tarea) => {
    if (!tarea.fechaLimite || tarea.estado === 'completada' || tarea.estado === 'cancelada') return false;
    return new Date(tarea.fechaLimite) < new Date();
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="tareas-page">
      {/* Header */}
      <div className="tareas-header">
        <div className="tareas-header-info">
          <h1>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="tareas-title-icon">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
            </svg>
            Tareas
          </h1>
          <p className="tareas-subtitle">
            {isAdmin ? 'Gestiona y asigna tareas al equipo' : 'Revisa y gestiona tus tareas asignadas'}
          </p>
        </div>
        {isAdmin && (
          <button className="tareas-btn-primary" onClick={openCreateModal}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nueva Tarea
          </button>
        )}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="tareas-stats-grid">
          <div className="tareas-stat-card stat-total">
            <div className="stat-number">{stats.total}</div>
            <div className="stat-label">Total</div>
          </div>
          <div className="tareas-stat-card stat-pendiente">
            <div className="stat-number">{stats.pendientes}</div>
            <div className="stat-label">Generadas</div>
          </div>
          <div className="tareas-stat-card stat-progreso">
            <div className="stat-number">{stats.enProgreso}</div>
            <div className="stat-label">En Proceso</div>
          </div>
          <div className="tareas-stat-card stat-completada">
            <div className="stat-number">{stats.completadas}</div>
            <div className="stat-label">Finalizadas</div>
          </div>
        </div>
      )}

      {/* Tabs + Filters */}
      <div className="tareas-toolbar">
        <div className="tareas-tabs">
          {isAdmin && (
            <button className={`tab-btn ${activeTab === 'todas' ? 'active' : ''}`} onClick={() => { setActiveTab('todas'); setFiltroEstado(''); setPage(1); }}>
              Todas las Tareas
            </button>
          )}
          <button className={`tab-btn ${activeTab === 'mis-tareas' ? 'active' : ''}`} onClick={() => { setActiveTab('mis-tareas'); setFiltroEstado(''); setPage(1); }}>
            Mis Tareas
          </button>
          <button className={`tab-btn ${activeTab === 'historial' ? 'active' : ''}`} onClick={() => { setActiveTab('historial'); setFiltroEstado(''); setPage(1); }}>
            Historial
          </button>
        </div>
        <div className="tareas-filters">
          {isAdmin && (activeTab === 'todas' || activeTab === 'historial') && (
            <input
              type="text"
              placeholder="Buscar tarea..."
              className="tareas-search-input"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            />
          )}
          <select value={filtroEstado} onChange={(e) => { setFiltroEstado(e.target.value); setPage(1); }} className="tareas-filter-select">
            {activeTab === 'historial' ? (
              <>
                <option value="">Todo el historial</option>
                <option value="completada">Finalizada</option>
                <option value="cancelada">Cancelada</option>
              </>
            ) : (
              <>
                <option value="">Todos los activos</option>
                <option value="pendiente">Generada</option>
                <option value="en_progreso">En Proceso</option>
              </>
            )}
          </select>
          <select value={filtroPrioridad} onChange={(e) => { setFiltroPrioridad(e.target.value); setPage(1); }} className="tareas-filter-select">
            <option value="">Todas las prioridades</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="tareas-loading">
          <div className="tareas-spinner"></div>
          <span>Cargando tareas...</span>
        </div>
      ) : tareas.length === 0 ? (
        <div className="tareas-empty">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" width="48" height="48">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
          </svg>
          <h3>No hay tareas</h3>
          <p>
            {activeTab === 'historial'
              ? 'No tienes tareas finalizadas o canceladas en el historial'
              : (isAdmin ? 'Crea una nueva tarea para empezar' : 'No tienes tareas activas asignadas')}
          </p>
        </div>
      ) : (
        <div className="tareas-list">
          {tareas.map(tarea => {
            const prio = PRIORIDAD_CONFIG[tarea.prioridad] || PRIORIDAD_CONFIG.media;
            const estado = ESTADO_CONFIG[tarea.estado] || ESTADO_CONFIG.pendiente;
            const overdue = isOverdue(tarea);
            const isAssigned = tarea.asignaciones?.some(a => a.userId === storedUser.id);

            return (
              <div key={tarea.id} className={`tarea-card ${overdue ? 'tarea-overdue' : ''}`}>
                <div className="tarea-card-header">
                  <div className="tarea-card-title-row">
                    <span className={`tarea-prioridad-badge ${prio.class}`}>
                      <span className="prioridad-dot"></span>
                      {prio.label}
                    </span>
                    <h3 className="tarea-titulo">{tarea.titulo}</h3>
                  </div>
                  <span className={`tarea-estado-badge ${estado.class}`}>{estado.label}</span>
                </div>

                {tarea.descripcion && (
                  <p className="tarea-descripcion">{tarea.descripcion}</p>
                )}

                <div className="tarea-meta">
                  <div className="tarea-meta-item">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0" />
                    </svg>
                    <span>Creada por: <strong>{tarea.creadoPor?.nombre || 'Desconocido'}</strong></span>
                  </div>
                  <div className="tarea-meta-item">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" width="14" height="14">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                    </svg>
                    <span>Creada: {formatDate(tarea.fechaCreacion)}</span>
                  </div>
                  {tarea.fechaLimite && (
                    <div className={`tarea-meta-item ${overdue ? 'meta-overdue' : ''}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                      <span>Fecha límite: <strong>{formatDate(tarea.fechaLimite)}</strong></span>
                      {overdue && <span className="overdue-label">Vencida</span>}
                    </div>
                  )}
                </div>

                {/* Assigned users */}
                <div className="tarea-asignados">
                  <span className="asignados-label">Asignados:</span>
                  <div className="asignados-avatars">
                    {(tarea.asignaciones || []).map(a => (
                      <span key={a.id} className="asignado-chip" title={a.user?.nombre || a.user?.username}>
                        <span className="asignado-chip-name">{a.user?.nombre || a.user?.username}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="tarea-actions">
                  {/* Status transition buttons for the assigned user */}
                  {isAssigned && (
                    <>
                      {tarea.estado === 'pendiente' && (
                        <button className="tarea-action-btn btn-progress" onClick={() => handleStatusChange(tarea, 'en_progreso')}>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="14" height="14" className="mr-1">
                            <path d="M6.3 2.841A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.269l9.324-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                          </svg>
                          Iniciar
                        </button>
                      )}
                      {tarea.estado === 'en_progreso' && (
                        <button className="tarea-action-btn btn-complete" onClick={() => handleStatusChange(tarea, 'completada')}>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="14" height="14" className="mr-1">
                            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                          </svg>
                          Completar
                        </button>
                      )}
                    </>
                  )}

                  {isAdmin && (
                    <>
                      <button className="tarea-action-btn btn-edit" onClick={() => openEditModal(tarea)}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" width="14" height="14" className="mr-1">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                        </svg>
                        Editar
                      </button>
                      {tarea.estado !== 'cancelada' && (
                        <button className="tarea-action-btn btn-cancel" onClick={() => handleStatusChange(tarea, 'cancelada')}>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" width="14" height="14" className="mr-1">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Cancelar
                        </button>
                      )}
                      <button className="tarea-action-btn btn-delete" onClick={() => handleDelete(tarea)}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" width="14" height="14" className="mr-1">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                        Eliminar
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="tareas-pagination">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="pagination-btn">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" width="12" height="12" style={{ display: 'inline', marginRight: '4px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Anterior
          </button>
          <span className="pagination-info">Página {page} de {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="pagination-btn">
            Siguiente
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" width="12" height="12" style={{ display: 'inline', marginLeft: '4px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Create/Edit Modal ─────────────────────────────────────────────── */}
      {showModal && (
        <ModalPortal>
        <div className="tareas-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="tareas-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTarea ? 'Editar Tarea' : 'Nueva Tarea'}</h2>
              <button className="modal-close-btn" onClick={() => setShowModal(false)}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form-wrapper">
              <div className="modal-form-body">
                {formError && <div className="form-error">{formError}</div>}

                <div className="modal-desktop-grid">
                  {/* Left Column: Task Info */}
                  <div className="modal-details-col">
                    <div className="form-group">
                      <label>Título *</label>
                      <input
                        type="text"
                        value={formTitulo}
                        onChange={(e) => setFormTitulo(e.target.value)}
                        placeholder="Ej: Instalar letrero en local norte"
                        className="form-input"
                        autoFocus
                      />
                    </div>

                    <div className="form-group">
                      <label>Descripción</label>
                      <textarea
                        value={formDescripcion}
                        onChange={(e) => setFormDescripcion(e.target.value)}
                        placeholder="Detalles adicionales de la tarea..."
                        className="form-textarea"
                        rows={4}
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Prioridad</label>
                        <select value={formPrioridad} onChange={(e) => setFormPrioridad(e.target.value)} className="form-input">
                          <option value="baja">Baja</option>
                          <option value="media">Media</option>
                          <option value="alta">Alta</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Fecha Límite</label>
                        <input
                          type="date"
                          value={formFechaLimite}
                          onChange={(e) => setFormFechaLimite(e.target.value)}
                          className="form-input"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Assignees with Search bar */}
                  <div className="modal-assignees-col">
                    <div className="form-group flex flex-col h-full">
                      <label>Asignar a *</label>
                      <div className="user-search-wrapper" style={{ marginBottom: '8px', position: 'relative' }}>
                        <input
                          type="text"
                          placeholder="Buscar por nombre o rol..."
                          className="form-input user-search-input"
                          value={searchUserQuery}
                          onChange={(e) => setSearchUserQuery(e.target.value)}
                          style={{ paddingLeft: '2rem' }}
                        />
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          width="16" 
                          height="16" 
                          style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                      </div>
                      
                      <div className="user-selector">
                        {users
                          .filter(u => u.estado === 'activo')
                          .filter(u => {
                            const query = searchUserQuery.trim().toLowerCase();
                            if (!query) return true;
                            return (
                              u.nombre.toLowerCase().includes(query) ||
                              (u.rol || '').toLowerCase().includes(query) ||
                              (u.username || '').toLowerCase().includes(query)
                            );
                          })
                          .map(u => (
                          <label key={u.id} className={`user-option ${formAsignados.includes(u.id) ? 'selected' : ''}`}>
                            <input
                              type="checkbox"
                              checked={formAsignados.includes(u.id)}
                              onChange={() => toggleAsignado(u.id)}
                            />
                            <div className="user-option-avatar">{(u.nombre || 'U').charAt(0).toUpperCase()}</div>
                            <div className="user-option-info">
                              <span className="user-option-name">{u.nombre}</span>
                              <span className="user-option-role">{u.rol}</span>
                            </div>
                          </label>
                        ))}
                        {users.filter(u => u.estado === 'activo').filter(u => {
                          const query = searchUserQuery.trim().toLowerCase();
                          if (!query) return true;
                          return u.nombre.toLowerCase().includes(query) || (u.rol || '').toLowerCase().includes(query);
                        }).length === 0 && (
                          <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
                            No se encontraron usuarios activos.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="tareas-btn-primary" disabled={submitting}>
                  {submitting ? 'Guardando...' : (editingTarea ? 'Actualizar' : 'Crear Tarea')}
                </button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
}
