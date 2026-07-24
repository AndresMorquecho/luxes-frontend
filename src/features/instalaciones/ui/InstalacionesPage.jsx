import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProyectos } from '../../proyectos/application/hooks/useProyectos.js';
import {
  Wrench, Search, MapPin, Calendar, Clock, CheckCircle, Eye, ClipboardList, AlertTriangle,
} from 'lucide-react';
import { DateRangePicker } from '../../../shared/ui/components/DateRangePicker.jsx';
import {
  ComprasPageHeader,
} from '../../compras/ui/components/ComprasPageHeader';

const PRIORIDAD_CLS = {
  BAJA: 'bg-slate-100 text-slate-600',
  MEDIA: 'bg-blue-50 text-blue-700',
  ALTA: 'bg-amber-50 text-amber-700',
  URGENTE: 'bg-rose-50 text-rose-700',
};

const FASE_LABELS = {
  COTIZACION: 'Cotización',
  DISEÑO: 'Diseño',
  PRODUCCION: 'Producción',
  INSTALACION: 'Instalación',
  ENTREGA: 'Entrega',
  COMPLETADO: 'Completado',
};

function getInitials(name = '') {
  return name
    .split(' ')
    .filter((w) => w.length > 0)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function InstalacionesPage() {
  const navigate = useNavigate();
  const { todosLosProyectos } = useProyectos();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('EN_PROGRESO');
  const [fechas, setFechas] = useState({ start: '', end: '' });
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const proyectosInstalacion = todosLosProyectos.filter(
    (p) =>
      p.requiereInstalacion === true &&
      ['INSTALACION', 'ENTREGA', 'COMPLETADO'].includes(p.faseActual)
  );

  const getStarted = (p) =>
    !!(p.fases?.INSTALACION?.datos?.fechaInstalacion && p.fases?.INSTALACION?.datos?.horaInstalacion);
  const getFinished = (p) =>
    ['ENTREGA', 'COMPLETADO'].includes(p.faseActual) ||
    p.fases?.INSTALACION?.datos?.instalacionCompletada === true;

  const stats = {
    total: proyectosInstalacion.length,
    pendientes: proyectosInstalacion.filter(
      (p) => p.faseActual === 'INSTALACION' && !getFinished(p) && !getStarted(p)
    ).length,
    activas: proyectosInstalacion.filter(
      (p) => p.faseActual === 'INSTALACION' && !getFinished(p) && getStarted(p)
    ).length,
    completadas: proyectosInstalacion.filter((p) => getFinished(p)).length,
  };

  const kpiItems = [
    { label: 'Total proyectos', value: stats.total, border: 'border-t-blue-600', color: 'text-blue-600' },
    { label: 'Pendientes', value: stats.pendientes, border: 'border-t-amber-500', color: 'text-amber-600' },
    { label: 'En curso', value: stats.activas, border: 'border-t-orange-500', color: 'text-orange-600' },
    { label: 'Finalizadas', value: stats.completadas, border: 'border-t-emerald-500', color: 'text-emerald-600' },
  ];

  const tabs = [
    { id: 'EN_PROGRESO', label: `Pendientes / En Curso (${stats.pendientes + stats.activas})` },
    { id: 'PENDIENTES', label: `Por Iniciar (${stats.pendientes})` },
    { id: 'ACTIVAS', label: `En Montaje (${stats.activas})` },
    { id: 'COMPLETADAS', label: `Completadas (${stats.completadas})` },
    { id: 'TODAS', label: `Todas (${stats.total})` },
  ];

  const filteredInstallations = proyectosInstalacion.filter((p) => {
    const matchesSearch =
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.cliente.empresa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.fases?.INSTALACION?.datos?.direccionInstalacion || p.cliente.direccion || '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    let matchesTab = true;
    const isFinished = getFinished(p);
    const isStarted = getStarted(p);

    if (activeTab === 'EN_PROGRESO') matchesTab = !isFinished;
    else if (activeTab === 'PENDIENTES') matchesTab = p.faseActual === 'INSTALACION' && !isFinished && !isStarted;
    else if (activeTab === 'ACTIVAS') matchesTab = p.faseActual === 'INSTALACION' && !isFinished && isStarted;
    else if (activeTab === 'COMPLETADAS') matchesTab = isFinished;

    let matchesDates = true;
    const projDateStr = p.fases?.INSTALACION?.datos?.fechaInstalacion || p.fechaCreacion || p.fecha;
    if (projDateStr) {
      const projDate = new Date(projDateStr);
      if (fechas.start) {
        const start = new Date(fechas.start);
        start.setHours(0, 0, 0, 0);
        if (projDate < start) matchesDates = false;
      }
      if (fechas.end) {
        const end = new Date(fechas.end);
        end.setHours(23, 59, 59, 999);
        if (projDate > end) matchesDates = false;
      }
    }

    return matchesSearch && matchesTab && matchesDates;
  });

  useEffect(() => {
    setPage(1);
  }, [searchTerm, activeTab, fechas]);

  const total = filteredInstallations.length;
  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const paginatedInstallations = filteredInstallations.slice((page - 1) * LIMIT, page * LIMIT);

  const renderEstadoBadge = (proyecto) => {
    const datos = proyecto.fases?.INSTALACION?.datos || {};
    const isStarted = !!(datos.fechaInstalacion && datos.horaInstalacion);
    const isFinished =
      ['ENTREGA', 'COMPLETADO'].includes(proyecto.faseActual) || datos.instalacionCompletada === true;

    if (isFinished) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full text-xs font-medium px-2.5 py-1 bg-emerald-50 text-emerald-700">
          <CheckCircle size={12} /> Completada
        </span>
      );
    }
    if (proyecto.faseActual === 'INSTALACION') {
      return isStarted ? (
        <span className="inline-flex items-center gap-1 rounded-full text-xs font-medium px-2.5 py-1 bg-orange-50 text-orange-700">
          <Clock size={12} /> En Montaje
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full text-xs font-medium px-2.5 py-1 bg-amber-50 text-amber-700">
          <AlertTriangle size={12} /> Iniciar Montaje
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full text-xs font-medium px-2.5 py-1 bg-slate-100 text-slate-600">
        <ClipboardList size={12} /> {FASE_LABELS[proyecto.faseActual]}
      </span>
    );
  };

  const renderOcBadge = (proyecto) => {
    const ocDelProyecto = proyecto.ordenesCompra || [];
    if (!ocDelProyecto.length) return null;
    const ocPendiente = ocDelProyecto.find((oc) => oc.estado === 'PENDIENTE');
    const ocAprobada = ocDelProyecto.find((oc) => oc.estado === 'APROBADA');
    const ocRecibida = ocDelProyecto.find((oc) => oc.estado === 'RECIBIDA');
    const ocRechazada = ocDelProyecto.find((oc) => oc.estado === 'RECHAZADA');

    if (ocPendiente) return <span className="inline-flex items-center rounded-full text-xs font-medium px-2.5 py-1 bg-amber-50 text-amber-700">OC Pendiente</span>;
    if (ocAprobada) return <span className="inline-flex items-center rounded-full text-xs font-medium px-2.5 py-1 bg-blue-50 text-blue-700">OC Aprobada</span>;
    if (ocRecibida) return <span className="inline-flex items-center rounded-full text-xs font-medium px-2.5 py-1 bg-emerald-50 text-emerald-700">OC Recibida</span>;
    if (ocRechazada) return <span className="inline-flex items-center rounded-full text-xs font-medium px-2.5 py-1 bg-rose-50 text-rose-700">OC Rechazada</span>;
    return null;
  };

  const renderRowContent = (proyecto) => {
    const datosInstalacion = proyecto.fases?.INSTALACION?.datos || {};
    const personalAsignado = datosInstalacion.personalAsignado || [];
    const materiales = datosInstalacion.materiales || [];
    const prioridadCls = PRIORIDAD_CLS[proyecto.prioridad] || PRIORIDAD_CLS.MEDIA;

    return {
      datosInstalacion,
      personalAsignado,
      materiales,
      prioridadCls,
    };
  };

  return (
    <div
      className="space-y-3 sm:space-y-5 animate-slide-up pb-10"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <style>{`
        .shadow-card { box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02); }
      `}</style>

      <ComprasPageHeader
        icon={Wrench}
        badge="Operaciones"
        title="Instalaciones"
        subtitle="Gestión, planificación y seguimiento de montajes en sitio"
      />

      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {kpiItems.map((kpi) => (
          <div
            key={kpi.label}
            className={`bg-white shadow-card rounded-xl border border-gray-100 border-t-2 ${kpi.border} px-2.5 sm:px-4 py-3 sm:py-4 min-w-0`}
          >
            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{kpi.label}</p>
            <p className={`text-base sm:text-lg font-bold mt-1 tabular-nums ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="max-w-xs w-full sm:w-auto">
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Fechas</label>
          <DateRangePicker
            value={fechas}
            onChange={(val) => setFechas({ start: val.start, end: val.end })}
            placeholder="Rango de fechas"
            size="sm"
          />
        </div>
        <div className="flex items-center justify-end gap-1.5 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap shrink-0 ${
                activeTab === tab.id
                  ? 'bg-blue-900 text-white shadow-md'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-card'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white shadow-card rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-gray-800">Lista de instalaciones</h2>
            <span className="text-xs font-medium text-gray-400">{total} registros</span>
          </div>
          <div className="relative w-full sm:w-auto">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 bg-gray-50 focus:bg-white w-full sm:w-80 sm:min-w-[280px] transition-colors"
              placeholder="Buscar por proyecto, cliente o dirección…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {paginatedInstallations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <Wrench size={22} />
            </div>
            <h3 className="text-sm font-semibold text-slate-700">Sin instalaciones encontradas</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              No hay proyectos que coincidan con los filtros seleccionados.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto relative">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Proyecto</th>
                    <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                    <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Dirección / Fecha</th>
                    <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Equipo</th>
                    <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                    <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedInstallations.map((proyecto) => {
                    const { datosInstalacion, personalAsignado, materiales, prioridadCls } = renderRowContent(proyecto);
                    return (
                      <tr key={proyecto.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`inline-flex items-center rounded-full text-[10px] font-semibold px-2 py-0.5 ${prioridadCls}`}>
                              {proyecto.prioridad}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">{proyecto.id}</span>
                          </div>
                          <p className="text-sm font-semibold text-slate-900 leading-tight">{proyecto.nombre}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-slate-800">{proyecto.cliente.empresa}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{proyecto.cliente.nombre}</p>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-start gap-1.5 text-sm text-slate-700">
                            <MapPin size={14} className="text-slate-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-2">
                              {datosInstalacion.direccionInstalacion || proyecto.cliente.direccion || 'Sin dirección'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1.5">
                            <Calendar size={12} className="shrink-0" />
                            {datosInstalacion.fechaInstalacion && datosInstalacion.horaInstalacion
                              ? `${datosInstalacion.fechaInstalacion} · ${datosInstalacion.horaInstalacion}`
                              : 'Pendiente de arranque'}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {personalAsignado.length > 0 ? (
                            <div className="flex items-center -space-x-1.5">
                              {personalAsignado.slice(0, 4).map((p, i) => (
                                <span
                                  key={i}
                                  title={`${p.nombre} - ${p.rol}`}
                                  className="w-7 h-7 rounded-full bg-blue-50 text-blue-700 border border-white text-[10px] font-bold flex items-center justify-center"
                                >
                                  {getInitials(p.nombre)}
                                </span>
                              ))}
                              {personalAsignado.length > 4 && (
                                <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 border border-white text-[10px] font-bold flex items-center justify-center">
                                  +{personalAsignado.length - 4}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Sin personal</span>
                          )}
                          <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                            <Wrench size={11} />
                            {materiales.length > 0 ? `${materiales.length} materiales` : 'Sin materiales'}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col items-start gap-1.5">
                            {renderEstadoBadge(proyecto)}
                            {renderOcBadge(proyecto)}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => navigate(`/instalaciones/${proyecto.id}/materiales`)}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-500 border border-blue-100 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                            title="Ver proyecto"
                            aria-label="Ver proyecto"
                          >
                            <Eye size={16} strokeWidth={1.5} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-slate-100">
              {paginatedInstallations.map((proyecto) => {
                const { datosInstalacion, personalAsignado, materiales, prioridadCls } = renderRowContent(proyecto);
                return (
                  <div key={proyecto.id} className="px-4 py-3.5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center rounded-full text-[10px] font-semibold px-2 py-0.5 ${prioridadCls}`}>
                            {proyecto.prioridad}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">{proyecto.id}</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-900 leading-tight">{proyecto.nombre}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{proyecto.cliente.empresa}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate(`/instalaciones/${proyecto.id}/materiales`)}
                        className="p-1.5 rounded-lg bg-blue-50 text-blue-500 border border-blue-100 shrink-0"
                        title="Ver proyecto"
                      >
                        <Eye size={16} strokeWidth={1.5} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {renderEstadoBadge(proyecto)}
                      {renderOcBadge(proyecto)}
                    </div>
                    <div className="text-xs text-slate-500 space-y-1">
                      <p className="flex items-start gap-1.5">
                        <MapPin size={12} className="mt-0.5 shrink-0" />
                        <span className="line-clamp-2">
                          {datosInstalacion.direccionInstalacion || proyecto.cliente.direccion || 'Sin dirección'}
                        </span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Calendar size={12} />
                        {datosInstalacion.fechaInstalacion && datosInstalacion.horaInstalacion
                          ? `${datosInstalacion.fechaInstalacion} · ${datosInstalacion.horaInstalacion}`
                          : 'Pendiente de arranque'}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Wrench size={12} />
                        {personalAsignado.length} personal · {materiales.length} materiales
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="px-4 sm:px-5 py-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="text-xs text-slate-400 text-center sm:text-left">
                  {total} instalaciones · Página {page} de {totalPages}
                </p>
                <div className="flex items-center justify-center gap-1">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    Anterior
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 2)
                    .map((n, idx, arr) => {
                      const prev = arr[idx - 1];
                      const showDots = prev && n - prev > 1;
                      return (
                        <React.Fragment key={n}>
                          {showDots && <span className="text-xs text-slate-400 px-1">…</span>}
                          <button
                            type="button"
                            onClick={() => setPage(n)}
                            className={`w-7 h-7 rounded-lg text-[11px] font-semibold transition-colors ${
                              n === page ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'
                            }`}
                          >
                            {n}
                          </button>
                        </React.Fragment>
                      );
                    })}
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
