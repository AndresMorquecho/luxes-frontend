import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ModalPortal } from '../../../../shared/ui/components/ModalPortal.jsx';
import { useNavigate } from 'react-router-dom';
import { getVentas, registrarCobro } from '../../application/ventasService';
import { getMetodosPago } from '../../../gastos/application/gastosService';
import { toast } from '../../../../shared/ui/components/Toast';
import { ComprasPageHeader } from '../../../compras/ui/components/ComprasPageHeader';
import { AbonoModal } from '../../../proformas/ui/components/AbonoModal.jsx';
import './VentasPage.css';

const CO_PRIMARY = '#2b41b8';
const CO_PRIMARY_HOVER = '#2436a0';
const CO_NAVY = '#1a1c3d';

const fmt = (n) => '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-EC', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const ESTADO_BADGES = {
  pendiente: { bg: 'bg-amber-50', color: 'text-amber-700', dot: 'bg-amber-500', label: 'PENDIENTE' },
  pagado:    { bg: 'bg-emerald-50', color: 'text-emerald-700', dot: 'bg-emerald-500', label: 'PAGADO' },
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

  // Métodos de Pago
  const [metodosPago, setMetodosPago] = useState([]);
  const [showAbonoModal, setShowAbonoModal] = useState(false);
  const [submittingAbono, setSubmittingAbono] = useState(false);
  const [abonoForm, setAbonoForm] = useState({
    proformaId: '',
    monto: '',
    metodoPagoId: '',
    referencia: '',
    comprobanteUrl: null,
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

  // ── Search debounce ──
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(val), 350);
  };

  useEffect(() => { setPage(1); }, [search, filterEstado]);

  // ── Abono handlers ──
  const handleOpenAbono = (proforma, pendiente, total) => {
    setAbonoForm({
      proformaId: proforma.id,
      monto: pendiente.toFixed(2),
      metodoPagoId: metodosPago.length > 0 ? metodosPago[0].id : '',
      referencia: '',
      comprobanteUrl: null,
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
        comprobanteUrl: abonoForm.comprobanteUrl,
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

  // ── Computed values ──
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

  // ── KPI totals ──
  const totalFacturado = items.reduce((sum, v) => sum + getItemTotals(v).total, 0);
  const totalCobrado = items.reduce((sum, v) => sum + getItemTotals(v).cobrado, 0);
  const totalPendiente = items.reduce((sum, v) => sum + getItemTotals(v).pendiente, 0);
  const countPendientes = items.filter((v) => getItemTotals(v).pendiente > 0.01).length;

  const kpiItems = [
    {
      label: 'Total Ventas',
      mobileLabel: 'Ventas',
      value: items.length,
      hint: 'Proformas aprobadas / pagadas',
      accent: CO_PRIMARY,
      iconBg: 'bg-[#eef1fc]',
      iconColor: 'text-[#2b41b8]',
      icon: 'M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z',
    },
    {
      label: 'Total Facturado',
      mobileLabel: 'Facturado',
      value: fmt(totalFacturado),
      hint: 'Monto bruto acumulado',
      accent: '#6366f1',
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-500',
      icon: 'M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5',
    },
    {
      label: 'Cobrado Acumulado',
      mobileLabel: 'Cobrado',
      value: fmt(totalCobrado),
      hint: 'Pagos recibidos',
      accent: '#10b981',
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      icon: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
    },
    {
      label: 'Pendiente de Cobro',
      mobileLabel: 'Pendiente',
      value: fmt(totalPendiente),
      hint: `${countPendientes} proforma${countPendientes !== 1 ? 's' : ''} con saldo`,
      accent: '#f59e0b',
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-500',
      icon: 'M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
    },
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

  const renderBadge = (pendiente) => {
    const isPendiente = pendiente > 0.01;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
        isPendiente
          ? 'bg-amber-50 text-amber-700 border-amber-200/60'
          : 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
      }`}>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isPendiente ? 'bg-amber-500' : 'bg-emerald-500'}`} />
        {isPendiente ? 'Pendiente' : 'Pagado'}
      </span>
    );
  };

  const renderPagination = () => (
    <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <p className="text-xs font-semibold text-slate-500 text-center sm:text-left">
        Mostrando {showingFrom} a {showingTo} de {filteredAll.length} registros
      </p>
      {totalPages > 1 && (
        <div className="flex items-center justify-center sm:justify-end gap-1.5">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 rounded-xl border border-slate-200/80 bg-white text-slate-600 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Anterior
          </button>
          <span className="text-xs font-bold text-slate-700 px-2">
            {safePage} de {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-xl border border-slate-200/80 bg-white text-slate-600 text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="w-full pb-20 md:pb-6 animate-slide-up vt-root" style={{ fontFamily: "var(--font-main, 'Inter', system-ui, -apple-system, sans-serif)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        .vt-root, .vt-root * {
          font-family: var(--font-main, 'Inter', system-ui, -apple-system, sans-serif) !important;
          box-sizing: border-box;
        }
      `}</style>

      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs mb-4 sm:mb-6 overflow-hidden">
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-blue-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800">Ventas e Ingresos</h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-blue-100 text-blue-700">
                  Lista
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">Control y registro de cobros, saldos pendientes y proformas aprobadas</p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpiItems.map((kpi) => (
          <div key={kpi.label} className="bg-white border border-slate-100 rounded-2xl shadow-xs flex items-center gap-4 p-4 sm:p-5 min-w-0 overflow-hidden">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border border-slate-100/90 ${kpi.iconBg}`}>
              <svg className={`w-5 h-5 ${kpi.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d={kpi.icon} />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-slate-500 leading-tight">{kpi.label}</p>
              <p className="text-xl sm:text-2xl font-bold mt-1 tabular-nums leading-none text-slate-800 truncate">{kpi.value}</p>
              <p className="text-[11px] text-slate-400 mt-1 truncate">{kpi.hint}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla Principal */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-xs overflow-hidden">
        {/* Toolbar con Buscador a la derecha */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-800">Cobros y Proformas</h2>
            <span className="text-xs text-slate-400 font-semibold">({filteredAll.length})</span>
          </div>

          <div className="flex items-center justify-end gap-2.5 flex-wrap sm:flex-nowrap">
            {/* Filtro de Estado */}
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="h-10 px-3 border border-slate-200/80 rounded-xl bg-slate-50/80 text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-blue-500 transition-colors cursor-pointer"
            >
              <option value="">Todos los Estados</option>
              <option value="pendiente">Pendientes de Pago</option>
              <option value="pagado">Completamente Pagados</option>
            </select>

            {/* Buscador a la derecha */}
            <div className="relative w-full sm:w-64">
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                id="search-ventas"
                value={searchInput}
                onChange={handleSearchChange}
                placeholder="Buscar proforma, cliente..."
                className="w-full h-10 pl-9 pr-8 border border-slate-200/80 rounded-xl bg-slate-50/80 text-xs sm:text-sm text-slate-800 outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all placeholder:text-slate-400"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => { setSearchInput(''); setSearch(''); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabla Responsive */}
        <div className="overflow-x-auto relative">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600" />
            </div>
          )}
          {!loading && (
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50/60 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5">Proforma</th>
                  <th className="px-5 py-3.5">Cliente</th>
                  <th className="px-5 py-3.5">Fecha</th>
                  <th className="px-5 py-3.5 text-right">Total</th>
                  <th className="px-5 py-3.5 text-right">Cobrado</th>
                  <th className="px-5 py-3.5 text-right">Pendiente</th>
                  <th className="px-5 py-3.5 text-center">Estado</th>
                  <th className="px-5 py-3.5 text-center w-36">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginated.map((v) => {
                  const { total, cobrado, pendiente } = getItemTotals(v);
                  return (
                    <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-4 font-mono text-xs font-bold text-blue-700">{v.id}</td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-800">{v.cliente}</p>
                        {v.email && <p className="text-[11px] text-slate-400 mt-0.5">{v.email}</p>}
                      </td>
                      <td className="px-5 py-4 text-slate-500 text-xs font-medium whitespace-nowrap">{fmtDate(v.fecha)}</td>
                      <td className="px-5 py-4 text-right font-semibold text-slate-800 tabular-nums">{fmt(total)}</td>
                      <td className="px-5 py-4 text-right font-semibold text-emerald-600 tabular-nums">{fmt(cobrado)}</td>
                      <td className="px-5 py-4 text-right font-bold tabular-nums" style={{ color: pendiente > 0.01 ? '#d97706' : '#059669' }}>
                        {fmt(pendiente)}
                      </td>
                      <td className="px-5 py-4 text-center">{renderBadge(pendiente)}</td>
                      <td className="px-5 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => navigate(`/proformas/detalle/${v.id}`)}
                            className="w-8 h-8 rounded-xl bg-blue-50/80 text-blue-600 border border-blue-100/90 flex items-center justify-center hover:bg-blue-100 transition-colors cursor-pointer"
                            title="Ver Detalle de Proforma"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            disabled={pendiente <= 0.01}
                            onClick={() => handleOpenAbono(v, pendiente, total)}
                            className={`h-8 px-3.5 inline-flex items-center gap-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                              pendiente <= 0.01
                                ? 'bg-slate-100 text-slate-400 border border-slate-200/60 cursor-not-allowed'
                                : 'bg-[#0b2d64] hover:bg-[#071f45] text-white shadow-sm shadow-blue-950/20 active:scale-[0.99] cursor-pointer'
                            }`}
                            title={pendiente <= 0.01 ? 'Esta proforma ya fue pagada por completo' : 'Registrar Cobro'}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            Cobrar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-16 text-center text-slate-400 text-sm font-medium">
                      No se encontraron registros de ventas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {renderPagination()}
      </div>

      {/* ── Modal Cobro / Abono Normalizado ── */}
      <AbonoModal
        open={showAbonoModal}
        onClose={() => setShowAbonoModal(false)}
        title="Registrar Cobro / Abono"
        subtitle="Ingresa el monto a cobrar y adjunta el comprobante opcional."
        proformaId={abonoForm.proformaId}
        total={abonoForm.total}
        pending={abonoForm.pending}
        monto={abonoForm.monto}
        setMonto={(val) => setAbonoForm((prev) => ({ ...prev, monto: val }))}
        metodoPagoId={abonoForm.metodoPagoId}
        setMetodoPagoId={(val) => setAbonoForm((prev) => ({ ...prev, metodoPagoId: val }))}
        metodosPago={metodosPago}
        referencia={abonoForm.referencia}
        setReferencia={(val) => setAbonoForm((prev) => ({ ...prev, referencia: val }))}
        comprobanteUrl={abonoForm.comprobanteUrl}
        setComprobanteUrl={(val) => setAbonoForm((prev) => ({ ...prev, comprobanteUrl: val }))}
        onSubmit={handleSaveAbono}
        submitting={submittingAbono}
        submitText="Confirmar Cobro"
      />
    </div>
  );
};
