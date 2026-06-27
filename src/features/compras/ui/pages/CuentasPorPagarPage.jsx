import React, { useEffect, useState, useCallback } from 'react';
import { ModalPortal, deferClose } from '../../../../shared/ui/components/ModalPortal.jsx';
import { toast } from '../../../../shared/ui/components/Toast';
import {
  getCuentasPorPagar, registrarAbono, getMetodosPago, getComprasStats
} from '../../application/comprasService';
import './ComprasPage.css';

const CXP_BADGES = {
  pendiente: { bg: 'rgba(239,68,68,0.08)', color: '#ef4444', label: 'Pendiente' },
  parcial:   { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b', label: 'Parcial' },
  pagado:    { bg: 'rgba(16,185,129,0.1)', color: '#10b981', label: 'Pagado' },
  vencido:   { bg: 'rgba(220,38,38,0.1)',  color: '#dc2626', label: 'Vencido' },
};

const fmt = (n) => '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-EC', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

export const CuentasPorPagarPage = () => {
  const [stats, setStats] = useState({ totalOrdenes: 0, pendientes: 0, totalGastado: 0, totalDeuda: 0 });
  const [cxpItems, setCxpItems] = useState([]);
  const [cxpPage, setCxpPage] = useState(1);
  const [cxpTotal, setCxpTotal] = useState(0);
  const [cxpFilter, setCxpFilter] = useState('');
  const [cxpLoading, setCxpLoading] = useState(true);
  const [metodos, setMetodos] = useState([]);

  // Abono modal
  const [abonoModalOpen, setAbonoModalOpen] = useState(false);
  const [abonoOrden, setAbonoOrden] = useState(null);
  const [abonoForm, setAbonoForm] = useState({ metodoPagoId: '', monto: '', referencia: '' });
  const [abonoSaving, setAbonoSaving] = useState(false);
  const perPage = 8;

  const loadStats = useCallback(async () => {
    try { const s = await getComprasStats(); setStats(s); } catch {}
  }, []);

  const loadCxP = useCallback(async () => {
    setCxpLoading(true);
    try {
      const data = await getCuentasPorPagar({ page: cxpPage, limit: perPage, estado: cxpFilter || undefined });
      setCxpItems(data.items || []);
      setCxpTotal(data.total || 0);
    } catch { setCxpItems([]); setCxpTotal(0); }
    finally { setCxpLoading(false); }
  }, [cxpPage, cxpFilter]);

  const loadMetodos = useCallback(async () => {
    try { const m = await getMetodosPago(); setMetodos(m); } catch {}
  }, []);

  useEffect(() => { loadStats(); loadMetodos(); }, []);
  useEffect(() => { loadCxP(); }, [loadCxP]);

  const openAbonoModal = (orden) => {
    setAbonoOrden(orden);
    setAbonoForm({ metodoPagoId: metodos.filter(m => m.activo)[0]?.id || '', monto: '', referencia: '' });
    setAbonoModalOpen(true);
  };

  const handleAbonoSave = async (e) => {
    e.preventDefault();
    setAbonoSaving(true);
    try {
      await registrarAbono(abonoOrden.id, {
        metodoPagoId: abonoForm.metodoPagoId,
        monto: parseFloat(abonoForm.monto) || 0,
        referencia: abonoForm.referencia
      });
      setAbonoModalOpen(false);
      loadStats(); loadCxP();
    } catch (err) { toast.error(err.message); }
    finally { setAbonoSaving(false); }
  };

  const cxpTotalPages = Math.max(1, Math.ceil(cxpTotal / perPage));

  return (
    <div className="co-page animate-slide-up">
      {/* Header */}
      <div className="co-card co-header">
        <div>
          <h1 className="co-title">Cuentas por Pagar</h1>
          <p className="co-subtitle">Gestión de deudas y saldos pendientes a proveedores</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="co-kpi-grid">
        {[
          { label: 'Deuda Total', value: fmt(stats.totalDeuda), color: '#ef4444', icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z' },
          { label: 'Órdenes Pendientes', value: stats.pendientes, color: '#f59e0b', icon: 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' },
        ].map((kpi, i) => (
          <div key={i} className="co-card co-kpi-card" style={{ maxWidth: '300px' }}>
            <div className="co-kpi-icon" style={{ background: `${kpi.color}15` }}>
              <svg className="w-5 h-5" style={{ color: kpi.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={kpi.icon} />
              </svg>
            </div>
            <div>
              <div className="co-kpi-label">{kpi.label}</div>
              <div className="co-kpi-value">{kpi.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Cuentas por pagar table */}
      <div className="co-card co-table-card">
        <div className="co-table-header">
          <span className="text-sm font-semibold text-slate-600">Filtrar por estado:</span>
          <select className="co-input co-select-sm" value={cxpFilter} onChange={e => { setCxpFilter(e.target.value); setCxpPage(1); }}>
            <option value="">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="parcial">Parcial</option>
            <option value="pagado">Pagado</option>
            <option value="vencido">Vencido</option>
          </select>
        </div>

        {cxpLoading ? (
          <div className="co-loader-box"><div className="co-spinner" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="co-table">
              <thead>
                <tr>
                  <th>Orden</th><th>Proveedor</th><th className="text-right">Monto Total</th>
                  <th className="text-right">Pagado</th><th className="text-right">Saldo</th>
                  <th className="text-center">Vencimiento</th><th className="text-center">Estado</th><th className="text-center w-20">Acción</th>
                </tr>
              </thead>
              <tbody>
                {cxpItems.map(c => (
                  <tr key={c.id} className="co-tr">
                    <td className="font-mono text-xs font-semibold text-slate-700">{c.ordenCompra?.numero || '—'}</td>
                    <td className="font-semibold text-slate-800">{c.ordenCompra?.proveedor?.nombre || '—'}</td>
                    <td className="text-right text-slate-700">{fmt(c.montoTotal)}</td>
                    <td className="text-right text-emerald-600 font-semibold">{fmt(c.montoPagado)}</td>
                    <td className="text-right text-red-500 font-bold">{fmt(c.saldo)}</td>
                    <td className="text-center text-slate-500 text-xs">{fmtDate(c.fechaVencimiento)}</td>
                    <td className="text-center">
                      <span className="co-badge" style={{ background: CXP_BADGES[c.estado]?.bg, color: CXP_BADGES[c.estado]?.color }}>
                        {CXP_BADGES[c.estado]?.label || c.estado}
                      </span>
                    </td>
                    <td className="text-center">
                      {c.estado !== 'pagado' && (
                        <button onClick={() => openAbonoModal(c.ordenCompra)} className="co-action-btn co-action-green" title="Registrar Abono">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {cxpItems.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-16 text-slate-400 text-sm font-medium">No hay cuentas por pagar</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {cxpTotalPages > 1 && (
          <div className="co-pagination">
            <span className="text-xs font-medium text-slate-400">{cxpTotal} cuenta{cxpTotal !== 1 ? 's' : ''}</span>
            <div className="flex items-center gap-1">
              <button disabled={cxpPage <= 1} onClick={() => setCxpPage(p => p - 1)} className="co-page-btn">‹</button>
              <span className="text-xs font-semibold text-slate-500 px-2">{cxpPage} / {cxpTotalPages}</span>
              <button disabled={cxpPage >= cxpTotalPages} onClick={() => setCxpPage(p => p + 1)} className="co-page-btn">›</button>
            </div>
          </div>
        )}
      </div>

      {/* Registrar Abono Modal */}
      {abonoModalOpen && (
        <ModalPortal>
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
                      <span className="font-semibold">{fmt(abonoOrden.total)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Saldo pendiente:</span>
                      <span className="font-bold text-red-500">{fmt(abonoOrden.cuentaPorPagar?.saldo || abonoOrden.total)}</span>
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
                      max={abonoOrden?.cuentaPorPagar?.saldo || abonoOrden?.total || 999999}
                      value={abonoForm.monto}
                      onChange={e => {
                        const val = e.target.value;
                        const maxVal = abonoOrden?.cuentaPorPagar?.saldo || abonoOrden?.total || 0;
                        if (parseFloat(val) > maxVal) {
                          setAbonoForm(p => ({ ...p, monto: maxVal.toString() }));
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
                    <button type="submit" disabled={abonoSaving || !abonoForm.monto || parseFloat(abonoForm.monto) <= 0 || parseFloat(abonoForm.monto) > (abonoOrden?.cuentaPorPagar?.saldo || abonoOrden?.total || 0)} className="co-btn-primary" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', boxShadow: '0 4px 14px rgba(16,185,129,0.3)' }}>
                      {abonoSaving && <div className="co-spinner-sm" />}
                      Registrar Abono
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
};
