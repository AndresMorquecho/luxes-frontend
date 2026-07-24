import React, { useEffect, useState, useMemo } from 'react';
import {
  ArrowDownUp,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { getMovimientos } from '../../application/movimientosService';
import { getMetodosPago } from '../../application/gastosService';
import { toast } from '../../../../shared/ui/components/Toast.jsx';
import { DateRangePicker } from '../../../../shared/ui/components/DateRangePicker';

const fmt = (n) => '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

const ORIGEN_LABELS = {
  proforma: 'Proforma',
  gasto: 'Gasto',
  orden_compra: 'Pago en caja',
  cuenta_por_pagar: 'Saldo OC',
  ingreso_manual: 'Ingreso Manual',
  transferencia: 'Transferencia',
};

const ORIGEN_BADGE = {
  proforma: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  gasto: 'bg-rose-50 text-rose-700 border-rose-100',
  orden_compra: 'bg-amber-50 text-amber-700 border-amber-100',
  cuenta_por_pagar: 'bg-slate-100 text-slate-700 border-slate-200',
  ingreso_manual: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  transferencia: 'bg-blue-50 text-blue-700 border-blue-100',
};

export const MovimientosPage = () => {
  const [movimientos, setMovimientos] = useState([]);
  const [kpi, setKpi] = useState({ totalIngresos: 0, totalEgresos: 0, balance: 0, conteo: 0 });
  const [metodosPago, setMetodosPago] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 12;

  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroMetodo, setFiltroMetodo] = useState('');
  const [fechas, setFechas] = useState({
    desde: (() => {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d.toISOString().split('T')[0];
    })(),
    hasta: new Date().toISOString().split('T')[0],
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [data, mps] = await Promise.all([
        getMovimientos({
          desde: fechas.desde,
          hasta: fechas.hasta,
          tipo: filtroTipo,
          metodoPagoId: filtroMetodo || undefined,
        }),
        getMetodosPago().catch(() => []),
      ]);
      setMovimientos(data.movimientos || []);
      setKpi(data.kpi || { totalIngresos: 0, totalEgresos: 0, balance: 0, conteo: 0 });
      setMetodosPago(mps || []);
    } catch (err) {
      toast.error('Error al cargar movimientos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [fechas.desde, fechas.hasta, filtroTipo, filtroMetodo]);

  const filtered = useMemo(() => {
    if (!search.trim()) return movimientos;
    const q = search.toLowerCase();
    return movimientos.filter(m =>
      m.descripcion?.toLowerCase().includes(q) ||
      m.entidad?.toLowerCase().includes(q) ||
      m.referencia?.toLowerCase().includes(q) ||
      m.metodoPago?.toLowerCase().includes(q)
    );
  }, [movimientos, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  useEffect(() => { setPage(1); }, [search, filtroTipo, filtroMetodo]);

  const balanceIsPositive = kpi.balance >= 0;

  const tipoTabs = [
    { key: 'todos', label: 'Todos' },
    { key: 'ingreso', label: 'Ingresos' },
    { key: 'egreso', label: 'Egresos' },
  ];

  return (
    <div className="space-y-3 sm:space-y-5 animate-slide-up" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        .shadow-card { box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02); }
      `}</style>

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-5 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 bg-blue-50 border-blue-100">
              <ArrowDownUp className="w-5 h-5 text-blue-600" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800">Movimientos</h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-blue-100 text-blue-700">
                  Financiero
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Bitácora de ingresos y egresos del negocio
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards — 2×2 en móvil; una fila en web */}
      <div className="grid grid-cols-4 max-sm:grid-cols-2 gap-2 sm:gap-3">
        <div className="bg-white shadow-card rounded-xl border border-gray-100 border-t-2 border-t-emerald-500 px-2.5 sm:px-4 py-3 sm:py-4 min-w-0">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ingresos</p>
          <p className="text-base sm:text-lg font-bold text-emerald-600 mt-1 tabular-nums truncate">{fmt(kpi.totalIngresos)}</p>
        </div>

        <div className="bg-white shadow-card rounded-xl border border-gray-100 border-t-2 border-t-red-500 px-2.5 sm:px-4 py-3 sm:py-4 min-w-0">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Egresos</p>
          <p className="text-base sm:text-lg font-bold text-red-500 mt-1 tabular-nums truncate">{fmt(kpi.totalEgresos)}</p>
          {(kpi.totalCompromisos > 0 || kpi.totalEgresosCaja > 0) && (
            <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">
              Caja {fmt(kpi.totalEgresosCaja || 0)}
              {kpi.totalCompromisos > 0 ? ` · Por pagar ${fmt(kpi.totalCompromisos)}` : ''}
            </p>
          )}
        </div>

        <div className={`bg-white shadow-card rounded-xl border border-gray-100 border-t-2 px-2.5 sm:px-4 py-3 sm:py-4 min-w-0 ${balanceIsPositive ? 'border-t-blue-600' : 'border-t-rose-500'}`}>
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Balance neto</p>
          <p className={`text-base sm:text-lg font-bold mt-1 tabular-nums truncate ${balanceIsPositive ? 'text-blue-600' : 'text-rose-600'}`}>
            {balanceIsPositive ? '+' : ''}{fmt(kpi.balance)}
          </p>
        </div>

        <div className="bg-white shadow-card rounded-xl border border-gray-100 border-t-2 border-t-indigo-500 px-2.5 sm:px-4 py-3 sm:py-4 min-w-0">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Transacciones</p>
          <p className="text-base sm:text-lg font-bold text-indigo-600 mt-1 tabular-nums">{kpi.conteo}</p>
        </div>
      </div>

      {/* Filters — una sola línea en desktop */}
      <div className="bg-white shadow-card rounded-xl border border-gray-100 p-3 sm:p-4">
        <div className="flex flex-col lg:flex-row lg:items-end lg:flex-nowrap gap-3">
          <div className="min-w-0 flex-1 lg:max-w-[240px]">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Fecha</label>
            <DateRangePicker
              value={{ start: fechas.desde, end: fechas.hasta }}
              onChange={val => setFechas({ desde: val.start, hasta: val.end })}
              placeholder="Seleccionar rango"
            />
          </div>

          <div className="min-w-0 flex-1 lg:max-w-[200px]">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Método de pago</label>
            <select
              value={filtroMetodo}
              onChange={e => setFiltroMetodo(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-gray-50 text-slate-700 focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-colors"
            >
              <option value="">Todos los métodos</option>
              {metodosPago.filter(mp => mp.activo).map(mp => (
                <option key={mp.id} value={mp.id}>{mp.nombre}</option>
              ))}
            </select>
          </div>

          <div className="min-w-0 flex-[1.4]">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Búsqueda</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Descripción, entidad, referencia..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-gray-50 placeholder-slate-400 focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div className="inline-flex flex-nowrap gap-1 p-1 bg-slate-100 rounded-xl shrink-0 self-start lg:self-end">
            {tipoTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFiltroTipo(tab.key)}
                className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                  filtroTipo === tab.key
                    ? 'bg-white text-blue-700 shadow-sm border border-blue-100'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow-card rounded-xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16">
            <div className="animate-spin rounded-full h-7 w-7 border-2 border-blue-200 border-t-blue-500" />
            <span className="text-xs text-slate-400">Cargando movimientos...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-11 h-11 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center mb-3 text-slate-400">
              <FileText size={20} />
            </div>
            <p className="text-sm font-semibold text-slate-600">No se encontraron movimientos</p>
            <p className="text-xs text-slate-400 mt-1">Ajusta los filtros o el rango de fechas</p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Fecha</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Tipo</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Origen</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Descripción</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Entidad</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Usuario</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Método</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Referencia</th>
                    <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginated.map((m) => {
                    const origenCls = ORIGEN_BADGE[m.origen] || 'bg-slate-50 text-slate-600 border-slate-200';
                    return (
                      <tr key={m.id + m.origen} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-[12.5px] font-semibold text-slate-700">
                            {new Date(m.fecha).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {new Date(m.fecha).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                            m.tipo === 'ingreso'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : 'bg-rose-50 text-rose-700 border-rose-100'
                          }`}>
                            {m.tipo === 'ingreso'
                              ? <ArrowDownLeft size={12} />
                              : <ArrowUpRight size={12} />}
                            {m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold border ${origenCls}`}>
                            {ORIGEN_LABELS[m.origen] || m.origen}
                          </span>
                        </td>
                        <td className="px-4 py-3 max-w-[240px]">
                          <div className="text-sm font-medium text-slate-800 truncate" title={m.descripcion}>
                            {m.descripcion}
                          </div>
                          {m.origen === 'orden_compra' && m.ordenTotal != null && (
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Total orden {fmt(m.ordenTotal)}
                              {m.ordenSaldo > 0.01 ? ` · Saldo ${fmt(m.ordenSaldo)}` : ' · Pagada'}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[12.5px] text-slate-500 font-medium">
                          {m.entidad || '—'}
                        </td>
                        <td className="px-4 py-3 text-[12.5px] text-slate-500 font-medium">
                          {m.usuario || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
                            {m.metodoPago}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {m.referencia || '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-[13px] font-bold tabular-nums ${
                            m.esCompromiso
                              ? 'text-slate-700'
                              : m.tipo === 'ingreso'
                                ? 'text-emerald-700'
                                : 'text-rose-600'
                          }`}>
                            {m.tipo === 'ingreso' ? '+' : '-'}{fmt(m.monto)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="md:hidden flex flex-col gap-3 p-4">
              {paginated.map((m) => {
                const origenCls = ORIGEN_BADGE[m.origen] || 'bg-slate-50 text-slate-600 border-slate-200';
                return (
                  <div key={m.id + m.origen} className="border border-slate-200 rounded-xl p-3.5 space-y-2">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-[11.5px] text-slate-500 font-medium">
                        {new Date(m.fecha).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                        m.tipo === 'ingreso'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : 'bg-rose-50 text-rose-700 border-rose-100'
                      }`}>
                        {m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-slate-800 leading-snug">{m.descripcion}</p>
                    {m.origen === 'orden_compra' && m.ordenTotal != null && (
                      <p className="text-[11px] text-slate-500">
                        Total orden {fmt(m.ordenTotal)}
                        {m.ordenSaldo > 0.01 ? ` · Saldo ${fmt(m.ordenSaldo)}` : ' · Pagada'}
                      </p>
                    )}
                    <div className="flex justify-between items-end gap-2 pt-1">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold border ${origenCls}`}>
                            {ORIGEN_LABELS[m.origen] || m.origen}
                          </span>
                          <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
                            {m.metodoPago}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-3 gap-y-0.5">
                          {m.entidad && <span>Entidad: {m.entidad}</span>}
                          {m.usuario && <span>Por: {m.usuario}</span>}
                          {m.referencia && <span>Ref: {m.referencia}</span>}
                        </div>
                      </div>
                      <span className={`text-sm font-bold tabular-nums shrink-0 ${
                        m.tipo === 'ingreso' ? 'text-emerald-700' : 'text-rose-600'
                      }`}>
                        {m.tipo === 'ingreso' ? '+' : '-'}{fmt(m.monto)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3.5 border-t border-slate-100">
                <span className="text-xs font-medium text-slate-400">
                  {filtered.length} movimiento{filtered.length !== 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage(p => p - 1)}
                    className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 7) {
                      pageNum = i + 1;
                    } else if (safePage <= 4) {
                      pageNum = i + 1;
                    } else if (safePage >= totalPages - 3) {
                      pageNum = totalPages - 6 + i;
                    } else {
                      pageNum = safePage - 3 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setPage(pageNum)}
                        className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-semibold border transition-colors ${
                          safePage === pageNum
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
