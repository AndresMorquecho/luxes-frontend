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
import { ComprasOperativoNav } from '../components/ComprasOperativoNav';
import { ComprasAdminNav } from '../components/ComprasAdminNav';
import { ComprasPageHeader, ComprasHeaderButton } from '../components/ComprasPageHeader';
import { DateRangePicker } from '../../../../shared/ui/components/DateRangePicker.jsx';
import { mapOrdenToPDFFormat, isOrdenEditable, getAbonoSaldoPendiente, getOrdenProyectoLabel } from '../../helpers/ordenCompraHelpers';
import './ComprasPage.css';

const fmt = (n) => '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-EC', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const CO_PRIMARY = '#2b41b8';
const CO_PRIMARY_HOVER = '#2436a0';
const CO_NAVY = '#1a1c3d';
const CO_PAGE_BG = '#f8f9fc';

const ESTADO_BADGES = {
  pendiente_aprobacion: { bg: 'bg-amber-50', color: 'text-amber-700', dot: 'bg-amber-500', label: 'PENDIENTE' },
  aprobada:             { bg: 'bg-blue-50', color: 'text-[#2b41b8]', dot: 'bg-[#2b41b8]', label: 'APROBADO' },
  parcialmente_recibida: { bg: 'bg-orange-50', color: 'text-orange-700', dot: 'bg-orange-500', label: 'PARCIAL' },
  recibida:             { bg: 'bg-emerald-50', color: 'text-emerald-700', dot: 'bg-emerald-500', label: 'RECIBIDA' },
  cancelada:            { bg: 'bg-red-50', color: 'text-red-700', dot: 'bg-red-500', label: 'CANCELADA' },
};
const PAGO_BADGES = {
  sin_pagar: { bg: 'bg-red-50', color: 'text-red-700', dot: 'bg-red-500', label: 'POR PAGAR' },
  parcial:   { bg: 'bg-orange-50', color: 'text-orange-700', dot: 'bg-orange-500', label: 'PARCIAL' },
  pagado:    { bg: 'bg-emerald-50', color: 'text-emerald-700', dot: 'bg-emerald-500', label: 'PAGADO' },
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

const ORDEN_ESTADO_ICON = {
  pendiente_aprobacion: { bg: 'bg-amber-50', color: 'text-amber-600' },
  aprobada: { bg: 'bg-blue-50', color: 'text-[#2b41b8]' },
  parcialmente_recibida: { bg: 'bg-orange-50', color: 'text-orange-600' },
  recibida: { bg: 'bg-emerald-50', color: 'text-emerald-600' },
  cancelada: { bg: 'bg-red-50', color: 'text-red-600' },
};

const BAG_ICON_PATH = 'M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12a1.125 1.125 0 0 1 1.263-1.123h12.974c.576 0 1.059.435 1.119 1.007z';

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
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(true);
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
  const activeFiltersCount = isVistaAprobaciones
    ? [filterPago, filterProveedorId, fechas.start, fechas.end].filter(Boolean).length
    : [filterEstado, filterPago, filterProveedorId, fechas.start, fechas.end].filter(Boolean).length;
  const emptyMessage = isVistaAprobaciones
    ? 'No hay órdenes pendientes de aprobación'
    : 'No se encontraron órdenes de compra';

  const renderKpiCardDesktop = (kpi) => (
    <div key={kpi.label} className="bg-white border border-slate-200/80 rounded-xl shadow-sm flex items-start gap-3 p-5 min-w-0 overflow-hidden">
      <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${kpi.iconBg}`}>
        <svg className={`w-5 h-5 ${kpi.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={kpi.icon} />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-500 leading-tight">{kpi.label}</p>
        <p className="text-2xl font-bold mt-0.5 tabular-nums leading-none truncate" style={{ color: CO_NAVY }}>{kpi.value}</p>
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
        <p className="text-sm font-semibold tabular-nums leading-none truncate" style={{ color: CO_NAVY }}>{kpi.value}</p>
        <p className="text-[8px] text-slate-400 leading-tight line-clamp-2">{kpi.hint}</p>
      </div>
    </div>
  );

  const renderBadge = (badges, key, compact = false) => {
    const b = badges[key];
    if (!b) return <span className="text-xs text-slate-500">{key}</span>;
    return (
      <span className={`inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wide ${b.bg} ${b.color} ${
        compact ? 'px-1.5 py-0.5 text-[8px] gap-0.5' : 'px-2.5 py-1 text-[10px] gap-1.5'
      }`}>
        <span className={`rounded-full shrink-0 ${b.dot} ${compact ? 'w-1 h-1' : 'w-1.5 h-1.5'}`} />
        {b.label}
      </span>
    );
  };

  const kpiItems = [
    { label: 'Total Órdenes', mobileLabel: 'Total Órdenes', value: stats.totalOrdenes, hint: 'Todas las órdenes', accent: '#2b41b8', iconBg: 'bg-[#eef1fc]', iconColor: 'text-[#2b41b8]', icon: BAG_ICON_PATH },
    { label: 'Pendientes Aprobación', mobileLabel: 'Pendientes', value: stats.pendientes, hint: 'Esperando aprobación', accent: '#f97316', iconBg: 'bg-orange-50', iconColor: 'text-orange-500', icon: 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' },
    ...(isAdmin ? [
      { label: 'Total Gastado', mobileLabel: 'Gastado', value: fmt(stats.totalGastado), hint: 'Monto acumulado', accent: '#10b981', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', icon: 'M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' },
      { label: 'Deuda Pendiente', mobileLabel: 'Deuda', value: fmt(stats.totalDeuda), hint: 'Saldo por pagar', accent: '#ef4444', iconBg: 'bg-red-50', iconColor: 'text-red-500', icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z' },
    ] : []),
  ];

  const renderOrdenActions = (o, mobile = false) => (
    <div className={`flex items-center justify-center ${mobile ? '' : 'gap-1'}`}>
      {!mobile && o.estado === 'pendiente_aprobacion' && hasAprobacionPermission && (
        <button
          type="button"
          onClick={() => goToAprobacion(o)}
          className="h-8 px-3 inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold text-white whitespace-nowrap"
          style={{ backgroundColor: CO_PRIMARY }}
          title="Revisar y aprobar"
        >
          Revisar
        </button>
      )}
      {!mobile && (
        <button
          type="button"
          onClick={() => openPDFPreview(o)}
          className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-[#eef1fc] hover:text-[#2b41b8] hover:border-[#c7d0f5] transition-colors"
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
          className={`inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors ${
            mobile ? 'w-7 h-7 bg-white/90' : 'w-8 h-8 text-slate-600'
          }`}
          title="Más acciones"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></svg>
        </button>
        {openMenuId === o.id && (
          <div
            className="absolute right-0 top-full mt-1 z-30 min-w-[180px] py-1 bg-white border border-slate-200 rounded-lg shadow-lg"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {mobile && (
              <button type="button" onClick={() => { setOpenMenuId(null); openPDFPreview(o); }} className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">Ver PDF</button>
            )}
            {o.estado === 'cancelada' && o.notas && (
              <button type="button" onClick={() => { setOpenMenuId(null); openViewReasonModal(o.notas, o.numero); }} className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">Ver motivo rechazo</button>
            )}
            {isAdmin && o.estado === 'pendiente_aprobacion' && hasAprobacionPermission && (
              <button type="button" onClick={() => { setOpenMenuId(null); goToAprobacion(o); }} className="w-full text-left px-3 py-2 text-xs text-emerald-700 hover:bg-emerald-50">Aprobar / revisar</button>
            )}
            {isAdmin && (o.estado === 'aprobada' || o.estado === 'parcialmente_recibida') && (
              <button type="button" onClick={() => { setOpenMenuId(null); goToRecepcion(o); }} className="w-full text-left px-3 py-2 text-xs text-violet-700 hover:bg-violet-50">Recibir productos</button>
            )}
            {isAdmin && o.estadoPago !== 'pagado' && o.estado !== 'cancelada' && o.estado !== 'pendiente_aprobacion' && (
              <button type="button" onClick={() => { setOpenMenuId(null); openAbonoModal(o); }} className="w-full text-left px-3 py-2 text-xs text-blue-700 hover:bg-blue-50">Registrar abono</button>
            )}
            {isAdmin && isOrdenEditable(o.estado) && (
              <button type="button" onClick={() => { setOpenMenuId(null); navigate(`/compras/editar/${o.id}`); }} className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">Editar orden</button>
            )}
            {isAdmin && (
              <button type="button" onClick={() => { setOpenMenuId(null); handleOrdenDelete(o.id); }} className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50">Eliminar</button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderMobileOrdenRow = (o) => {
    const iconStyle = ORDEN_ESTADO_ICON[o.estado] || ORDEN_ESTADO_ICON.aprobada;
    return (
      <div key={o.id} className="co-orden-row border-b border-slate-100 last:border-b-0">
        <div className="flex items-center gap-1.5 px-2 py-2.5">
          <button
            type="button"
            onClick={() => openPDFPreview(o)}
            className="flex items-center gap-2 min-w-0 flex-1 text-left active:opacity-80"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconStyle.bg}`}>
              <svg className={`w-5 h-5 ${iconStyle.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={BAG_ICON_PATH} />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold leading-tight truncate" style={{ color: CO_NAVY }}>{o.numero}</p>
              <p className="text-[10px] text-slate-500 truncate uppercase tracking-wide">{o.proveedor?.nombre || '—'}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{fmtDate(o.fecha)}</p>
            </div>
          </button>
          {isAdmin && (
            <p className="text-xs font-bold tabular-nums shrink-0 px-0.5" style={{ color: CO_NAVY }}>{fmt(o.total)}</p>
          )}
          <div className="flex flex-col items-end gap-0.5 shrink-0 max-w-[4.25rem]">
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
          <div className="px-2 pb-2.5">
            <button
              type="button"
              onClick={() => goToAprobacion(o)}
              className="w-full h-9 inline-flex items-center justify-center rounded-lg text-xs font-semibold text-white"
              style={{ backgroundColor: CO_PRIMARY }}
            >
              Revisar y aprobar
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderAdminFilters = (extraClass = '') => (
    <div className={`grid grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-2 ${extraClass}`}>
      {!isVistaAprobaciones && (
        <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} className="h-9 sm:h-10 px-2 sm:px-3 border border-slate-200 rounded-lg bg-white text-[10px] sm:text-sm text-slate-700 outline-none focus:border-[#2b41b8] focus:ring-2 focus:ring-[#2b41b8]/15 min-w-0">
          {ESTADO_FILTER_OPTIONS.map((opt) => <option key={opt.value || 'all'} value={opt.value}>Estado: {opt.label}</option>)}
        </select>
      )}
      <select value={filterPago} onChange={(e) => setFilterPago(e.target.value)} className="h-9 sm:h-10 px-2 sm:px-3 border border-slate-200 rounded-lg bg-white text-[10px] sm:text-sm text-slate-700 outline-none focus:border-[#2b41b8] focus:ring-2 focus:ring-[#2b41b8]/15 min-w-0">
        {PAGO_FILTER_OPTIONS.map((opt) => <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>)}
      </select>
      <select value={filterProveedorId} onChange={(e) => setFilterProveedorId(e.target.value)} className="h-9 sm:h-10 px-2 sm:px-3 border border-slate-200 rounded-lg bg-white text-[10px] sm:text-sm text-slate-700 outline-none focus:border-[#2b41b8] focus:ring-2 focus:ring-[#2b41b8]/15 min-w-0">
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
      className="co-compras-page w-full min-h-full animate-slide-up pb-10"
      style={{ fontFamily: "'Inter', system-ui, sans-serif", backgroundColor: CO_PAGE_BG }}
    >

      {/* ── Móvil ── */}
      <div className="md:hidden">
        <ComprasPageHeader
          title={isImpresion || isTaller ? 'Órdenes activas' : isVistaAprobaciones ? 'Pendientes de aprobación' : 'Órdenes de Compra'}
          subtitle={isVistaAprobaciones
            ? 'Revisa, aprueba o rechaza solicitudes de compra entrantes'
            : isImpresion || isTaller
            ? 'Solicitudes pendientes, aprobadas o en recepción'
            : 'Control y emisión de compras de materiales y activos.'}
          action={(
            <ComprasHeaderButton onClick={() => navigate('/compras/nueva')}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Nueva Orden
            </ComprasHeaderButton>
          )}
        />

        {(isImpresion || isTaller) && <ComprasOperativoNav />}
        {showAdminNav && <ComprasAdminNav />}

        <div className={`grid gap-2 mb-4 ${isAdmin ? 'grid-cols-4' : 'grid-cols-2'}`}>
          {kpiItems.map((kpi) => renderKpiCardMobile(kpi))}
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex gap-2">
            <div className="relative flex-1 min-w-0">
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                id="search-ordenes-mobile"
                value={ordenSearchInput}
                onChange={handleOrdenSearchChange}
                placeholder="Buscar por número, proveedor o concepto…"
                className="w-full h-10 pl-10 pr-3 border border-slate-200 rounded-xl bg-white text-sm text-slate-800 outline-none focus:border-[#2b41b8] focus:ring-2 focus:ring-[#2b41b8]/15"
              />
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setMobileFiltersOpen((v) => !v)}
                className="w-10 h-10 shrink-0 inline-flex items-center justify-center border border-slate-200 rounded-xl bg-white text-slate-500 relative"
                aria-label="Filtros"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
                </svg>
                {activeFiltersCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[1rem] h-4 px-1 rounded-full text-[9px] font-bold text-white flex items-center justify-center" style={{ backgroundColor: CO_PRIMARY }}>
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            )}
          </div>
          {isAdmin && mobileFiltersOpen && renderAdminFilters()}
          {!isAdmin && (
            <DateRangePicker value={fechas} onChange={(val) => setFechas({ start: val.start, end: val.end })} placeholder="Rango de fechas" />
          )}
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden mb-3">
          <div className="px-3 py-2.5 flex items-center justify-between border-b border-slate-100">
            <h2 className="text-sm font-bold" style={{ color: CO_NAVY }}>Órdenes recientes</h2>
            {ordenTotalPages > 1 && (
              <button type="button" onClick={() => setOrdenPage((p) => Math.min(p + 1, ordenTotalPages))} className="text-[11px] font-semibold" style={{ color: CO_PRIMARY }}>
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
              <span className="text-xs font-semibold px-2 tabular-nums" style={{ color: CO_NAVY }}>{ordenPage} / {ordenTotalPages}</span>
              <button type="button" disabled={ordenPage >= ordenTotalPages} onClick={() => setOrdenPage((p) => p + 1)} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 bg-white">&gt;</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Escritorio ── */}
      <div className="hidden md:block">
      <ComprasPageHeader
        title={isImpresion || isTaller ? 'Órdenes activas' : isVistaAprobaciones ? 'Pendientes de aprobación' : 'Órdenes de Compra'}
        subtitle={isVistaAprobaciones
          ? 'Revisa, aprueba o rechaza solicitudes de órdenes de compra entrantes'
          : isImpresion || isTaller
          ? 'Solicitudes pendientes, aprobadas o en recepción de tu área'
          : 'Solicitud, control y emisión de compras de materiales y activos.'}
        action={(
          <ComprasHeaderButton onClick={() => navigate('/compras/nueva')} id="btn-nueva-orden">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nueva Orden
          </ComprasHeaderButton>
        )}
      />

      {(isImpresion || isTaller) && <ComprasOperativoNav />}
      {showAdminNav && <ComprasAdminNav />}

      <div className={`grid gap-4 mb-6 ${isAdmin ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-2'}`}>
        {kpiItems.map((kpi) => renderKpiCardDesktop(kpi))}
      </div>

      <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 space-y-3">
          <div className="relative">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              id="search-ordenes"
              value={ordenSearchInput}
              onChange={handleOrdenSearchChange}
              placeholder="Buscar por número, proveedor o concepto…"
              className="w-full h-10 pl-10 pr-3 border border-slate-200 rounded-lg bg-white text-sm text-slate-800 outline-none focus:border-[#2b41b8] focus:ring-2 focus:ring-[#2b41b8]/15"
            />
          </div>
          {isAdmin && renderAdminFilters('lg:grid-cols-4')}
          {!isAdmin && (
            <div className="max-w-xs">
              <DateRangePicker value={fechas} onChange={(val) => setFechas({ start: val.start, end: val.end })} placeholder="Rango de fechas" />
            </div>
          )}
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
                <th className="px-4 py-3">Emisor</th>
                {isVistaAprobaciones && <th className="px-4 py-3">Proyecto</th>}
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Concepto</th>
                {isAdmin && <th className="px-4 py-3 text-right">Total</th>}
                <th className="px-4 py-3 text-center">Estado</th>
                {isAdmin && <th className="px-4 py-3 text-center">Pago</th>}
                <th className="px-4 py-3 text-center w-28">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!ordenLoading && ordenes.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: CO_PRIMARY }}>{o.numero}</td>
                  <td className="px-4 py-3 font-medium" style={{ color: CO_NAVY }}>{o.proveedor?.nombre || '—'}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{o.usuario?.nombre || '—'}</td>
                  {isVistaAprobaciones && (
                    <td className="px-4 py-3 text-slate-700 text-xs max-w-[180px] truncate" title={getOrdenProyectoLabel(o) || ''}>
                      {getOrdenProyectoLabel(o) || '—'}
                    </td>
                  )}
                  <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{fmtDate(o.fecha)}</td>
                  <td className="px-4 py-3 text-slate-700 text-xs max-w-[220px] truncate" title={o.concepto}>{o.concepto || '—'}</td>
                  {isAdmin && <td className="px-4 py-3 text-right font-semibold text-slate-900 tabular-nums">{fmt(o.total)}</td>}
                  <td className="px-4 py-3 text-center">{renderBadge(ESTADO_BADGES, o.estado)}</td>
                  {isAdmin && <td className="px-4 py-3 text-center">{renderBadge(PAGO_BADGES, o.estadoPago)}</td>}
                  <td className="px-4 py-3">{renderOrdenActions(o)}</td>
                </tr>
              ))}
              {!ordenLoading && ordenes.length === 0 && (
                <tr><td colSpan={isAdmin ? (isVistaAprobaciones ? 10 : 9) : 7} className="px-4 py-16 text-center text-slate-400 text-sm">{emptyMessage}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-slate-100 flex flex-row items-center justify-between gap-3 bg-white">
          <p className="text-xs text-slate-500">
            Mostrando {showingFrom} a {showingTo} de {ordenTotal} órdenes
          </p>
          <div className="flex items-center gap-1">
            <button type="button" disabled={ordenPage <= 1} onClick={() => setOrdenPage((p) => p - 1)} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50">&lt;</button>
            {Array.from({ length: Math.min(5, ordenTotalPages) }, (_, i) => {
              const maxVisible = Math.min(5, ordenTotalPages);
              let start = Math.max(1, ordenPage - Math.floor(maxVisible / 2));
              const end = Math.min(ordenTotalPages, start + maxVisible - 1);
              if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
              const pageNum = start + i;
              if (pageNum > end) return null;
              const isActive = ordenPage === pageNum;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setOrdenPage(pageNum)}
                  className={`w-8 h-8 rounded-lg border text-sm font-medium transition-colors ${isActive ? 'text-white border-transparent' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  style={isActive ? { backgroundColor: CO_PRIMARY, borderColor: CO_PRIMARY } : undefined}
                >
                  {pageNum}
                </button>
              );
            })}
            <button type="button" disabled={ordenPage >= ordenTotalPages} onClick={() => setOrdenPage((p) => p + 1)} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50">&gt;</button>
          </div>
        </div>
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
                      <span className="font-bold text-red-500">{fmt(saldoAbono)}</span>
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
                    <button type="submit" disabled={abonoSaving} className="co-btn-primary" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 4px 14px rgba(16,185,129,0.3)' }}>
                      {abonoSaving && <div className="co-spinner-sm" />}
                      Registrar Gasto
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
                <h2 className="text-lg font-bold text-slate-800">Motivo del Rechazo</h2>
                <button type="button" onClick={() => setViewReasonOpen(false)} className="co-modal-close">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="co-modal-body">
                <div className="space-y-4">
                  <div className="text-xs text-slate-500">
                    Motivo ingresado para el rechazo de la orden de compra <strong className="font-mono">{viewReasonNumero}</strong>:
                  </div>
                  <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-xl text-slate-700 text-sm font-semibold whitespace-pre-wrap leading-relaxed">
                    {viewReasonText || 'No se ingresó un motivo específico.'}
                  </div>
                  <div className="flex items-center justify-end pt-3 border-t border-slate-100">
                    <button type="button" onClick={() => setViewReasonOpen(false)} className="co-btn-primary" style={{ background: '#475569' }}>
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
