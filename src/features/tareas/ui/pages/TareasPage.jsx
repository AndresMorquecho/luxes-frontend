import React, { useState, useEffect, useCallback } from 'react';
import { ModalPortal, deferClose } from '../../../../shared/ui/components/ModalPortal.jsx';
import { ClipboardList, X, Pencil, Trash2, Ban, Play, Check } from 'lucide-react';
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
import { DateRangePicker } from '../../../../shared/ui/components/DateRangePicker.jsx';
import '../../../compras/ui/pages/ComprasPage.css';
import './TareasPage.css';

const PRIORIDAD_BADGES = {
  alta:  { bg: 'bg-rose-50', color: 'text-rose-700', dot: 'bg-rose-500', label: 'Alta' },
  media: { bg: 'bg-amber-50', color: 'text-amber-700', dot: 'bg-amber-500', label: 'Media' },
  baja:  { bg: 'bg-slate-50', color: 'text-slate-600', dot: 'bg-slate-400', label: 'Baja' },
};

const ESTADO_BADGES = {
  pendiente:   { bg: 'bg-blue-50', color: 'text-blue-700', dot: 'bg-blue-600', label: 'Generada' },
  en_progreso: { bg: 'bg-amber-50', color: 'text-amber-700', dot: 'bg-amber-500', label: 'En proceso' },
  completada:  { bg: 'bg-emerald-50', color: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Finalizada' },
  cancelada:   { bg: 'bg-rose-50', color: 'text-rose-700', dot: 'bg-rose-500', label: 'Cancelada' },
};

const CHECK_ICON = 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z';

export default function TareasPage() {
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = storedUser?.permissions?.includes('gestion_tareas') ||
    ['admin', 'administrador'].includes((storedUser?.rol || '').toLowerCase());

  const [tareas, setTareas] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroPrioridad, setFiltroPrioridad] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [fechas, setFechas] = useState({ start: '', end: '' });

  const [showModal, setShowModal] = useState(false);
  const [editingTarea, setEditingTarea] = useState(null);

  const [formTitulo, setFormTitulo] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formPrioridad, setFormPrioridad] = useState('media');
  const [formFechaLimite, setFormFechaLimite] = useState('');
  const [formAsignados, setFormAsignados] = useState([]);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchUserQuery, setSearchUserQuery] = useState('');

  const [activeTab, setActiveTab] = useState(isAdmin ? 'todas' : 'mis-tareas');

  const LIMIT = 25;

  const fetchTareas = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {
        page,
        limit: LIMIT,
        fechaInicio: fechas.start || undefined,
        fechaFin: fechas.end || undefined,
      };

      if (filtroEstado) {
        filters.estado = filtroEstado;
      } else if (activeTab === 'historial') {
        filters.estado = 'history';
      } else {
        filters.estado = 'active';
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
      setTareas(data?.items || []);
      setTotal(data?.total || 0);
    } catch (err) {
      console.error('Error loading tareas:', err);
    } finally {
      setLoading(false);
    }
  }, [page, filtroEstado, filtroPrioridad, searchQuery, activeTab, isAdmin, fechas]);

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
  useEffect(() => { setPage(1); }, [fechas, filtroEstado, filtroPrioridad, searchQuery, activeTab]);

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
    setFormAsignados(tarea.asignaciones?.map((a) => a.userId) || []);
    setFormError('');
    setSearchUserQuery('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!formTitulo.trim()) { setFormError('El título es requerido.'); return; }
    if (formAsignados.length === 0) { setFormError('Debes asignar al menos un usuario.'); return; }

    setSubmitting(true);
    try {
      const payload = {
        titulo: formTitulo.trim(),
        descripcion: formDescripcion.trim() || undefined,
        prioridad: formPrioridad,
        fechaLimite: formFechaLimite || null,
        asignadoA: formAsignados,
      };
      if (editingTarea) await updateTarea(editingTarea.id, payload);
      else await createTarea(payload);
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
      const confirmed = await confirmDialog('Iniciar Tarea', `¿Estás seguro de iniciar la tarea "${tarea.titulo}"?`, { type: 'info', confirmLabel: 'Iniciar', cancelLabel: 'Cancelar' });
      if (!confirmed) return;
    } else if (newEstado === 'completada') {
      const confirmed = await confirmDialog('Finalizar Tarea', `¿Estás seguro de finalizar la tarea "${tarea.titulo}"?`, { type: 'warning', confirmLabel: 'Finalizar', cancelLabel: 'Cancelar' });
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
    const confirmed = await confirmDialog('Eliminar Tarea', `¿Eliminar la tarea "${tarea.titulo}"?`, { type: 'danger', confirmLabel: 'Eliminar', cancelLabel: 'Cancelar' });
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
    setFormAsignados((prev) => prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]);
  };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const showingFrom = total === 0 ? 0 : (page - 1) * LIMIT + 1;
  const showingTo = Math.min(page * LIMIT, total);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const isOverdue = (tarea) => {
    if (!tarea.fechaLimite || tarea.estado === 'completada' || tarea.estado === 'cancelada') return false;
    return new Date(tarea.fechaLimite) < new Date();
  };

  const kpiItems = stats ? [
    { label: 'Total tareas', value: stats.total, border: 'border-t-blue-600', color: 'text-blue-600' },
    { label: 'Generadas', value: stats.pendientes, border: 'border-t-amber-500', color: 'text-amber-600' },
    { label: 'En proceso', value: stats.enProgreso, border: 'border-t-indigo-500', color: 'text-indigo-600' },
    { label: 'Finalizadas', value: stats.completadas, border: 'border-t-emerald-500', color: 'text-emerald-600' },
  ] : [];

  const renderBadge = (badges, key) => {
    const b = badges[key];
    if (!b) return null;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${b.bg} ${b.color} border-current/10`}>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${b.dot}`} />
        {b.label}
      </span>
    );
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setFiltroEstado('');
  };

  const inputClass = 'w-full h-10 px-3 border border-slate-200 rounded-xl bg-gray-50 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-colors';

  const renderFilters = (mobile = false) => (
    <div className={`grid gap-4 ${mobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
      <div className="min-w-0">
        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Fechas</label>
        <DateRangePicker value={fechas} onChange={(val) => setFechas({ start: val.start, end: val.end })} placeholder="Rango de fechas" size="sm" />
      </div>
      <div className="min-w-0">
        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Estado</label>
        <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className={inputClass}>
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
              <option value="en_progreso">En proceso</option>
            </>
          )}
        </select>
      </div>
      <div className="min-w-0">
        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Prioridad</label>
        <select value={filtroPrioridad} onChange={(e) => setFiltroPrioridad(e.target.value)} className={inputClass}>
          <option value="">Todas las prioridades</option>
          <option value="alta">Alta</option>
          <option value="media">Media</option>
          <option value="baja">Baja</option>
        </select>
      </div>
    </div>
  );

  const renderTareaActions = (tarea, compact = false) => {
    const isAssigned = tarea.asignaciones?.some((a) => a.userId === storedUser.id);

    return (
      <div className={`flex flex-wrap items-center ${compact ? 'gap-1.5' : 'gap-1.5 justify-end'}`}>
        {isAssigned && tarea.estado === 'pendiente' && (
          <button
            type="button"
            onClick={() => handleStatusChange(tarea, 'en_progreso')}
            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 hover:text-blue-700 transition-colors"
            title="Iniciar"
            aria-label="Iniciar"
          >
            <Play size={16} strokeWidth={1.5} />
          </button>
        )}
        {isAssigned && tarea.estado === 'en_progreso' && (
          <button
            type="button"
            onClick={() => handleStatusChange(tarea, 'completada')}
            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 hover:text-emerald-700 transition-colors"
            title="Completar"
            aria-label="Completar"
          >
            <Check size={16} strokeWidth={1.5} />
          </button>
        )}
        {isAdmin && (
          <>
            <button
              type="button"
              onClick={() => openEditModal(tarea)}
              className="p-1.5 rounded-lg bg-blue-50 text-blue-500 border border-blue-100 hover:bg-blue-100 hover:text-blue-600 transition-colors"
              title="Editar"
              aria-label="Editar"
            >
              <Pencil size={16} strokeWidth={1.5} />
            </button>
            {tarea.estado !== 'cancelada' && (
              <button
                type="button"
                onClick={() => handleStatusChange(tarea, 'cancelada')}
                className="p-1.5 rounded-lg bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                title="Cancelar"
                aria-label="Cancelar"
              >
                <Ban size={16} strokeWidth={1.5} />
              </button>
            )}
            <button
              type="button"
              onClick={() => handleDelete(tarea)}
              className="p-1.5 rounded-lg bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-100 hover:text-rose-600 transition-colors"
              title="Eliminar"
              aria-label="Eliminar"
            >
              <Trash2 size={16} strokeWidth={1.5} />
            </button>
          </>
        )}
      </div>
    );
  };

  const renderMobileRow = (tarea) => {
    const overdue = isOverdue(tarea);
    const asignados = (tarea.asignaciones || []).map((a) => a.user?.nombre || a.user?.username).filter(Boolean);

    return (
      <div key={tarea.id} className={`border-b border-slate-100 last:border-b-0 px-4 py-3.5 ${overdue ? 'bg-rose-50/40' : ''}`}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800 leading-tight truncate">{tarea.titulo}</p>
            {tarea.descripcion && <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{tarea.descripcion}</p>}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {renderBadge(PRIORIDAD_BADGES, tarea.prioridad)}
            {renderBadge(ESTADO_BADGES, tarea.estado)}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs mb-2">
          <div><span className="text-slate-400 block text-[10px]">Creador</span><span className="font-medium text-slate-700">{tarea.creadoPor?.nombre || '—'}</span></div>
          <div><span className="text-slate-400 block text-[10px]">Fecha límite</span><span className={`font-medium ${overdue ? 'text-rose-600' : 'text-slate-700'}`}>{formatDate(tarea.fechaLimite)}{overdue ? ' · Vencida' : ''}</span></div>
          <div className="col-span-2"><span className="text-slate-400 block text-[10px]">Asignados</span><span className="font-medium text-slate-700">{asignados.join(', ') || '—'}</span></div>
        </div>
        {renderTareaActions(tarea, true)}
      </div>
    );
  };

  const renderPagination = () => (
    <div className="px-4 sm:px-5 py-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
      <p className="text-xs text-slate-400 text-center sm:text-left">
        {showingFrom}–{showingTo} de {total} tareas
      </p>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 bg-white hover:bg-slate-50">&lt;</button>
          <span className="text-xs font-semibold px-2 tabular-nums text-slate-700">{page} / {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 bg-white hover:bg-slate-50">&gt;</button>
        </div>
      )}
    </div>
  );

  const emptyMessage = activeTab === 'historial'
    ? 'No hay tareas finalizadas o canceladas en el historial'
    : (isAdmin ? 'Crea una nueva tarea para empezar' : 'No tienes tareas activas asignadas');

  const filteredUsers = users
    .filter((u) => u.estado === 'activo')
    .filter((u) => {
      const query = searchUserQuery.trim().toLowerCase();
      if (!query) return true;
      return u.nombre.toLowerCase().includes(query) || (u.rol || '').toLowerCase().includes(query) || (u.username || '').toLowerCase().includes(query);
    });

  const tabs = [
    ...(isAdmin ? [{ id: 'todas', label: 'Todas las tareas' }] : []),
    { id: 'mis-tareas', label: 'Mis tareas' },
    { id: 'historial', label: 'Historial' },
  ];

  return (
    <div className="space-y-3 sm:space-y-5 animate-slide-up overflow-x-hidden" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        .shadow-card { box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02); }
      `}</style>

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-5 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 bg-blue-50 border-blue-100">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={CHECK_ICON} />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800">Tareas</h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-blue-100 text-blue-700">
                  Equipo
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                {isAdmin ? 'Gestiona y asigna tareas al equipo' : 'Revisa y gestiona tus tareas asignadas'}
              </p>
            </div>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-700 transition-opacity shadow-sm shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Nueva tarea
            </button>
          )}
        </div>
      </div>

      {/* KPIs — una sola fila */}
      {stats && (
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {kpiItems.map((kpi) => (
            <div key={kpi.label} className={`bg-white shadow-card rounded-xl border border-gray-100 border-t-2 ${kpi.border} px-2.5 sm:px-4 py-3 sm:py-4 min-w-0`}>
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{kpi.label}</p>
              <p className={`text-base sm:text-lg font-bold mt-1 tabular-nums ${kpi.color}`}>{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtros móvil */}
      <div className="md:hidden bg-white shadow-card rounded-xl border border-gray-100 p-4 relative z-30">
        {renderFilters(true)}
      </div>

      {/* Filtros escritorio */}
      <div className="hidden md:block bg-white shadow-card rounded-xl border border-gray-100 p-4 sm:p-5 relative z-30">
        {renderFilters(false)}
      </div>

      {/* Tabs — debajo de los filtros */}
      <div className="flex items-center justify-end gap-1.5 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => switchTab(tab.id)}
            className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap shrink-0 ${
              activeTab === tab.id
                ? 'bg-blue-900 text-white shadow-md'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tabla escritorio */}
      <div className="hidden md:block bg-white shadow-card rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-gray-800">
              {activeTab === 'historial' ? 'Historial de tareas' : activeTab === 'mis-tareas' ? 'Mis tareas' : 'Todas las tareas'}
            </h2>
            <span className="text-xs font-medium text-gray-400">{total} registros</span>
          </div>
          {isAdmin && (activeTab === 'todas' || activeTab === 'historial') && (
            <div className="relative w-full sm:w-auto">
              <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                className="pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 bg-gray-50 focus:bg-white w-full sm:w-80 sm:min-w-[280px] transition-colors"
                placeholder="Buscar tarea…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="overflow-x-auto relative min-h-[200px]">
          {loading && (
            <div className="absolute inset-0 z-10 flex justify-center items-center bg-white/70 backdrop-blur-[2px]">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-200 border-t-blue-500" />
            </div>
          )}
          {!loading && tareas.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-12 px-4">{emptyMessage}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Título</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Prioridad</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Creador</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Fecha límite</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Asignados</th>
                  <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tareas.map((tarea) => {
                  const overdue = isOverdue(tarea);
                  const asignados = (tarea.asignaciones || []).map((a) => a.user?.nombre || a.user?.username).filter(Boolean);
                  return (
                    <tr key={tarea.id} className={`hover:bg-slate-50/70 transition-colors ${overdue ? 'bg-rose-50/30' : ''}`}>
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-slate-900 leading-tight">{tarea.titulo}</p>
                        {tarea.descripcion && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{tarea.descripcion}</p>}
                      </td>
                      <td className="px-5 py-4">{renderBadge(PRIORIDAD_BADGES, tarea.prioridad)}</td>
                      <td className="px-5 py-4">{renderBadge(ESTADO_BADGES, tarea.estado)}</td>
                      <td className="px-5 py-4 text-sm text-slate-700">{tarea.creadoPor?.nombre || '—'}</td>
                      <td className={`px-5 py-4 text-sm ${overdue ? 'text-rose-600 font-semibold' : 'text-slate-700'}`}>
                        {formatDate(tarea.fechaLimite)}
                        {overdue && <span className="ml-1 text-[10px] font-semibold uppercase">Vencida</span>}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600 max-w-[180px]">
                        <span className="line-clamp-2">{asignados.join(', ') || '—'}</span>
                      </td>
                      <td className="px-5 py-4 text-right">{renderTareaActions(tarea)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {renderPagination()}
      </div>

      {/* Lista móvil */}
      <div className="md:hidden bg-white shadow-card rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex flex-col gap-3 px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-slate-800">
              {activeTab === 'historial' ? 'Historial de tareas' : activeTab === 'mis-tareas' ? 'Mis tareas' : 'Todas las tareas'}
            </h2>
            <span className="text-xs font-medium text-gray-400">{total} registros</span>
          </div>
          {isAdmin && (activeTab === 'todas' || activeTab === 'historial') && (
            <div className="relative w-full">
              <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                className="pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 bg-gray-50 focus:bg-white w-full transition-colors"
                placeholder="Buscar tarea…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}
        </div>
        {loading && (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-7 w-7 border-2 border-blue-200 border-t-blue-500" />
          </div>
        )}
        {!loading && tareas.length === 0 && <p className="text-center text-slate-400 text-sm py-10 px-4">{emptyMessage}</p>}
        {!loading && tareas.map((t) => renderMobileRow(t))}
        {renderPagination()}
      </div>

      {/* Modal crear/editar */}
      {showModal && (
        <ModalPortal>
          <div className="co-portal-root">
            <div
              className="fixed inset-0 z-[200] bg-slate-200/60 backdrop-blur-md"
              onClick={() => deferClose(() => setShowModal(false))}
            />
            <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
              <div
                className="co-modal co-modal-lg animate-co-modal-in pointer-events-auto w-full border border-slate-200 rounded-xl shadow-xl bg-white max-h-[90vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
              >
                <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 border border-blue-100 text-blue-600">
                      <ClipboardList size={18} strokeWidth={2.5} />
                    </div>
                    <h2 className="text-base font-bold text-slate-800 truncate">
                      {editingTarea ? 'Editar tarea' : 'Nueva tarea'}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => deferClose(() => setShowModal(false))}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 border border-slate-200 transition-colors shrink-0"
                    title="Cerrar"
                  >
                    <X size={14} />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
                  <div className="co-modal-body overflow-y-auto">
                    {formError && (
                      <div className="mb-4 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">{formError}</div>
                    )}
                    <div className="ta-modal-grid">
                      <div className="space-y-4">
                        <div>
                          <label className="co-label">Título *</label>
                          <input type="text" value={formTitulo} onChange={(e) => setFormTitulo(e.target.value)} placeholder="Ej: Instalar letrero en local norte" className="co-input w-full" autoFocus />
                        </div>
                        <div>
                          <label className="co-label">Descripción</label>
                          <textarea value={formDescripcion} onChange={(e) => setFormDescripcion(e.target.value)} placeholder="Detalles adicionales…" className="co-input w-full min-h-[100px] resize-y" rows={4} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="co-label">Prioridad</label>
                            <select value={formPrioridad} onChange={(e) => setFormPrioridad(e.target.value)} className="co-input w-full">
                              <option value="baja">Baja</option>
                              <option value="media">Media</option>
                              <option value="alta">Alta</option>
                            </select>
                          </div>
                          <div>
                            <label className="co-label">Fecha límite</label>
                            <input type="date" value={formFechaLimite} onChange={(e) => setFormFechaLimite(e.target.value)} className="co-input w-full" />
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col min-h-0">
                        <label className="co-label">Asignar a *</label>
                        <div className="relative mb-2">
                          <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                          </svg>
                          <input type="text" placeholder="Buscar por nombre o rol…" className="co-input w-full pl-10" value={searchUserQuery} onChange={(e) => setSearchUserQuery(e.target.value)} />
                        </div>
                        <div className="ta-user-selector">
                          {filteredUsers.map((u) => (
                            <label key={u.id} className={`ta-user-option ${formAsignados.includes(u.id) ? 'selected' : ''}`}>
                              <input type="checkbox" checked={formAsignados.includes(u.id)} onChange={() => toggleAsignado(u.id)} />
                              <span className="ta-user-avatar">{(u.nombre || 'U').charAt(0).toUpperCase()}</span>
                              <span>
                                <span className="block text-sm font-semibold text-slate-800">{u.nombre}</span>
                                <span className="block text-xs text-slate-500">{u.rol}</span>
                              </span>
                            </label>
                          ))}
                          {filteredUsers.length === 0 && (
                            <p className="text-center text-slate-400 text-xs py-6">No se encontraron usuarios activos.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100 shrink-0 bg-white">
                    <button type="button" onClick={() => deferClose(() => setShowModal(false))} className="co-btn-ghost">Cancelar</button>
                    <button type="submit" className="co-btn-primary" disabled={submitting}>
                      {submitting ? 'Guardando…' : (editingTarea ? 'Actualizar' : 'Crear tarea')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
