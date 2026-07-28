import React, { useEffect, useState, useCallback } from 'react';
import { Eye, Trash2, X, FileText, AlertCircle } from 'lucide-react';
import { ModalPortal } from '../../../../shared/ui/components/ModalPortal.jsx';
import { toast } from '../../../../shared/ui/components/Toast';
import {
  getCuentasPorPagar, registrarAbono, getMetodosPago, getComprasStats, getAbonos, eliminarAbono
} from '../../application/comprasService';
import { buildOrdenParaAbono, getAbonoSaldoPendiente } from '../../helpers/ordenCompraHelpers';
import { ComprasPageHeader } from '../components/ComprasPageHeader';
import { isAdminUser } from '../../../../shared/utils/userRoleHelpers';
import './ComprasPage.css';

const CO_PRIMARY = '#2b41b8';
const CO_PRIMARY_HOVER = '#2436a0';
const CO_NAVY = '#1a1c3d';

const CXP_BADGES = {
  pendiente: { bg: 'bg-red-50', color: 'text-red-700', dot: 'bg-red-500', label: 'PENDIENTE' },
  parcial:   { bg: 'bg-orange-50', color: 'text-orange-700', dot: 'bg-orange-500', label: 'PARCIAL' },
  pagado:    { bg: 'bg-emerald-50', color: 'text-emerald-700', dot: 'bg-emerald-500', label: 'PAGADO' },
  vencido:   { bg: 'bg-red-50', color: 'text-red-800', dot: 'bg-red-600', label: 'VENCIDO' },
};

const ESTADO_FILTER_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'parcial', label: 'Parcial' },
  { value: 'pagado', label: 'Pagado' },
  { value: 'vencido', label: 'Vencido' },
];

const fmt = (n) => '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-EC', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('es-EC', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export const CuentasPorPagarPage = () => {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = isAdminUser(currentUser);

  const [stats, setStats] = useState({ totalOrdenes: 0, pendientes: 0, totalGastado: 0, totalDeuda: 0 });
  const [cxpItems, setCxpItems] = useState([]);
  const [cxpPage, setCxpPage] = useState(1);
  const [cxpTotal, setCxpTotal] = useState(0);
  const [cxpFilter, setCxpFilter] = useState('');
  const [cxpLoading, setCxpLoading] = useState(true);
  const [metodos, setMetodos] = useState([]);

  // Modal Registrar Abono
  const [abonoModalOpen, setAbonoModalOpen] = useState(false);
  const [abonoOrden, setAbonoOrden] = useState(null);
  const [abonoForm, setAbonoForm] = useState({ metodoPagoId: '', monto: '', referencia: '' });
  const [abonoSaving, setAbonoSaving] = useState(false);
  
  // Modal Ver Pagos / Abonos
  const [verModalOpen, setVerModalOpen] = useState(false);
  const [verCuenta, setVerCuenta] = useState(null);
  const [verAbonosList, setVerAbonosList] = useState([]);
  const [verLoading, setVerLoading] = useState(false);
  const [deletingAbonoId, setDeletingAbonoId] = useState(null);
  const [confirmDeleteAbono, setConfirmDeleteAbono] = useState(null);

  const perPage = 25;

  const loadStats = useCallback(async () => {
    try { const s = await getComprasStats(); setStats(s); } catch {}
  }, []);

  const loadCxP = useCallback(async () => {
    setCxpLoading(true);
    try {
      const data = await getCuentasPorPagar({ page: cxpPage, limit: perPage, estado: cxpFilter || undefined });
      setCxpItems(data.items || []);
      setCxpTotal(data.total || 0);
    } catch {
      setCxpItems([]);
      setCxpTotal(0);
    } finally {
      setCxpLoading(false);
    }
  }, [cxpPage, cxpFilter]);

  const loadMetodos = useCallback(async () => {
    try { const m = await getMetodosPago(); setMetodos(m); } catch {}
  }, []);

  useEffect(() => { loadStats(); loadMetodos(); }, [loadStats, loadMetodos]);
  useEffect(() => { loadCxP(); }, [loadCxP]);
  useEffect(() => { setCxpPage(1); }, [cxpFilter]);

  const openAbonoModal = (cuenta) => {
    const orden = buildOrdenParaAbono(cuenta);
    if (!orden) return;
    setAbonoOrden(orden);
    setAbonoForm({ metodoPagoId: metodos.filter(m => m.activo)[0]?.id || '', monto: '', referencia: '' });
    setAbonoModalOpen(true);
  };

  const openVerModal = async (cuenta) => {
    setVerCuenta(cuenta);
    setVerModalOpen(true);
    setVerLoading(true);
    try {
      const ordenId = cuenta.ordenCompraId || cuenta.ordenCompra?.id;
      const list = await getAbonos(ordenId);
      setVerAbonosList(list || []);
    } catch (err) {
      toast.error(err.message || 'Error al obtener el historial de abonos');
      setVerAbonosList([]);
    } finally {
      setVerLoading(false);
    }
  };

  const reloadVerAbonos = async () => {
    if (!verCuenta) return;
    setVerLoading(true);
    try {
      const ordenId = verCuenta.ordenCompraId || verCuenta.ordenCompra?.id;
      const list = await getAbonos(ordenId);
      setVerAbonosList(list || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setVerLoading(false);
    }
  };

  const handleConfirmDeleteAbono = async () => {
    if (!confirmDeleteAbono || !verCuenta) return;
    const abonoId = confirmDeleteAbono.id;
    const ordenId = verCuenta.ordenCompraId || verCuenta.ordenCompra?.id;
    setDeletingAbonoId(abonoId);
    try {
      await eliminarAbono(ordenId, abonoId);
      toast.success('Abono eliminado con éxito. El dinero ha sido devuelto a la cuenta.');
      setConfirmDeleteAbono(null);
      await reloadVerAbonos();
      loadStats();
      loadCxP();
      loadMetodos();
    } catch (err) {
      toast.error(err.message || 'Error al eliminar abono');
    } finally {
      setDeletingAbonoId(null);
    }
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
      loadStats();
      loadCxP();
      loadMetodos();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAbonoSaving(false);
    }
  };

  const cxpTotalPages = Math.max(1, Math.ceil(cxpTotal / perPage));
  const showingFrom = cxpTotal === 0 ? 0 : (cxpPage - 1) * perPage + 1;
  const showingTo = Math.min(cxpPage * perPage, cxpTotal);

  const kpiItems = [
    { label: 'Deuda total', mobileLabel: 'Deuda', value: fmt(stats.totalDeuda), hint: 'Saldo por pagar', accent: '#ef4444', iconBg: 'bg-red-50', iconColor: 'text-red-500', icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z' },
    { label: 'Órdenes pendientes', mobileLabel: 'Pendientes', value: stats.pendientes, hint: 'Por aprobar o pagar', accent: '#f97316', iconBg: 'bg-orange-50', iconColor: 'text-orange-500', icon: 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' },
    { label: 'Total gastado', mobileLabel: 'Gastado', value: fmt(stats.totalGastado), hint: 'Monto acumulado', accent: '#10b981', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', icon: 'M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' },
    { label: 'Cuentas listadas', mobileLabel: 'Cuentas', value: cxpTotal, hint: 'Según filtro actual', accent: '#2b41b8', iconBg: 'bg-[#eef1fc]', iconColor: 'text-[#2b41b8]', icon: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-6.75 3h16.5a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5H4.5a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5z' },
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

  const renderBadge = (estado, compact = false) => {
    const b = CXP_BADGES[estado] || CXP_BADGES.pendiente;
    return (
      <span className={`inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wide ${b.bg} ${b.color} ${
        compact ? 'px-1.5 py-0.5 text-[8px] gap-0.5' : 'px-2.5 py-1 text-[10px] gap-1.5'
      }`}>
        <span className={`rounded-full shrink-0 ${b.dot} ${compact ? 'w-1 h-1' : 'w-1.5 h-1.5'}`} />
        {b.label}
      </span>
    );
  };

  const renderEstadoFilter = (className = '') => (
    <select
      value={cxpFilter}
      onChange={(e) => setCxpFilter(e.target.value)}
      className={`h-9 sm:h-10 px-2 sm:px-3 border border-slate-200 rounded-lg bg-white text-[10px] sm:text-sm text-slate-700 outline-none focus:border-[#2b41b8] focus:ring-2 focus:ring-[#2b41b8]/15 min-w-0 ${className}`}
    >
      {ESTADO_FILTER_OPTIONS.map((opt) => (
        <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );

  const renderMobileRow = (c) => (
    <div key={c.id} className="co-orden-row border-b border-slate-100 last:border-b-0">
      <div className="flex items-start justify-between gap-2 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] font-bold leading-tight" style={{ color: CO_PRIMARY }}>{c.ordenCompra?.numero || '—'}</p>
          <p className="text-[10px] text-slate-500 truncate mt-0.5">{c.ordenCompra?.proveedor?.nombre || '—'}</p>
          <div className="mt-1">{renderBadge(c.estado, true)}</div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] text-slate-400">Saldo</p>
          <p className="text-sm font-bold text-red-600 tabular-nums">{fmt(c.saldo)}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs px-3 pb-2">
        <div><span className="text-slate-400 block text-[10px]">Total</span><span className="font-semibold text-slate-700">{fmt(c.montoTotal)}</span></div>
        <div><span className="text-slate-400 block text-[10px]">Pagado</span><span className="font-semibold text-emerald-600">{fmt(c.montoPagado)}</span></div>
        <div className="col-span-2"><span className="text-slate-400 block text-[10px]">Vencimiento</span><span className="text-slate-700">{fmtDate(c.fechaVencimiento)}</span></div>
      </div>
      <div className="px-3 pb-3 flex gap-2">
        <button
          type="button"
          onClick={() => openVerModal(c)}
          className="flex-1 h-9 inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
        >
          <Eye size={14} />
          Ver pagos
        </button>
        {c.estado !== 'pagado' && (
          <button
            type="button"
            onClick={() => openAbonoModal(c)}
            className="flex-1 h-9 inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold text-white"
            style={{ backgroundColor: CO_PRIMARY }}
          >
            Registrar abono
          </button>
        )}
      </div>
    </div>
  );

  const renderPagination = () => (
    <div className="px-4 md:px-5 py-3 border-t border-slate-100 bg-white flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4">
      <p className="text-xs text-slate-500 text-center md:text-left shrink-0">
        Mostrando {showingFrom} a {showingTo} de {cxpTotal} cuentas
      </p>
      {cxpTotalPages > 1 && (
        <div className="flex items-center justify-center md:justify-end gap-1">
          <button type="button" disabled={cxpPage <= 1} onClick={() => setCxpPage((p) => p - 1)} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 bg-white">&lt;</button>
          <span className="md:hidden text-xs font-semibold px-2 tabular-nums" style={{ color: CO_NAVY }}>{cxpPage} / {cxpTotalPages}</span>
          <div className="hidden md:flex items-center gap-1">
            {Array.from({ length: Math.min(5, cxpTotalPages) }, (_, i) => {
              const maxVisible = Math.min(5, cxpTotalPages);
              let start = Math.max(1, cxpPage - Math.floor(maxVisible / 2));
              const end = Math.min(cxpTotalPages, start + maxVisible - 1);
              if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
              const pageNum = start + i;
              if (pageNum > end) return null;
              const isActive = cxpPage === pageNum;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCxpPage(pageNum)}
                  className={`w-8 h-8 rounded-lg border text-sm font-medium transition-colors ${isActive ? 'text-white border-transparent' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  style={isActive ? { backgroundColor: CO_PRIMARY, borderColor: CO_PRIMARY } : undefined}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <button type="button" disabled={cxpPage >= cxpTotalPages} onClick={() => setCxpPage((p) => p + 1)} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 bg-white">&gt;</button>
        </div>
      )}
    </div>
  );

  return (
    <div
      className="co-compras-page animate-slide-up overflow-x-hidden pb-6"
    >
      {/* ── Móvil ── */}
      <div className="md:hidden">
        <ComprasPageHeader
          title="Cuentas por Pagar"
          subtitle="Deudas y saldos pendientes a proveedores."
          aside={(
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <p className="text-sm font-bold text-red-600 whitespace-nowrap tabular-nums">{fmt(stats.totalDeuda)}</p>
            </div>
          )}
        />

        <div className="grid grid-cols-2 gap-2 mb-4">
          {kpiItems.map((kpi) => renderKpiCardMobile(kpi))}
        </div>

        <div className="mb-3">
          {renderEstadoFilter('w-full')}
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden mb-3">
          <div className="px-3 py-2.5 border-b border-slate-100">
            <h2 className="text-sm font-bold" style={{ color: CO_NAVY }}>Cuentas por pagar</h2>
          </div>
          {cxpLoading && <div className="flex justify-center py-10"><div className="co-spinner" /></div>}
          {!cxpLoading && cxpItems.map((c) => renderMobileRow(c))}
          {!cxpLoading && cxpItems.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-10 px-4">No hay cuentas por pagar</p>
          )}
        </div>

        <div className="px-1 py-2 flex flex-col gap-2">
          <p className="text-[11px] text-slate-500 text-center">Mostrando {showingFrom} a {showingTo} de {cxpTotal} cuentas</p>
          {cxpTotalPages > 1 && (
            <div className="flex items-center justify-center gap-1">
              <button type="button" disabled={cxpPage <= 1} onClick={() => setCxpPage((p) => p - 1)} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 bg-white">&lt;</button>
              <span className="text-xs font-semibold px-2 tabular-nums" style={{ color: CO_NAVY }}>{cxpPage} / {cxpTotalPages}</span>
              <button type="button" disabled={cxpPage >= cxpTotalPages} onClick={() => setCxpPage((p) => p + 1)} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 bg-white">&gt;</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Escritorio ── */}
      <div className="hidden md:block">
        <ComprasPageHeader
          title="Cuentas por Pagar"
          subtitle="Gestión de deudas y saldos pendientes a proveedores."
        />

        <div className="grid gap-4 mb-6 md:grid-cols-2 xl:grid-cols-4">
          {kpiItems.map((kpi) => renderKpiCardDesktop(kpi))}
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <div className="max-w-xs">{renderEstadoFilter('w-full')}</div>
          </div>

          <div className="overflow-x-auto relative">
            {cxpLoading && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                <div className="co-spinner" />
              </div>
            )}
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f8f9fc] text-[11px] font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">Orden</th>
                  <th className="px-4 py-3">Proveedor</th>
                  <th className="px-4 py-3 text-right">Monto total</th>
                  <th className="px-4 py-3 text-right">Pagado</th>
                  <th className="px-4 py-3 text-right">Saldo</th>
                  <th className="px-4 py-3 text-center">Vencimiento</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-center w-48">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!cxpLoading && cxpItems.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: CO_PRIMARY }}>{c.ordenCompra?.numero || '—'}</td>
                    <td className="px-4 py-3 font-medium" style={{ color: CO_NAVY }}>{c.ordenCompra?.proveedor?.nombre || '—'}</td>
                    <td className="px-4 py-3 text-right text-slate-700 tabular-nums">{fmt(c.montoTotal)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-semibold tabular-nums">{fmt(c.montoPagado)}</td>
                    <td className="px-4 py-3 text-right text-red-600 font-bold tabular-nums">{fmt(c.saldo)}</td>
                    <td className="px-4 py-3 text-center text-slate-500 text-xs whitespace-nowrap">{fmtDate(c.fechaVencimiento)}</td>
                    <td className="px-4 py-3 text-center">{renderBadge(c.estado)}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openVerModal(c)}
                          className="h-8 px-2.5 inline-flex items-center justify-center gap-1 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors whitespace-nowrap cursor-pointer"
                          title="Ver historial de abonos"
                        >
                          <Eye size={14} />
                          Ver
                        </button>
                        {c.estado !== 'pagado' && (
                          <button
                            type="button"
                            onClick={() => openAbonoModal(c)}
                            className="h-8 px-2.5 inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold text-white whitespace-nowrap cursor-pointer"
                            style={{ backgroundColor: CO_PRIMARY }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = CO_PRIMARY_HOVER; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = CO_PRIMARY; }}
                          >
                            Registrar abono
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!cxpLoading && cxpItems.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-16 text-center text-slate-400 text-sm">No hay cuentas por pagar</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {renderPagination()}
        </div>
      </div>

      {/* Modal Registrar Abono */}
      <ModalPortal open={abonoModalOpen}>
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" onClick={() => setAbonoModalOpen(false)} />
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden relative z-[201] animate-slide-up">
            <div className="co-modal-header">
              <h2 className="text-lg font-bold text-slate-800">Registrar Abono</h2>
              <button type="button" onClick={() => setAbonoModalOpen(false)} className="co-modal-close cursor-pointer">
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
                      {metodos.filter(m => m.activo).map(m => (
                        <option key={m.id} value={m.id}>
                          {m.nombre} ({fmt(m.saldoActual || 0)})
                        </option>
                      ))}
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
                    <button type="submit" disabled={abonoSaving || !abonoForm.monto || parseFloat(abonoForm.monto) <= 0 || parseFloat(abonoForm.monto) > saldoAbono} className="co-btn-primary" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 4px 14px rgba(16,185,129,0.3)' }}>
                      {abonoSaving && <div className="co-spinner-sm" />}
                      Registrar Abono
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </ModalPortal>

      {/* Modal Ver Historial de Abonos */}
      <ModalPortal open={verModalOpen}>
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 animate-fade-in">
          {/* Backdrop Overlay with Blur */}
          <div
            className="fixed inset-0 bg-slate-900/65 backdrop-blur-md transition-opacity"
            onClick={() => setVerModalOpen(false)}
          />

          {/* Modal Container: Fixed max height & wide layout */}
          <div
            className="bg-white rounded-[20px] sm:rounded-[24px] border border-slate-100 shadow-2xl flex flex-col overflow-hidden relative z-[201] animate-slide-up"
            style={{ width: '94vw', maxWidth: '1100px', maxHeight: '85vh', fontFamily: "'Inter', sans-serif" }}
          >
            {/* Header (Fixed) */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100/80 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <FileText size={18} className="sm:w-5 sm:h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-lg font-extrabold text-slate-800 leading-tight truncate">
                    Historial de Pagos y Abonos
                  </h2>
                  <p className="text-[11px] sm:text-xs text-slate-500 font-semibold mt-0.5 truncate">
                    {verCuenta?.ordenCompra?.numero || 'Orden'} • {verCuenta?.ordenCompra?.proveedor?.nombre || 'Proveedor'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVerModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body (Scrollable inside) */}
            <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-5 flex-1 overflow-y-auto min-h-0 bg-white">
              {verCuenta && (
                /* 4 KPI Cards ALWAYS in 1 single row */
                <div className="grid grid-cols-4 gap-1.5 sm:gap-3.5 bg-slate-50/80 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200/80">
                  <div className="bg-white p-2 sm:p-3.5 rounded-lg sm:rounded-xl border border-slate-100 shadow-2xs flex flex-col justify-center min-w-0">
                    <span className="text-[8px] sm:text-[10px] text-slate-400 font-extrabold uppercase block tracking-wider truncate">Monto Total</span>
                    <span className="text-xs sm:text-base font-extrabold text-slate-800 font-mono mt-0.5 block truncate">{fmt(verCuenta.montoTotal)}</span>
                  </div>
                  <div className="bg-white p-2 sm:p-3.5 rounded-lg sm:rounded-xl border border-slate-100 shadow-2xs flex flex-col justify-center min-w-0">
                    <span className="text-[8px] sm:text-[10px] text-slate-400 font-extrabold uppercase block tracking-wider truncate">Pagado</span>
                    <span className="text-xs sm:text-base font-extrabold text-emerald-600 font-mono mt-0.5 block truncate">{fmt(verCuenta.montoPagado)}</span>
                  </div>
                  <div className="bg-white p-2 sm:p-3.5 rounded-lg sm:rounded-xl border border-slate-100 shadow-2xs flex flex-col justify-center min-w-0">
                    <span className="text-[8px] sm:text-[10px] text-slate-400 font-extrabold uppercase block tracking-wider truncate">Saldo</span>
                    <span className="text-xs sm:text-base font-extrabold text-red-600 font-mono mt-0.5 block truncate">{fmt(verCuenta.saldo)}</span>
                  </div>
                  <div className="bg-white p-2 sm:p-3.5 rounded-lg sm:rounded-xl border border-slate-100 shadow-2xs flex flex-col justify-between min-w-0">
                    <span className="text-[8px] sm:text-[10px] text-slate-400 font-extrabold uppercase block tracking-wider truncate">Estado</span>
                    <div className="mt-0.5 sm:mt-1 truncate">{renderBadge(verCuenta.estado, true)}</div>
                  </div>
                </div>
              )}

              {verLoading ? (
                <div className="flex justify-center py-10">
                  <div className="co-spinner" />
                </div>
              ) : verAbonosList.length === 0 ? (
                <div className="text-center py-10 bg-slate-50/50 rounded-xl sm:rounded-2xl border border-dashed border-slate-200">
                  <p className="text-slate-400 text-xs sm:text-sm font-semibold">No hay abonos registrados para esta cuenta por pagar.</p>
                </div>
              ) : (
                <>
                  {/* Vista Escritorio: Tabla panorámica completa */}
                  <div className="hidden sm:block border border-slate-200/80 rounded-2xl shadow-2xs bg-white overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#f8f9fc] text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/80">
                        <tr>
                          <th className="px-5 py-3.5">Fecha y Hora</th>
                          <th className="px-5 py-3.5">Caja / Cuenta de Pago</th>
                          <th className="px-5 py-3.5">Referencia</th>
                          <th className="px-5 py-3.5">Registrado Por</th>
                          <th className="px-5 py-3.5 text-right">Monto Abono</th>
                          {isAdmin && <th className="px-5 py-3.5 text-center w-28">Acciones</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {verAbonosList.map((ab, idx) => {
                          const isLastAbono = idx === 0;
                          return (
                            <tr key={ab.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-5 py-3.5 font-mono font-medium text-slate-600 whitespace-nowrap">{fmtDateTime(ab.fecha)}</td>
                              <td className="px-5 py-3.5 font-bold text-slate-800 whitespace-nowrap">{ab.metodoPago?.nombre || 'General'}</td>
                              <td className="px-5 py-3.5 text-slate-600">{ab.referencia || <span className="text-slate-300">—</span>}</td>
                              <td className="px-5 py-3.5 text-slate-600 font-medium whitespace-nowrap">{ab.registradoPor?.nombre || <span className="text-slate-300">—</span>}</td>
                              <td className="px-5 py-3.5 text-right font-extrabold text-slate-900 font-mono text-sm whitespace-nowrap">{fmt(ab.monto)}</td>
                              {isAdmin && (
                                <td className="px-5 py-3.5 text-center whitespace-nowrap">
                                  {isLastAbono ? (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteAbono(ab)}
                                      disabled={deletingAbonoId === ab.id}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 font-bold text-xs transition-colors cursor-pointer border border-red-100"
                                      title="Eliminar este abono (reembolsar a la cuenta)"
                                    >
                                      <Trash2 size={14} />
                                      Eliminar
                                    </button>
                                  ) : (
                                    <span className="text-[10px] font-semibold text-slate-300" title="Solo se puede eliminar el último abono registrado">Anteriores</span>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Vista Móvil: Tarjetas optimizadas para pantallas pequeñas */}
                  <div className="block sm:hidden space-y-2.5">
                    {verAbonosList.map((ab, idx) => {
                      const isLastAbono = idx === 0;
                      return (
                        <div key={ab.id} className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-800 text-xs">{ab.metodoPago?.nombre || 'General'}</span>
                            <span className="font-extrabold text-slate-900 font-mono text-sm">{fmt(ab.monto)}</span>
                          </div>
                          <div className="flex flex-col gap-1 text-[10px] text-slate-500 bg-slate-50 rounded-lg p-2 border border-slate-100">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Fecha:</span>
                              <span className="font-mono text-slate-700 font-medium">{fmtDateTime(ab.fecha)}</span>
                            </div>
                            {ab.referencia && (
                              <div className="flex justify-between">
                                <span className="text-slate-400">Referencia:</span>
                                <span className="font-medium text-slate-700">{ab.referencia}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-slate-400">Usuario:</span>
                              <span className="font-medium text-slate-700">{ab.registradoPor?.nombre || '—'}</span>
                            </div>
                          </div>
                          {isAdmin && isLastAbono && (
                            <div className="pt-1.5 border-t border-slate-100 flex justify-end">
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteAbono(ab)}
                                disabled={deletingAbonoId === ab.id}
                                className="w-full py-1.5 inline-flex items-center justify-center gap-1.5 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 font-bold text-xs border border-red-100 cursor-pointer"
                              >
                                <Trash2 size={14} />
                                Eliminar abono
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Footer (Fixed) */}
            <div className="px-4 sm:px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setVerModalOpen(false)}
                className="px-5 py-1.5 sm:py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 font-bold text-slate-700 text-xs transition-colors shadow-2xs cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>

      {/* Modal de Confirmación para eliminar abono (z-index 300) */}
      <ModalPortal open={!!confirmDeleteAbono}>
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop con Blur acumulativo sobre el primer modal */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity"
            onClick={() => setConfirmDeleteAbono(null)}
          />

          {/* Card Container */}
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-2xl w-full max-w-md p-6 relative z-[301] space-y-4 animate-slide-up">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
                <AlertCircle size={22} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 leading-tight">¿Eliminar último abono?</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Esta acción no se puede deshacer.</p>
              </div>
            </div>

            <div className="bg-red-50/70 border border-red-100 rounded-2xl p-4 text-xs text-red-900 space-y-1.5">
              <div className="flex justify-between">
                <span className="font-semibold text-red-700">Monto a devolver:</span>
                <span className="font-extrabold font-mono text-slate-900">{fmt(confirmDeleteAbono?.monto)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-red-700">Cuenta / Caja:</span>
                <span className="font-bold text-slate-900">{confirmDeleteAbono?.metodoPago?.nombre || 'General'}</span>
              </div>
              <p className="text-[11px] text-red-600/90 pt-1.5 border-t border-red-200/60 leading-relaxed font-medium">
                Este dinero regresará al saldo de la cuenta de pago seleccionada y aumentará el saldo pendiente de la cuenta por pagar.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteAbono(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAbono}
                disabled={!!deletingAbonoId}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-all shadow-md hover:shadow-lg inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {deletingAbonoId && <div className="co-spinner-sm" />}
                Sí, eliminar y devolver dinero
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
};
