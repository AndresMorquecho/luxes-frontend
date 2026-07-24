import React, { useEffect, useState, useCallback } from 'react';
import { Wallet, Banknote, X } from 'lucide-react';
import { ModalPortal } from '../../../../shared/ui/components/ModalPortal.jsx';
import { toast } from '../../../../shared/ui/components/Toast';
import {
  getCuentasPorPagar, registrarAbono, getMetodosPago, getComprasStats
} from '../../application/comprasService';
import { buildOrdenParaAbono, getAbonoSaldoPendiente } from '../../helpers/ordenCompraHelpers';
import { ComprasPageHeader } from '../components/ComprasPageHeader';
import './ComprasPage.css';

const CXP_BADGES = {
  pendiente: { bg: 'bg-rose-50', color: 'text-rose-700', label: 'Pendiente' },
  parcial:   { bg: 'bg-amber-50', color: 'text-amber-700', label: 'Parcial' },
  pagado:    { bg: 'bg-slate-100', color: 'text-slate-700', label: 'Pagado' },
  vencido:   { bg: 'bg-rose-50', color: 'text-rose-800', label: 'Vencido' },
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

const inputFocus =
  'outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:bg-white';

const inputClass =
  `w-full h-10 px-3 border border-slate-200 rounded-xl bg-gray-50 text-sm text-slate-800 ${inputFocus}`;
const labelClass = 'block text-xs font-semibold text-slate-500 mb-1.5';

export const CuentasPorPagarPage = () => {
  const [stats, setStats] = useState({ totalOrdenes: 0, pendientes: 0, totalGastado: 0, totalDeuda: 0 });
  const [cxpItems, setCxpItems] = useState([]);
  const [cxpPage, setCxpPage] = useState(1);
  const [cxpTotal, setCxpTotal] = useState(0);
  const [cxpFilter, setCxpFilter] = useState('');
  const [cxpLoading, setCxpLoading] = useState(true);
  const [metodos, setMetodos] = useState([]);

  const [abonoModalOpen, setAbonoModalOpen] = useState(false);
  const [abonoOrden, setAbonoOrden] = useState(null);
  const [abonoForm, setAbonoForm] = useState({ metodoPagoId: '', monto: '', referencia: '' });
  const [abonoSaving, setAbonoSaving] = useState(false);
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
    { label: 'Deuda total', value: fmt(stats.totalDeuda), border: 'border-t-red-500', color: 'text-red-500' },
    { label: 'Órdenes pendientes', value: stats.pendientes, border: 'border-t-amber-500', color: 'text-amber-600' },
    { label: 'Total gastado', value: fmt(stats.totalGastado), border: 'border-t-indigo-500', color: 'text-indigo-600' },
    { label: 'Cuentas listadas', value: cxpTotal, border: 'border-t-blue-600', color: 'text-blue-600' },
  ];

  const renderBadge = (estado, compact = false) => {
    const b = CXP_BADGES[estado] || CXP_BADGES.pendiente;
    return (
      <span className={`inline-flex items-center rounded-full font-medium ${b.bg} ${b.color} ${
        compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      }`}>
        {b.label}
      </span>
    );
  };

  const renderEstadoFilter = () => (
    <select
      value={cxpFilter}
      onChange={(e) => setCxpFilter(e.target.value)}
      className={`h-10 px-3 border border-slate-200 rounded-xl bg-gray-50 text-sm text-slate-700 ${inputFocus} w-full max-w-xs`}
    >
      {ESTADO_FILTER_OPTIONS.map((opt) => (
        <option key={opt.value || 'all'} value={opt.value}>
          Estado: {opt.label}
        </option>
      ))}
    </select>
  );

  const renderAbonoAction = (c) => (
    c.estado !== 'pagado' ? (
      <button
        type="button"
        onClick={() => openAbonoModal(c)}
        className="p-1.5 rounded-lg bg-blue-50 text-blue-500 border border-blue-100 hover:bg-blue-100 hover:text-blue-600 transition-colors"
        title="Registrar abono"
        aria-label="Registrar abono"
      >
        <Banknote className="w-4 h-4" strokeWidth={1.5} />
      </button>
    ) : (
      <span className="text-sm text-slate-400">—</span>
    )
  );

  const renderMobileRow = (c) => (
    <div key={c.id} className="border-b border-slate-100 last:border-b-0">
      <div className="flex items-start justify-between gap-2 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[11px] font-bold leading-tight text-blue-700">
            {c.ordenCompra?.numero || '—'}
          </p>
          <p className="text-[10px] text-slate-500 truncate mt-0.5">
            {c.ordenCompra?.proveedor?.nombre || '—'}
          </p>
          <div className="mt-1">{renderBadge(c.estado, true)}</div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] text-slate-400">Saldo</p>
          <p className="text-sm font-bold text-rose-600 tabular-nums">{fmt(c.saldo)}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs px-3 pb-2">
        <div>
          <span className="text-slate-400 block text-[10px]">Total</span>
          <span className="font-semibold text-slate-700">{fmt(c.montoTotal)}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px]">Pagado</span>
          <span className="font-semibold text-slate-700">{fmt(c.montoPagado)}</span>
        </div>
        <div className="col-span-2">
          <span className="text-slate-400 block text-[10px]">Vencimiento</span>
          <span className="text-slate-700">{fmtDate(c.fechaVencimiento)}</span>
        </div>
      </div>
      {c.estado !== 'pagado' && (
        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={() => openAbonoModal(c)}
            className="w-full h-9 inline-flex items-center justify-center rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700"
          >
            Registrar abono
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div
      className="space-y-3 sm:space-y-5 animate-slide-up overflow-x-hidden pb-6"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <style>{`
        .shadow-card { box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02); }
      `}</style>

      <ComprasPageHeader
        icon={Wallet}
        badge="Compras"
        title="Cuentas por pagar"
        subtitle="Deudas y saldos pendientes a proveedores"
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

      <div className="bg-white shadow-card rounded-xl border border-gray-100 p-3 sm:p-4">
        {renderEstadoFilter()}
      </div>

      {/* Móvil */}
      <div className="md:hidden space-y-3">
        <div className="bg-white shadow-card rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
            <h2 className="text-sm font-semibold text-slate-800">Cuentas por pagar</h2>
            <span className="text-xs font-medium text-gray-400">{cxpTotal} registros</span>
          </div>
          {cxpLoading && (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-200 border-t-blue-500" />
            </div>
          )}
          {!cxpLoading && cxpItems.map((c) => renderMobileRow(c))}
          {!cxpLoading && cxpItems.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-10 px-4">No hay cuentas por pagar</p>
          )}
        </div>

        <div className="px-1 py-2 flex flex-col gap-2">
          <p className="text-[11px] text-slate-500 text-center">
            Mostrando {showingFrom} a {showingTo} de {cxpTotal} cuentas
          </p>
          {cxpTotalPages > 1 && (
            <div className="flex items-center justify-center gap-1">
              <button
                type="button"
                disabled={cxpPage <= 1}
                onClick={() => setCxpPage((p) => p - 1)}
                className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 bg-white"
              >
                &lt;
              </button>
              <span className="text-xs font-semibold px-2 tabular-nums text-slate-800">
                {cxpPage} / {cxpTotalPages}
              </span>
              <button
                type="button"
                disabled={cxpPage >= cxpTotalPages}
                onClick={() => setCxpPage((p) => p + 1)}
                className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 bg-white"
              >
                &gt;
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Escritorio */}
      <div className="hidden md:block">
        <div className="bg-white shadow-card rounded-xl border border-gray-100 overflow-hidden">
          <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Lista de cuentas</h2>
            <span className="text-xs font-medium text-gray-400">{cxpTotal} registros</span>
          </div>

          <div className="overflow-x-auto relative">
            {cxpLoading && (
              <div className="absolute inset-0 z-10 flex justify-center items-center bg-white/70 backdrop-blur-[2px]">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-200 border-t-blue-500" />
              </div>
            )}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Orden</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Proveedor</th>
                  <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Monto total</th>
                  <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pagado</th>
                  <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Saldo</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Vencimiento</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!cxpLoading && cxpItems.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4 font-mono text-sm font-semibold text-blue-700">
                      {c.ordenCompra?.numero || '—'}
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-slate-800">
                      {c.ordenCompra?.proveedor?.nombre || '—'}
                    </td>
                    <td className="px-5 py-4 text-right text-sm text-slate-700 tabular-nums">
                      {fmt(c.montoTotal)}
                    </td>
                    <td className="px-5 py-4 text-right text-sm font-semibold text-slate-700 tabular-nums">
                      {fmt(c.montoPagado)}
                    </td>
                    <td className="px-5 py-4 text-right text-sm font-semibold text-rose-600 tabular-nums">
                      {fmt(c.saldo)}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-700 whitespace-nowrap">
                      {fmtDate(c.fechaVencimiento)}
                    </td>
                    <td className="px-5 py-4">{renderBadge(c.estado)}</td>
                    <td className="px-5 py-4 text-right">{renderAbonoAction(c)}</td>
                  </tr>
                ))}
                {!cxpLoading && cxpItems.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-sm text-slate-400">
                      No hay cuentas por pagar
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {cxpTotal > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3 border-t border-gray-100">
              <span className="text-[11px] font-medium text-gray-400">
                Mostrando {showingFrom} a {showingTo} de {cxpTotal} cuentas
              </span>
              {cxpTotalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={cxpPage <= 1}
                    onClick={() => setCxpPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    Anterior
                  </button>
                  {Array.from({ length: Math.min(5, cxpTotalPages) }, (_, i) => {
                    const maxVisible = Math.min(5, cxpTotalPages);
                    let start = Math.max(1, cxpPage - Math.floor(maxVisible / 2));
                    const end = Math.min(cxpTotalPages, start + maxVisible - 1);
                    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
                    const pageNum = start + i;
                    if (pageNum > end) return null;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCxpPage(pageNum)}
                        className={`w-7 h-7 rounded-lg text-[11px] font-semibold transition-colors ${
                          cxpPage === pageNum ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    disabled={cxpPage >= cxpTotalPages}
                    onClick={() => setCxpPage((p) => Math.min(cxpTotalPages, p + 1))}
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

      <ModalPortal open={abonoModalOpen}>
        <>
          <div
            className="fixed inset-0 z-[200] bg-slate-200/60 backdrop-blur-md"
            onClick={() => setAbonoModalOpen(false)}
          />
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
            <div className="w-full max-w-md bg-white rounded-xl shadow-xl flex flex-col border border-slate-200 overflow-hidden pointer-events-auto">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0 gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Registrar abono</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Aplica un pago parcial o total a la cuenta</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAbonoModalOpen(false)}
                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="px-5 py-4 space-y-4">
                {abonoOrden && (
                  <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-2">
                    <div className="flex justify-between text-sm gap-3">
                      <span className="text-slate-500">Orden</span>
                      <span className="font-bold text-slate-800 font-mono">{abonoOrden.numero}</span>
                    </div>
                    <div className="flex justify-between text-sm gap-3">
                      <span className="text-slate-500">Total</span>
                      <span className="font-semibold text-slate-700 tabular-nums">
                        {fmt(abonoOrden.cuentaPorPagar?.montoTotal ?? abonoOrden.total)}
                      </span>
                    </div>
                    {(abonoOrden.cuentaPorPagar?.montoPagado ?? 0) > 0 && (
                      <div className="flex justify-between text-sm gap-3">
                        <span className="text-slate-500">Pagado</span>
                        <span className="font-semibold text-slate-700 tabular-nums">
                          {fmt(abonoOrden.cuentaPorPagar.montoPagado)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm gap-3 pt-2 border-t border-slate-200">
                      <span className="text-slate-500 font-semibold">Saldo pendiente</span>
                      <span className="font-bold text-rose-600 tabular-nums">{fmt(saldoAbono)}</span>
                    </div>
                  </div>
                )}
                <form onSubmit={handleAbonoSave} className="space-y-3">
                  <div>
                    <label className={labelClass}>Método de pago</label>
                    <select
                      className={inputClass}
                      value={abonoForm.metodoPagoId}
                      onChange={(e) => setAbonoForm((p) => ({ ...p, metodoPagoId: e.target.value }))}
                      required
                    >
                      <option value="">Seleccionar método…</option>
                      {metodos.filter((m) => m.activo).map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nombre} ({fmt(m.saldoActual || 0)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Monto ($)</label>
                    <input
                      type="number"
                      className={inputClass}
                      step="0.01"
                      min="0.01"
                      max={saldoAbono || 999999}
                      value={abonoForm.monto}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (parseFloat(val) > saldoAbono) {
                          setAbonoForm((p) => ({ ...p, monto: saldoAbono.toString() }));
                        } else {
                          setAbonoForm((p) => ({ ...p, monto: val }));
                        }
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Referencia (cheque, transferencia, etc.)</label>
                    <input
                      className={inputClass}
                      value={abonoForm.referencia}
                      placeholder="Opcional"
                      onChange={(e) => setAbonoForm((p) => ({ ...p, referencia: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setAbonoModalOpen(false)}
                      className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-semibold text-sm text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={
                        abonoSaving ||
                        !abonoForm.monto ||
                        parseFloat(abonoForm.monto) <= 0 ||
                        parseFloat(abonoForm.monto) > saldoAbono
                      }
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-white rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-700 transition-opacity shadow-sm disabled:opacity-50"
                    >
                      {abonoSaving ? 'Registrando...' : 'Registrar abono'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      </ModalPortal>
    </div>
  );
};
