import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Wrench, Clock, User, CheckCircle2, Search, X, Undo2,
} from 'lucide-react';
import { getPrestamos, devolverPrestamo, sincronizarDevolucionesInstalacion } from '../application/inventarioService.js';
import { isAdminUser } from '../../../shared/utils/userRoleHelpers.js';
import { DateRangePicker } from '../../../shared/ui/components/DateRangePicker.jsx';
import { toast } from '../../../shared/ui/components/Toast.jsx';
import { ComprasPageHeader } from '../../compras/ui/components/ComprasPageHeader';
import { unidadLabel } from './prestamosUtils.js';

const elapsed = (fechaSalida) => {
  const diff = Date.now() - new Date(fechaSalida).getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const fmtDate = (d) => (d
  ? new Date(d).toLocaleString('es-EC', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  : '—');

function getEncargadoDisplay(prestamo) {
  const match = (prestamo.comentarios || '').match(/Encargado:\s*([^|]+)/i);
  if (match?.[1]) return match[1].trim();
  return prestamo.responsable?.nombre || 'Desconocido';
}

const inputClass =
  'w-full h-10 px-3 border border-slate-200 rounded-xl bg-gray-50 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-colors';

export function DevolucionesPage() {
  const currentUser = useMemo(
    () => JSON.parse(localStorage.getItem('user') || 'null'),
    [],
  );
  const esAdmin = isAdminUser(currentUser);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchTool, setSearchTool] = useState('');
  const [filterPersona, setFilterPersona] = useState('');
  const [personas, setPersonas] = useState([]);
  const [filterEstado, setFilterEstado] = useState('prestado');
  const [returningId, setReturningId] = useState(null);
  const [fechas, setFechas] = useState({ start: '', end: '' });
  const [stats, setStats] = useState({ pendientes: 0, devueltos: 0 });

  const LIMIT = 20;

  const loadStats = useCallback(async () => {
    try {
      const [resPend, resHist] = await Promise.all([
        getPrestamos({ estado: 'prestado', page: 1, limit: 1 }),
        getPrestamos({ estado: 'devuelto', page: 1, limit: 1 }),
      ]);
      setStats({
        pendientes: resPend.total ?? (Array.isArray(resPend) ? resPend.length : 0),
        devueltos: resHist.total ?? (Array.isArray(resHist) ? resHist.length : 0),
      });
    } catch (e) {
      console.error('Error fetching loan counts:', e);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPrestamos({
        estado: filterEstado,
        page,
        limit: LIMIT,
        fechaInicio: fechas.start || undefined,
        fechaFin: fechas.end || undefined,
        searchTool: searchTool || undefined,
        filterPersona: filterPersona || undefined,
      });

      if (data && typeof data === 'object' && 'items' in data) {
        setItems(data.items || []);
        setTotal(data.total || 0);
      } else {
        setItems(data || []);
        setTotal((data || []).length);
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [filterEstado, page, fechas, searchTool, filterPersona]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await sincronizarDevolucionesInstalacion();
      } catch (err) {
        console.error('Sync devoluciones instalación:', err);
      }
      if (!cancelled) {
        loadData();
        loadStats();
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!esAdmin) return undefined;
    const fetchPersonas = async () => {
      try {
        const { getEmpleados } = await import('../../empleados/application/empleadosService.js');
        const emps = await getEmpleados();
        if (Array.isArray(emps)) {
          const names = emps.map((e) => e.nombre).filter(Boolean);
          setPersonas([...new Set(names)].sort());
        }
      } catch (e) {
        console.error('Error loading employees for filter:', e);
      }
    };
    fetchPersonas();
    return undefined;
  }, [esAdmin]);

  useEffect(() => {
    setPage(1);
  }, [searchTool, filterPersona, filterEstado, fechas]);

  const filtered = items;

  const handleDevolucion = async (prestamo) => {
    if (!prestamo?.id || returningId) return;
    setReturningId(prestamo.id);
    try {
      await devolverPrestamo(prestamo.id);
      toast.success(`"${prestamo.material?.nombre}" devuelta correctamente.`);
      loadData();
      loadStats();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setReturningId(null);
    }
  };

  const clearFilters = () => {
    setSearchTool('');
    setFilterPersona('');
    setFechas({ start: '', end: '' });
  };
  const hasFilters = !!(searchTool || filterPersona || fechas.start || fechas.end);

  const totalPages = Math.ceil(total / LIMIT) || 1;

  const load = () => {
    loadData();
    loadStats();
  };

  const emptyMessage = hasFilters
    ? 'No hay registros que coincidan con los filtros.'
    : filterEstado === 'prestado'
      ? 'No hay herramientas pendientes por devolver.'
      : 'No hay devoluciones recientes.';

  const colSpan = filterEstado === 'devuelto' ? 8 : 8;

  return (
    <div
      className="space-y-3 sm:space-y-5 animate-slide-up pb-10"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <style>{`
        .shadow-card { box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02); }
      `}</style>

      <ComprasPageHeader
        icon={Undo2}
        badge="Taller"
        title="Devoluciones"
        subtitle={
          esAdmin
            ? 'Herramientas y equipos que salieron con un encargado'
            : 'Tus herramientas y equipos pendientes por devolver'
        }
      />

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div className="bg-white shadow-card rounded-xl border border-gray-100 border-t-2 border-t-amber-500 px-2.5 sm:px-4 py-3 sm:py-4 min-w-0">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Por devolver</p>
          <p className="text-base sm:text-lg font-bold text-amber-600 mt-1 tabular-nums">{stats.pendientes}</p>
        </div>
        <div className="bg-white shadow-card rounded-xl border border-gray-100 border-t-2 border-t-emerald-500 px-2.5 sm:px-4 py-3 sm:py-4 min-w-0">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Devueltas</p>
          <p className="text-base sm:text-lg font-bold text-emerald-600 mt-1 tabular-nums">{stats.devueltos}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mt-1 sm:mt-2">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3 min-w-0">
          {esAdmin && (
            <div className="min-w-0 w-full sm:w-52">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Persona</label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  className={`${inputClass} pl-9`}
                  value={filterPersona}
                  onChange={(e) => setFilterPersona(e.target.value)}
                >
                  <option value="">Todas las personas</option>
                  {personas.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          <div className="max-w-xs w-full sm:w-auto">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Fechas</label>
            <DateRangePicker
              value={fechas}
              onChange={(val) => setFechas({ start: val.start, end: val.end })}
              placeholder="Rango de fechas"
              size="sm"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {[
            { val: 'prestado', label: `Pendientes (${stats.pendientes})` },
            { val: 'devuelto', label: 'Historial' },
          ].map((opt) => (
            <button
              key={opt.val}
              type="button"
              onClick={() => setFilterEstado(opt.val)}
              className={`inline-flex items-center px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${
                filterEstado === opt.val
                  ? 'bg-blue-50 text-blue-700 border border-blue-100 shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 border border-slate-200 bg-white hover:bg-slate-50 shrink-0"
            >
              <X size={13} /> Limpiar
            </button>
          )}
        </div>
      </div>

      <div className="bg-white shadow-card rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-gray-800">
              {filterEstado === 'prestado' ? 'Pendientes por devolver' : 'Historial de devoluciones'}
            </h2>
            <span className="text-xs font-medium text-gray-400">{total} registros</span>
          </div>
          <div className="relative w-full sm:w-auto">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="pl-10 pr-9 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 bg-gray-50 focus:bg-white w-full sm:w-80 sm:min-w-[280px] transition-colors"
              placeholder="Buscar herramienta…"
              value={searchTool}
              onChange={(e) => setSearchTool(e.target.value)}
            />
            {searchTool && (
              <button
                type="button"
                onClick={() => setSearchTool('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400 text-sm">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-200 border-t-blue-500" />
            <span>Cargando devoluciones…</span>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto relative">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Herramienta</th>
                    <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Encargado</th>
                    <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cantidad</th>
                    <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Fecha salida</th>
                    <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tiempo / Retorno</th>
                    <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                    <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Motivo</th>
                    {filterEstado === 'devuelto' && (
                      <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Observación</th>
                    )}
                    {filterEstado === 'prestado' && (
                      <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={colSpan} className="text-center py-12 text-sm text-slate-400">
                        {emptyMessage}
                      </td>
                    </tr>
                  ) : filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                            <Wrench size={14} />
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 leading-tight truncate">
                              {p.material?.nombre || '—'}
                            </p>
                            {p.material?.codigo && (
                              <p className="text-xs text-slate-400 font-mono mt-0.5">{p.material.codigo}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-slate-800">{getEncargadoDisplay(p)}</p>
                        <p className="text-xs text-slate-400 mt-0.5">@{p.responsable?.username || '—'}</p>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700 tabular-nums">
                        {p.cantidad}{' '}
                        <span className="text-slate-400 text-xs">{unidadLabel(p.material?.unidadMedida)}</span>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600 whitespace-nowrap">{fmtDate(p.fechaSalida)}</td>
                      <td className="px-5 py-4">
                        {p.estado === 'prestado' ? (
                          <span className="inline-flex items-center gap-1 rounded-full text-xs font-medium px-2.5 py-1 bg-amber-50 text-amber-700">
                            <Clock size={12} />
                            {elapsed(p.fechaSalida)} fuera
                          </span>
                        ) : (
                          <span className="text-sm text-slate-600 whitespace-nowrap">{fmtDate(p.fechaRetorno)}</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full text-xs font-medium px-2.5 py-1 ${
                            p.estado === 'prestado'
                              ? 'bg-orange-50 text-orange-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {p.estado === 'prestado' ? <Clock size={12} /> : <CheckCircle2 size={12} />}
                          {p.estado === 'prestado' ? 'Fuera' : 'Devuelta'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500 max-w-[180px]">
                        <span className="line-clamp-2">{p.comentarios || '—'}</span>
                      </td>
                      {filterEstado === 'devuelto' && (
                        <td className="px-5 py-4 text-sm text-slate-500 max-w-[180px]">
                          <span className="line-clamp-2">{p.observacionDevolucion || '—'}</span>
                        </td>
                      )}
                      {filterEstado === 'prestado' && (
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            disabled={returningId === p.id}
                            onClick={() => handleDevolucion(p)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 hover:text-emerald-800 transition-colors disabled:opacity-50"
                            title="Registrar devolución"
                          >
                            <Undo2 size={14} strokeWidth={1.5} />
                            {returningId === p.id ? 'Registrando…' : 'Devolver'}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <div className="text-center py-12 text-sm text-slate-400 px-4">{emptyMessage}</div>
              ) : (
                filtered.map((p) => (
                  <div key={p.id} className="px-4 py-3.5">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                          <Wrench size={14} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{p.material?.nombre || '—'}</p>
                          {p.material?.codigo && (
                            <p className="text-xs text-slate-400 font-mono">{p.material.codigo}</p>
                          )}
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full text-xs font-medium px-2.5 py-1 shrink-0 ${
                          p.estado === 'prestado'
                            ? 'bg-orange-50 text-orange-700'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}
                      >
                        {p.estado === 'prestado' ? 'Fuera' : 'Devuelta'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Encargado</span>
                        <span className="font-semibold text-slate-800">{getEncargadoDisplay(p)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Cantidad</span>
                        <span className="font-medium text-slate-700">
                          {p.cantidad} {unidadLabel(p.material?.unidadMedida)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Salida</span>
                        <span className="font-medium text-slate-600">{fmtDate(p.fechaSalida)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">
                          {p.estado === 'prestado' ? 'Tiempo fuera' : 'Retorno'}
                        </span>
                        <span className="font-medium text-slate-600">
                          {p.estado === 'prestado' ? elapsed(p.fechaSalida) : fmtDate(p.fechaRetorno)}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 block text-[10px]">Motivo</span>
                        <span className="text-slate-600">{p.comentarios || '—'}</span>
                      </div>
                      {filterEstado === 'devuelto' && (
                        <div className="col-span-2">
                          <span className="text-slate-400 block text-[10px]">Observación</span>
                          <span className="text-slate-600">{p.observacionDevolucion || '—'}</span>
                        </div>
                      )}
                    </div>
                    {filterEstado === 'prestado' && (
                      <button
                        type="button"
                        disabled={returningId === p.id}
                        onClick={() => handleDevolucion(p)}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                      >
                        <Undo2 size={14} />
                        {returningId === p.id ? 'Registrando…' : 'Devolución realizada'}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {totalPages > 1 && (
              <div className="px-4 sm:px-5 py-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="text-xs text-slate-400 text-center sm:text-left">
                  {total} registros · Página {page} de {totalPages}
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
