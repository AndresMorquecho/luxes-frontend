import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Search, Clock, CheckCircle2,
  AlertTriangle, MessageSquare, Phone, Mail,
  ExternalLink, Edit3, Loader2, RefreshCw, ShieldAlert, X,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { getReclamos, updateEstadoReclamo } from '../../application/encuestaService.js';
import { alertDialog } from '../../../../shared/ui/components/ConfirmModal';

const ESTADOS = [
  { id: 'TODOS', label: 'Todos' },
  { id: 'PENDIENTE', label: 'Pendientes' },
  { id: 'EN_REVISION', label: 'En Revisión' },
  { id: 'EN_PROCESO', label: 'En Proceso' },
  { id: 'FINALIZADO', label: 'Finalizados' },
];

const inputClass =
  'w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-gray-50 text-slate-700 focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-colors';

export function ReclamosPage() {
  const navigate = useNavigate();
  const [reclamos, setReclamos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');

  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [kpis, setKpis] = useState({ total: 0, pendientes: 0, enProceso: 0, finalizados: 0 });

  const [reclamoSeleccionado, setReclamoSeleccionado] = useState(null);
  const [nuevoEstado, setNuevoEstado] = useState('PENDIENTE');
  const [notasResolucion, setNotasResolucion] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargarReclamos = useCallback(async (pageTarget = 1, limitTarget = pagination.limit, q = busqueda, st = filtroEstado) => {
    setLoading(true);
    try {
      const res = await getReclamos({
        page: pageTarget,
        limit: limitTarget,
        search: q,
        estado: st,
      });

      if (res) {
        setReclamos(res.reclamos || []);
        if (res.pagination) setPagination(res.pagination);
        if (res.kpis) setKpis(res.kpis);
      }
    } catch (err) {
      await alertDialog('Error', 'No se pudieron cargar los reclamos: ' + err.message, { type: 'warning' });
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, busqueda, filtroEstado]);

  useEffect(() => {
    cargarReclamos(1, pagination.limit, busqueda, filtroEstado);
  }, [filtroEstado]);

  const handleBusquedaChange = (e) => {
    const val = e.target.value;
    setBusqueda(val);
    cargarReclamos(1, pagination.limit, val, filtroEstado);
  };

  const handleAbrirEditar = (rec) => {
    setReclamoSeleccionado(rec);
    setNuevoEstado(rec.estado || 'PENDIENTE');
    setNotasResolucion(rec.notasResolucion || '');
  };

  const handleGuardarEstado = async (e) => {
    e.preventDefault();
    if (!reclamoSeleccionado || guardando) return;
    setGuardando(true);
    try {
      await updateEstadoReclamo(reclamoSeleccionado.id, {
        estado: nuevoEstado,
        notasResolucion,
      });
      setReclamoSeleccionado(null);
      await cargarReclamos(pagination.page, pagination.limit, busqueda, filtroEstado);
    } catch (err) {
      await alertDialog('Error', 'No se pudo actualizar el estado: ' + err.message, { type: 'warning' });
    } finally {
      setGuardando(false);
    }
  };

  const renderBadgeEstado = (estado) => {
    switch (estado) {
      case 'PENDIENTE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock size={12} /> Pendiente
          </span>
        );
      case 'EN_REVISION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Clock size={12} /> En Revisión
          </span>
        );
      case 'EN_PROCESO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
            <MessageSquare size={12} /> En Proceso
          </span>
        );
      case 'FINALIZADO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={12} /> Finalizado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {estado}
          </span>
        );
    }
  };

  const formatFecha = (fecha, withTime = true) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-EC', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
    });
  };

  const kpiCards = [
    { label: 'Total reportes', value: kpis.total, hint: 'Todos los reclamos', border: 'border-t-blue-600', color: 'text-blue-600' },
    { label: 'Pendientes', value: kpis.pendientes, hint: 'Sin atender', border: 'border-t-amber-500', color: 'text-amber-600' },
    { label: 'En proceso', value: kpis.enProceso, hint: 'Revisión / proceso', border: 'border-t-sky-500', color: 'text-sky-600' },
    { label: 'Finalizados', value: kpis.finalizados, hint: 'Resueltos', border: 'border-t-emerald-500', color: 'text-emerald-600' },
  ];

  const tabClass = (active) =>
    `inline-flex items-center px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
      active
        ? 'bg-white text-blue-700 shadow-sm border border-blue-100'
        : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
    }`;

  return (
    <div
      className="space-y-3 sm:space-y-5 animate-slide-up pb-10 w-full"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <style>{`
        .shadow-card { box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02); }
        .recl-desktop-only { display: block; }
        .recl-mobile-only { display: none; }
        @media (max-width: 768px) {
          .recl-desktop-only { display: none !important; }
          .recl-mobile-only { display: block !important; }
        }
      `}</style>

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => navigate('/proyectos')}
              className="w-10 h-10 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 flex items-center justify-center shrink-0 transition-colors"
              title="Volver"
              aria-label="Volver a proyectos"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 bg-amber-50 border-amber-100">
              <ShieldAlert className="w-5 h-5 text-amber-600" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-800 leading-tight">Reclamos</h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-blue-100 text-blue-700">
                  Post-venta
                </span>
                {kpis.pendientes > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-white">
                    {kpis.pendientes} pendiente{kpis.pendientes > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-snug">
                Seguimiento de inconvenientes reportados por clientes
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => cargarReclamos(pagination.page, pagination.limit, busqueda, filtroEstado)}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-colors shrink-0 disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 max-sm:grid-cols-2 gap-2 sm:gap-3">
        {kpiCards.map(({ label, value, hint, border, color }) => (
          <div key={label} className={`bg-white shadow-card rounded-xl border border-gray-100 border-t-2 ${border} px-3 sm:px-4 py-3 sm:py-4 min-w-0`}>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{label}</p>
            <p className={`text-xl sm:text-2xl font-bold mt-1 tabular-nums ${color}`}>{value}</p>
            <p className="text-xs text-slate-400 mt-1 truncate">{hint}</p>
          </div>
        ))}
      </div>

      {/* Filtros: búsqueda + tabs */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="relative w-full sm:max-w-sm">
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Búsqueda</label>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className={inputClass}
              placeholder="Proyecto, cliente o problema…"
              value={busqueda}
              onChange={handleBusquedaChange}
            />
          </div>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar bg-slate-50/80 border border-slate-100 rounded-xl p-1">
          {ESTADOS.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setFiltroEstado(st.id)}
              className={tabClass(filtroEstado === st.id)}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white shadow-card rounded-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-2">
            <Loader2 size={28} className="animate-spin text-blue-500" />
            <p className="text-sm font-medium">Cargando reportes…</p>
          </div>
        ) : reclamos.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
              <AlertTriangle size={22} />
            </div>
            <p className="text-slate-700 font-semibold text-sm">No hay reclamos que coincidan</p>
            <p className="text-xs text-slate-400 mt-1">Prueba cambiando el estado o el término de búsqueda</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="recl-desktop-only overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/80">
                    <th className="text-left pl-5 pr-4 py-3">Proyecto</th>
                    <th className="text-left px-4 py-3">Cliente</th>
                    <th className="text-left px-4 py-3">Fecha</th>
                    <th className="text-left px-4 py-3 w-[32%]">Detalle</th>
                    <th className="text-center px-4 py-3">Estado</th>
                    <th className="text-right pr-5 py-3">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reclamos.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="pl-5 pr-4 py-4 align-top">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="font-bold text-slate-800 hover:text-blue-600 transition-colors text-left"
                            onClick={() => navigate(`/proyectos/${rec.proyectoId}`)}
                          >
                            {rec.proyectoNombre || rec.proyectoId}
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/proyectos/${rec.proyectoId}`)}
                            className="text-slate-400 hover:text-blue-500 transition-colors"
                            title="Ver proyecto"
                          >
                            <ExternalLink size={13} />
                          </button>
                        </div>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{rec.proyectoId}</p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        <p className="font-semibold text-slate-700">{rec.clienteNombre || 'Cliente'}</p>
                        {rec.clienteTelefono && (
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone size={11} className="text-slate-400" /> {rec.clienteTelefono}
                          </p>
                        )}
                        {rec.clienteEmail && (
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Mail size={11} className="text-slate-400" /> {rec.clienteEmail}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4 align-top text-xs text-slate-500 whitespace-nowrap">
                        {formatFecha(rec.fechaCreacion)}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <p className="text-slate-700 text-xs bg-gray-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed whitespace-pre-wrap">
                          {rec.detalle}
                        </p>
                        {rec.notasResolucion && (
                          <div className="mt-2 text-xs bg-emerald-50 text-emerald-800 p-2 rounded-xl border border-emerald-100">
                            <span className="font-bold">Resolución:</span> {rec.notasResolucion}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 align-top text-center whitespace-nowrap">
                        {renderBadgeEstado(rec.estado)}
                      </td>
                      <td className="pr-5 py-4 align-top text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleAbrirEditar(rec)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-100 rounded-xl transition-colors"
                        >
                          <Edit3 size={13} />
                          Gestionar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="recl-mobile-only divide-y divide-slate-100">
              {reclamos.map((rec) => (
                <div key={rec.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => navigate(`/proyectos/${rec.proyectoId}`)}
                        className="font-bold text-slate-800 hover:text-blue-600 text-sm text-left"
                      >
                        {rec.proyectoNombre || rec.proyectoId}
                      </button>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">{rec.proyectoId}</p>
                    </div>
                    {renderBadgeEstado(rec.estado)}
                  </div>
                  <div className="text-xs text-slate-500 space-y-1">
                    <p className="font-semibold text-slate-700">{rec.clienteNombre || 'Cliente'}</p>
                    <p>{formatFecha(rec.fechaCreacion)}</p>
                  </div>
                  <p className="text-xs text-slate-700 bg-gray-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed whitespace-pre-wrap">
                    {rec.detalle}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleAbrirEditar(rec)}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 rounded-xl"
                  >
                    <Edit3 size={13} />
                    Gestionar
                  </button>
                </div>
              ))}
            </div>

            {pagination.total > 0 && (
              <div className="px-4 sm:px-5 py-3.5 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span>Mostrar</span>
                  <select
                    value={pagination.limit}
                    onChange={(e) => cargarReclamos(1, Number(e.target.value), busqueda, filtroEstado)}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span className="text-slate-400">por página</span>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 flex-wrap">
                  <span>
                    <span className="font-bold text-slate-800">{(pagination.page - 1) * pagination.limit + 1}</span>
                    –
                    <span className="font-bold text-slate-800">{Math.min(pagination.page * pagination.limit, pagination.total)}</span>
                    {' '}de{' '}
                    <span className="font-bold text-slate-800">{pagination.total}</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => cargarReclamos(pagination.page - 1, pagination.limit, busqueda, filtroEstado)}
                      disabled={pagination.page <= 1 || loading}
                      className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 font-bold rounded-xl border border-blue-100">
                      {pagination.page} / {pagination.totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => cargarReclamos(pagination.page + 1, pagination.limit, busqueda, filtroEstado)}
                      disabled={pagination.page >= pagination.totalPages || loading}
                      className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {reclamoSeleccionado && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/55 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 sm:px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                  <ShieldAlert size={18} />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base sm:text-lg font-bold text-slate-800 truncate">Gestionar reclamo</h3>
                  <p className="text-xs text-slate-500 truncate">
                    {reclamoSeleccionado.proyectoNombre || reclamoSeleccionado.proyectoId}
                    <span className="text-slate-400"> · {reclamoSeleccionado.proyectoId}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {renderBadgeEstado(reclamoSeleccionado.estado)}
                <button
                  type="button"
                  onClick={() => setReclamoSeleccionado(null)}
                  className="w-9 h-9 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-white flex items-center justify-center transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50/40 grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-5">
              <div className="md:col-span-5 space-y-4">
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-card space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cliente</h4>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{reclamoSeleccionado.clienteNombre || 'Cliente'}</p>
                    {reclamoSeleccionado.clienteTelefono && (
                      <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-1">
                        <Phone size={13} className="text-blue-500 shrink-0" />
                        <a href={`tel:${reclamoSeleccionado.clienteTelefono}`} className="hover:underline">
                          {reclamoSeleccionado.clienteTelefono}
                        </a>
                      </p>
                    )}
                    {reclamoSeleccionado.clienteEmail && (
                      <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-1">
                        <Mail size={13} className="text-blue-500 shrink-0" />
                        <a href={`mailto:${reclamoSeleccionado.clienteEmail}`} className="hover:underline">
                          {reclamoSeleccionado.clienteEmail}
                        </a>
                      </p>
                    )}
                  </div>
                  <div className="border-t border-slate-100 pt-2 text-xs text-slate-400">
                    Reporte:{' '}
                    <span className="text-slate-600 font-medium">
                      {reclamoSeleccionado.fechaCreacion
                        ? new Date(reclamoSeleccionado.fechaCreacion).toLocaleString('es-EC')
                        : '-'}
                    </span>
                  </div>
                </div>

                <div className="bg-amber-50/70 border border-amber-100 p-4 rounded-xl space-y-2">
                  <h4 className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare size={13} /> Problema reportado
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed bg-white/80 p-3 rounded-xl border border-amber-100 whitespace-pre-wrap">
                    {reclamoSeleccionado.detalle}
                  </p>
                </div>
              </div>

              <div className="md:col-span-7 bg-white p-4 sm:p-5 rounded-xl border border-gray-100 shadow-card">
                <form id="form-estado-reclamo" onSubmit={handleGuardarEstado} className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-2">Estado del reclamo</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'PENDIENTE', label: 'Pendiente', color: 'border-amber-200 bg-amber-50 text-amber-900', icon: Clock },
                        { id: 'EN_REVISION', label: 'En Revisión', color: 'border-blue-200 bg-blue-50 text-blue-900', icon: Clock },
                        { id: 'EN_PROCESO', label: 'En Proceso', color: 'border-sky-200 bg-sky-50 text-sky-900', icon: MessageSquare },
                        { id: 'FINALIZADO', label: 'Finalizado', color: 'border-emerald-200 bg-emerald-50 text-emerald-900', icon: CheckCircle2 },
                      ].map((st) => {
                        const IconComponent = st.icon;
                        const esSeleccionado = nuevoEstado === st.id;
                        return (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => setNuevoEstado(st.id)}
                            className={`p-3 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between gap-2 ${
                              esSeleccionado
                                ? `${st.color} shadow-sm ring-2 ring-blue-500/20`
                                : 'border-slate-200 text-slate-600 bg-gray-50 hover:bg-slate-100'
                            }`}
                          >
                            <span>{st.label}</span>
                            <IconComponent size={15} className={esSeleccionado ? 'opacity-100' : 'opacity-40'} />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                      Notas de resolución
                    </label>
                    <textarea
                      rows="4"
                      value={notasResolucion}
                      onChange={(e) => setNotasResolucion(e.target.value)}
                      placeholder="Soluciones, acuerdos o motivo del cambio de estado…"
                      className="w-full p-3 text-sm bg-gray-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:outline-none resize-none text-slate-800 transition-colors"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Quedan registradas como historial interno de seguimiento.
                    </p>
                  </div>
                </form>
              </div>
            </div>

            <div className="px-5 sm:px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setReclamoSeleccionado(null)}
                disabled={guardando}
                className="px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="form-estado-reclamo"
                disabled={guardando}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {guardando ? <Loader2 size={16} className="animate-spin" /> : null}
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
