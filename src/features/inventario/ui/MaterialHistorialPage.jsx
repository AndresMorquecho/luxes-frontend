// src/features/inventario/ui/MaterialHistorialPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  User,
  Search,
  RotateCcw,
  Plus,
  Minus,
  ChevronLeft,
  ChevronRight,
  Tag,
  X
} from 'lucide-react';
import { getMaterialHistorial, registrarMovimiento } from '../application/inventarioService.js';
import { DateRangePicker } from '../../../shared/ui/components/DateRangePicker.jsx';
import { ModalPortal } from '../../../shared/ui/components/ModalPortal.jsx';
import { toast } from '../../../shared/ui/components/Toast.jsx';
import './MaterialHistorialPage.css';

const ITEMS_PER_PAGE = 15;

export function MaterialHistorialPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination state
  const [page, setPage] = useState(1);
  const [tipoFilter, setTipoFilter] = useState('todos'); // 'todos' | 'entrada' | 'salida'
  const [userSearch, setUserSearch] = useState('');
  const [debouncedUserSearch, setDebouncedUserSearch] = useState('');
  const [fechas, setFechas] = useState({ start: '', end: '' });

  // Quick Movimiento Modal state
  const [movModalTipo, setMovModalTipo] = useState(null); // null | 'entrada' | 'salida'
  const [movCantidad, setMovCantidad] = useState('');
  const [movMotivo, setMovMotivo] = useState('');
  const [savingMov, setSavingMov] = useState(false);

  // Debounce user search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUserSearch(userSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [tipoFilter, debouncedUserSearch, fechas.start, fechas.end]);

  const loadHistorial = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getMaterialHistorial(id, {
        page,
        limit: ITEMS_PER_PAGE,
        tipo: tipoFilter !== 'todos' ? tipoFilter : undefined,
        fechaInicio: fechas.start || undefined,
        fechaFin: fechas.end || undefined,
        usuario: debouncedUserSearch.trim() || undefined,
      });
      setData(result);
    } catch (e) {
      toast.error('Error al cargar historial: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [id, page, tipoFilter, fechas.start, fechas.end, debouncedUserSearch]);

  useEffect(() => {
    loadHistorial();
  }, [loadHistorial]);

  const material = data?.material;
  const movimientos = data?.movimientos || [];
  const pagination = data?.pagination || { total: 0, page: 1, limit: ITEMS_PER_PAGE, totalPages: 1 };

  const unidad = material?.unidadMedida?.abreviacion || material?.unidadMedida?.nombre || 'unid';
  const currentStock = Number(material?.stockActual) || 0;
  const stockMinimo = Number(material?.stockMinimo) || 0;

  const stockStatus = currentStock === 0
    ? { label: 'Agotado', color: 'bg-red-50 text-red-700 border-red-200' }
    : currentStock <= stockMinimo
    ? { label: 'Stock Bajo', color: 'bg-amber-50 text-amber-800 border-amber-200' }
    : { label: 'En Stock', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };

  // Quick movement submit
  async function handleQuickMovSubmit(e) {
    e.preventDefault();
    const qty = parseFloat(movCantidad);
    if (!qty || qty <= 0) {
      toast.error('Ingresa una cantidad válida.');
      return;
    }
    if (movModalTipo === 'salida' && qty > currentStock) {
      toast.error(`Stock insuficiente. Stock actual: ${currentStock} ${unidad}`);
      return;
    }

    setSavingMov(true);
    try {
      await registrarMovimiento(material.id, {
        tipo: movModalTipo,
        cantidad: qty,
        motivo: movMotivo.trim() || (movModalTipo === 'entrada' ? 'Ingreso de stock manual' : 'Descarga de stock manual'),
      });
      toast.success(`Movimiento de ${movModalTipo} registrado.`);
      setMovModalTipo(null);
      setMovCantidad('');
      setMovMotivo('');
      loadHistorial();
    } catch (err) {
      toast.error(err.message || 'Error al registrar movimiento');
    } finally {
      setSavingMov(false);
    }
  }

  const handleClearFilters = () => {
    setTipoFilter('todos');
    setUserSearch('');
    setDebouncedUserSearch('');
    setFechas({ start: '', end: '' });
  };

  const hasActiveFilters = tipoFilter !== 'todos' || userSearch.trim() !== '' || fechas.start !== '' || fechas.end !== '';

  const formatDateTime = (dateStr) => {
    if (!dateStr) return { date: '—', time: '' };
    try {
      const d = new Date(dateStr);
      const date = d.toLocaleDateString('es-EC', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      const time = d.toLocaleTimeString('es-EC', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      return { date, time };
    } catch {
      return { date: dateStr, time: '' };
    }
  };

  const getPageNumbers = () => {
    const totalP = pagination.totalPages;
    if (totalP <= 7) return Array.from({ length: totalP }, (_, i) => i + 1);
    if (page <= 4) return [1, 2, 3, 4, 5, '...', totalP];
    if (page >= totalP - 3) return [1, '...', totalP - 4, totalP - 3, totalP - 2, totalP - 1, totalP];
    return [1, '...', page - 1, page, page + 1, '...', totalP];
  };

  return (
    <div className="hist-page max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="mb-6 flex flex-col gap-4">
        <div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer shadow-xs mb-3"
            onClick={() => navigate('/inventario')}
          >
            <ArrowLeft size={14} /> Volver a Inventario
          </button>
        </div>

        {/* Product Info & Stock Banner */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                <Tag size={12} />
                {material?.categoria || 'General'}
              </span>
              {material?.codigo && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                  {material.codigo}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
              {material?.nombre || 'Cargando producto…'}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Registro de trazabilidad y movimientos en tiempo real
            </p>
          </div>

          {/* Real-time Stock Display Card */}
          <div className="w-full md:w-auto bg-slate-50 border border-slate-100 rounded-2xl p-4 sm:p-5 flex items-center justify-between md:justify-end gap-6 shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Stock en Tiempo Real
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${stockStatus.color}`}>
                  {stockStatus.label}
                </span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono">
                  {currentStock}
                </span>
                <span className="text-sm font-bold text-slate-500">{unidad}</span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-1.5">
              <button
                type="button"
                onClick={() => setMovModalTipo('entrada')}
                className="inline-flex items-center justify-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                title="Registrar Entrada Manual"
              >
                <Plus size={14} /> Entrada
              </button>
              <button
                type="button"
                onClick={() => setMovModalTipo('salida')}
                className="inline-flex items-center justify-center gap-1 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                title="Registrar Salida / Descarga"
              >
                <Minus size={14} /> Salida
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-4 sm:p-5 mb-5 relative z-20">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Filters Left */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Tipo Filter Buttons */}
            <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
              <button
                type="button"
                onClick={() => setTipoFilter('todos')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  tipoFilter === 'todos'
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setTipoFilter('entrada')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  tipoFilter === 'entrada'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-emerald-700'
                }`}
              >
                <ArrowDownLeft size={13} /> Entradas
              </button>
              <button
                type="button"
                onClick={() => setTipoFilter('salida')}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  tipoFilter === 'salida'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-amber-700'
                }`}
              >
                <ArrowUpRight size={13} /> Salidas
              </button>
            </div>

            <div className="hidden sm:block w-px h-7 bg-slate-200" />

            {/* DateRangePicker */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                Rango:
              </span>
              <div className="w-56 sm:w-64">
                <DateRangePicker
                  value={{ start: fechas.start, end: fechas.end }}
                  onChange={(val) => setFechas({ start: val.start, end: val.end })}
                  placeholder="Seleccionar fechas"
                />
              </div>
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                title="Limpiar todos los filtros"
              >
                <RotateCcw size={12} /> Limpiar
              </button>
            )}
          </div>

          {/* Search by User Right */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 w-full lg:w-64">
            <User size={15} className="text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Filtrar por usuario…"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-xs font-medium text-slate-800 placeholder-slate-400"
            />
            {userSearch && (
              <button
                type="button"
                onClick={() => setUserSearch('')}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Movement List Table & Cards */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-semibold text-slate-500">Cargando movimientos de inventario…</p>
          </div>
        ) : movimientos.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
              <Clock size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No se encontraron movimientos</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              {hasActiveFilters
                ? 'No hay registros que coincidan con los filtros aplicados.'
                : 'Aún no se han registrado entradas ni salidas para este producto.'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 px-5">Fecha y Hora</th>
                    <th className="py-3.5 px-4 text-center">Acción / Tipo</th>
                    <th className="py-3.5 px-4 text-right">Cantidad</th>
                    <th className="py-3.5 px-5">Motivo / Detalle</th>
                    <th className="py-3.5 px-5">Usuario Responsable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {movimientos.map((m) => {
                    const isEntrada = m.tipo?.toLowerCase() === 'entrada';
                    const { date, time } = formatDateTime(m.fecha);
                    const userName = m.usuario?.nombre || m.usuario?.username || 'Sistema';

                    return (
                      <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Fecha y Hora */}
                        <td className="py-3.5 px-5 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                              <Calendar size={14} />
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 text-xs">{date}</p>
                              <p className="text-[11px] text-slate-400 font-mono mt-0.5">{time}</p>
                            </div>
                          </div>
                        </td>

                        {/* Tipo / Acción */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${
                              isEntrada
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-800 border-amber-200'
                            }`}
                          >
                            {isEntrada ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
                            {isEntrada ? 'ENTRADA' : 'SALIDA'}
                          </span>
                        </td>

                        {/* Cantidad */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span
                            className={`font-mono font-bold text-sm ${
                              isEntrada ? 'text-emerald-600' : 'text-amber-700'
                            }`}
                          >
                            {isEntrada ? '+' : '-'}
                            {m.cantidad} <span className="text-xs font-medium text-slate-500">{unidad}</span>
                          </span>
                        </td>

                        {/* Motivo */}
                        <td className="py-3.5 px-5">
                          <p className="font-medium text-slate-700 text-xs leading-relaxed max-w-md">
                            {m.motivo || (isEntrada ? 'Ingreso de inventario' : 'Descarga de inventario')}
                          </p>
                        </td>

                        {/* Usuario Responsable */}
                        <td className="py-3.5 px-5 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold shrink-0">
                              {userName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800">{userName}</p>
                              {m.usuario?.rol && (
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                                  {m.usuario.rol}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="block md:hidden divide-y divide-slate-100 p-3 space-y-3">
              {movimientos.map((m) => {
                const isEntrada = m.tipo?.toLowerCase() === 'entrada';
                const { date, time } = formatDateTime(m.fecha);
                const userName = m.usuario?.nombre || m.usuario?.username || 'Sistema';

                return (
                  <div key={m.id} className="bg-slate-50/60 rounded-xl p-3.5 border border-slate-100">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          isEntrada
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {isEntrada ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                        {isEntrada ? 'ENTRADA' : 'SALIDA'}
                      </span>
                      <span
                        className={`font-mono font-black text-sm ${
                          isEntrada ? 'text-emerald-600' : 'text-amber-700'
                        }`}
                      >
                        {isEntrada ? '+' : '-'}
                        {m.cantidad} {unidad}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-slate-800 mb-2">
                      {m.motivo || (isEntrada ? 'Ingreso de inventario' : 'Descarga de inventario')}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-200/50">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock size={11} /> {date} {time}
                      </span>
                      <span className="flex items-center gap-1 font-bold text-slate-700">
                        <User size={11} /> {userName}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
                <p className="text-xs text-slate-500">
                  Mostrando{' '}
                  <strong className="text-slate-800">
                    {Math.min(pagination.total, (page - 1) * ITEMS_PER_PAGE + 1)}
                  </strong>{' '}
                  a{' '}
                  <strong className="text-slate-800">
                    {Math.min(pagination.total, page * ITEMS_PER_PAGE)}
                  </strong>{' '}
                  de <strong className="text-slate-800">{pagination.total}</strong> movimientos
                </p>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                  </button>

                  {getPageNumbers().map((pNum, index) => {
                    if (pNum === '...') {
                      return (
                        <span key={`dots-${index}`} className="px-2 text-slate-400 text-xs">
                          …
                        </span>
                      );
                    }
                    return (
                      <button
                        key={pNum}
                        type="button"
                        onClick={() => setPage(pNum)}
                        className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          page === pNum
                            ? 'bg-[#0b2d64] text-white shadow-xs'
                            : 'border border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {pNum}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    disabled={page === pagination.totalPages}
                    onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                    className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Quick Movimiento Modal */}
      {movModalTipo && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
            style={{
              background: 'rgba(15, 23, 42, 0.45)',
              backdropFilter: 'blur(5px)',
              WebkitBackdropFilter: 'blur(5px)',
              fontFamily: "var(--font-main, 'Inter', system-ui, -apple-system, sans-serif)",
            }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setMovModalTipo(null);
            }}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    {movModalTipo === 'entrada' ? 'Registrar Entrada de Stock' : 'Registrar Salida / Descarga'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {material?.nombre} ({currentStock} {unidad} actual)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMovModalTipo(null)}
                  className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleQuickMovSubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Cantidad ({unidad}) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    required
                    autoFocus
                    placeholder="0"
                    value={movCantidad}
                    onChange={(e) => setMovCantidad(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-base font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Motivo / Destino
                  </label>
                  <input
                    type="text"
                    value={movMotivo}
                    onChange={(e) => setMovMotivo(e.target.value)}
                    placeholder={
                      movModalTipo === 'entrada'
                        ? 'Ej: Compra manual, devolución de taller...'
                        : 'Ej: Descarga para producción, uso en taller...'
                    }
                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setMovModalTipo(null)}
                    disabled={savingMov}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingMov || !movCantidad}
                    className={`inline-flex items-center justify-center gap-1.5 px-5 py-2 text-white rounded-xl font-bold text-xs whitespace-nowrap transition-all shadow-sm cursor-pointer active:scale-[0.99] disabled:opacity-50 ${
                      movModalTipo === 'entrada'
                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-950/20'
                        : 'bg-amber-600 hover:bg-amber-700 shadow-amber-950/20'
                    }`}
                  >
                    {savingMov
                      ? 'Registrando…'
                      : movModalTipo === 'entrada'
                      ? 'Confirmar Entrada'
                      : 'Confirmar Salida'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
