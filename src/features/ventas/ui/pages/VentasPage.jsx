import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ModalPortal } from '../../../../shared/ui/components/ModalPortal.jsx';
import { useNavigate } from 'react-router-dom';
import { getVentas, registrarCobro } from '../../application/ventasService';
import { getMetodosPago } from '../../../gastos/application/gastosService';
import { toast } from '../../../../shared/ui/components/Toast';
import { ComprasPageHeader } from '../../../compras/ui/components/ComprasPageHeader';
import { AbonoModal } from '../../../proformas/ui/components/AbonoModal.jsx';
import { todayDateInputValue } from '../../../../shared/utils/dateOnly';
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
      fecha: todayDateInputValue(),
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
        fecha: abonoForm.fecha,
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
    const subtotal = (v.items || []).reduce((s, item) => s + (Number(item.cantidad) || 0) * (Number(item.precioUnitario) || 0), 0);
    const total = Math.round(subtotal * (1 + (Number(v.iva) || 0)) * 100) / 100;
    const cobrado = Math.round((v.abonos || []).reduce((s, ab) => s + Number(ab.monto), 0) * 100) / 100;
    const pendiente = Math.max(0, Math.round((total - cobrado) * 100) / 100);
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

  const renderBadge = (pendiente, compact = false) => {
    const isPendiente = pendiente > 0.01;
    const b = isPendiente ? ESTADO_BADGES.pendiente : ESTADO_BADGES.pagado;
    return (
      <span className={`inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wide ${b.bg} ${b.color} ${
        compact ? 'px-1.5 py-0.5 text-[8px] gap-0.5' : 'px-2.5 py-1 text-[10px] gap-1.5'
      }`}>
        <span className={`rounded-full shrink-0 ${b.dot} ${compact ? 'w-1 h-1' : 'w-1.5 h-1.5'}`} />
        {isPendiente ? 'PENDIENTE' : 'PAGADO'}
      </span>
    );
  };

  const renderFilterBar = (className = '') => (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <select
        value={filterEstado}
        onChange={(e) => setFilterEstado(e.target.value)}
        className="h-9 sm:h-10 px-2 sm:px-3 border border-slate-200 rounded-lg bg-white text-[10px] sm:text-sm text-slate-700 outline-none focus:border-[#2b41b8] focus:ring-2 focus:ring-[#2b41b8]/15 min-w-0"
      >
        <option value="">Estado: Todos</option>
        <option value="pendiente">Pendiente de pago</option>
        <option value="pagado">Pagado</option>
      </select>
    </div>
  );

  const renderMobileRow = (v) => {
    const { total, cobrado, pendiente } = getItemTotals(v);
    return (
      <div key={v.id} className="co-orden-row border-b border-slate-100 last:border-b-0">
        <div className="flex items-start justify-between gap-2 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => navigate(`/proformas/detalle/${v.id}`)}
              className="text-left"
            >
              <p className="font-mono text-[11px] font-bold leading-tight" style={{ color: CO_PRIMARY }}>{v.id}</p>
              <p className="text-xs font-semibold text-slate-800 mt-0.5 truncate">{v.cliente}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{fmtDate(v.fecha)}</p>
            </button>
            <div className="mt-1">{renderBadge(pendiente, true)}</div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-slate-400">Saldo</p>
            <p className="text-sm font-bold tabular-nums" style={{ color: pendiente > 0.01 ? '#f59e0b' : '#10b981' }}>
              {fmt(pendiente)}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs px-3 pb-2">
          <div><span className="text-slate-400 block text-[10px]">Total</span><span className="font-semibold text-slate-700">{fmt(total)}</span></div>
          <div><span className="text-slate-400 block text-[10px]">Cobrado</span><span className="font-semibold text-emerald-600">{fmt(cobrado)}</span></div>
        </div>
        <div className="px-3 pb-3">
          <button
            type="button"
            disabled={pendiente <= 0.01}
            onClick={() => handleOpenAbono(v, pendiente, total)}
            className={`w-full h-9 inline-flex items-center justify-center rounded-lg text-xs font-semibold transition-colors ${
              pendiente <= 0.01
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                : 'text-white'
            }`}
            style={pendiente <= 0.01 ? {} : { backgroundColor: CO_PRIMARY }}
            onMouseEnter={(e) => {
              if (pendiente > 0.01) {
                e.currentTarget.style.backgroundColor = CO_PRIMARY_HOVER;
              }
            }}
            onMouseLeave={(e) => {
              if (pendiente > 0.01) {
                e.currentTarget.style.backgroundColor = CO_PRIMARY;
              }
            }}
            title={pendiente <= 0.01 ? 'Esta proforma ya fue pagada por completo' : 'Registrar cobro'}
          >
            Cobrar
          </button>
        </div>
      </div>
    );
  };

  const renderPagination = () => (
    <div className="px-4 md:px-5 py-3 border-t border-slate-100 bg-white flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4">
      <p className="text-xs text-slate-500 text-center md:text-left shrink-0">
        Mostrando {showingFrom} a {showingTo} de {filteredAll.length} registros
      </p>
      {totalPages > 1 && (
        <div className="flex items-center justify-center md:justify-end gap-1">
          <button
            type="button"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 bg-white"
          >&lt;</button>
          <span className="md:hidden text-xs font-semibold px-2 tabular-nums" style={{ color: CO_NAVY }}>
            {safePage} / {totalPages}
          </span>
          <div className="hidden md:flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const maxVisible = Math.min(5, totalPages);
              let start = Math.max(1, safePage - Math.floor(maxVisible / 2));
              const end = Math.min(totalPages, start + maxVisible - 1);
              if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
              const pageNum = start + i;
              if (pageNum > end) return null;
              const isActive = safePage === pageNum;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 rounded-lg border text-sm font-medium transition-colors ${isActive ? 'text-white border-transparent' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  style={isActive ? { backgroundColor: CO_PRIMARY, borderColor: CO_PRIMARY } : undefined}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 hover:bg-slate-50 bg-white"
          >&gt;</button>
        </div>
      )}
    </div>
  );

  return (
    <div className="co-ventas-page animate-slide-up overflow-x-hidden pb-6">

      {/* ── Móvil ── */}
      <div className="md:hidden">
        <ComprasPageHeader
          title="Ventas e Ingresos"
          subtitle="Control de cobros y saldos pendientes de proformas aprobadas."
          aside={(
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
              <p className="text-sm font-bold tabular-nums" style={{ color: '#f59e0b' }} title="Pendiente acumulado">
                {fmt(totalPendiente)}
              </p>
            </div>
          )}
        />

        <div className="grid grid-cols-2 gap-2 mb-4">
          {kpiItems.map((kpi) => renderKpiCardMobile(kpi))}
        </div>

        <div className="space-y-2 mb-3">
          <div className="relative">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              value={searchInput}
              onChange={handleSearchChange}
              placeholder="Buscar por proforma, cliente…"
              className="w-full h-10 pl-10 pr-3 border border-slate-200 rounded-xl bg-white text-sm text-slate-800 outline-none focus:border-[#2b41b8] focus:ring-2 focus:ring-[#2b41b8]/15"
            />
          </div>
          {renderFilterBar()}
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden mb-3">
          <div className="px-3 py-2.5 flex items-center justify-between border-b border-slate-100">
            <h2 className="text-sm font-bold" style={{ color: CO_NAVY }}>Cobros y proformas</h2>
            {totalPages > 1 && (
              <button type="button" onClick={() => setPage((p) => Math.min(p + 1, totalPages))} className="text-[11px] font-semibold" style={{ color: CO_PRIMARY }}>
                Ver todas ›
              </button>
            )}
          </div>
          {loading && <div className="flex justify-center py-10"><div className="co-spinner" /></div>}
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
              <button type="button" disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 bg-white">&lt;</button>
              <span className="text-xs font-semibold px-2 tabular-nums" style={{ color: CO_NAVY }}>{safePage} / {totalPages}</span>
              <button type="button" disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)} className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 bg-white">&gt;</button>
            </div>
          )}
        </div>
      </div>

      {/* ── Escritorio ── */}
      <div className="hidden md:block">
        <ComprasPageHeader
          title="Ventas e Ingresos"
          subtitle="Control y registro de cobros, saldos pendientes y proformas aprobadas."
        />

        {/* KPI Cards */}
        <div className="grid gap-4 mb-6 md:grid-cols-2 xl:grid-cols-4">
          {kpiItems.map((kpi) => renderKpiCardDesktop(kpi))}
        </div>

        {/* Tabla principal */}
        <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
          {/* Toolbar */}
          <div className="px-5 py-4 border-b border-slate-100 space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  id="search-ventas"
                  value={searchInput}
                  onChange={handleSearchChange}
                  placeholder="Buscar por proforma, cliente o estado…"
                  className="w-full h-10 pl-10 pr-3 border border-slate-200 rounded-lg bg-white text-sm text-slate-800 outline-none focus:border-[#2b41b8] focus:ring-2 focus:ring-[#2b41b8]/15"
                />
              </div>
              {renderFilterBar()}
            </div>
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto relative">
            {loading && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                <div className="co-spinner" />
              </div>
            )}
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#f8f9fc] text-[11px] font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">Proforma</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Cobrado</th>
                  <th className="px-4 py-3 text-right">Pendiente</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-center w-32">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!loading && paginated.map((v) => {
                  const { total, cobrado, pendiente } = getItemTotals(v);
                  return (
                    <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-semibold" style={{ color: CO_PRIMARY }}>{v.id}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium" style={{ color: CO_NAVY }}>{v.cliente}</p>
                        {v.email && <p className="text-[11px] text-slate-400 mt-0.5">{v.email}</p>}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{fmtDate(v.fecha)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900 tabular-nums">{fmt(total)}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-600 tabular-nums">{fmt(cobrado)}</td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums" style={{ color: pendiente > 0.01 ? '#d97706' : '#059669' }}>{fmt(pendiente)}</td>
                      <td className="px-4 py-3 text-center">{renderBadge(pendiente)}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => navigate(`/proformas/detalle/${v.id}`)}
                            className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-[#eef1fc] hover:text-[#2b41b8] hover:border-[#c7d0f5] transition-colors"
                            title="Ver Detalle"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            disabled={pendiente <= 0.01}
                            onClick={() => handleOpenAbono(v, pendiente, total)}
                            className={`h-8 px-3 inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                              pendiente <= 0.01
                                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                : 'text-white'
                            }`}
                            style={pendiente <= 0.01 ? {} : { backgroundColor: CO_PRIMARY }}
                            onMouseEnter={(e) => {
                              if (pendiente > 0.01) {
                                e.currentTarget.style.backgroundColor = CO_PRIMARY_HOVER;
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (pendiente > 0.01) {
                                e.currentTarget.style.backgroundColor = CO_PRIMARY;
                              }
                            }}
                            title={pendiente <= 0.01 ? 'Esta proforma ya fue pagada por completo' : 'Registrar Cobro'}
                          >
                            Cobrar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!loading && paginated.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center text-slate-400 text-sm">
                      No se encontraron registros de ventas
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {renderPagination()}
        </div>
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
        fecha={abonoForm.fecha}
        setFecha={(val) => setAbonoForm((prev) => ({ ...prev, fecha: val }))}
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
