import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ModalPortal } from '../../../../shared/ui/components/ModalPortal.jsx';
import { useNavigate } from 'react-router-dom';
import { Receipt, Eye, Banknote, X } from 'lucide-react';
import { getVentas, registrarCobro } from '../../application/ventasService';
import { getMetodosPago } from '../../../gastos/application/gastosService';
import { toast } from '../../../../shared/ui/components/Toast';
import { ComprasPageHeader } from '../../../compras/ui/components/ComprasPageHeader';
import '../../../compras/ui/pages/ComprasPage.css';

const fmt = (n) => '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-EC', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const inputFocus =
  'outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:bg-white';

const inputClass =
  `w-full h-10 px-3 border border-slate-200 rounded-xl bg-gray-50 text-sm text-slate-800 ${inputFocus}`;
const labelClass = 'block text-xs font-semibold text-slate-500 mb-1.5';

const ESTADO_BADGES = {
  pendiente: { bg: 'bg-amber-50', color: 'text-amber-700', label: 'Pendiente' },
  pagado:    { bg: 'bg-slate-100', color: 'text-slate-700', label: 'Pagado' },
};

export const VentasPage = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 25;
  const searchTimer = useRef(null);

  const [metodosPago, setMetodosPago] = useState([]);
  const [showAbonoModal, setShowAbonoModal] = useState(false);
  const [submittingAbono, setSubmittingAbono] = useState(false);
  const [abonoForm, setAbonoForm] = useState({
    proformaId: '',
    monto: '',
    metodoPagoId: '',
    referencia: '',
    pending: 0,
    total: 0,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getVentas({ limit: 500 });
      const onlyApprovedOrPaid = (res.data || []).filter(
        (v) => v.estado === 'Aprobada' || v.estado === 'Pagada' || v.estado === 'Pagado'
      );
      setItems(onlyApprovedOrPaid);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar las ventas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    getMetodosPago()
      .then((data) => {
        setMetodosPago(data || []);
        if (data && data.length > 0) {
          setAbonoForm((prev) => ({ ...prev, metodoPagoId: data[0].id }));
        }
      })
      .catch((err) => console.error('Error cargando métodos de pago:', err));
  }, [load]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(val), 350);
  };

  useEffect(() => { setPage(1); }, [search, filterEstado]);

  const handleOpenAbono = (proforma, pendiente, total) => {
    setAbonoForm({
      proformaId: proforma.id,
      monto: pendiente.toFixed(2),
      metodoPagoId: metodosPago.length > 0 ? metodosPago[0].id : '',
      referencia: '',
      pending: pendiente,
      total,
    });
    setShowAbonoModal(true);
  };

  const handleSaveAbono = async (e) => {
    e.preventDefault();
    const numericMonto = parseFloat(abonoForm.monto);
    if (isNaN(numericMonto) || numericMonto <= 0) {
      toast.error('Por favor, ingresa un monto válido mayor a $0');
      return;
    }
    if (numericMonto > abonoForm.pending + 0.01) {
      toast.error(`El abono no puede superar el saldo pendiente de ${fmt(abonoForm.pending)}`);
      return;
    }
    setSubmittingAbono(true);
    try {
      await registrarCobro(abonoForm.proformaId, {
        monto: numericMonto,
        metodoPagoId: abonoForm.metodoPagoId,
        referencia: abonoForm.referencia,
      });
      toast.success('Cobro registrado correctamente');
      setShowAbonoModal(false);
      load();
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Error al registrar el cobro');
    } finally {
      setSubmittingAbono(false);
    }
  };

  const getItemTotals = (v) => {
    const subtotal = v.items.reduce((s, item) => s + (item.cantidad || 0) * (item.precioUnitario || 0), 0);
    const total = subtotal * (1 + (v.iva || 0));
    const cobrado = (v.abonos || []).reduce((s, ab) => s + Number(ab.monto), 0);
    const pendiente = Math.max(0, total - cobrado);
    return { total, cobrado, pendiente };
  };

  const q = search.toLowerCase();
  const filteredAll = items.filter((v) => {
    const { pendiente } = getItemTotals(v);
    const matchesEstado =
      !filterEstado ||
      (filterEstado === 'pendiente' && pendiente > 0.01) ||
      (filterEstado === 'pagado' && pendiente <= 0.01);
    const matchesSearch =
      !q ||
      v.id.toLowerCase().includes(q) ||
      (v.cliente || '').toLowerCase().includes(q) ||
      v.estado.toLowerCase().includes(q);
    return matchesEstado && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredAll.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paginated = filteredAll.slice((safePage - 1) * perPage, safePage * perPage);
  const showingFrom = filteredAll.length === 0 ? 0 : (safePage - 1) * perPage + 1;
  const showingTo = Math.min(safePage * perPage, filteredAll.length);

  const totalFacturado = items.reduce((sum, v) => sum + getItemTotals(v).total, 0);
  const totalCobrado = items.reduce((sum, v) => sum + getItemTotals(v).cobrado, 0);
  const totalPendiente = items.reduce((sum, v) => sum + getItemTotals(v).pendiente, 0);
  const countPendientes = items.filter((v) => getItemTotals(v).pendiente > 0.01).length;

  const kpiItems = [
    { label: 'Total ventas', value: items.length, border: 'border-t-blue-600', color: 'text-blue-600' },
    { label: 'Total facturado', value: fmt(totalFacturado), border: 'border-t-indigo-500', color: 'text-indigo-600' },
    { label: 'Cobrado acumulado', value: fmt(totalCobrado), border: 'border-t-emerald-500', color: 'text-emerald-600' },
    { label: 'Pendiente de cobro', value: fmt(totalPendiente), border: 'border-t-amber-500', color: 'text-amber-600' },
  ];

  const renderBadge = (pendiente, compact = false) => {
    const isPendiente = pendiente > 0.01;
    const b = isPendiente ? ESTADO_BADGES.pendiente : ESTADO_BADGES.pagado;
    return (
      <span className={`inline-flex items-center rounded-full font-medium ${b.bg} ${b.color} ${
        compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      }`}>
        {b.label}
      </span>
    );
  };

  const renderActions = (v, pendiente, total) => (
    <div className="flex items-center justify-end gap-1.5">
      <button
        type="button"
        onClick={() => navigate(`/proformas/detalle/${v.id}`)}
        className="p-1.5 rounded-lg bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        title="Ver detalle"
        aria-label="Ver detalle"
      >
        <Eye className="w-4 h-4" strokeWidth={1.5} />
      </button>
      <button
        type="button"
        disabled={pendiente <= 0.01}
        onClick={() => handleOpenAbono(v, pendiente, total)}
        className={`p-1.5 rounded-lg border transition-colors ${
          pendiente <= 0.01
            ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
            : 'bg-blue-50 text-blue-500 border-blue-100 hover:bg-blue-100 hover:text-blue-600'
        }`}
        title={pendiente <= 0.01 ? 'Esta proforma ya fue pagada por completo' : 'Registrar cobro'}
        aria-label="Registrar cobro"
      >
        <Banknote className="w-4 h-4" strokeWidth={1.5} />
      </button>
    </div>
  );

  const renderMobileRow = (v) => {
    const { total, cobrado, pendiente } = getItemTotals(v);
    return (
      <div key={v.id} className="border-b border-slate-100 last:border-b-0">
        <div className="flex items-start justify-between gap-2 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => navigate(`/proformas/detalle/${v.id}`)}
              className="text-left"
            >
              <p className="font-mono text-[11px] font-bold leading-tight text-blue-700">{v.id}</p>
              <p className="text-xs font-semibold text-slate-800 mt-0.5 truncate">{v.cliente}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{fmtDate(v.fecha)}</p>
            </button>
            <div className="mt-1">{renderBadge(pendiente, true)}</div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-slate-400">Saldo</p>
            <p className={`text-sm font-bold tabular-nums ${pendiente > 0.01 ? 'text-amber-600' : 'text-slate-700'}`}>
              {fmt(pendiente)}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs px-3 pb-2">
          <div>
            <span className="text-slate-400 block text-[10px]">Total</span>
            <span className="font-semibold text-slate-700">{fmt(total)}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Cobrado</span>
            <span className="font-semibold text-slate-700">{fmt(cobrado)}</span>
          </div>
        </div>
        <div className="px-3 pb-3">
          <button
            type="button"
            disabled={pendiente <= 0.01}
            onClick={() => handleOpenAbono(v, pendiente, total)}
            className={`w-full h-9 inline-flex items-center justify-center rounded-xl text-xs font-semibold transition-colors ${
              pendiente <= 0.01
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                : 'text-white bg-blue-600 hover:bg-blue-700'
            }`}
            title={pendiente <= 0.01 ? 'Esta proforma ya fue pagada por completo' : 'Registrar cobro'}
          >
            Cobrar
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      className="space-y-3 sm:space-y-5 animate-slide-up overflow-x-hidden pb-6"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <style>{`
        .shadow-card { box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02); }
      `}</style>

      <ComprasPageHeader
        icon={Receipt}
        badge="Ventas"
        title="Ventas e ingresos"
        subtitle="Control de cobros y saldos pendientes de proformas aprobadas"
      />

      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {kpiItems.map((kpi) => (
          <div
            key={kpi.label}
            className={`bg-white shadow-card rounded-xl border border-gray-100 border-t-2 ${kpi.border} px-2.5 sm:px-4 py-3 sm:py-4 min-w-0`}
          >
            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{kpi.label}</p>
            <p className={`text-base sm:text-lg font-bold mt-1 tabular-nums ${kpi.color}`}>{kpi.value}</p>
            {kpi.label === 'Pendiente de cobro' && (
              <p className="text-[9px] sm:text-[11px] text-slate-400 mt-0.5 truncate">
                {countPendientes} proforma{countPendientes !== 1 ? 's' : ''} con saldo
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="bg-white shadow-card rounded-xl border border-gray-100 p-3 sm:p-4">
        <select
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)}
          className={`h-10 px-3 border border-slate-200 rounded-xl bg-gray-50 text-sm text-slate-700 ${inputFocus} w-full max-w-xs`}
        >
          <option value="">Estado: Todos</option>
          <option value="pendiente">Pendiente de pago</option>
          <option value="pagado">Pagado</option>
        </select>
      </div>

      {/* Móvil */}
      <div className="md:hidden space-y-3">
        <div className="bg-white shadow-card rounded-xl border border-gray-100 p-3">
          <div className="relative">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              value={searchInput}
              onChange={handleSearchChange}
              placeholder="Buscar por proforma, cliente…"
              className={`w-full h-10 pl-10 pr-3 border border-slate-200 rounded-xl bg-gray-50 text-sm text-slate-800 ${inputFocus}`}
            />
          </div>
        </div>

        <div className="bg-white shadow-card rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
            <h2 className="text-sm font-semibold text-slate-800">Cobros y proformas</h2>
            <span className="text-xs font-medium text-gray-400">{filteredAll.length} registros</span>
          </div>
          {loading && (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-200 border-t-blue-500" />
            </div>
          )}
          {!loading && paginated.map((v) => renderMobileRow(v))}
          {!loading && paginated.length === 0 && (
            <p className="text-center text-slate-400 text-sm py-10 px-4">No se encontraron registros</p>
          )}
        </div>

        <div className="px-1 py-2 flex flex-col gap-2">
          <p className="text-[11px] text-slate-500 text-center">
            Mostrando {showingFrom} a {showingTo} de {filteredAll.length} registros
          </p>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 bg-white"
              >
                &lt;
              </button>
              <span className="text-xs font-semibold px-2 tabular-nums text-slate-800">
                {safePage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => p + 1)}
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-gray-800">Lista de ventas</h2>
              <span className="text-xs font-medium text-gray-400">{filteredAll.length} registros</span>
            </div>
            <div className="relative w-full sm:w-auto">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                id="search-ventas"
                value={searchInput}
                onChange={handleSearchChange}
                placeholder="Buscar por proforma, cliente o estado…"
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
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Proforma</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
                  <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                  <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cobrado</th>
                  <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pendiente</th>
                  <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!loading && paginated.map((v) => {
                  const { total, cobrado, pendiente } = getItemTotals(v);
                  return (
                    <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-4 font-mono text-sm font-semibold text-blue-700">{v.id}</td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-slate-800">{v.cliente}</p>
                        {v.email && <p className="text-xs text-slate-400 mt-0.5">{v.email}</p>}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700 whitespace-nowrap">{fmtDate(v.fecha)}</td>
                      <td className="px-5 py-4 text-right text-sm font-semibold text-slate-900 tabular-nums">{fmt(total)}</td>
                      <td className="px-5 py-4 text-right text-sm font-semibold text-slate-700 tabular-nums">{fmt(cobrado)}</td>
                      <td className={`px-5 py-4 text-right text-sm font-semibold tabular-nums ${pendiente > 0.01 ? 'text-amber-600' : 'text-slate-700'}`}>
                        {fmt(pendiente)}
                      </td>
                      <td className="px-5 py-4">{renderBadge(pendiente)}</td>
                      <td className="px-5 py-4 text-right">{renderActions(v, pendiente, total)}</td>
                    </tr>
                  );
                })}
                {!loading && paginated.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-sm text-slate-400">
                      No se encontraron registros de ventas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filteredAll.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3 border-t border-gray-100">
              <span className="text-[11px] font-medium text-gray-400">
                Mostrando {showingFrom} a {showingTo} de {filteredAll.length} registros
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    Anterior
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const maxVisible = Math.min(5, totalPages);
                    let start = Math.max(1, safePage - Math.floor(maxVisible / 2));
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
                          safePage === pageNum ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
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

      <ModalPortal open={showAbonoModal}>
        <>
          <div
            className="fixed inset-0 z-[200] bg-slate-200/60 backdrop-blur-md"
            onClick={() => setShowAbonoModal(false)}
          />
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
            <div className="w-full max-w-lg bg-white rounded-xl shadow-xl flex flex-col border border-slate-200 overflow-hidden pointer-events-auto">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0 gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Registrar cobro / abono</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Aplica un pago parcial o total a la proforma</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAbonoModal(false)}
                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="px-5 py-4 space-y-4">
                <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-2">
                  <div className="flex justify-between text-sm gap-3">
                    <span className="text-slate-500">Proforma</span>
                    <span className="font-bold text-slate-800 font-mono">{abonoForm.proformaId}</span>
                  </div>
                  <div className="flex justify-between text-sm gap-3">
                    <span className="text-slate-500">Total</span>
                    <span className="font-semibold text-slate-800 tabular-nums">{fmt(abonoForm.total)}</span>
                  </div>
                  <div className="flex justify-between text-sm gap-3 pt-2 border-t border-slate-200">
                    <span className="text-slate-500 font-semibold">Saldo pendiente</span>
                    <span className="font-bold text-amber-600 tabular-nums">{fmt(abonoForm.pending)}</span>
                  </div>
                </div>

                <form onSubmit={handleSaveAbono} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Monto a cobrar *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max={abonoForm.pending}
                          required
                          value={abonoForm.monto}
                          onChange={(e) => setAbonoForm((prev) => ({ ...prev, monto: e.target.value }))}
                          className={`${inputClass} !pl-7 font-mono`}
                          placeholder="0.00"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setAbonoForm((prev) => ({ ...prev, monto: abonoForm.pending.toFixed(2) }))}
                        className="text-[11px] font-semibold mt-1.5 text-blue-600 hover:text-blue-700"
                      >
                        Cobrar saldo total (100%)
                      </button>
                    </div>

                    <div>
                      <label className={labelClass}>Caja / método de pago *</label>
                      <select
                        required
                        value={abonoForm.metodoPagoId}
                        onChange={(e) => setAbonoForm((prev) => ({ ...prev, metodoPagoId: e.target.value }))}
                        className={inputClass}
                      >
                        <option value="">Seleccione una caja...</option>
                        {metodosPago.map((m) => (
                          <option key={m.id} value={m.id}>{m.nombre}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass}>Referencia / N° comprobante</label>
                    <input
                      type="text"
                      value={abonoForm.referencia}
                      onChange={(e) => setAbonoForm((prev) => ({ ...prev, referencia: e.target.value }))}
                      className={inputClass}
                      placeholder="Ej. Transferencia, Depósito, N° control"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAbonoModal(false)}
                      className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-semibold text-sm text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={submittingAbono}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-white rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-700 transition-opacity shadow-sm disabled:opacity-50"
                    >
                      {submittingAbono ? 'Registrando...' : 'Confirmar cobro'}
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
