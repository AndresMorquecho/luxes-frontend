import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Eye } from 'lucide-react';
import { getOrdenes, getProveedores } from '../../../compras/application/comprasService';
import { toast } from '../../../../shared/ui/components/Toast';
import { RecepcionNav } from './RecepcionNav';
import { ComprasPageHeader } from '../../../compras/ui/components/ComprasPageHeader';
import { DateRangePicker } from '../../../../shared/ui/components/DateRangePicker.jsx';
import { formatDateTimeES } from '../../../../shared/utils/dateOnly.js';
import '../../../compras/ui/pages/ComprasPage.css';

const fmt = (n) => '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const fmtDateTime = (d) => formatDateTimeES(d);

const inputFocus =
  'outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:bg-white';

const countRecibidos = (orden) =>
  (orden.detalles || []).filter((d) => (d.cantidadRecibida ?? 0) > 0).length;

const countInventario = (orden) =>
  (orden.detalles || []).filter((d) => d.descargableInventario && (d.cantidadRecibida ?? 0) > 0).length;

export const HistorialRecepcionesPage = ({ basePath = '/compras/recepcion' }) => {
  const navigate = useNavigate();
  const [user] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const userRole = (user?.rol || '').toUpperCase();
  const isImpresion = userRole === 'IMPRESIÓN' || userRole === 'IMPRESION';
  const isTaller = userRole === 'TALLER';

  const [ordenes, setOrdenes] = useState([]);
  const [statsOrdenes, setStatsOrdenes] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [fechas, setFechas] = useState({ start: '', end: '' });
  const [filterProveedorId, setFilterProveedorId] = useState('');
  const [filterSolicitanteId, setFilterSolicitanteId] = useState('');
  const [proveedores, setProveedores] = useState([]);
  const perPage = 25;
  const searchTimer = useRef(null);

  const listFilters = useMemo(() => ({
    search: search || undefined,
    estado: 'recibida',
    creadorRol: (isImpresion || isTaller) ? user?.rol : undefined,
    proveedorId: filterProveedorId || undefined,
    creadorId: filterSolicitanteId || undefined,
    fechaInicio: fechas.start || undefined,
    fechaFin: fechas.end || undefined,
  }), [search, isImpresion, isTaller, user, filterProveedorId, filterSolicitanteId, fechas]);

  const loadProveedores = useCallback(async () => {
    try {
      const list = await getProveedores();
      setProveedores(Array.isArray(list) ? list : []);
    } catch {
      setProveedores([]);
    }
  }, []);

  const loadOrdenes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOrdenes({ page, limit: perPage, ...listFilters });
      setOrdenes(data.items || []);
      setTotal(data.total || 0);
    } catch {
      setOrdenes([]);
      setTotal(0);
      toast.error('Error al cargar el historial de productos recibidos');
    } finally {
      setLoading(false);
    }
  }, [page, listFilters]);

  const loadStats = useCallback(async () => {
    try {
      const data = await getOrdenes({ page: 1, limit: 500, ...listFilters });
      setStatsOrdenes(data.items || []);
    } catch {
      setStatsOrdenes([]);
    }
  }, [listFilters]);

  useEffect(() => {
    loadProveedores();
  }, [loadProveedores]);

  useEffect(() => {
    loadOrdenes();
    loadStats();
  }, [loadOrdenes, loadStats]);

  useEffect(() => {
    setPage(1);
  }, [search, fechas, filterProveedorId, filterSolicitanteId]);

  const solicitantes = useMemo(() => {
    const map = new Map();
    statsOrdenes.forEach((o) => {
      if (o.usuario?.id) map.set(o.usuario.id, o.usuario);
    });
    return [...map.values()];
  }, [statsOrdenes]);

  const kpiStats = useMemo(() => {
    const items = statsOrdenes;
    return {
      ordenesRecibidas: total,
      itemsRecibidos: items.reduce((s, o) => s + countRecibidos(o), 0),
      valorTotal: items.reduce((s, o) => s + Number(o.total || 0), 0),
      aInventario: items.reduce((s, o) => s + countInventario(o), 0),
    };
  }, [statsOrdenes, total]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(val), 350);
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const showingFrom = total === 0 ? 0 : (page - 1) * perPage + 1;
  const showingTo = Math.min(page * perPage, total);

  const kpiItems = [
    { label: 'Órdenes recibidas', value: kpiStats.ordenesRecibidas, border: 'border-t-blue-600', color: 'text-blue-600' },
    { label: 'Items recibidos', value: kpiStats.itemsRecibidos, border: 'border-t-violet-500', color: 'text-violet-600' },
    ...(!isTaller
      ? [{ label: 'Valor total recibido', value: fmt(kpiStats.valorTotal), border: 'border-t-emerald-500', color: 'text-emerald-600' }]
      : []),
    { label: 'Items a inventario', value: kpiStats.aInventario, border: 'border-t-orange-500', color: 'text-orange-500' },
  ];

  const renderFilters = () => (
    <div className="grid gap-2 grid-cols-1 sm:grid-cols-3">
      <select
        value={filterProveedorId}
        onChange={(e) => setFilterProveedorId(e.target.value)}
        className={`h-10 px-3 border border-slate-200 rounded-xl bg-gray-50 text-sm text-slate-700 ${inputFocus} min-w-0`}
      >
        <option value="">Proveedor: Todos</option>
        {proveedores.map((p) => (
          <option key={p.id} value={p.id}>{p.nombre}</option>
        ))}
      </select>
      <select
        value={filterSolicitanteId}
        onChange={(e) => setFilterSolicitanteId(e.target.value)}
        className={`h-10 px-3 border border-slate-200 rounded-xl bg-gray-50 text-sm text-slate-700 ${inputFocus} min-w-0`}
      >
        <option value="">Solicitante: Todos</option>
        {solicitantes.map((s) => (
          <option key={s.id} value={s.id}>{s.nombre}</option>
        ))}
      </select>
      <div className="min-w-0">
        <DateRangePicker value={fechas} onChange={(val) => setFechas({ start: val.start, end: val.end })} placeholder="Rango de fechas" />
      </div>
    </div>
  );

  const renderEstadoBadge = (compact = false) => (
    <span className={`inline-flex items-center rounded-full font-medium bg-emerald-50 text-emerald-700 ${
      compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
    }`}>
      Recibida
    </span>
  );

  const renderMobileRow = (o) => (
    <div key={o.id} className="border-b border-slate-100 last:border-b-0">
      <div className="flex items-start justify-between gap-2 px-3 py-2.5">
        <div className="min-w-0">
          <p className="font-mono text-[11px] font-bold leading-tight text-blue-700">{o.numero}</p>
          <div className="mt-1">{renderEstadoBadge(true)}</div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] text-slate-400">Inventario</p>
          <p className="text-xs font-bold text-violet-700">{countInventario(o)}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs px-3 pb-2">
        <div>
          <span className="text-slate-400 block text-[10px]">Proveedor</span>
          <span className="font-semibold text-slate-800">{o.proveedor?.nombre || '—'}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px]">Solicitante</span>
          <span className="font-semibold text-slate-700">{o.usuario?.nombre || '—'}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px]">Fecha de llegada</span>
          <span className="text-slate-700">{fmtDateTime(o.fechaRecepcion)}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px]">Recibido por</span>
          <span className="text-slate-700">{o.recibidoPor?.nombre || '—'}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px]">Items</span>
          <span className="font-semibold text-slate-700">{countRecibidos(o)}</span>
        </div>
        {!isTaller && (
          <div>
            <span className="text-slate-400 block text-[10px]">Total</span>
            <span className="font-bold text-slate-800">{fmt(o.total)}</span>
          </div>
        )}
      </div>
      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={() => navigate(`${basePath}/historial/${o.id}`)}
          className="w-full h-9 inline-flex items-center justify-center gap-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50"
        >
          Ver detalle
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="space-y-3 sm:space-y-5 w-full min-h-full animate-slide-up pb-10"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <style>{`
        .shadow-card { box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02); }
      `}</style>

      <ComprasPageHeader
        icon={History}
        badge="Historial"
        title="Historial de productos recibidos"
        subtitle="Órdenes completas con fecha de llegada, responsable e ítems ingresados"
        tabs={<RecepcionNav basePath={basePath} />}
      />

      <div className={`grid gap-2 sm:gap-3 ${isTaller ? 'grid-cols-3' : 'grid-cols-4'}`}>
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

      <div className="bg-white shadow-card rounded-xl border border-gray-100 p-3 sm:p-4">
        {renderFilters()}
      </div>

      <div className="md:hidden space-y-3">
        <div className="bg-white shadow-card rounded-xl border border-gray-100 p-3">
          <div className="relative">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              value={searchInput}
              onChange={handleSearchChange}
              placeholder="Buscar por número, proveedor o concepto…"
              className={`w-full h-10 pl-10 pr-3 border border-slate-200 rounded-xl bg-gray-50 text-sm text-slate-800 ${inputFocus}`}
            />
          </div>
        </div>

        <div className="bg-white shadow-card rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
            <h2 className="text-sm font-semibold text-slate-800">Productos recibidos</h2>
            <span className="text-xs font-medium text-gray-400">{total} registros</span>
          </div>
          {loading && (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-200 border-t-blue-500" />
            </div>
          )}
          {!loading && ordenes.map((o) => renderMobileRow(o))}
          {!loading && ordenes.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-10 px-4">No hay productos recibidos registrados aún.</p>
          )}
        </div>

        <div className="px-1 py-2 flex flex-col gap-2">
          <p className="text-[11px] text-slate-500 text-center">Mostrando {showingFrom} a {showingTo} de {total} órdenes</p>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 bg-white">&lt;</button>
              <span className="text-xs font-semibold px-2 tabular-nums text-slate-800">{page} / {totalPages}</span>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 bg-white">&gt;</button>
            </div>
          )}
        </div>
      </div>

      <div className="hidden md:block">
        <div className="bg-white shadow-card rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-gray-800">Productos recibidos</h2>
              <span className="text-xs font-medium text-gray-400">{total} registros</span>
            </div>
            <div className="relative w-full sm:w-auto">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                value={searchInput}
                onChange={handleSearchChange}
                placeholder="Buscar por número, proveedor, concepto o solicitante…"
                className={`pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 bg-gray-50 focus:bg-white w-full sm:w-80 sm:min-w-[280px] transition-colors ${inputFocus}`}
              />
            </div>
          </div>

          <div className="overflow-x-auto relative">
            {loading && (
              <div className="absolute inset-0 z-10 flex justify-center items-center bg-white/70 backdrop-blur-[2px]">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-200 border-t-blue-500" />
              </div>
            )}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Orden</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Fecha de llegada</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Recibido por</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Solicitante</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Proveedor</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Items</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">A inventario</th>
                  <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!loading && ordenes.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-mono text-sm font-semibold text-blue-700">{o.numero}</p>
                      <div className="mt-1.5">{renderEstadoBadge()}</div>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700 whitespace-nowrap">{fmtDateTime(o.fechaRecepcion)}</td>
                    <td className="px-5 py-4 text-sm text-slate-700">{o.recibidoPor?.nombre || '—'}</td>
                    <td className="px-5 py-4 text-sm text-slate-700">{o.usuario?.nombre || '—'}</td>
                    <td className="px-5 py-4 text-sm font-medium text-slate-800">{o.proveedor?.nombre || '—'}</td>
                    <td className="px-5 py-4 text-sm text-slate-700">{countRecibidos(o)}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-violet-50 text-violet-700">
                        {countInventario(o)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => navigate(`${basePath}/historial/${o.id}`)}
                        className="p-1.5 rounded-lg bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                        title="Ver detalle"
                        aria-label="Ver detalle"
                      >
                        <Eye className="w-4 h-4" strokeWidth={1.5} />
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && ordenes.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-sm text-slate-400">
                      No hay productos recibidos registrados aún.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {total > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3 border-t border-gray-100">
              <span className="text-[11px] font-medium text-gray-400">
                Mostrando {showingFrom} a {showingTo} de {total} órdenes
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    Anterior
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const maxVisible = Math.min(5, totalPages);
                    let start = Math.max(1, page - Math.floor(maxVisible / 2));
                    const end = Math.min(totalPages, start + maxVisible - 1);
                    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
                    const pageNum = start + i;
                    if (pageNum > end) return null;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setPage(pageNum)}
                        className={`w-7 h-7 rounded-lg text-[11px] font-semibold transition-colors ${
                          page === pageNum ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
