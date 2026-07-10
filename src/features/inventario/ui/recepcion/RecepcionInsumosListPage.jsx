import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrdenes, getProveedores } from '../../../compras/application/comprasService';
import { toast } from '../../../../shared/ui/components/Toast';
import { PDFPreviewModal } from '../../../../shared/ui/components/PDFPreviewModal.jsx';
import { deferClose } from '../../../../shared/ui/components/ModalPortal.jsx';
import { RecepcionNav } from './RecepcionNav';
import { ComprasPageHeader } from '../../../compras/ui/components/ComprasPageHeader';
import { DateRangePicker } from '../../../../shared/ui/components/DateRangePicker.jsx';
import '../../../compras/ui/pages/ComprasPage.css';
import './RecepcionInsumos.css';

const fmt = (n) => '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-EC', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const RI_PRIMARY = '#2b41b8';
const RI_PRIMARY_HOVER = '#2436a0';
const RI_NAVY = '#1a1c3d';

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
  aprobada: { bg: 'bg-blue-50', color: 'text-[#2b41b8]', dot: 'bg-[#2b41b8]', label: 'APROBADO' },
  parcialmente_recibida: { bg: 'bg-orange-50', color: 'text-orange-700', dot: 'bg-orange-500', label: 'PARCIAL' },
};

const BAG_ICON_PATH = 'M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12a1.125 1.125 0 0 1 1.263-1.123h12.974c.576 0 1.059.435 1.119 1.007z';

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
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(true);
  const perPage = 25;

  const [isPDFOpen, setIsPDFOpen] = useState(false);
  const [previewOC, setPreviewOC] = useState(null);

  const searchTimer = useRef(null);

  const listFilters = useMemo(() => ({
    search: ordenSearch || undefined,
    pendienteRecepcion: true,
    creadorRol: (isImpresion || isTaller) ? user?.rol : undefined,
    proveedorId: filterProveedorId || undefined,
    creadorId: filterSolicitanteId || undefined,
    fechaInicio: fechas.start || undefined,
    fechaFin: fechas.end || undefined,
  }), [ordenSearch, isImpresion, isTaller, user, filterProveedorId, filterSolicitanteId, fechas]);

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
    const progresoPromedio = items.length === 0
      ? 0
      : Math.round(items.reduce((s, o) => s + getProgressPct(o), 0) / items.length);
    return {
      ordenesPendientes: ordenTotal,
      itemsPorRecibir: totalItems,
      valorTotal,
      progresoPromedio,
    };
  }, [statsOrdenes, ordenTotal]);

  const activeFiltersCount = [filterProveedorId, filterSolicitanteId, fechas.start, fechas.end].filter(Boolean).length;

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
    { label: 'Órdenes pendientes', mobileLabel: 'Pendientes', value: kpiStats.ordenesPendientes, hint: 'Por recibir', accent: '#2b41b8', iconBg: 'bg-[#eef1fc]', iconColor: 'text-[#2b41b8]', icon: BAG_ICON_PATH },
    { label: 'Artículos por recibir', mobileLabel: 'Artículos', value: kpiStats.itemsPorRecibir, hint: 'Líneas pendientes', accent: '#8b5cf6', iconBg: 'bg-violet-50', iconColor: 'text-violet-600', icon: 'M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v4.5m0 0-4.5 4.5m4.5-4.5 4.5 4.5' },
    ...(!isTaller ? [
      { label: 'Valor total pendiente', mobileLabel: 'Valor', value: fmt(kpiStats.valorTotal), hint: 'Monto acumulado', accent: '#10b981', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', icon: 'M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' },
    ] : []),
    { label: 'Progreso promedio', mobileLabel: 'Progreso', value: `${kpiStats.progresoPromedio}%`, hint: 'Recepción parcial', accent: '#f97316', iconBg: 'bg-orange-50', iconColor: 'text-orange-500', icon: 'M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z' },
  ];

  const renderKpiCardDesktop = (kpi) => (
    <div key={kpi.label} className="bg-white border border-slate-200/80 rounded-xl shadow-sm flex items-start gap-3 p-5 min-w-0 overflow-hidden">
      <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${kpi.iconBg}`}>
        <svg className={`w-5 h-5 ${kpi.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={kpi.icon} />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-500 leading-tight">{kpi.label}</p>
        <p className="text-2xl font-bold mt-0.5 tabular-nums leading-none truncate" style={{ color: RI_NAVY }}>{kpi.value}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">{kpi.hint}</p>
      </div>
    </div>
  );

  const renderKpiCardMobile = (kpi) => (
    <div
      key={kpi.label}
      className="co-kpi-mobile bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col gap-2 p-3 min-w-0"
      style={{ borderBottomWidth: '3px', borderBottomColor: kpi.accent }}
    >
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${kpi.iconBg}`}>
        <svg className={`w-3.5 h-3.5 ${kpi.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={kpi.icon} />
        </svg>
      </div>
      <div className="flex flex-col gap-1.5 min-w-0">
        <p className="text-[9px] font-medium text-slate-600 leading-tight line-clamp-2">{kpi.mobileLabel || kpi.label}</p>
        <p className="text-sm font-semibold tabular-nums leading-none truncate" style={{ color: RI_NAVY }}>{kpi.value}</p>
        <p className="text-[8px] text-slate-400 leading-tight line-clamp-2">{kpi.hint}</p>
      </div>
    </div>
  );

  const renderBadge = (estado, compact = false) => {
    const b = ESTADO_BADGES[estado] || ESTADO_BADGES.aprobada;
    return (
      <span className={`inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wide ${b.bg} ${b.color} ${
        compact ? 'px-1.5 py-0.5 text-[8px] gap-0.5' : 'px-2.5 py-1 text-[10px] gap-1.5'
      }`}>
        <span className={`rounded-full shrink-0 ${b.dot} ${compact ? 'w-1 h-1' : 'w-1.5 h-1.5'}`} />
        {b.label}
      </span>
    );
  };

  const renderFilters = (mobile = false) => (
    <div className={`grid gap-2 ${mobile ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3'}`}>
      <select value={filterProveedorId} onChange={(e) => setFilterProveedorId(e.target.value)} className="h-10 px-3 border border-slate-200 rounded-lg bg-white text-sm text-slate-700 outline-none focus:border-[#2b41b8] focus:ring-2 focus:ring-[#2b41b8]/15 min-w-0">
        <option value="">Proveedor: Todos</option>
        {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
      </select>
      <select value={filterSolicitanteId} onChange={(e) => setFilterSolicitanteId(e.target.value)} className="h-10 px-3 border border-slate-200 rounded-lg bg-white text-sm text-slate-700 outline-none focus:border-[#2b41b8] focus:ring-2 focus:ring-[#2b41b8]/15 min-w-0">
        <option value="">Solicitante: Todos</option>
        {solicitantes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
      </select>
      <div className="min-w-0">
        <DateRangePicker value={fechas} onChange={(val) => setFechas({ start: val.start, end: val.end })} placeholder="Rango de fechas" />
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
          <span className="text-xs font-semibold text-slate-700">{recibidos}/{total}</span>
          <span className="text-[10px] text-slate-400">{pct}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: RI_PRIMARY }} />
        </div>
      </div>
    );
  };

  const renderEstadoBadge = (estado, compact = false) => renderBadge(estado || 'aprobada', compact);

  const renderMobileRow = (o) => (
    <div key={o.id} className="co-orden-row border-b border-slate-100 last:border-b-0">
      <div className="flex items-start justify-between gap-2 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] font-bold leading-tight" style={{ color: RI_PRIMARY }}>{o.numero}</p>
          <p className="text-[10px] text-slate-500 truncate mt-0.5">{o.proveedor?.nombre || '—'}</p>
          <div className="mt-1">{renderEstadoBadge(o.estado, true)}</div>
        </div>
        <div className="shrink-0 w-20">{renderProgress(o)}</div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs px-3 pb-2">
        <div><span className="text-slate-400 block text-[10px]">Solicitante</span><span className="font-semibold text-slate-700">{o.usuario?.nombre || '—'}</span></div>
        <div><span className="text-slate-400 block text-[10px]">Fecha</span><span className="text-slate-700">{fmtDate(o.fechaAprobacion || o.fecha)}</span></div>
        {!isTaller && (
          <div><span className="text-slate-400 block text-[10px]">Total</span><span className="font-bold" style={{ color: RI_NAVY }}>{fmt(o.total)}</span></div>
        )}
        <div><span className="text-slate-400 block text-[10px]">Items</span><span className="font-semibold text-slate-700">{o.detalles?.length || 0}</span></div>
      </div>
      <div className="flex gap-2 px-3 pb-3">
        {!isTaller && (
          <button type="button" onClick={() => handleVerOrden(o)} className="flex-1 h-9 inline-flex items-center justify-center gap-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-white">
            Ver
          </button>
        )}
        <button type="button" onClick={() => handleRecepcionar(o.id)} className="flex-[2] h-9 inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold text-white" style={{ backgroundColor: RI_PRIMARY }}>
          Recibir productos
        </button>
      </div>
    </div>
  );

  const renderPagination = () => (
    <div className="px-4 md:px-5 py-3 border-t border-slate-100 bg-white flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4">
      <p className="text-xs text-slate-500 text-center md:text-left shrink-0">
        Mostrando {showingFrom} a {showingTo} de {ordenTotal} órdenes
      </p>
      {ordenTotalPages > 1 && (
        <div className="flex items-center justify-center md:justify-end gap-1">
          <button type="button" disabled={ordenPage <= 1} onClick={() => setOrdenPage((p) => p - 1)} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 bg-white">&lt;</button>
          <span className="md:hidden text-xs font-semibold px-2 tabular-nums" style={{ color: RI_NAVY }}>{ordenPage} / {ordenTotalPages}</span>
          <div className="hidden md:flex items-center gap-1">
            {Array.from({ length: Math.min(5, ordenTotalPages) }, (_, i) => {
              const maxVisible = Math.min(5, ordenTotalPages);
              let start = Math.max(1, ordenPage - Math.floor(maxVisible / 2));
              const end = Math.min(ordenTotalPages, start + maxVisible - 1);
              if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
              const pageNum = start + i;
              if (pageNum > end) return null;
              const isActive = ordenPage === pageNum;
              return (
                <button key={pageNum} type="button" onClick={() => setOrdenPage(pageNum)} className={`w-8 h-8 rounded-lg border text-sm font-medium transition-colors ${isActive ? 'text-white border-transparent' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`} style={isActive ? { backgroundColor: RI_PRIMARY, borderColor: RI_PRIMARY } : undefined}>{pageNum}</button>
              );
            })}
          </div>
          <button type="button" disabled={ordenPage >= ordenTotalPages} onClick={() => setOrdenPage((p) => p + 1)} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 bg-white">&gt;</button>
        </div>
      )}
    </div>
  );

  return (
    <div
      className="co-compras-page co-recepcion-page w-full min-h-full animate-slide-up pb-10"
      style={{ fontFamily: "'Inter', system-ui, sans-serif", backgroundColor: RI_PAGE_BG }}
    >
      {/* ── Móvil ── */}
      <div className="md:hidden">
        <ComprasPageHeader
          title="Recibir productos"
          subtitle="Órdenes aprobadas con productos pendientes de ingreso."
          aside={(
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <p className="text-sm font-bold whitespace-nowrap" style={{ color: RI_PRIMARY }}>{ordenTotal} pend.</p>
            </div>
          )}
        />

        <RecepcionNav basePath={basePath} />

        <div className={`grid gap-2 mb-4 ${isTaller ? 'grid-cols-3' : 'grid-cols-4'}`}>
          {kpiItems.map((kpi) => renderKpiCardMobile(kpi))}
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex gap-2">
            <div className="relative flex-1 min-w-0">
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                value={ordenSearchInput}
                onChange={handleOrdenSearchChange}
                placeholder="Buscar por número, proveedor o concepto…"
                className="w-full h-10 pl-10 pr-3 border border-slate-200 rounded-xl bg-white text-sm text-slate-800 outline-none focus:border-[#2b41b8] focus:ring-2 focus:ring-[#2b41b8]/15"
              />
            </div>
            <button type="button" onClick={() => setMobileFiltersOpen((v) => !v)} className="w-10 h-10 shrink-0 inline-flex items-center justify-center border border-slate-200 rounded-xl bg-white text-slate-500 relative" aria-label="Filtros">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
              </svg>
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[1rem] h-4 px-1 rounded-full text-[9px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: RI_PRIMARY }}>{activeFiltersCount}</span>
              )}
            </button>
          </div>
          {mobileFiltersOpen && renderFilters(true)}
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden mb-3">
          <div className="px-3 py-2.5 border-b border-slate-100">
            <h2 className="text-sm font-bold" style={{ color: RI_NAVY }}>Pendientes por recibir</h2>
          </div>
          {ordenLoading && <div className="flex justify-center py-10"><div className="co-spinner" /></div>}
          {!ordenLoading && ordenes.map((o) => renderMobileRow(o))}
          {!ordenLoading && ordenes.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-10 px-4">No hay órdenes con productos pendientes</p>
          )}
        </div>

        <div className="px-1 py-2 flex flex-col gap-2">
          <p className="text-[11px] text-slate-500 text-center">Mostrando {showingFrom} a {showingTo} de {ordenTotal} órdenes</p>
          {ordenTotalPages > 1 && (
            <div className="flex items-center justify-center gap-1">
              <button type="button" disabled={ordenPage <= 1} onClick={() => setOrdenPage((p) => p - 1)} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 bg-white">&lt;</button>
              <span className="text-xs font-semibold px-2 tabular-nums" style={{ color: RI_NAVY }}>{ordenPage} / {ordenTotalPages}</span>
              <button type="button" disabled={ordenPage >= ordenTotalPages} onClick={() => setOrdenPage((p) => p + 1)} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 bg-white">&gt;</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Escritorio ── */}
      <div className="hidden md:block">
        <ComprasPageHeader
          title="Recibir productos"
          subtitle="Órdenes aprobadas con productos pendientes — registra cantidades, fecha de llegada e inventario."
        />

        <RecepcionNav basePath={basePath} />

        <div className={`grid gap-4 mb-6 ${isTaller ? 'md:grid-cols-3' : 'md:grid-cols-2 xl:grid-cols-4'}`}>
          {kpiItems.map((kpi) => renderKpiCardDesktop(kpi))}
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 space-y-3">
            <div className="relative">
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                value={ordenSearchInput}
                onChange={handleOrdenSearchChange}
                placeholder="Buscar por número, proveedor o concepto…"
                className="w-full h-10 pl-10 pr-3 border border-slate-200 rounded-lg bg-white text-sm text-slate-800 outline-none focus:border-[#2b41b8] focus:ring-2 focus:ring-[#2b41b8]/15"
              />
            </div>
            {renderFilters()}
          </div>

          <div className="overflow-x-auto relative">
            {ordenLoading && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                <div className="co-spinner" />
              </div>
            )}
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f8f9fc] text-[11px] font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">Orden</th>
                  <th className="px-4 py-3">Proveedor</th>
                  <th className="px-4 py-3">Solicitante</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Concepto</th>
                  {!isTaller && <th className="px-4 py-3 text-right">Total</th>}
                  <th className="px-4 py-3 text-center">Items</th>
                  <th className="px-4 py-3">Progreso</th>
                  <th className="px-4 py-3 text-center w-52">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!ordenLoading && ordenes.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs font-semibold" style={{ color: RI_PRIMARY }}>{o.numero}</p>
                      <div className="mt-1">{renderEstadoBadge(o.estado)}</div>
                    </td>
                    <td className="px-4 py-3 font-medium" style={{ color: RI_NAVY }}>{o.proveedor?.nombre || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{o.usuario?.nombre || '—'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{fmtDate(o.fechaAprobacion || o.fecha)}</td>
                    <td className="px-4 py-3 text-slate-700 text-xs max-w-[220px] truncate" title={o.concepto}>{o.concepto || '—'}</td>
                    {!isTaller && <td className="px-4 py-3 text-right font-semibold text-slate-900 tabular-nums">{fmt(o.total)}</td>}
                    <td className="px-4 py-3 text-center text-slate-700 text-xs">{o.detalles?.length || 0}</td>
                    <td className="px-4 py-3">{renderProgress(o)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        {!isTaller && (
                          <button type="button" onClick={() => handleVerOrden(o)} className="h-9 px-3 inline-flex items-center gap-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50">
                            Ver
                          </button>
                        )}
                        <button type="button" onClick={() => handleRecepcionar(o.id)} className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold text-white whitespace-nowrap" style={{ backgroundColor: RI_PRIMARY }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = RI_PRIMARY_HOVER; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = RI_PRIMARY; }}>
                          Recibir productos
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!ordenLoading && ordenes.length === 0 && (
                  <tr><td colSpan={isTaller ? 8 : 9} className="px-4 py-16 text-center text-slate-400 text-sm">No hay órdenes con productos pendientes</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {renderPagination()}
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
