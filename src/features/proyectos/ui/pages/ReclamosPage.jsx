import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Search, Clock, CheckCircle2,
  AlertTriangle, MessageSquare, Phone, Mail,
  ExternalLink, Edit3, Loader2, RefreshCw, ShieldAlert, X,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { getReclamos, updateEstadoReclamo } from '../../application/encuestaService.js';
import { alertDialog } from '../../../../shared/ui/components/ConfirmModal';

const ESTADOS = [
  { id: 'TODOS', label: 'Todos' },
  { id: 'PENDIENTE', label: 'Pendientes', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'EN_REVISION', label: 'En Revisión', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'EN_PROCESO', label: 'En Proceso', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'FINALIZADO', label: 'Finalizados', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
];

export function ReclamosPage() {
  const navigate = useNavigate();
  const [reclamos, setReclamos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');

  // Estado de paginación y KPIs desde el backend
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [kpis, setKpis] = useState({ total: 0, pendientes: 0, enProceso: 0, finalizados: 0 });

  // Estado para modal de cambio de estado
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
        if (res.pagination) {
          setPagination(res.pagination);
        }
        if (res.kpis) {
          setKpis(res.kpis);
        }
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

  // Manejador de búsqueda con debounce
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
      // Recargar lista manteniendo página
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
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <Clock size={12} /> En Proceso
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
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            {estado}
          </span>
        );
    }
  };

  return (
    <div className="pb-10 space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4 flex-wrap shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/proyectos')}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="Volver a Proyectos"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800">Reclamos y Seguimiento Post-Venta</h1>
              {kpis.pendientes > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white animate-pulse">
                  {kpis.pendientes} pendiente{kpis.pendientes > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">Atención e inconvenientes reportados por clientes al finalizar encuestas</p>
          </div>
        </div>

        <button
          onClick={() => cargarReclamos(pagination.page, pagination.limit, busqueda, filtroEstado)}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-xs transition-colors shrink-0"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* KPI Cards desde Backend */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
            <ShieldAlert size={20} />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{kpis.total}</p>
            <p className="text-xs text-slate-500">Total reportes</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-700">{kpis.pendientes}</p>
            <p className="text-xs text-slate-500">Pendientes de atención</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <MessageSquare size={20} />
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-700">{kpis.enProceso}</p>
            <p className="text-xs text-slate-500">En revisión / proceso</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-700">{kpis.finalizados}</p>
            <p className="text-xs text-slate-500">Finalizados / Resueltos</p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Buscador */}
        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Buscar por proyecto, cliente o problema..."
            value={busqueda}
            onChange={handleBusquedaChange}
          />
        </div>

        {/* Tabs de Filtro de Estado */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {ESTADOS.map((st) => (
            <button
              key={st.id}
              onClick={() => setFiltroEstado(st.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                filtroEstado === st.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de Reclamos */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {loading ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-2">
            <Loader2 size={28} className="animate-spin text-blue-500" />
            <p className="text-sm font-medium">Cargando reportes...</p>
          </div>
        ) : reclamos.length === 0 ? (
          <div className="py-16 text-center">
            <AlertTriangle size={36} className="mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500 font-semibold text-base">No hay reclamos que coincidan</p>
            <p className="text-xs text-slate-400 mt-1">Prueba cambiando el estado o el término de búsqueda</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50">
                    <th className="text-left pl-5 pr-4 py-3">Proyecto</th>
                    <th className="text-left px-4 py-3">Cliente / Contacto</th>
                    <th className="text-left px-4 py-3">Fecha Reporte</th>
                    <th className="text-left px-4 py-3 w-[35%]">Detalle del Inconveniente</th>
                    <th className="text-center px-4 py-3">Estado</th>
                    <th className="text-right pr-5 py-3">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reclamos.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="pl-5 pr-4 py-4 align-top">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 hover:text-blue-600 transition-colors cursor-pointer" onClick={() => navigate(`/proyectos/${rec.proyectoId}`)}>
                            {rec.proyectoNombre || rec.proyectoId}
                          </span>
                          <button
                            onClick={() => navigate(`/proyectos/${rec.proyectoId}`)}
                            className="text-slate-400 hover:text-blue-500 transition-colors"
                            title="Ver detalle del proyecto"
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
                        {rec.fechaCreacion ? new Date(rec.fechaCreacion).toLocaleDateString('es-EC', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }) : '-'}
                      </td>

                      <td className="px-4 py-4 align-top">
                        <p className="text-slate-800 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 leading-relaxed font-medium whitespace-pre-wrap">
                          "{rec.detalle}"
                        </p>
                        {rec.notasResolucion && (
                          <div className="mt-2 text-xs bg-emerald-50 text-emerald-800 p-2 rounded-lg border border-emerald-100">
                            <span className="font-bold">Nota de resolución:</span> {rec.notasResolucion}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4 align-top text-center whitespace-nowrap">
                        {renderBadgeEstado(rec.estado)}
                      </td>

                      <td className="pr-5 py-4 align-top text-right whitespace-nowrap">
                        <button
                          onClick={() => handleAbrirEditar(rec)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 rounded-lg transition-colors shadow-sm"
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

            {/* Footer de Paginación Backend */}
            {pagination.total > 0 && (
              <div className="px-5 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4 flex-wrap text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <span>Mostrar</span>
                  <select
                    value={pagination.limit}
                    onChange={(e) => {
                      const newLimit = Number(e.target.value);
                      cargarReclamos(1, newLimit, busqueda, filtroEstado);
                    }}
                    className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 font-bold"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span>registros por página</span>
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                  <span>
                    Mostrando <span className="font-bold text-slate-800">{(pagination.page - 1) * pagination.limit + 1}</span> a{' '}
                    <span className="font-bold text-slate-800">
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>{' '}
                    de <span className="font-bold text-slate-800">{pagination.total}</span> reclamos
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => cargarReclamos(pagination.page - 1, pagination.limit, busqueda, filtroEstado)}
                      disabled={pagination.page <= 1 || loading}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white transition-colors"
                      title="Página anterior"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    <span className="px-3 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-200">
                      {pagination.page} / {pagination.totalPages}
                    </span>

                    <button
                      onClick={() => cargarReclamos(pagination.page + 1, pagination.limit, busqueda, filtroEstado)}
                      disabled={pagination.page >= pagination.totalPages || loading}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white transition-colors"
                      title="Página siguiente"
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

      {/* Modal Widescreen para Gestión de Reclamo */}
      {reclamoSeleccionado && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            
            {/* Header del Modal */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800">
                    Gestionar Reclamo Post-Venta
                  </h3>
                  <p className="text-xs text-slate-500">
                    Proyecto: <span className="font-semibold text-slate-700">{reclamoSeleccionado.proyectoNombre || reclamoSeleccionado.proyectoId}</span> ({reclamoSeleccionado.proyectoId})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {renderBadgeEstado(reclamoSeleccionado.estado)}
                <button
                  onClick={() => setReclamoSeleccionado(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
                  title="Cerrar"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Cuerpo del Modal (2 Columnas) */}
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50 grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Columna Izquierda: Información del Cliente y Queja */}
              <div className="md:col-span-5 space-y-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Información del Cliente
                  </h4>

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
                    Fecha de reporte:{' '}
                    <span className="text-slate-600 font-medium">
                      {reclamoSeleccionado.fechaCreacion
                        ? new Date(reclamoSeleccionado.fechaCreacion).toLocaleString('es-EC')
                        : '-'}
                    </span>
                  </div>
                </div>

                {/* Detalle del Inconveniente */}
                <div className="bg-amber-50/60 border border-amber-200/80 p-4 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <MessageSquare size={13} /> Queja / Problema Reportado
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium bg-white/80 p-3 rounded-lg border border-amber-200/60 whitespace-pre-wrap">
                    "{reclamoSeleccionado.detalle}"
                  </p>
                </div>
              </div>

              {/* Columna Derecha: Formulario de Actualización */}
              <div className="md:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-5">
                <form id="form-estado-reclamo" onSubmit={handleGuardarEstado} className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                      Cambiar Estado del Reclamo
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {[
                        { id: 'PENDIENTE', label: 'Pendiente', color: 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100', icon: Clock },
                        { id: 'EN_REVISION', label: 'En Revisión', color: 'border-blue-300 bg-blue-50 text-blue-900 hover:bg-blue-100', icon: Clock },
                        { id: 'EN_PROCESO', label: 'En Proceso', color: 'border-purple-300 bg-purple-50 text-purple-900 hover:bg-purple-100', icon: Clock },
                        { id: 'FINALIZADO', label: 'Finalizado', color: 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100', icon: CheckCircle2 },
                      ].map((st) => {
                        const IconComponent = st.icon;
                        const esSeleccionado = nuevoEstado === st.id;
                        return (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => setNuevoEstado(st.id)}
                            className={`p-3.5 rounded-xl text-xs font-bold border transition-all text-left flex items-center justify-between gap-2 ${
                              esSeleccionado
                                ? `${st.color} shadow-sm ring-2 ring-blue-500/30 scale-[1.02]`
                                : 'border-slate-200 text-slate-600 bg-slate-50 hover:bg-slate-100'
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
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                      Notas de Resolución / Atención al Cliente
                    </label>
                    <textarea
                      rows="4"
                      value={notasResolucion}
                      onChange={(e) => setNotasResolucion(e.target.value)}
                      placeholder="Escribe aquí las soluciones brindadas, acuerdos alcanzados o el motivo del cambio de estado..."
                      className="w-full p-3.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-400 focus:outline-none resize-none text-slate-800"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      * Estas notas quedan registradas como historial interno de seguimiento.
                    </p>
                  </div>
                </form>
              </div>
            </div>

            {/* Footer Fijo del Modal */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setReclamoSeleccionado(null)}
                disabled={guardando}
                className="px-5 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-xs sm:text-sm rounded-xl transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="form-estado-reclamo"
                disabled={guardando}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {guardando ? <Loader2 size={16} className="animate-spin" /> : null}
                Guardar Cambios
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
