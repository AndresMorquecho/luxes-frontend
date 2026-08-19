// src/features/inventario/ui/InventarioPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, Wrench, ArrowRightLeft, Search, Plus, Edit2, Trash2,
  ArrowUp, ArrowDown, RefreshCw, AlertTriangle, CheckCircle2,
  Clock, X, Layers, User, ExternalLink, Filter, ChevronLeft, ChevronRight,
  Monitor, Printer, Tag
} from 'lucide-react';
import {
  getMateriales, createMaterial, updateMaterial, deleteMaterial,
  registrarMovimiento, getInventarioStats, getUnidadesMedida,
  getInventarioCategoriaPorRol, buildMaterialesQuery,
} from '../application/inventarioService.js';
import { toast } from '../../../shared/ui/components/Toast.jsx';
import { confirmDialog } from '../../../shared/ui/components/ConfirmModal.jsx';
import { ModalPortal, deferClose } from '../../../shared/ui/components/ModalPortal.jsx';
import './InventarioPage.css';
import { ProductoFormModal } from './ProductoFormModal.jsx';
import { InventoryTable } from './components/InventoryTable.jsx';

// ── Helper ─────────────────────────────────────────────────────────────────
const ITEMS_PER_PAGE = 25;
const fmt = (n) => `$${Number(n).toFixed(2)}`;
const fmtCompra = (d) => d ? new Date(d).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const elapsed = (fechaSalida) => {
  const diff = Date.now() - new Date(fechaSalida).getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const ALUX_CATEGORIAS_BASE = [
  'Perfilería de Aluminio',
  'Vidrio y Cristal Templado',
  'Alucobond / ACM',
  'Herrajes y Accesorios',
  'Selladores, Siliconas e Insumos',
  'Herramientas y Equipos',
  'Tornillería y Anclajes',
  'Policarbonato y Acrílicos',
  'Consumibles de Taller',
  'Otros / Varios',
];

// ── Movimiento rápido (desde fila de tabla) ────────────────────────────────
function MovimientoModal({ material, initialTipo = 'entrada', onClose, onSave }) {
  const [tipo, setTipo] = useState(initialTipo);
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);
  const unidad = material.unidadMedida?.abreviacion || material.unidadMedida?.nombre || 'unid';

  const numQty = parseFloat(cantidad) || 0;
  const currentStock = Number(material.stockActual) || 0;
  const newStock = tipo === 'entrada' ? currentStock + numQty : currentStock - numQty;
  const isInvalidSalida = tipo === 'salida' && numQty > currentStock;

  const PRESET_MOTIVOS = tipo === 'entrada' ? [
    'Ingreso por Compra Manual',
    'Ajuste por Conteo Físico',
    'Devolución de Taller',
    'Sobrante de Proyecto',
  ] : [
    'Descarga para Producción',
    'Uso en Taller / Obra',
    'Merma / Daño de Material',
    'Ajuste por Conteo Físico',
  ];

  async function handleSubmit(e) {
    e.preventDefault();
    if (!numQty || numQty <= 0) {
      toast.error('Ingresa una cantidad válida mayor a 0.');
      return;
    }
    if (isInvalidSalida) {
      toast.error(`Stock insuficiente. Disponible: ${currentStock} ${unidad}`);
      return;
    }

    setSaving(true);
    try {
      await onSave({
        tipo,
        cantidad: numQty,
        motivo: motivo.trim() || (tipo === 'entrada' ? 'Ingreso de stock manual' : 'Descarga de stock manual'),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
        style={{
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(5px)',
          WebkitBackdropFilter: 'blur(5px)',
          fontFamily: "var(--font-main, 'Inter', system-ui, -apple-system, sans-serif)",
        }}
        onMouseDown={(e) => { if (e.target === e.currentTarget) deferClose(onClose); }}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                {tipo === 'entrada' ? 'Registrar Entrada de Stock' : 'Registrar Salida / Descarga'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Ajusta el inventario manualmente</p>
            </div>
            <button
              type="button"
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer"
              onClick={() => deferClose(onClose)}
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Info del Producto */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {material.categoria || 'Producto'}
                </p>
                <p className="text-sm font-bold text-slate-800 truncate" title={material.nombre}>
                  {material.nombre}
                </p>
                {material.codigo && (
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{material.codigo}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <span className="text-[11px] text-slate-500 block font-medium">Stock Actual</span>
                <strong className="text-sm font-bold text-slate-800">
                  {currentStock} <span className="text-xs text-slate-500 font-normal">{unidad}</span>
                </strong>
              </div>
            </div>

            {/* Toggle Tipo (Entrada vs Salida) */}
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setTipo('entrada')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  tipo === 'entrada'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowDown size={14} /> Entrada (+)
              </button>
              <button
                type="button"
                onClick={() => setTipo('salida')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  tipo === 'salida'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowUp size={14} /> Salida / Descarga (-)
              </button>
            </div>

            {/* Cantidad Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Cantidad a {tipo === 'entrada' ? 'Ingresar' : 'Descargar'} ({unidad}) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                required
                autoFocus
                placeholder="0"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-base font-bold text-slate-800 focus:outline-none transition-all shadow-xs ${
                  isInvalidSalida
                    ? 'border-red-400 bg-red-50/20 text-red-700 focus:ring-2 focus:ring-red-400/20'
                    : 'border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                }`}
              />
              {isInvalidSalida && (
                <p className="text-xs font-semibold text-red-500 mt-1">
                  ⚠️ No puedes descargar más de los {currentStock} {unidad} disponibles en stock.
                </p>
              )}
            </div>

            {/* Preview de Nuevo Stock */}
            {numQty > 0 && !isInvalidSalida && (
              <div className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-between border ${
                tipo === 'entrada' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                <span>Proyección de Stock:</span>
                <span>
                  {currentStock} {unidad} ➔ <strong>{newStock} {unidad}</strong> ({tipo === 'entrada' ? `+${numQty}` : `-${numQty}`})
                </span>
              </div>
            )}

            {/* Motivo Input & Chips */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Motivo / Destino
              </label>
              <input
                type="text"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder={tipo === 'entrada' ? 'Ej: Compra manual, sobrante...' : 'Ej: Descarga para producción, uso en taller...'}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs mb-2"
              />
              <div className="flex flex-wrap gap-1.5">
                {PRESET_MOTIVOS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMotivo(m)}
                    className="text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => deferClose(onClose)}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={`inline-flex items-center justify-center gap-1.5 px-5 py-2 text-white rounded-xl font-bold text-xs whitespace-nowrap transition-all shadow-sm cursor-pointer active:scale-[0.99] disabled:opacity-50 ${
                  tipo === 'entrada' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-950/20' : 'bg-amber-600 hover:bg-amber-700 shadow-amber-950/20'
                }`}
                disabled={saving || isInvalidSalida || !numQty}
              >
                {saving ? 'Registrando…' : tipo === 'entrada' ? 'Confirmar Entrada' : 'Confirmar Salida'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export function InventarioPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = (user?.rol || 'visor').toUpperCase();
  const isAdmin = userRole === 'ADMIN' || userRole === 'ADMINISTRADOR';

  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [selectedStockStatus, setSelectedStockStatus] = useState('all'); // 'all' | 'en_stock' | 'low_stock' | 'agotado'
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [stats, setStats] = useState({
    totalMateriales: 0,
    totalLowStock: 0,
    activeLoans: 0,
    returnedLoans: 0,
  });
  const [unidades, setUnidades] = useState([]);

  const [matModal, setMatModal] = useState(null);       // null | 'new' | item
  const [movModal, setMovModal] = useState(null);       // null | item

  // Categorías disponibles (base ALUX + dinámicas de los productos registrados)
  const availableCategorias = useMemo(() => {
    const set = new Set(ALUX_CATEGORIAS_BASE);
    items.forEach((i) => {
      if (i.categoria && i.categoria.trim()) set.add(i.categoria.trim());
    });
    return Array.from(set);
  }, [items]);

  // ── Debounce Search ──────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedCategoria, selectedStockStatus, debouncedSearch]);

  // ── Loaders ──────────────────────────────────────────────────────────────
  const loadUnits = useCallback(async () => {
    try {
      const u = await getUnidadesMedida();
      setUnidades(u);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const s = await getInventarioStats();
      setStats(s);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMateriales(buildMaterialesQuery({
        categoria: selectedCategoria || undefined,
        page,
        limit: ITEMS_PER_PAGE,
        search: debouncedSearch,
      }));
      
      let resItems = res.items || (Array.isArray(res) ? res : []);
      if (selectedStockStatus === 'low_stock') {
        resItems = resItems.filter(i => (i.stockActual || 0) <= (i.stockMinimo || 1) && (i.stockActual || 0) > 0);
      } else if (selectedStockStatus === 'agotado') {
        resItems = resItems.filter(i => (i.stockActual || 0) === 0);
      } else if (selectedStockStatus === 'en_stock') {
        resItems = resItems.filter(i => (i.stockActual || 0) > (i.stockMinimo || 1));
      }
      setItems(resItems);
      setTotalItems(res.total ?? resItems.length);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedCategoria, selectedStockStatus, page, debouncedSearch]);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadUnits();
  }, [loadUnits]);

  const loadAll = useCallback(async () => {
    await Promise.all([loadMaterials(), loadStats(), loadUnits()]);
  }, [loadMaterials, loadStats, loadUnits]);

  // ── CRUD handlers ─────────────────────────────────────────────────────────
  async function handleSaveMaterial(form, keepOpen = false) {
    try {
      if (matModal && matModal !== 'new') {
        await updateMaterial(matModal.id, form);
        toast.success('Registro actualizado correctamente.');
      } else {
        await createMaterial(form);
        toast.success('Registro creado correctamente.');
      }
      if (!keepOpen) {
        setMatModal(null);
      }
      loadAll();
    } catch (e) {
      toast.error(e.message);
      throw e;
    }
  }

  async function handleDeleteMaterial(item) {
    const confirmed = await confirmDialog(
      '¿Eliminar registro?',
      `¿Eliminar "${item.nombre}" del inventario? Esta acción no se puede deshacer.`,
      { confirmLabel: 'Eliminar', cancelLabel: 'Cancelar', type: 'danger' },
    );
    if (!confirmed) return;
    try {
      await deleteMaterial(item.id);
      deferClose(() => {
        toast.success('Registro eliminado.');
        loadAll();
      });
    } catch (e) { toast.error(e.message); }
  }

  async function handleMovimiento(form) {
    try {
      const targetId = movModal?.material?.id || movModal?.id;
      await registrarMovimiento(targetId, form);
      toast.success(`Movimiento de ${form.tipo} registrado con éxito.`);
      setMovModal(null);
      loadAll();
    } catch (e) { toast.error(e.message); }
  }

  // ── Handlers for Table ───────────────────────────────────────────────────
  const handleViewHistory = useCallback((item) => {
    navigate(`/inventario/historial/${item.codigo || item.id}`);
  }, [navigate]);

  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (page <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (page >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', page - 1, page, page + 1, '...', totalPages];
  };

  return (
    <div className="inv-page">
      {/* Page Header */}
      <div className="inv-page-header" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem', background: '#fff', padding: '1.25rem 1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div className="inv-page-header-text" style={{ flex: 1, minWidth: '200px' }}>
          <div className="inv-page-title-row" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <h1 className="inv-page-title" style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', letterSpacing: '-0.025em' }}>Control de Inventario</h1>
            <button type="button" className="inv-btn-refresh" onClick={loadAll} title="Actualizar" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '0.4rem', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RefreshCw size={14}/>
            </button>
          </div>
          <p className="inv-page-sub" style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>Catálogo de perfilería, cristales, herrajes e insumos de fabricación</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', width: '100%', maxWidth: 'max-content' }}>
          {isAdmin && (
            <button type="button" className="inv-btn-primary" onClick={() => setMatModal('new')} style={{ padding: '0.6rem 1.25rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={16}/> Nuevo registro
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards ALUX */}
      <div className="inv-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="inv-kpi-card">
          <div className="inv-kpi-icon blue"><Layers size={20}/></div>
          <div>
            <span className="inv-kpi-value">{stats.totalMateriales || items.length}</span>
            <span className="inv-kpi-label">Total en Catálogo</span>
          </div>
        </div>
        <div className="inv-kpi-card">
          <div className="inv-kpi-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}><Package size={20}/></div>
          <div>
            <span className="inv-kpi-value">{items.filter(i => (i.stockActual || 0) > (i.stockMinimo || 1)).length}</span>
            <span className="inv-kpi-label">En Stock Óptimo</span>
          </div>
        </div>
        <div className="inv-kpi-card">
          <div className="inv-kpi-icon" style={{ background: '#eff6ff', color: '#0b2d64' }}><Filter size={20}/></div>
          <div>
            <span className="inv-kpi-value">{availableCategorias.length}</span>
            <span className="inv-kpi-label">Categorías Activas</span>
          </div>
        </div>
        <div className="inv-kpi-card">
          <div className="inv-kpi-icon amber"><AlertTriangle size={20}/></div>
          <div>
            <span className="inv-kpi-value">{stats.totalLowStock || items.filter(i => (i.stockActual || 0) <= (i.stockMinimo || 1)).length}</span>
            <span className="inv-kpi-label">Stock Crítico / Bajo</span>
          </div>
        </div>
      </div>

      {/* Dropdown Filters & Search Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem', background: '#fff', padding: '0.85rem 1.25rem', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem', alignItems: 'center', flex: 1, minWidth: '280px' }}>
          {/* Dropdown de Categorías */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '0.625rem', padding: '0.45rem 0.75rem' }}>
            <Tag size={15} color="#0b2d64" />
            <select
              value={selectedCategoria}
              onChange={(e) => { setSelectedCategoria(e.target.value); setPage(1); }}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: selectedCategoria ? '#0b2d64' : '#475569',
                cursor: 'pointer',
                minWidth: '180px',
              }}
            >
              <option value="">Todas las Categorías ({availableCategorias.length})</option>
              {availableCategorias.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Dropdown de Estado de Stock */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '0.625rem', padding: '0.45rem 0.75rem' }}>
            <AlertTriangle size={15} color="#d97706" />
            <select
              value={selectedStockStatus}
              onChange={(e) => { setSelectedStockStatus(e.target.value); setPage(1); }}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: selectedStockStatus !== 'all' ? '#0b2d64' : '#475569',
                cursor: 'pointer',
                minWidth: '140px',
              }}
            >
              <option value="all">Todos los Estados</option>
              <option value="en_stock">En Stock</option>
              <option value="low_stock">Stock Bajo (Crítico)</option>
              <option value="agotado">Agotado (0)</option>
            </select>
          </div>

          {/* Botón limpiar filtros */}
          {(selectedCategoria || selectedStockStatus !== 'all' || search) && (
            <button
              type="button"
              onClick={() => { setSelectedCategoria(''); setSelectedStockStatus('all'); setSearch(''); }}
              style={{
                border: 'none',
                background: '#f1f5f9',
                color: '#64748b',
                padding: '0.45rem 0.75rem',
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '0.625rem', padding: '0.45rem 0.85rem', width: '100%', maxWidth: '300px' }}>
          <Search size={15} color="#94a3b8" />
          <input
            type="text"
            placeholder="Buscar por nombre o código…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '0.8125rem',
              fontWeight: 500,
              color: '#1e293b',
              width: '100%'
            }}
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="inv-loading">
          <div className="inv-spinner"/>
          <span>Cargando inventario…</span>
        </div>
      ) : (
        <>
          <div className="inv-table-card" style={{ position: 'relative', zIndex: 10 }}>
            <InventoryTable 
              items={items}
              isAdmin={isAdmin}
              onViewHistory={handleViewHistory}
              onEntrada={(item) => setMovModal({ material: item, initialTipo: 'entrada' })}
              onSalida={(item) => setMovModal({ material: item, initialTipo: 'salida' })}
              onEdit={setMatModal}
              onDelete={handleDeleteMaterial}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="inv-pagination">
                <div className="inv-pagination-info">
                  Mostrando <strong>{Math.min(totalItems, (page - 1) * ITEMS_PER_PAGE + 1)}</strong> a{' '}
                  <strong>{Math.min(totalItems, page * ITEMS_PER_PAGE)}</strong> de{' '}
                  <strong>{totalItems}</strong> registros
                </div>
                <div className="inv-pagination-pages">
                  <button
                    className="inv-page-btn"
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  >
                    <ChevronLeft size={14}/>
                  </button>
                  {getPageNumbers().map((pNum, index) => {
                    if (pNum === '...') {
                      return <span key={`dots-${index}`} className="inv-pagination-dots">...</span>;
                    }
                    return (
                      <button
                        key={pNum}
                        className={`inv-page-btn ${page === pNum ? 'active' : ''}`}
                        onClick={() => setPage(pNum)}
                      >
                        {pNum}
                      </button>
                    );
                  })}
                  <button
                    className="inv-page-btn"
                    disabled={page === totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  >
                    <ChevronRight size={14}/>
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modals */}
      {matModal && (
        <ProductoFormModal
          item={matModal === 'new' ? null : matModal}
          existingItems={items}
          unidades={unidades}
          onClose={() => setMatModal(null)}
          onSave={handleSaveMaterial}
          onImportComplete={loadAll}
        />
      )}
      {movModal && (
        <MovimientoModal
          material={movModal.material || movModal}
          initialTipo={movModal.initialTipo || 'entrada'}
          onClose={() => setMovModal(null)}
          onSave={handleMovimiento}
        />
      )}
    </div>
  );
}
