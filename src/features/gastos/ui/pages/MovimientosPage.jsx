import React, { useEffect, useState, useMemo } from 'react';
import {
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Search,
  ChevronLeft,
  ChevronRight,
  FileText,
  CreditCard
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

const ORIGEN_BADGE_CLASSES = {
  proforma: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  gasto: 'bg-rose-50 text-rose-700 border-rose-200/60',
  orden_compra: 'bg-amber-50 text-amber-800 border-amber-200/60',
  cuenta_por_pagar: 'bg-purple-50 text-purple-700 border-purple-200/60',
  ingreso_manual: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
  transferencia: 'bg-blue-50 text-blue-700 border-blue-200/60',
};

export const MovimientosPage = () => {
  const [movimientos, setMovimientos] = useState([]);
  const [kpi, setKpi] = useState({ totalIngresos: 0, totalEgresos: 0, balance: 0, conteo: 0, totalCompromisos: 0, totalEgresosCaja: 0 });
  const [metodosPago, setMetodosPago] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 12;

  // Filters
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
      setKpi(data.kpi || { totalIngresos: 0, totalEgresos: 0, balance: 0, conteo: 0, totalCompromisos: 0, totalEgresosCaja: 0 });
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

  // Client-side text search
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

  return (
    <div className="w-full pb-20 md:pb-6 animate-slide-up mv-root" style={{ fontFamily: "var(--font-main, 'Inter', system-ui, -apple-system, sans-serif)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');

        .mv-root, .mv-root * {
          font-family: var(--font-main, 'Inter', system-ui, -apple-system, sans-serif) !important;
          box-sizing: border-box;
        }

        .mv-mono {
          font-family: 'JetBrains Mono', monospace !important;
        }
      `}</style>

      {/* Header Institucional */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs mb-4 sm:mb-6 overflow-hidden">
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-blue-600 shadow-xs">
              <ArrowLeftRight size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800">Movimientos Financieros</h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-blue-100 text-blue-700">
                  Caja y Flujo
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Bitácora consolidada de ingresos, cobros liquidados y pagos en caja
              </p>
            </div>
          </div>


        </div>
      </div>

      {/* Top Row: 4 KPI Cards (Estrictamente una sola fila) */}
      <div className="grid grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {/* Card 1: Ingresos */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-4 sm:p-5 flex items-center gap-3.5 sm:gap-4 min-w-0 overflow-hidden">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 text-emerald-600">
            <TrendingUp size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">Ingresos</p>
            <p className="text-lg sm:text-2xl font-bold text-slate-800 tracking-tight leading-tight mt-0.5 truncate mv-mono">
              {fmt(kpi.totalIngresos)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5 truncate font-medium">Cobros y ventas</p>
          </div>
        </div>

        {/* Card 2: Egresos */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-4 sm:p-5 flex items-center gap-3.5 sm:gap-4 min-w-0 overflow-hidden">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0 text-rose-600">
            <TrendingDown size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">Egresos</p>
            <p className="text-lg sm:text-2xl font-bold text-slate-800 tracking-tight leading-tight mt-0.5 truncate mv-mono">
              {fmt(kpi.totalEgresos)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5 truncate font-medium">
              {kpi.totalCompromisos > 0 ? `Caja ${fmt(kpi.totalEgresosCaja || 0)}` : 'Gastos y compras'}
            </p>
          </div>
        </div>

        {/* Card 3: Balance Neto */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-4 sm:p-5 flex items-center gap-3.5 sm:gap-4 min-w-0 overflow-hidden">
          <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl border flex items-center justify-center shrink-0 ${balanceIsPositive
              ? 'bg-blue-50 border-blue-100 text-[#0b2d64]'
              : 'bg-rose-50 border-rose-100 text-rose-600'
            }`}>
            <DollarSign size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">Balance Neto</p>
            <p className={`text-lg sm:text-2xl font-bold tracking-tight leading-tight mt-0.5 truncate mv-mono ${balanceIsPositive ? 'text-slate-800' : 'text-rose-600'
              }`}>
              {balanceIsPositive ? '+' : ''}{fmt(kpi.balance)}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5 truncate font-medium">
              {balanceIsPositive ? 'Superávit neto' : 'Déficit operativo'}
            </p>
          </div>
        </div>

        {/* Card 4: Transacciones */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-4 sm:p-5 flex items-center gap-3.5 sm:gap-4 min-w-0 overflow-hidden">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0 text-purple-600">
            <Activity size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate">Transacciones</p>
            <p className="text-lg sm:text-2xl font-bold text-slate-800 tracking-tight leading-tight mt-0.5 truncate mv-mono">
              {kpi.conteo}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5 truncate font-medium">Registros en periodo</p>
          </div>
        </div>
      </div>

      {/* Contenedor de Filtros y Buscador */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs mb-4 sm:mb-6 p-4 sm:p-5 relative z-30">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Controles de Filtros */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Rango de Fechas */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Fecha:</span>
              <div className="w-56 sm:w-64">
                <DateRangePicker
                  value={{ start: fechas.desde, end: fechas.hasta }}
                  onChange={val => setFechas({ desde: val.start, hasta: val.end })}
                  placeholder="Seleccionar rango"
                  size="sm"
                />
              </div>
            </div>

            <div className="hidden sm:block w-px h-7 bg-slate-200" />

            {/* Toggle Tipo */}
            <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
              <button
                type="button"
                onClick={() => setFiltroTipo('todos')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${filtroTipo === 'todos'
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setFiltroTipo('ingreso')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${filtroTipo === 'ingreso'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-emerald-700'
                  }`}
              >
                Ingresos
              </button>
              <button
                type="button"
                onClick={() => setFiltroTipo('egreso')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${filtroTipo === 'egreso'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-rose-700'
                  }`}
              >
                Egresos
              </button>
            </div>

            <div className="hidden sm:block w-px h-7 bg-slate-200" />

            {/* Método de Pago */}
            <select
              value={filtroMetodo}
              onChange={e => setFiltroMetodo(e.target.value)}
              className="h-10 px-3 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white focus:bg-white text-xs sm:text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer min-w-[160px]"
            >
              <option value="">Todos los métodos</option>
              {metodosPago.filter(mp => mp.activo).map(mp => (
                <option key={mp.id} value={mp.id}>{mp.nombre}</option>
              ))}
            </select>
          </div>

          {/* Buscador a la derecha */}
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar concepto, entidad, ref..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full h-10 pl-10 pr-8 border border-slate-200 rounded-xl bg-white text-xs sm:text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400 transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                title="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabla de Movimientos */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xs relative z-10">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-[#0b2d64]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-3 shadow-xs">
              <FileText size={24} strokeWidth={1.5} />
            </div>
            <h3 className="text-base font-bold text-slate-700">No se encontraron movimientos</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Ajusta los filtros o el rango de fechas para ver otros registros de caja.
            </p>
          </div>
        ) : (
          <>
            {/* Vista Escritorio */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-[13px] border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 bg-slate-50/50">
                    <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider w-36">Fecha Hora</th>
                    <th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-wider w-28">Tipo</th>
                    <th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-wider w-32">Origen</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider">Concepto</th>
                    <th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-wider">Entidad / Cliente</th>
                    <th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-wider">Usuario</th>
                    <th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-wider">Método</th>
                    <th className="px-4 py-3.5 text-[10px] font-bold uppercase tracking-wider">Referencia</th>
                    <th className="px-5 py-3.5 text-[10px] font-bold uppercase tracking-wider text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {paginated.map((m) => {
                    const badgeClass = ORIGEN_BADGE_CLASSES[m.origen] || 'bg-slate-50 text-slate-700 border-slate-200';
                    return (
                      <tr key={m.id + m.origen} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <div className="font-bold text-slate-800 text-xs">
                            {new Date(m.fecha).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                          <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                            {new Date(m.fecha).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: true })}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${m.tipo === 'ingreso'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                              : 'bg-rose-50 text-rose-700 border-rose-200/60'
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${m.tipo === 'ingreso' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            {m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badgeClass}`}>
                            {ORIGEN_LABELS[m.origen] || m.origen}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 max-w-[240px]">
                          <div className="font-bold text-slate-800 text-xs truncate" title={m.descripcion}>
                            {m.descripcion}
                          </div>
                          {m.origen === 'orden_compra' && m.ordenTotal != null && (
                            <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                              Total orden {fmt(m.ordenTotal)}
                              {m.ordenSaldo > 0.01 ? ` · Saldo ${fmt(m.ordenSaldo)}` : ' · Pagada'}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-slate-600 text-xs truncate max-w-[140px]" title={m.entidad}>
                          {m.entidad || '—'}
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 text-xs whitespace-nowrap">
                          {m.usuario || '—'}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded-lg bg-slate-50 text-slate-600 text-[10px] font-bold border border-slate-200/80">
                            {m.metodoPago || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-400 text-xs font-mono truncate max-w-[110px]" title={m.referencia}>
                          {m.referencia || '—'}
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <span className={`font-bold text-sm mv-mono ${m.tipo === 'ingreso' ? 'text-emerald-600' : 'text-rose-600'
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

            {/* Vista Móvil */}
            <div className="md:hidden divide-y divide-slate-100 p-3 space-y-3">
              {paginated.map((m) => {
                const badgeClass = ORIGEN_BADGE_CLASSES[m.origen] || 'bg-slate-50 text-slate-700 border-slate-200';
                return (
                  <div key={m.id + m.origen} className="bg-slate-50/50 rounded-xl p-3.5 border border-slate-100 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-slate-500 font-semibold">
                        {new Date(m.fecha).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${m.tipo === 'ingreso'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                          : 'bg-rose-50 text-rose-700 border-rose-200/60'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${m.tipo === 'ingreso' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {m.tipo === 'ingreso' ? 'Ingreso' : 'Egreso'}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-slate-800">
                      {m.descripcion}
                    </div>

                    {m.origen === 'orden_compra' && m.ordenTotal != null && (
                      <div className="text-[10px] text-slate-400 font-medium">
                        Total orden {fmt(m.ordenTotal)}
                        {m.ordenSaldo > 0.01 ? ` · Saldo ${fmt(m.ordenSaldo)}` : ' · Pagada'}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${badgeClass}`}>
                          {ORIGEN_LABELS[m.origen] || m.origen}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg bg-white text-slate-600 text-[9px] font-bold border border-slate-200">
                          {m.metodoPago}
                        </span>
                      </div>

                      <span className={`font-bold text-xs mv-mono ${m.tipo === 'ingreso' ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                        {m.tipo === 'ingreso' ? '+' : '-'}{fmt(m.monto)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-400">
                  Mostrando {((safePage - 1) * perPage) + 1} a {Math.min(safePage * perPage, filtered.length)} de {filtered.length} movimientos
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage(p => p - 1)}
                    className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 flex items-center justify-center hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    <ChevronLeft size={16} />
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
                    const isActive = safePage === pageNum;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${isActive
                            ? 'bg-[#0b2d64] text-white shadow-xs'
                            : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
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
                    className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-600 flex items-center justify-center hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    <ChevronRight size={16} />
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
