import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ModalPortal, deferClose } from '../../../../shared/ui/components/ModalPortal.jsx';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  getOrdenes, updateOrden, deleteOrden, getComprasStats,
  registrarAbono, getMetodosPago, getProveedores
} from '../../application/comprasService';
import { toast } from '../../../../shared/ui/components/Toast';
import { confirmDialog } from '../../../../shared/ui/components/ConfirmModal';
import { PDFPreviewModal } from '../../../../shared/ui/components/PDFPreviewModal.jsx';
import { ShoppingCart, Plus, ClipboardCheck } from 'lucide-react';
import { ComprasOperativoNav } from '../components/ComprasOperativoNav';
import { ComprasAdminNav } from '../components/ComprasAdminNav';
import { ComprasPageHeader, ComprasHeaderButton } from '../components/ComprasPageHeader';
import { DateRangePicker } from '../../../../shared/ui/components/DateRangePicker.jsx';
import { mapOrdenToPDFFormat, isOrdenEditable, getAbonoSaldoPendiente, getOrdenProyectoLabel } from '../../helpers/ordenCompraHelpers';
import './ComprasPage.css';

const fmt = (n) => '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-EC', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const inputFocus =
  'outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:bg-white';

const ESTADO_BADGES = {
  pendiente_aprobacion: { bg: 'bg-amber-50', color: 'text-amber-700', border: 'border-amber-200', label: 'Pendiente' },
  aprobada:             { bg: 'bg-blue-50', color: 'text-blue-700', border: 'border-blue-100', label: 'Aprobado' },
  parcialmente_recibida: { bg: 'bg-orange-50', color: 'text-orange-700', border: 'border-orange-200', label: 'Parcial' },
  recibida:             { bg: 'bg-slate-100', color: 'text-slate-700', border: 'border-slate-200', label: 'Recibida' },
  cancelada:            { bg: 'bg-rose-50', color: 'text-rose-700', border: 'border-rose-200', label: 'Cancelada' },
};
const PAGO_BADGES = {
  sin_pagar: { bg: 'bg-rose-50', color: 'text-rose-700', border: 'border-rose-200', label: 'Por pagar' },
  parcial:   { bg: 'bg-amber-50', color: 'text-amber-700', border: 'border-amber-200', label: 'Parcial' },
  pagado:    { bg: 'bg-slate-100', color: 'text-slate-700', border: 'border-slate-200', label: 'Pagado' },
};
const ESTADO_FILTER_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'pendiente_aprobacion', label: 'Pendiente aprobación' },
  { value: 'aprobada', label: 'Aprobada' },
  { value: 'parcialmente_recibida', label: 'Recepción parcial' },
  { value: 'recibida', label: 'Recibida' },
  { value: 'cancelada', label: 'Cancelada' },
];

const PAGO_FILTER_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'sin_pagar', label: 'Por pagar' },
  { value: 'parcial', label: 'Parcial' },
  { value: 'pagado', label: 'Pagado' },
];

export const ComprasPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const userRole = (currentUser?.rol || '').toLowerCase();
  const isAdmin = userRole === 'admin' || userRole === 'administrador';
  const isImpresion = userRole === 'impresión' || userRole === 'impresion';
  const isTaller = userRole === 'taller';
  const hasAprobacionPermission = currentUser?.permissions?.includes('aprobacion_ordenes_compra') || isAdmin;
  const showAdminNav = hasAprobacionPermission && !isImpresion && !isTaller;
  const isVistaAprobaciones = showAdminNav && searchParams.get('vista') === 'aprobaciones';

  const [stats, setStats] = useState({ totalOrdenes: 0, pendientes: 0, totalGastado: 0, totalDeuda: 0 });

  // ── Órdenes state ──
  const [ordenes, setOrdenes] = useState([]);
  const [ordenPage, setOrdenPage] = useState(1);
  const [ordenTotal, setOrdenTotal] = useState(0);
  const [ordenSearch, setOrdenSearch] = useState('');
  const [ordenSearchInput, setOrdenSearchInput] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterPago, setFilterPago] = useState('');
  const [filterProveedorId, setFilterProveedorId] = useState('');
  const [proveedores, setProveedores] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [ordenLoading, setOrdenLoading] = useState(true);
  const [fechas, setFechas] = useState({ start: '', end: '' });
  const perPage = 25;

  // ── PDF state ──
  const [isPDFOpen, setIsPDFOpen] = useState(false);
  const [previewOC, setPreviewOC] = useState(null);

  const openPDFPreview = (orden) => {
    setPreviewOC(mapOrdenToPDFFormat(orden));
    setIsPDFOpen(true);
  };

  // ── Rejection reason state & handlers ──
  const [viewReasonOpen, setViewReasonOpen] = useState(false);
  const [viewReasonText, setViewReasonText] = useState('');
  const [viewReasonNumero, setViewReasonNumero] = useState('');

  const openViewReasonModal = (notas, numero) => {
    setViewReasonText(notas);
    setViewReasonNumero(numero);
    setViewReasonOpen(true);
  };

  // ── Abono modal state ──
  const [abonoModalOpen, setAbonoModalOpen] = useState(false);
  const [abonoOrden, setAbonoOrden] = useState(null);
  const [abonoForm, setAbonoForm] = useState({ metodoPagoId: '', monto: '', referencia: '' });
  const [abonoSaving, setAbonoSaving] = useState(false);
  const [metodos, setMetodos] = useState([]);

  const searchTimer = useRef(null);

  // ── Data loading ──
  const loadStats = useCallback(async () => {
    try { const s = await getComprasStats(); setStats(s); } catch {}
  }, []);

  const loadOrdenes = useCallback(async () => {
    setOrdenLoading(true);
    try {
      const data = await getOrdenes({
        page: ordenPage,
        limit: perPage,
        search: ordenSearch || undefined,
        estado: isVistaAprobaciones
          ? 'pendiente_aprobacion'
          : (filterEstado || undefined),
        estadoPago: filterPago || undefined,
        proveedorId: filterProveedorId || undefined,
        creadorRol: (isImpresion || isTaller) ? currentUser?.rol : undefined,
        estados: (isImpresion || isTaller)
          ? ['pendiente_aprobacion', 'aprobada', 'parcialmente_recibida']
          : undefined,
        fechaInicio: fechas.start || undefined,
        fechaFin: fechas.end || undefined
      });
      setOrdenes(data.items || []);
      setOrdenTotal(data.total || 0);
    } catch { setOrdenes([]); setOrdenTotal(0); }
    finally { setOrdenLoading(false); }
  }, [ordenPage, ordenSearch, filterEstado, filterPago, filterProveedorId, isImpresion, isTaller, currentUser, fechas, isVistaAprobaciones]);

  const loadProveedores = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const list = await getProveedores();
      setProveedores(Array.isArray(list) ? list : []);
    } catch {
      setProveedores([]);
    }
  }, [isAdmin]);

  const loadMetodos = useCallback(async () => {
    try { const m = await getMetodosPago(); setMetodos(m); } catch {}
  }, []);

  useEffect(() => {
    loadStats();
    loadOrdenes();
    loadMetodos();
    loadProveedores();
  }, [loadStats, loadOrdenes, loadMetodos, loadProveedores]);

  useEffect(() => {
    setOrdenPage(1);
  }, [fechas, ordenSearch, filterEstado, filterPago, filterProveedorId, isVistaAprobaciones]);

  const goToRecepcion = (orden) => navigate(`/compras/recepcion/${orden.id}`);
  const goToAprobacion = (orden) => navigate(`/compras/aprobacion/${orden.id}`, { state: { ordenFromList: orden } });

  useEffect(() => {
    if (!openMenuId) return undefined;
    const close = () => setOpenMenuId(null);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [openMenuId]);

  // ── Search debounce ──
  const handleOrdenSearchChange = (e) => {
    const val = e.target.value;
    setOrdenSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setOrdenSearch(val); }, 350);
  };

  const handleOrdenDelete = async (id) => {
    const confirmed = await confirmDialog(
      '¿Eliminar orden de compra?',
      '¿Está seguro de que desea eliminar esta orden de compra y todos sus datos asociados?',
      { type: 'danger', confirmLabel: 'Eliminar', cancelLabel: 'Cancelar' }
    );
    if (!confirmed) return;
    try {
      await deleteOrden(id);
      toast.success('Orden de compra eliminada con éxito');
      loadOrdenes(); loadStats();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleOrdenEstadoChange = async (id, estado) => {
    try {
      await updateOrden(id, { estado });
      toast.success('Estado de la orden actualizado con éxito');
      loadOrdenes(); loadStats();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ── Abono handlers ──
  const openAbonoModal = (orden) => {
    setAbonoOrden(orden);
    setAbonoForm({ metodoPagoId: metodos.filter(m => m.activo)[0]?.id || '', monto: '', referencia: '' });
    setAbonoModalOpen(true);
  };

  const saldoAbono = abonoOrden ? getAbonoSaldoPendiente(abonoOrden) : 0;

  const handleAbonoSave = async (e) => {
    e.preventDefault();
    setAbonoSaving(true);
    try {
      await registrarAbono(abonoOrden.id, {
        metodoPagoId: abonoForm.metodoPagoId,
        monto: parseFloat(abonoForm.monto) || 0,
        referencia: abonoForm.referencia
      });
      toast.success('Abono registrado con éxito');
      setAbonoModalOpen(false);
      loadOrdenes(); loadStats();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAbonoSaving(false);
    }
  };

  const ordenTotalPages = Math.max(1, Math.ceil(ordenTotal / perPage));
  const showingFrom = ordenTotal === 0 ? 0 : (ordenPage - 1) * perPage + 1;
  const showingTo = Math.min(ordenPage * perPage, ordenTotal);
  const emptyMessage = isVistaAprobaciones
    ? 'No hay órdenes pendientes de aprobación'
    : 'No se encontraron órdenes de compra';

  const renderBadge = (badges, key, compact = false) => {
    const b = badges[key];
    if (!b) return <span className="text-sm text-slate-400">—</span>;
    return (
      <span className={`inline-flex items-center rounded-full font-medium ${b.bg} ${b.color} ${
        compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      }`}>
        {b.label}
      </span>
    );
  };

  const kpiItems = [
    { label: 'Total órdenes', value: stats.totalOrdenes, border: 'border-t-blue-600', color: 'text-blue-600' },
    { label: 'Pendientes aprobación', value: stats.pendientes, border: 'border-t-amber-500', color: 'text-amber-600' },
    ...(isAdmin ? [
      { label: 'Total gastado', value: fmt(stats.totalGastado), border: 'border-t-indigo-500', color: 'text-indigo-600' },
      { label: 'Deuda pendiente', value: fmt(stats.totalDeuda), border: 'border-t-red-500', color: 'text-red-500' },
    ] : []),
  ];

  const pageTitle = isImpresion || isTaller
    ? 'Órdenes activas'
    : isVistaAprobaciones
      ? 'Pendientes de aprobación'
      : 'Órdenes de compra';
  const pageSubtitle = isVistaAprobaciones
    ? 'Revisa, aprueba o rechaza solicitudes de compra entrantes'
    : isImpresion || isTaller
      ? 'Solicitudes pendientes, aprobadas o en recepción'
      : 'Control y emisión de compras de materiales y activos';
  const pageBadge = isVistaAprobaciones ? 'Aprobaciones' : 'Compras';

  const renderOrdenActions = (o, mobile = false) => (
    <div className={`flex items-center ${mobile ? '' : 'justify-end gap-1.5'}`}>
      {!mobile && o.estado === 'pendiente_aprobacion' && hasAprobacionPermission && (
        <button
          type="button"
          onClick={() => goToAprobacion(o)}
          className="p-1.5 rounded-lg bg-blue-50 text-blue-500 border border-blue-100 hover:bg-blue-100 hover:text-blue-600 transition-colors"
          title="Revisar y aprobar"
          aria-label="Revisar y aprobar"
        >
          <ClipboardCheck className="w-4 h-4" strokeWidth={1.5} />
        </button>
      )}
      {!mobile && (
        <button
          type="button"
          onClick={() => openPDFPreview(o)}
          className="p-1.5 rounded-lg bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          title="Ver PDF"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        </button>
      )}
      <div className="relative">
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === o.id ? null : o.id); }}
          className={`rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors ${
            mobile ? 'w-7 h-7 inline-flex items-center justify-center bg-white/90' : 'p-1.5 bg-slate-50'
          }`}
          title="Más acciones"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></svg>
        </button>
        {openMenuId === o.id && (
          <div
            className="absolute right-0 top-full mt-1 z-30 min-w-[180px] py-1 bg-white border border-slate-200 rounded-xl shadow-lg"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {mobile && (
              <button type="button" onClick={() => { setOpenMenuId(null); openPDFPreview(o); }} className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">Ver PDF</button>
            )}
            {o.estado === 'cancelada' && o.notas && (
              <button type="button" onClick={() => { setOpenMenuId(null); openViewReasonModal(o.notas, o.numero); }} className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">Ver motivo rechazo</button>
            )}
            {isAdmin && o.estado === 'pendiente_aprobacion' && hasAprobacionPermission && (
              <button type="button" onClick={() => { setOpenMenuId(null); goToAprobacion(o); }} className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">Aprobar / revisar</button>
            )}
            {isAdmin && (o.estado === 'aprobada' || o.estado === 'parcialmente_recibida') && (
              <button type="button" onClick={() => { setOpenMenuId(null); goToRecepcion(o); }} className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">Recibir productos</button>
            )}
            {isAdmin && o.estadoPago !== 'pagado' && o.estado !== 'cancelada' && o.estado !== 'pendiente_aprobacion' && (
              <button type="button" onClick={() => { setOpenMenuId(null); openAbonoModal(o); }} className="w-full text-left px-3 py-2 text-xs text-blue-700 hover:bg-blue-50">Registrar abono</button>
            )}
            {isAdmin && isOrdenEditable(o.estado) && (
              <button type="button" onClick={() => { setOpenMenuId(null); navigate(`/compras/editar/${o.id}`); }} className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">Editar orden</button>
            )}
            {isAdmin && (
              <button type="button" onClick={() => { setOpenMenuId(null); handleOrdenDelete(o.id); }} className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50">Eliminar</button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderMobileOrdenRow = (o) => (
    <div key={o.id} className="border-b border-slate-100 last:border-b-0">
      <div className="flex items-center gap-1.5 px-3 py-2.5">
        <button
          type="button"
          onClick={() => openPDFPreview(o)}
          className="flex items-center gap-2 min-w-0 flex-1 text-left active:opacity-80"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-slate-800 leading-tight truncate">{o.numero}</p>
            <p className="text-[10px] text-slate-500 truncate uppercase tracking-wide">{o.proveedor?.nombre || '—'}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{fmtDate(o.fecha)}</p>
          </div>
        </button>
        {isAdmin && (
          <p className="text-xs font-bold tabular-nums shrink-0 px-0.5 text-slate-800">{fmt(o.total)}</p>
        )}
        <div className="flex flex-col items-end gap-0.5 shrink-0 max-w-[4.5rem]">
          {renderBadge(ESTADO_BADGES, o.estado, true)}
          {isAdmin && renderBadge(PAGO_BADGES, o.estadoPago, true)}
        </div>
        <button type="button" onClick={() => openPDFPreview(o)} className="shrink-0 p-0.5 text-slate-300" aria-label="Ver orden">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>
      {isVistaAprobaciones && o.estado === 'pendiente_aprobacion' && hasAprobacionPermission && (
        <div className="px-3 pb-2.5">
          <button
            type="button"
            onClick={() => goToAprobacion(o)}
            className="w-full h-9 inline-flex items-center justify-center rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700"
          >
            Revisar y aprobar
          </button>
        </div>
      )}
    </div>
  );

  const renderAdminFilters = (extraClass = '') => (
    <div className={`grid grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-2 ${extraClass}`}>
      {!isVistaAprobaciones && (
        <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} className={`h-9 sm:h-10 px-2 sm:px-3 border border-slate-200 rounded-xl bg-gray-50 text-[10px] sm:text-sm text-slate-700 ${inputFocus} min-w-0`}>
          {ESTADO_FILTER_OPTIONS.map((opt) => <option key={opt.value || 'all'} value={opt.value}>Estado: {opt.label}</option>)}
        </select>
      )}
      <select value={filterPago} onChange={(e) => setFilterPago(e.target.value)} className={`h-9 sm:h-10 px-2 sm:px-3 border border-slate-200 rounded-xl bg-gray-50 text-[10px] sm:text-sm text-slate-700 ${inputFocus} min-w-0`}>
        {PAGO_FILTER_OPTIONS.map((opt) => <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>)}
      </select>
      <select value={filterProveedorId} onChange={(e) => setFilterProveedorId(e.target.value)} className={`h-9 sm:h-10 px-2 sm:px-3 border border-slate-200 rounded-xl bg-gray-50 text-[10px] sm:text-sm text-slate-700 ${inputFocus} min-w-0`}>
        <option value="">Proveedor: Todos</option>
        {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
      </select>
      <div className="min-w-0 col-span-3 lg:col-span-1">
        <DateRangePicker value={fechas} onChange={(val) => setFechas({ start: val.start, end: val.end })} placeholder="Rango de fechas" />
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
        icon={ShoppingCart}
        badge={pageBadge}
        title={pageTitle}
        subtitle={pageSubtitle}
        action={(
          <ComprasHeaderButton onClick={() => navigate('/compras/nueva')} id="btn-nueva-orden">
            <Plus size={15} />
            Nueva orden
          </ComprasHeaderButton>
        )}
      />

      <div className={`grid gap-2 sm:gap-3 ${isAdmin ? 'grid-cols-4' : 'grid-cols-2'}`}>
        {kpiItems.map((kpi) => (
          <div key={kpi.label} className={`bg-white shadow-card rounded-xl border border-gray-100 border-t-2 ${kpi.border} px-2.5 sm:px-4 py-3 sm:py-4 min-w-0`}>
            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{kpi.label}</p>
            <p className={`text-base sm:text-lg font-bold mt-1 tabular-nums ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Fechas + tabs (misma fila, sin card — igual que instalaciones) */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mt-1 sm:mt-2">
        {isAdmin ? (
          <div className="flex-1 min-w-0">
            {renderAdminFilters('lg:grid-cols-4')}
          </div>
        ) : (
          <div className="max-w-xs w-full sm:w-auto">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Fechas</label>
            <DateRangePicker value={fechas} onChange={(val) => setFechas({ start: val.start, end: val.end })} placeholder="Rango de fechas" />
          </div>
        )}
        {(isImpresion || isTaller || showAdminNav) && (
          <div className="flex items-center justify-end gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            {(isImpresion || isTaller) ? <ComprasOperativoNav /> : <ComprasAdminNav />}
          </div>
        )}
      </div>

      {/* ── Móvil ── */}
      <div className="md:hidden space-y-3">
        <div className="bg-white shadow-card rounded-xl border border-gray-100 p-3">
          <div className="relative">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              id="search-ordenes-mobile"
              value={ordenSearchInput}
              onChange={handleOrdenSearchChange}
              placeholder="Buscar por número, proveedor o concepto…"
              className={`w-full h-10 pl-10 pr-3 border border-slate-200 rounded-xl bg-gray-50 text-sm text-slate-800 ${inputFocus}`}
            />
          </div>
        </div>

        <div className="bg-white shadow-card rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">Órdenes recientes</h2>
            {ordenTotalPages > 1 && (
              <button type="button" onClick={() => setOrdenPage((p) => Math.min(p + 1, ordenTotalPages))} className="text-[11px] font-semibold text-blue-600">
                Ver todas ›
              </button>
            )}
          </div>
          {ordenLoading && (
            <div className="flex justify-center py-10"><div className="co-spinner" /></div>
          )}
          {!ordenLoading && ordenes.map((o) => renderMobileOrdenRow(o))}
          {!ordenLoading && ordenes.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-10 px-4">{emptyMessage}</p>
          )}
        </div>

        <div className="px-1 py-2 flex flex-col gap-2">
          <p className="text-[11px] text-slate-500 text-center">
            Mostrando {showingFrom} a {showingTo} de {ordenTotal} órdenes
          </p>
          {ordenTotalPages > 1 && (
            <div className="flex items-center justify-center gap-1">
              <button type="button" disabled={ordenPage <= 1} onClick={() => setOrdenPage((p) => p - 1)} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 bg-white">&lt;</button>
              <span className="text-xs font-semibold px-2 tabular-nums text-slate-800">{ordenPage} / {ordenTotalPages}</span>
              <button type="button" disabled={ordenPage >= ordenTotalPages} onClick={() => setOrdenPage((p) => p + 1)} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 bg-white">&gt;</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Escritorio ── */}
      <div className="hidden md:block">
        <div className="bg-white shadow-card rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-gray-800">
                {isVistaAprobaciones ? 'Pendientes de aprobación' : 'Lista de órdenes'}
              </h2>
              <span className="text-xs font-medium text-gray-400">{ordenTotal} registros</span>
            </div>
            <div className="relative w-full sm:w-auto">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                id="search-ordenes"
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
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Emisor</th>
                  {isVistaAprobaciones && (
                    <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Proyecto</th>
                  )}
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Concepto</th>
                  {isAdmin && (
                    <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                  )}
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                  {isAdmin && (
                    <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pago</th>
                  )}
                  <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!ordenLoading && ordenes.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4 font-mono text-sm font-semibold text-blue-700">{o.numero}</td>
                    <td className="px-5 py-4 text-sm font-medium text-slate-800">{o.proveedor?.nombre || '—'}</td>
                    <td className="px-5 py-4 text-sm text-slate-700">{o.usuario?.nombre || '—'}</td>
                    {isVistaAprobaciones && (
                      <td className="px-5 py-4 text-sm text-slate-700 max-w-[180px] truncate" title={getOrdenProyectoLabel(o) || ''}>
                        {getOrdenProyectoLabel(o) || '—'}
                      </td>
                    )}
                    <td className="px-5 py-4 text-sm text-slate-700 whitespace-nowrap">{fmtDate(o.fecha)}</td>
                    <td className="px-5 py-4 text-sm text-slate-700 max-w-[220px] truncate" title={o.concepto}>{o.concepto || '—'}</td>
                    {isAdmin && <td className="px-5 py-4 text-right text-sm font-semibold text-slate-900 tabular-nums">{fmt(o.total)}</td>}
                    <td className="px-5 py-4">{renderBadge(ESTADO_BADGES, o.estado)}</td>
                    {isAdmin && <td className="px-5 py-4">{renderBadge(PAGO_BADGES, o.estadoPago)}</td>}
                    <td className="px-5 py-4 text-right">{renderOrdenActions(o)}</td>
                  </tr>
                ))}
                {!ordenLoading && ordenes.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? (isVistaAprobaciones ? 10 : 9) : 7} className="text-center py-12 text-sm text-slate-400">
                      {emptyMessage}
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

      {/* Registrar Abono Modal */}
      <ModalPortal open={abonoModalOpen}>
        <div className="co-portal-root">
          <div className="co-overlay" onClick={() => setAbonoModalOpen(false)} />
          <div className="co-modal-wrap">
            <div className="co-modal animate-co-modal-in">
              <div className="co-modal-header">
                <h2 className="text-lg font-bold text-slate-800">Registrar Abono</h2>
                <button type="button" onClick={() => setAbonoModalOpen(false)} className="co-modal-close">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="co-modal-body">
                {abonoOrden && (
                  <div className="co-abono-info">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Orden:</span>
                      <span className="font-bold text-slate-800">{abonoOrden.numero}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Total:</span>
                      <span className="font-semibold">{fmt(abonoOrden.cuentaPorPagar?.montoTotal ?? abonoOrden.total)}</span>
                    </div>
                    {(abonoOrden.cuentaPorPagar?.montoPagado ?? 0) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Pagado:</span>
                        <span className="font-semibold text-emerald-600">{fmt(abonoOrden.cuentaPorPagar.montoPagado)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Saldo pendiente:</span>
                      <span className="font-bold text-rose-600">{fmt(saldoAbono)}</span>
                    </div>
                  </div>
                )}
                <form onSubmit={handleAbonoSave} className="space-y-4 mt-4">
                  <div>
                    <label className="co-label">Método de Pago</label>
                    <select className="co-input" value={abonoForm.metodoPagoId}
                      onChange={e => setAbonoForm(p => ({ ...p, metodoPagoId: e.target.value }))} required>
                      <option value="">Seleccionar método…</option>
                      {metodos.filter(m => m.activo).map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="co-label">Monto ($)</label>
                    <input type="number" className="co-input" step="0.01" min="0.01"
                      max={saldoAbono || 999999}
                      value={abonoForm.monto}
                      onChange={e => {
                        const val = e.target.value;
                        if (parseFloat(val) > saldoAbono) {
                          setAbonoForm(p => ({ ...p, monto: saldoAbono.toString() }));
                        } else {
                          setAbonoForm(p => ({ ...p, monto: val }));
                        }
                      }} required />
                  </div>
                  <div>
                    <label className="co-label">Referencia (Nro. cheque, transferencia, etc.)</label>
                    <input className="co-input" value={abonoForm.referencia} placeholder="Opcional"
                      onChange={e => setAbonoForm(p => ({ ...p, referencia: e.target.value }))} />
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                    <button type="button" onClick={() => setAbonoModalOpen(false)} className="co-btn-ghost">Cancelar</button>
                    <button type="submit" disabled={abonoSaving} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                      {abonoSaving && <div className="co-spinner-sm" />}
                      Registrar gasto
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </ModalPortal>

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

      <ModalPortal open={viewReasonOpen}>
        <div className="co-portal-root">
          <div className="co-overlay" onClick={() => setViewReasonOpen(false)} />
          <div className="co-modal-wrap">
            <div className="co-modal animate-co-modal-in" style={{ maxWidth: '480px' }}>
              <div className="co-modal-header">
                <h2 className="text-lg font-bold text-slate-800">Motivo del rechazo</h2>
                <button type="button" onClick={() => setViewReasonOpen(false)} className="co-modal-close">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="co-modal-body">
                <div className="space-y-4">
                  <div className="text-xs text-slate-500">
                    Motivo ingresado para el rechazo de la orden de compra <strong className="font-mono">{viewReasonNumero}</strong>:
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm font-medium whitespace-pre-wrap leading-relaxed">
                    {viewReasonText || 'No se ingresó un motivo específico.'}
                  </div>
                  <div className="flex items-center justify-end pt-3 border-t border-slate-100">
                    <button type="button" onClick={() => setViewReasonOpen(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-slate-600 hover:bg-slate-700">
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
};
