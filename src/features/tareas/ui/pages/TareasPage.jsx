import React, { useState, useEffect, useCallback } from 'react';
import {
  Play, CheckCircle2, DollarSign, Pencil, Ban, Trash2, X, Loader2,
  History, Plus, Clock, AlertTriangle
} from 'lucide-react';
import { ModalPortal } from '../../../../shared/ui/components/ModalPortal.jsx';
import {
  getTareas,
  getMisTareas,
  createTarea,
  updateTarea,
  deleteTarea,
  getTareasStats,
  getUsers,
} from '../../application/tareasService';
import { confirmDialog, alertDialog } from '../../../../shared/ui/components/ConfirmModal';
import { notifyNotificationsUpdated } from '../../../notificaciones/application/notificationsService';
import { DateRangePicker } from '../../../../shared/ui/components/DateRangePicker.jsx';
import { ComprasPageHeader, ComprasHeaderButton } from '../../../compras/ui/components/ComprasPageHeader';
import { isAdminUser } from '../../../../shared/utils/userRoleHelpers';
import '../../../compras/ui/pages/ComprasPage.css';
import './TareasPage.css';

const TA_PRIMARY = '#2b41b8';
const TA_NAVY = '#1a1c3d';

const PRIORIDAD_BADGES = {
  alta:  { bg: 'bg-red-50', color: 'text-red-700', dot: 'bg-red-500', label: 'ALTA' },
  media: { bg: 'bg-amber-50', color: 'text-amber-700', dot: 'bg-amber-500', label: 'MEDIA' },
  baja:  { bg: 'bg-slate-100', color: 'text-slate-600', dot: 'bg-slate-400', label: 'BAJA' },
};

const ESTADO_BADGES = {
  pendiente:   { bg: 'bg-blue-50', color: 'text-[#2b41b8]', dot: 'bg-[#2b41b8]', label: 'GENERADA' },
  en_progreso: { bg: 'bg-orange-50', color: 'text-orange-700', dot: 'bg-orange-500', label: 'EN PROCESO' },
  completada:  { bg: 'bg-emerald-50', color: 'text-emerald-700', dot: 'bg-emerald-500', label: 'FINALIZADA' },
  cancelada:   { bg: 'bg-red-50', color: 'text-red-700', dot: 'bg-red-500', label: 'CANCELADA' },
};

const CHECK_ICON = 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z';

export default function TareasPage() {
  const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = isAdminUser(storedUser);

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
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

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

  // Estado para el modal de multas por incumplimiento de tarea
  const [showMultaModal, setShowMultaModal] = useState(false);
  const [multaModalTab, setMultaModalTab] = useState('historial'); // 'historial' | 'nueva'
  const [multaTarea, setMultaTarea] = useState(null);
  const [multaUsuarioId, setMultaUsuarioId] = useState('');
  const [multaMonto, setMultaMonto] = useState('');
  const [multaFecha, setMultaFecha] = useState('');
  const [multaMotivo, setMultaMotivo] = useState('');
  const [multaError, setMultaError] = useState('');
  const [multaSubmitting, setMultaSubmitting] = useState(false);
  const [empleadosList, setEmpleadosList] = useState([]);

  // Historial de multas de la tarea seleccionada
  const [multasRegistradas, setMultasRegistradas] = useState([]);
  const [loadingMultasHistory, setLoadingMultasHistory] = useState(false);
  const [eliminandoMultaId, setEliminandoMultaId] = useState(null);

  const LIMIT = 25;

  const cargarMultasTarea = async (tarea, empListOverride = null) => {
    if (!tarea) return [];
    setLoadingMultasHistory(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/nomina/egresos?tipo=MULTA', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const allMultas = data.data || [];
        const taskTag = `[TAREA:${tarea.id}]`;

        const filtered = allMultas.filter(
          (m) => m.motivo && m.motivo.includes(taskTag)
        );

        setMultasRegistradas(filtered);
        return filtered;
      }
    } catch (err) {
      console.error('[cargarMultasTarea] Error:', err);
    } finally {
      setLoadingMultasHistory(false);
    }
    return [];
  };

  const openMultaModal = async (tarea) => {
    setMultaTarea(tarea);
    const asignados = tarea.asignaciones || [];
    const primerUsuarioId = asignados.length > 0 ? (asignados[0].userId || asignados[0].user?.id || '') : '';
    setMultaUsuarioId(primerUsuarioId);
    setMultaMonto(''); // Inicia vacío para ingreso manual
    setMultaFecha(new Date().toISOString().split('T')[0]);
    setMultaMotivo(`Multa por incumplimiento de tarea: ${tarea.titulo}`);
    setMultaError('');
    setShowMultaModal(true);

    let currentEmpList = empleadosList;
    if (currentEmpList.length === 0) {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/empleados', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && data.success) {
          currentEmpList = data.data || [];
          setEmpleadosList(currentEmpList);
        }
      } catch (err) {
        console.error('[openMultaModal] Error al cargar empleados:', err);
      }
    }

    const multasExistentes = await cargarMultasTarea(tarea);
    if (multasExistentes && multasExistentes.length > 0) {
      setMultaModalTab('historial');
    } else {
      setMultaModalTab('nueva');
    }
  };

  const handleSaveMulta = async (e) => {
    e.preventDefault();
    if (!multaUsuarioId) {
      setMultaError('Por favor selecciona un colaborador asignado');
      return;
    }
    const montoNum = Number(multaMonto);
    if (!multaMonto || isNaN(montoNum) || montoNum <= 0) {
      setMultaError('Ingresa un monto válido mayor a 0');
      return;
    }
    if (!multaFecha) {
      setMultaError('Selecciona una fecha válida');
      return;
    }

    setMultaSubmitting(true);
    setMultaError('');

    try {
      const userSelected = users.find((u) => u.id === multaUsuarioId);
      let empId = userSelected?.empleadoId;

      if (!empId && empleadosList.length > 0) {
        const empFound = empleadosList.find(
          (e) =>
            e.userId === multaUsuarioId ||
            e.user?.id === multaUsuarioId ||
            e.id === multaUsuarioId ||
            e.nombre?.toLowerCase() === userSelected?.nombre?.toLowerCase()
        );
        if (empFound) empId = empFound.id;
      }

      if (!empId) {
        empId = multaUsuarioId;
      }

      const tagMotivo = `[TAREA:${multaTarea.id}] ${multaMotivo.trim() || `Multa por incumplimiento en tarea "${multaTarea?.titulo}"`}`;

      const token = localStorage.getItem('token');
      const res = await fetch('/api/nomina/egresos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          empleadoId: String(empId),
          tipo: 'MULTA',
          monto: montoNum,
          fecha: multaFecha,
          motivo: tagMotivo,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Error al registrar la multa en Nómina');
      }

      await alertDialog(
        'Multa Registrada',
        `Se ha aplicado exitosamente la multa de $${montoNum.toFixed(2)} al colaborador en Nómina.`,
        { type: 'success' }
      );

      // Recargar historial y cambiar a la pestaña de historial
      await cargarMultasTarea(multaTarea);
      setMultaMonto('');
      setMultaMotivo(`Multa por incumplimiento de tarea: ${multaTarea.titulo}`);
      setMultaModalTab('historial');
    } catch (err) {
      setMultaError(err.message || 'No se pudo guardar la multa');
    } finally {
      setMultaSubmitting(false);
    }
  };

  const handleDeleteMulta = async (multa) => {
    const ok = await confirmDialog(
      '¿Eliminar esta multa?',
      `Esta acción eliminará la multa de $${Number(multa.monto).toFixed(2)} de la Nómina del colaborador y recalculará su sueldo automáticamente. ¿Deseas continuar?`,
      { type: 'danger', confirmText: 'Eliminar Multa' }
    );
    if (!ok) return;

    setEliminandoMultaId(multa.id);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/nomina/egresos/${multa.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Error al eliminar la multa');
      }

      await alertDialog('Multa Eliminada', 'La multa ha sido eliminada de Nómina correctamente.', { type: 'success' });
      await cargarMultasTarea(multaTarea);
    } catch (err) {
      await alertDialog('Error', 'No se pudo eliminar la multa: ' + err.message, { type: 'warning' });
    } finally {
      setEliminandoMultaId(null);
    }
  };

  const getNombreEmpleado = (empId) => {
    const emp = empleadosList.find((e) => e.id === empId || e.user?.id === empId);
    if (emp) return emp.nombre;
    const usr = users.find((u) => u.id === empId || u.empleadoId === empId);
    if (usr) return usr.nombre;
    return empId || 'Colaborador';
  };

  const getQuincenaBadge = (fechaStr) => {
    if (!fechaStr) return null;
    const parts = fechaStr.split('-');
    const day = parseInt(parts[2] || '1', 10);
    if (day <= 15) {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
          1ra Quincena (01-15)
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
        2da Quincena (16-Fin)
      </span>
    );
  };



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
      await alertDialog('Error', err.message, { type: 'warning' });
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
      await alertDialog('Error', err.message, { type: 'warning' });
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

  const activeFiltersCount = [filtroEstado, filtroPrioridad, fechas.start, fechas.end].filter(Boolean).length;

  const renderBadge = (badges, key, compact = false) => {
    const b = badges[key];
    if (!b) return null;
    return (
      <span className={`inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wide ${b.bg} ${b.color} ${
        compact ? 'px-1.5 py-0.5 text-[8px] gap-0.5' : 'px-2.5 py-1 text-[10px] gap-1.5'
      }`}>
        <span className={`rounded-full shrink-0 ${b.dot} ${compact ? 'w-1 h-1' : 'w-1.5 h-1.5'}`} />
        {b.label}
      </span>
    );
  };

  const kpiItems = stats ? [
    { label: 'Total tareas', mobileLabel: 'Total', value: stats.total, hint: 'Registradas', accent: '#2b41b8', iconBg: 'bg-[#eef1fc]', iconColor: 'text-[#2b41b8]', icon: CHECK_ICON },
    { label: 'Generadas', mobileLabel: 'Generadas', value: stats.pendientes, hint: 'Sin iniciar', accent: '#3b82f6', iconBg: 'bg-blue-50', iconColor: 'text-blue-600', icon: 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' },
    { label: 'En proceso', mobileLabel: 'En proceso', value: stats.enProgreso, hint: 'Activas ahora', accent: '#f97316', iconBg: 'bg-orange-50', iconColor: 'text-orange-500', icon: 'M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 0 1 0 1.971l-11.54 6.347a1.125 1.125 0 0 1-1.667-.985V5.653Z' },
    { label: 'Finalizadas', mobileLabel: 'Finalizadas', value: stats.completadas, hint: 'Completadas', accent: '#10b981', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', icon: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' },
  ] : [];

  const renderKpiCardDesktop = (kpi) => (
    <div key={kpi.label} className="bg-white border border-slate-200/80 rounded-xl shadow-sm flex items-start gap-3 p-5 min-w-0">
      <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${kpi.iconBg}`}>
        <svg className={`w-5 h-5 ${kpi.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={kpi.icon} />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-500">{kpi.label}</p>
        <p className="text-2xl font-bold mt-0.5 tabular-nums leading-none" style={{ color: TA_NAVY }}>{kpi.value}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">{kpi.hint}</p>
      </div>
    </div>
  );

  const renderKpiCardMobile = (kpi) => (
    <div key={kpi.label} className="co-kpi-mobile bg-white rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-2.5 p-3 min-w-0">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${kpi.iconBg}`}>
        <svg className={`w-4 h-4 ${kpi.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={kpi.icon} />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium text-slate-500 leading-tight truncate">{kpi.mobileLabel}</p>
        <p className="text-base font-bold tabular-nums leading-none mt-0.5" style={{ color: TA_NAVY }}>{kpi.value}</p>
      </div>
    </div>
  );

  const tabClass = (active) =>
    `px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
      active ? 'border-[#2b41b8] text-[#2b41b8]' : 'border-transparent text-slate-500 hover:text-slate-700'
    }`;

  const switchTab = (tab) => {
    setActiveTab(tab);
    setFiltroEstado('');
  };

  const renderTabs = () => (
    <div className="flex gap-1 border-b border-slate-200 mb-4 md:mb-5 overflow-x-auto">
      {isAdmin && (
        <button type="button" className={tabClass(activeTab === 'todas')} style={activeTab === 'todas' ? { color: TA_PRIMARY, borderColor: TA_PRIMARY } : undefined} onClick={() => switchTab('todas')}>
          Todas las tareas
        </button>
      )}
      <button type="button" className={tabClass(activeTab === 'mis-tareas')} style={activeTab === 'mis-tareas' ? { color: TA_PRIMARY, borderColor: TA_PRIMARY } : undefined} onClick={() => switchTab('mis-tareas')}>
        Mis tareas
      </button>
      <button type="button" className={tabClass(activeTab === 'historial')} style={activeTab === 'historial' ? { color: TA_PRIMARY, borderColor: TA_PRIMARY } : undefined} onClick={() => switchTab('historial')}>
        Historial
      </button>
    </div>
  );

  const renderFilters = (mobile = false) => (
    <div className={`grid gap-2 ${mobile ? 'grid-cols-1' : 'grid-cols-2 lg:grid-cols-4'}`}>
      <div className={`relative ${mobile ? '' : 'col-span-2 lg:col-span-1'}`}>
        <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="text"
          placeholder="Buscar tarea…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-10 pl-10 pr-3 border border-slate-200 rounded-lg bg-white text-sm text-slate-800 outline-none focus:border-[#2b41b8] focus:ring-2 focus:ring-[#2b41b8]/15"
        />
      </div>
      <div className="min-w-0">
        <DateRangePicker value={fechas} onChange={(val) => setFechas({ start: val.start, end: val.end })} placeholder="Rango de fechas" />
      </div>
      <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className="h-10 px-3 border border-slate-200 rounded-lg bg-white text-sm text-slate-700 outline-none focus:border-[#2b41b8] focus:ring-2 focus:ring-[#2b41b8]/15 min-w-0">
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
      <select value={filtroPrioridad} onChange={(e) => setFiltroPrioridad(e.target.value)} className="h-10 px-3 border border-slate-200 rounded-lg bg-white text-sm text-slate-700 outline-none focus:border-[#2b41b8] focus:ring-2 focus:ring-[#2b41b8]/15 min-w-0">
        <option value="">Todas las prioridades</option>
        <option value="alta">Alta</option>
        <option value="media">Media</option>
        <option value="baja">Baja</option>
      </select>
    </div>
  );

  const renderTareaActions = (tarea, compact = false) => {
    const isAssigned = tarea.asignaciones?.some((a) => a.userId === storedUser.id || a.user?.id === storedUser.id);
    const hasAssignments = (tarea.asignaciones || []).length > 0;

    return (
      <div className={`flex flex-wrap items-center gap-1.5 ${compact ? '' : 'justify-end'}`}>
        {isAssigned && tarea.estado === 'pendiente' && (
          <button
            type="button"
            title="Iniciar tarea"
            onClick={() => handleStatusChange(tarea, 'en_progreso')}
            className="h-8 px-2.5 inline-flex items-center gap-1 bg-[#2b41b8] hover:bg-[#1a1c3d] text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Play size={13} />
            {!compact && <span>Iniciar</span>}
          </button>
        )}

        {isAssigned && tarea.estado === 'en_progreso' && (
          <button
            type="button"
            title="Completar tarea"
            onClick={() => handleStatusChange(tarea, 'completada')}
            className="h-8 px-2.5 inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <CheckCircle2 size={13} />
            {!compact && <span>Completar</span>}
          </button>
        )}

        {isAdmin && (
          <>
            {hasAssignments && (
              <button
                type="button"
                title="Multar colaborador por incumplimiento"
                onClick={() => openMultaModal(tarea)}
                className="h-8 px-2.5 inline-flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300/80 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <DollarSign size={14} className="text-amber-700" strokeWidth={2.5} />
                {!compact && <span>Multar</span>}
              </button>
            )}

            <button
              type="button"
              title="Editar tarea"
              onClick={() => openEditModal(tarea)}
              className="h-8 w-8 inline-flex items-center justify-center border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 rounded-lg transition-all shadow-sm cursor-pointer"
            >
              <Pencil size={14} />
            </button>

            {tarea.estado !== 'cancelada' && (
              <button
                type="button"
                title="Cancelar tarea"
                onClick={() => handleStatusChange(tarea, 'cancelada')}
                className="h-8 w-8 inline-flex items-center justify-center border border-orange-200 text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg transition-all shadow-sm cursor-pointer"
              >
                <Ban size={14} />
              </button>
            )}

            <button
              type="button"
              title="Eliminar tarea"
              onClick={() => handleDelete(tarea)}
              className="h-8 w-8 inline-flex items-center justify-center border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all shadow-sm cursor-pointer"
            >
              <Trash2 size={14} />
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
      <div key={tarea.id} className={`co-orden-row border-b border-slate-100 last:border-b-0 px-3 py-3 ${overdue ? 'bg-red-50/40' : ''}`}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-tight truncate" style={{ color: TA_NAVY }}>{tarea.titulo}</p>
            {tarea.descripcion && <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{tarea.descripcion}</p>}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {renderBadge(PRIORIDAD_BADGES, tarea.prioridad, true)}
            {renderBadge(ESTADO_BADGES, tarea.estado, true)}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs mb-2">
          <div><span className="text-slate-400 block text-[10px]">Creador</span><span className="font-medium text-slate-700">{tarea.creadoPor?.nombre || '—'}</span></div>
          <div><span className="text-slate-400 block text-[10px]">Fecha límite</span><span className={`font-medium ${overdue ? 'text-red-600' : 'text-slate-700'}`}>{formatDate(tarea.fechaLimite)}{overdue ? ' · Vencida' : ''}</span></div>
          <div className="col-span-2"><span className="text-slate-400 block text-[10px]">Asignados</span><span className="font-medium text-slate-700">{asignados.join(', ') || '—'}</span></div>
        </div>
        {renderTareaActions(tarea, true)}
      </div>
    );
  };

  const renderPagination = () => (
    <div className="px-4 md:px-5 py-3 border-t border-slate-100 bg-white flex flex-col md:flex-row md:items-center md:justify-between gap-2">
      <p className="text-xs text-slate-500 text-center md:text-left">
        Mostrando {showingFrom} a {showingTo} de {total} tareas
      </p>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 bg-white">&lt;</button>
          <span className="md:hidden text-xs font-semibold px-2 tabular-nums" style={{ color: TA_NAVY }}>{page} / {totalPages}</span>
          <div className="hidden md:flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const maxVisible = Math.min(5, totalPages);
              let start = Math.max(1, page - Math.floor(maxVisible / 2));
              const end = Math.min(totalPages, start + maxVisible - 1);
              if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
              const pageNum = start + i;
              if (pageNum > end) return null;
              const isActive = page === pageNum;
              return (
                <button key={pageNum} type="button" onClick={() => setPage(pageNum)} className={`w-8 h-8 rounded-lg border text-sm font-medium ${isActive ? 'text-white border-transparent' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`} style={isActive ? { backgroundColor: TA_PRIMARY } : undefined}>{pageNum}</button>
              );
            })}
          </div>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 bg-white">&gt;</button>
        </div>
      )}
    </div>
  );

  const emptyMessage = activeTab === 'historial'
    ? 'No hay tareas finalizadas o canceladas en el historial'
    : (isAdmin ? 'Crea una nueva tarea para empezar' : 'No tienes tareas activas asignadas');

  const headerAction = isAdmin ? (
    <ComprasHeaderButton onClick={openCreateModal}>
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
      Nueva Tarea
    </ComprasHeaderButton>
  ) : null;

  const filteredUsers = users
    .filter((u) => u.estado === 'activo')
    .filter((u) => {
      const query = searchUserQuery.trim().toLowerCase();
      if (!query) return true;
      return u.nombre.toLowerCase().includes(query) || (u.rol || '').toLowerCase().includes(query) || (u.username || '').toLowerCase().includes(query);
    });

  return (
    <div className="co-tareas-page co-compras-page animate-slide-up overflow-x-hidden pb-6">
      <ComprasPageHeader
        title="Tareas"
        subtitle={isAdmin ? 'Gestiona y asigna tareas al equipo' : 'Revisa y gestiona tus tareas asignadas'}
        action={headerAction}
      />

      {stats && (
        <>
          <div className="md:hidden">
            <div className="grid grid-cols-2 gap-2 mb-4">
              {kpiItems.map((kpi) => renderKpiCardMobile(kpi))}
            </div>
          </div>
          <div className="hidden md:block">
            <div className="grid gap-4 mb-6 md:grid-cols-2 xl:grid-cols-4">
              {kpiItems.map((kpi) => renderKpiCardDesktop(kpi))}
            </div>
          </div>
        </>
      )}

      {renderTabs()}

      {/* Móvil: filtros colapsables */}
      <div className="md:hidden mb-3 space-y-2">
        <div className="flex gap-2">
          <div className="relative flex-1 min-w-0">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input type="text" placeholder="Buscar tarea…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-10 pl-10 pr-3 border border-slate-200 rounded-xl bg-white text-sm outline-none focus:border-[#2b41b8] focus:ring-2 focus:ring-[#2b41b8]/15" />
          </div>
          <button type="button" onClick={() => setMobileFiltersOpen((v) => !v)} className="w-10 h-10 shrink-0 inline-flex items-center justify-center border border-slate-200 rounded-xl bg-white text-slate-500 relative" aria-label="Filtros">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
            </svg>
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[1rem] h-4 px-1 rounded-full text-[9px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: TA_PRIMARY }}>{activeFiltersCount}</span>
            )}
          </button>
        </div>
        {mobileFiltersOpen && renderFilters(true)}
      </div>

      {/* Escritorio: filtros en tarjeta */}
      <div className="hidden md:block bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm mb-6">
        <div className="px-5 py-4 border-b border-slate-100">
          {renderFilters()}
        </div>

        <div className="overflow-x-auto relative min-h-[200px]">
          {loading && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
              <div className="co-spinner" />
            </div>
          )}
          {!loading && tareas.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-16 px-4">{emptyMessage}</p>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f8f9fc] text-[11px] font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">Título</th>
                  <th className="px-4 py-3">Prioridad</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Creador</th>
                  <th className="px-4 py-3">Fecha límite</th>
                  <th className="px-4 py-3">Asignados</th>
                  <th className="px-4 py-3 text-right w-64">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {tareas.map((tarea) => {
                  const overdue = isOverdue(tarea);
                  const asignados = (tarea.asignaciones || []).map((a) => a.user?.nombre || a.user?.username).filter(Boolean);
                  return (
                    <tr key={tarea.id} className={`border-b border-slate-50 hover:bg-slate-50/60 ${overdue ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{tarea.titulo}</p>
                        {tarea.descripcion && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{tarea.descripcion}</p>}
                      </td>
                      <td className="px-4 py-3">{renderBadge(PRIORIDAD_BADGES, tarea.prioridad)}</td>
                      <td className="px-4 py-3">{renderBadge(ESTADO_BADGES, tarea.estado)}</td>
                      <td className="px-4 py-3 text-slate-700">{tarea.creadoPor?.nombre || '—'}</td>
                      <td className={`px-4 py-3 ${overdue ? 'text-red-600 font-semibold' : 'text-slate-700'}`}>
                        {formatDate(tarea.fechaLimite)}
                        {overdue && <span className="ml-1 text-[10px] font-bold uppercase">Vencida</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs max-w-[180px]">
                        <span className="line-clamp-2">{asignados.join(', ') || '—'}</span>
                      </td>
                      <td className="px-4 py-3">{renderTareaActions(tarea)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {renderPagination()}
      </div>

      {/* Móvil: lista en tarjeta */}
      <div className="md:hidden bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden mb-3">
        <div className="px-3 py-2.5 border-b border-slate-100">
          <h2 className="text-sm font-bold" style={{ color: TA_NAVY }}>
            {activeTab === 'historial' ? 'Historial de tareas' : activeTab === 'mis-tareas' ? 'Mis tareas' : 'Todas las tareas'}
          </h2>
        </div>
        {loading && <div className="flex justify-center py-10"><div className="co-spinner" /></div>}
        {!loading && tareas.length === 0 && <p className="text-center text-slate-400 text-sm py-10 px-4">{emptyMessage}</p>}
        {!loading && tareas.map((t) => renderMobileRow(t))}
      </div>

      <div className="md:hidden px-1 py-2">
        {totalPages > 1 && (
          <div className="flex flex-col gap-2">
            <p className="text-[11px] text-slate-500 text-center">Mostrando {showingFrom} a {showingTo} de {total} tareas</p>
            <div className="flex items-center justify-center gap-1">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="w-8 h-8 rounded-lg border border-slate-200 bg-white disabled:opacity-40">&lt;</button>
              <span className="text-xs font-semibold px-2 tabular-nums" style={{ color: TA_NAVY }}>{page} / {totalPages}</span>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="w-8 h-8 rounded-lg border border-slate-200 bg-white disabled:opacity-40">&gt;</button>
            </div>
          </div>
        )}
      </div>

      {/* Modal crear/editar */}
      {showModal && (
        <ModalPortal>
          <div className="co-portal-root">
            <div className="co-overlay" onClick={() => setShowModal(false)} />
            <div className="co-modal-wrap">
              <div className="co-modal co-modal-lg animate-co-modal-in overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="co-modal-header">
                <h2 className="text-base font-bold text-slate-800">{editingTarea ? 'Editar Tarea' : 'Nueva Tarea'}</h2>
                <button type="button" onClick={() => setShowModal(false)} className="co-modal-close">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1 overflow-hidden">
                <div className="co-modal-body">
                  {formError && (
                    <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{formError}</div>
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
                <div className="co-modal-fixed-footer flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100">
                  <button type="button" onClick={() => setShowModal(false)} className="co-btn-ghost">Cancelar</button>
                  <button type="submit" className="co-btn-primary" disabled={submitting} style={{ background: TA_PRIMARY }}>
                    {submitting ? 'Guardando…' : (editingTarea ? 'Actualizar' : 'Crear Tarea')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Modal Widescreen para Gestión de Multas e Historial (Altura Fija) */}
      {showMultaModal && multaTarea && (
        <ModalPortal>
          <div className="co-portal-root">
            <div className="co-overlay" onClick={() => setShowMultaModal(false)} />
            <div className="co-modal-wrap">
              <div
                className="co-modal animate-co-modal-in overflow-hidden bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-2xl w-full flex flex-col h-[570px] max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header Modal Fijo */}
                <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <DollarSign size={19} strokeWidth={2.5} />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-slate-800">Gestión de Multas por Incumplimiento</h2>
                      <p className="text-xs text-slate-500">Tarea: <span className="font-semibold text-slate-700">{multaTarea.titulo}</span></p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowMultaModal(false)}
                    className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Barra de Pestañas (Tabs) Fija */}
                <div className="bg-slate-100/70 px-6 pt-2.5 border-b border-slate-200 flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setMultaModalTab('historial')}
                    className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 border-t border-x ${
                      multaModalTab === 'historial'
                        ? 'bg-white text-slate-800 border-slate-200 border-b-transparent shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 border-transparent hover:bg-slate-200/50'
                    }`}
                  >
                    <History size={14} />
                    <span>Multas Registradas</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        multasRegistradas.length > 0
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {multasRegistradas.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMultaModalTab('nueva')}
                    className={`px-4 py-2 rounded-t-xl text-xs font-bold transition-all flex items-center gap-2 border-t border-x ${
                      multaModalTab === 'nueva'
                        ? 'bg-white text-slate-800 border-slate-200 border-b-transparent shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 border-transparent hover:bg-slate-200/50'
                    }`}
                  >
                    <Plus size={14} />
                    <span>+ Registrar Nueva Multa</span>
                  </button>
                </div>

                {/* Cuerpo del Modal con Altura Fija según Pestaña */}
                <div className="p-5 flex-1 bg-white overflow-hidden flex flex-col min-h-0">
                  
                  {/* TAB 1: HISTORIAL DE MULTAS */}
                  {multaModalTab === 'historial' && (
                    <div className="h-full overflow-y-auto pr-1 space-y-3">
                      {loadingMultasHistory ? (
                        <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-2">
                          <Loader2 size={24} className="animate-spin text-amber-500" />
                          <p className="text-xs font-medium">Cargando multas de esta tarea...</p>
                        </div>
                      ) : multasRegistradas.length === 0 ? (
                        <div className="py-12 text-center bg-slate-50 rounded-2xl border border-slate-200/80 p-6 my-auto">
                          <AlertTriangle size={32} className="mx-auto text-slate-300 mb-2" />
                          <p className="text-slate-700 font-bold text-sm">No hay multas registradas para esta tarea</p>
                          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                            Aún no se han aplicado sanciones económicas a los colaboradores asignados a esta tarea.
                          </p>
                          <button
                            type="button"
                            onClick={() => setMultaModalTab('nueva')}
                            className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm inline-flex items-center gap-1.5"
                          >
                            <Plus size={14} />
                            Registrar Primera Multa
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Resumen Total */}
                          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 flex items-center justify-between gap-4 shrink-0">
                            <div className="flex items-center gap-2">
                              <DollarSign size={17} className="text-amber-700" />
                              <span className="text-xs font-bold text-amber-900">Total Sancionado en esta Tarea:</span>
                            </div>
                            <span className="text-base font-extrabold text-amber-900">
                              ${multasRegistradas.reduce((acc, m) => acc + Number(m.monto || 0), 0).toFixed(2)}
                            </span>
                          </div>

                          {/* Lista de Multas */}
                          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                            {multasRegistradas.map((m) => (
                              <div key={m.id} className="p-3.5 hover:bg-slate-50/80 transition-colors flex items-start justify-between gap-3">
                                <div className="space-y-1 min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-bold text-slate-800">
                                      {getNombreEmpleado(m.empleadoId)}
                                    </span>
                                    {getQuincenaBadge(m.fecha)}
                                    <span className="text-[11px] text-slate-400 font-mono">
                                      {m.fecha}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-600 leading-snug bg-slate-50 p-2 rounded-lg border border-slate-100">
                                    {m.motivo ? m.motivo.replace(/\[TAREA:[^\]]+\]\s*/g, '') : 'Incumplimiento'}
                                  </p>
                                </div>

                                <div className="flex items-center gap-2.5 shrink-0">
                                  <span className="text-sm font-extrabold text-red-600 font-mono">
                                    -${Number(m.monto).toFixed(2)}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteMulta(m)}
                                    disabled={eliminandoMultaId === m.id}
                                    className="p-1.5 rounded-lg border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                                    title="Eliminar esta multa (Se descontará de Nómina)"
                                  >
                                    {eliminandoMultaId === m.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: REGISTRAR NUEVA MULTA (Sin Scrollbar) */}
                  {multaModalTab === 'nueva' && (
                    <form onSubmit={handleSaveMulta} className="h-full flex flex-col justify-between space-y-3 overflow-hidden">
                      <div className="space-y-3 overflow-hidden">
                        {multaError && (
                          <div className="px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                            {multaError}
                          </div>
                        )}

                        {/* Selección del Colaborador Asignado */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                            Colaborador Asignado a Multar *
                          </label>
                          {(multaTarea.asignaciones || []).length > 1 ? (
                            <div>
                              <select
                                value={multaUsuarioId}
                                onChange={(e) => setMultaUsuarioId(e.target.value)}
                                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                              >
                                {(multaTarea.asignaciones || []).map((a) => {
                                  const uId = a.userId || a.user?.id;
                                  const name = a.user?.nombre || a.user?.username || 'Usuario';
                                  const role = a.user?.rol ? ` (${a.user.rol})` : '';
                                  return (
                                    <option key={uId} value={uId}>
                                      {name}{role}
                                    </option>
                                  );
                                })}
                              </select>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                * Tarea con múltiples colaboradores. Selecciona a quién deseas multar individualmente.
                              </p>
                            </div>
                          ) : (multaTarea.asignaciones || []).length === 1 ? (
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                                {((multaTarea.asignaciones[0].user?.nombre || 'U').charAt(0)).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-800 truncate">
                                  {multaTarea.asignaciones[0].user?.nombre || multaTarea.asignaciones[0].user?.username}
                                </p>
                                <p className="text-[10px] text-slate-500 truncate">
                                  {multaTarea.asignaciones[0].user?.rol || 'Asignado único'}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-red-500">Esta tarea no posee colaboradores asignados.</p>
                          )}
                        </div>

                        {/* Monto de la Multa */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                            Monto Económico de la Multa ($) *
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">$</span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={multaMonto}
                              onChange={(e) => setMultaMonto(e.target.value)}
                              className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                              autoFocus
                            />
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            * Ingresa el monto en dólares sin ceros predeterminados.
                          </p>
                        </div>

                        {/* Fecha de Aplicación (Quincena) */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                            Fecha de Aplicación (Descuento en Nómina) *
                          </label>
                          <input
                            type="date"
                            value={multaFecha}
                            onChange={(e) => setMultaFecha(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            * Se reflejará en los Egresos / Multas de la 1ra o 2da quincena en Nómina según esta fecha.
                          </p>
                        </div>

                        {/* Concepto / Motivo */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                            Motivo / Concepto de la Multa *
                          </label>
                          <textarea
                            rows="2"
                            value={multaMotivo}
                            onChange={(e) => setMultaMotivo(e.target.value)}
                            placeholder="Ej: No realizó la tarea asignada / La marcó como realizada pero no fue ejecutada..."
                            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                          />
                        </div>
                      </div>

                      {/* Footer Modal Fijo al Fondo sin Scroll */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setMultaModalTab('historial')}
                          className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors"
                        >
                          Ver Historial
                        </button>
                        <button
                          type="submit"
                          disabled={multaSubmitting}
                          className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {multaSubmitting ? <Loader2 size={13} className="animate-spin" /> : <DollarSign size={13} />}
                          Registrar Multa en Nómina
                        </button>
                      </div>
                    </form>
                  )}

                </div>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}

