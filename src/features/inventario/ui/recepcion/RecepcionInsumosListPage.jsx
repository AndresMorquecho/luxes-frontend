import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PackageCheck, Eye, PackagePlus } from 'lucide-react';
import { getOrdenes, getProveedores } from '../../../compras/application/comprasService';
import { toast } from '../../../../shared/ui/components/Toast';
import { PDFPreviewModal } from '../../../../shared/ui/components/PDFPreviewModal.jsx';
import { deferClose } from '../../../../shared/ui/components/ModalPortal.jsx';
import { RecepcionNav } from './RecepcionNav';
import { ComprasPageHeader } from '../../../compras/ui/components/ComprasPageHeader';
import { DateRangePicker } from '../../../../shared/ui/components/DateRangePicker.jsx';
import '../../../compras/ui/pages/ComprasPage.css';

const fmt = (n) => '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-EC', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const inputFocus =
  'outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:bg-white';

const mapOrdenToPDFFormat = (orden) => {
  if (!orden) return null;
  return {
    id: orden.numero,
    fechaCreacion: orden.fecha ? new Date(orden.fecha).toISOString().split('T')[0] : '',
    estado: (orden.estado || 'PENDIENTE').toUpperCase(),
    proyectoNombre: orden.concepto || 'Compra de Materiales',
    comentarios: orden.notas || 'Sin observaciones.',
    items: (orden.detalles || []).map((d) => ({
      sku: d.materialId ? d.materialId.slice(-8).toUpperCase() : 'ESP-LIBRE',
      nombre: d.descripcion,
      cantidad: d.cantidad,
      precioUnitario: d.precioUnitario,
      unidad: 'unidad',
    })),
  };
};

const countRecibidos = (orden) =>
  (orden.detalles || []).filter((d) => (d.cantidadRecibida ?? 0) > 0).length;

const getProgressPct = (orden) => {
  const total = orden.detalles?.length || 0;
  if (total === 0) return 0;
  return Math.round((countRecibidos(orden) / total) * 100);
};

const ESTADO_BADGES = {
  aprobada: {
    bg: 'bg-blue-50',
    color: 'text-blue-700',
    label: 'Aprobado',
  },
  parcialmente_recibida: {
    bg: 'bg-amber-50',
    color: 'text-amber-700',
    label: 'Parcial',
  },
};

export const RecepcionInsumosListPage = ({ basePath = '/compras/recepcion' }) => {
  const navigate = useNavigate();
  const [user] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const userRole = (user?.rol || '').toUpperCase();
  const isImpresion = userRole === 'IMPRESIÓN' || userRole === 'IMPRESION';
  const isTaller = userRole === 'TALLER';

  const [ordenes, setOrdenes] = useState([]);
  const [statsOrdenes, setStatsOrdenes] = useState([]);
  const [ordenPage, setOrdenPage] = useState(1);
  const [ordenTotal, setOrdenTotal] = useState(0);
  const [ordenSearch, setOrdenSearch] = useState('');
  const [ordenSearchInput, setOrdenSearchInput] = useState('');
  const [ordenLoading, setOrdenLoading] = useState(true);
  const [fechas, setFechas] = useState({ start: '', end: '' });
  const [filterProveedorId, setFilterProveedorId] = useState('');
  const [filterSolicitanteId, setFilterSolicitanteId] = useState('');
  const [proveedores, setProveedores] = useState([]);
  const perPage = 25;

  const [isPDFOpen, setIsPDFOpen] = useState(false);
  const [previewOC, setPreviewOC] = useState(null);

  const searchTimer = useRef(null);

  const listFilters = useMemo(
    () => ({
      search: ordenSearch || undefined,
      pendienteRecepcion: true,
      creadorRol: isImpresion || isTaller ? user?.rol : undefined,
      proveedorId: filterProveedorId || undefined,
      creadorId: filterSolicitanteId || undefined,
      fechaInicio: fechas.start || undefined,
      fechaFin: fechas.end || undefined,
    }),
    [
      ordenSearch,
      isImpresion,
      isTaller,
      user,
      filterProveedorId,
      filterSolicitanteId,
      fechas,
    ]
  );

  const loadProveedores = useCallback(async () => {
    try {
      const list = await getProveedores();
      setProveedores(Array.isArray(list) ? list : []);
    } catch {
      setProveedores([]);
    }
  }, []);

  const loadOrdenes = useCallback(async () => {
    setOrdenLoading(true);
    try {
      const data = await getOrdenes({ page: ordenPage, limit: perPage, ...listFilters });
      setOrdenes(data.items || []);
      setOrdenTotal(data.total || 0);
    } catch {
      setOrdenes([]);
      setOrdenTotal(0);
      toast.error('Error al cargar las órdenes aprobadas');
    } finally {
      setOrdenLoading(false);
    }
  }, [ordenPage, listFilters]);

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
    setOrdenPage(1);
  }, [ordenSearch, fechas, filterProveedorId, filterSolicitanteId]);

  const solicitantes = useMemo(() => {
    const map = new Map();
    statsOrdenes.forEach((o) => {
      if (o.usuario?.id) map.set(o.usuario.id, o.usuario);
    });
    return [...map.values()];
  }, [statsOrdenes]);

  const kpiStats = useMemo(() => {
    const items = statsOrdenes;
    const totalItems = items.reduce((s, o) => s + (o.detalles?.length || 0), 0);
    const valorTotal = items.reduce((s, o) => s + Number(o.total || 0), 0);
    const progresoPromedio =
      items.length === 0
        ? 0
        : Math.round(items.reduce((s, o) => s + getProgressPct(o), 0) / items.length);
    return {
      ordenesPendientes: ordenTotal,
      itemsPorRecibir: totalItems,
      valorTotal,
      progresoPromedio,
    };
  }, [statsOrdenes, ordenTotal]);

  const handleOrdenSearchChange = (e) => {
    const val = e.target.value;
    setOrdenSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setOrdenSearch(val), 350);
  };

  const handleRecepcionar = (ordenId) => navigate(`${basePath}/${ordenId}`);

  const handleVerOrden = (orden) => {
    setPreviewOC(mapOrdenToPDFFormat(orden));
    setIsPDFOpen(true);
  };

  const ordenTotalPages = Math.max(1, Math.ceil(ordenTotal / perPage));
  const showingFrom = ordenTotal === 0 ? 0 : (ordenPage - 1) * perPage + 1;
  const showingTo = Math.min(ordenPage * perPage, ordenTotal);

  const kpiItems = [
    { label: 'Órdenes pendientes', value: kpiStats.ordenesPendientes, border: 'border-t-amber-500', color: 'text-amber-600' },
    { label: 'Artículos por recibir', value: kpiStats.itemsPorRecibir, border: 'border-t-blue-600', color: 'text-blue-600' },
    ...(!isTaller
      ? [{ label: 'Valor total pendiente', value: fmt(kpiStats.valorTotal), border: 'border-t-indigo-500', color: 'text-indigo-600' }]
      : []),
    { label: 'Progreso promedio', value: `${kpiStats.progresoPromedio}%`, border: 'border-t-emerald-500', color: 'text-emerald-600' },
  ];

  const renderBadge = (estado, compact = false) => {
    const b = ESTADO_BADGES[estado] || ESTADO_BADGES.aprobada;
    return (
      <span
        className={`inline-flex items-center rounded-full font-medium ${b.bg} ${b.color} ${
          compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
        }`}
      >
        {b.label}
      </span>
    );
  };

  const renderFilters = () => (
    <div className="grid gap-2 grid-cols-1 sm:grid-cols-3">
      <select
        value={filterProveedorId}
        onChange={(e) => setFilterProveedorId(e.target.value)}
        className={`h-10 px-3 border border-slate-200 rounded-xl bg-gray-50 text-sm text-slate-700 ${inputFocus} min-w-0`}
      >
        <option value="">Proveedor: Todos</option>
        {proveedores.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre}
          </option>
        ))}
      </select>
      <select
        value={filterSolicitanteId}
        onChange={(e) => setFilterSolicitanteId(e.target.value)}
        className={`h-10 px-3 border border-slate-200 rounded-xl bg-gray-50 text-sm text-slate-700 ${inputFocus} min-w-0`}
      >
        <option value="">Solicitante: Todos</option>
        {solicitantes.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nombre}
          </option>
        ))}
      </select>
      <div className="min-w-0">
        <DateRangePicker
          value={fechas}
          onChange={(val) => setFechas({ start: val.start, end: val.end })}
          placeholder="Rango de fechas"
        />
      </div>
    </div>
  );

  const renderProgress = (o) => {
    const total = o.detalles?.length || 0;
    const recibidos = countRecibidos(o);
    const pct = getProgressPct(o);
    return (
      <div className="min-w-[5.5rem]">
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="text-xs font-semibold text-slate-700">
            {recibidos}/{total}
          </span>
          <span className="text-[10px] text-slate-400">{pct}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-600 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  };

  const renderActions = (o) => (
    <div className="flex items-center justify-end gap-1.5">
      {!isTaller && (
        <button
          type="button"
          onClick={() => handleVerOrden(o)}
          className="p-1.5 rounded-lg bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          title="Ver orden"
          aria-label="Ver orden"
        >
          <Eye className="w-4 h-4" strokeWidth={1.5} />
        </button>
      )}
      <button
        type="button"
        onClick={() => handleRecepcionar(o.id)}
        className="p-1.5 rounded-lg bg-blue-50 text-blue-500 border border-blue-100 hover:bg-blue-100 hover:text-blue-600 transition-colors"
        title="Recibir productos"
        aria-label="Recibir productos"
      >
        <PackagePlus className="w-4 h-4" strokeWidth={1.5} />
      </button>
    </div>
  );

  const renderMobileRow = (o) => (
    <div key={o.id} className="border-b border-slate-100 last:border-b-0">
      <div className="flex items-start justify-between gap-2 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] font-bold leading-tight text-blue-700">{o.numero}</p>
          <p className="text-[10px] text-slate-500 truncate mt-0.5">
            {o.proveedor?.nombre || '—'}
          </p>
          <div className="mt-1">{renderBadge(o.estado || 'aprobada', true)}</div>
        </div>
        <div className="shrink-0 w-20">{renderProgress(o)}</div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs px-3 pb-2">
        <div>
          <span className="text-slate-400 block text-[10px]">Solicitante</span>
          <span className="font-semibold text-slate-700">{o.usuario?.nombre || '—'}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px]">Fecha</span>
          <span className="text-slate-700">{fmtDate(o.fechaAprobacion || o.fecha)}</span>
        </div>
        {!isTaller && (
          <div>
            <span className="text-slate-400 block text-[10px]">Total</span>
            <span className="font-bold text-slate-800">{fmt(o.total)}</span>
          </div>
        )}
        <div>
          <span className="text-slate-400 block text-[10px]">Items</span>
          <span className="font-semibold text-slate-700">{o.detalles?.length || 0}</span>
        </div>
      </div>
      <div className="flex gap-2 px-3 pb-3">
        {!isTaller && (
          <button
            type="button"
            onClick={() => handleVerOrden(o)}
            className="flex-1 h-9 inline-flex items-center justify-center gap-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50"
          >
            Ver
          </button>
        )}
        <button
          type="button"
          onClick={() => handleRecepcionar(o.id)}
          className="flex-[2] h-9 inline-flex items-center justify-center gap-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700"
        >
          Recibir productos
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
        icon={PackageCheck}
        badge="Recepción"
        title="Recibir productos"
        subtitle="Órdenes aprobadas con productos pendientes de ingreso"
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
            <svg
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <input
              value={ordenSearchInput}
              onChange={handleOrdenSearchChange}
              placeholder="Buscar por número, proveedor o concepto…"
              className={`w-full h-10 pl-10 pr-3 border border-slate-200 rounded-xl bg-gray-50 text-sm text-slate-800 ${inputFocus}`}
            />
          </div>
        </div>

        <div className="bg-white shadow-card rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
            <h2 className="text-sm font-semibold text-slate-800">Pendientes por recibir</h2>
            <span className="text-xs font-medium text-gray-400">{ordenTotal} registros</span>
          </div>
          {ordenLoading && (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-200 border-t-blue-500" />
            </div>
          )}
          {!ordenLoading && ordenes.map((o) => renderMobileRow(o))}
          {!ordenLoading && ordenes.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-10 px-4">
              No hay órdenes con productos pendientes
            </p>
          )}
        </div>

        <div className="px-1 py-2 flex flex-col gap-2">
          <p className="text-[11px] text-slate-500 text-center">
            Mostrando {showingFrom} a {showingTo} de {ordenTotal} órdenes
          </p>
          {ordenTotalPages > 1 && (
            <div className="flex items-center justify-center gap-1">
              <button
                type="button"
                disabled={ordenPage <= 1}
                onClick={() => setOrdenPage((p) => p - 1)}
                className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 bg-white"
              >
                &lt;
              </button>
              <span className="text-xs font-semibold px-2 tabular-nums text-slate-800">
                {ordenPage} / {ordenTotalPages}
              </span>
              <button
                type="button"
                disabled={ordenPage >= ordenTotalPages}
                onClick={() => setOrdenPage((p) => p + 1)}
                className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 bg-white"
              >
                &gt;
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="hidden md:block">
        <div className="bg-white shadow-card rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-gray-800">Pendientes por recibir</h2>
              <span className="text-xs font-medium text-gray-400">{ordenTotal} registros</span>
            </div>
            <div className="relative w-full sm:w-auto">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                value={ordenSearchInput}
                onChange={handleOrdenSearchChange}
                placeholder="Buscar por número, proveedor o concepto…"
                className={`pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 bg-gray-50 focus:bg-white w-full sm:w-80 sm:min-w-[280px] transition-colors ${inputFocus}`}
              />
            </div>
          </div>

          <div className="overflow-x-auto relative">
            {ordenLoading && (
              <div className="absolute inset-0 z-10 flex justify-center items-center bg-white/70 backdrop-blur-[2px]">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-200 border-t-blue-500" />
              </div>
            )}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Orden</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Proveedor</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Solicitante</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Concepto</th>
                  {!isTaller && (
                    <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                  )}
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Items</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Progreso</th>
                  <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!ordenLoading &&
                  ordenes.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-mono text-sm font-semibold text-blue-700">{o.numero}</p>
                        <div className="mt-1.5">{renderBadge(o.estado || 'aprobada')}</div>
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-slate-800">
                        {o.proveedor?.nombre || '—'}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700">
                        {o.usuario?.nombre || '—'}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700 whitespace-nowrap">
                        {fmtDate(o.fechaAprobacion || o.fecha)}
                      </td>
                      <td
                        className="px-5 py-4 text-sm text-slate-700 max-w-[220px] truncate"
                        title={o.concepto}
                      >
                        {o.concepto || '—'}
                      </td>
                      {!isTaller && (
                        <td className="px-5 py-4 text-right text-sm font-semibold text-slate-900 tabular-nums">
                          {fmt(o.total)}
                        </td>
                      )}
                      <td className="px-5 py-4 text-sm text-slate-700">
                        {o.detalles?.length || 0}
                      </td>
                      <td className="px-5 py-4">{renderProgress(o)}</td>
                      <td className="px-5 py-4 text-right">{renderActions(o)}</td>
                    </tr>
                  ))}
                {!ordenLoading && ordenes.length === 0 && (
                  <tr>
                    <td
                      colSpan={isTaller ? 8 : 9}
                      className="text-center py-12 text-sm text-slate-400"
                    >
                      No hay órdenes con productos pendientes
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {ordenTotal > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3 border-t border-gray-100">
              <span className="text-[11px] font-medium text-gray-400">
                Mostrando {showingFrom} a {showingTo} de {ordenTotal} órdenes
              </span>
              {ordenTotalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={ordenPage <= 1}
                    onClick={() => setOrdenPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    Anterior
                  </button>
                  {Array.from({ length: Math.min(5, ordenTotalPages) }, (_, i) => {
                    const maxVisible = Math.min(5, ordenTotalPages);
                    let start = Math.max(1, ordenPage - Math.floor(maxVisible / 2));
                    const end = Math.min(ordenTotalPages, start + maxVisible - 1);
                    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
                    const pageNum = start + i;
                    if (pageNum > end) return null;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setOrdenPage(pageNum)}
                        className={`w-7 h-7 rounded-lg text-[11px] font-semibold transition-colors ${
                          ordenPage === pageNum ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    disabled={ordenPage >= ordenTotalPages}
                    onClick={() => setOrdenPage((p) => Math.min(ordenTotalPages, p + 1))}
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

      {isPDFOpen && previewOC && (
        <PDFPreviewModal
          isOpen
          onClose={() => {
            setIsPDFOpen(false);
            deferClose(() => setPreviewOC(null));
          }}
          oc={previewOC}
          title="Orden de Compra"
        />
      )}
    </div>
  );
};
