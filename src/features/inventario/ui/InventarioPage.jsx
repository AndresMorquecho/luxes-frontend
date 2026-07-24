// src/features/inventario/ui/InventarioPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, Wrench, Search, Plus,
  ArrowUp, ArrowDown,
  X, Layers, ExternalLink, Monitor, Printer,
} from 'lucide-react';
import {
  getMateriales, createMaterial, updateMaterial, deleteMaterial,
  registrarMovimiento, getInventarioStats, getUnidadesMedida,
  getInventarioCategoriaPorRol, buildMaterialesQuery,
} from '../application/inventarioService.js';
import { toast } from '../../../shared/ui/components/Toast.jsx';
import { confirmDialog } from '../../../shared/ui/components/ConfirmModal.jsx';
import { ModalPortal, deferClose } from '../../../shared/ui/components/ModalPortal.jsx';
import {
  ComprasPageHeader,
  ComprasHeaderButton,
} from '../../compras/ui/components/ComprasPageHeader';
import './InventarioPage.css';
import { ProductoFormModal } from './ProductoFormModal.jsx';
import { InventoryTable } from './components/InventoryTable.jsx';

// ── Helper ─────────────────────────────────────────────────────────────────
const ITEMS_PER_PAGE = 25;

const TABS = [
  { id: 'all',        label: 'Todos',          Icon: Layers },
  { id: 'Oficina',    label: 'Inv. Oficina',   Icon: Monitor },
  { id: 'Taller',     label: 'Inv. Taller',    Icon: Wrench },
  { id: 'Impresión',  label: 'Inv. Impresión', Icon: Printer },
];

const inputClass =
  'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-gray-50 text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-colors';

// ── Movimiento rápido (desde fila de tabla) ────────────────────────────────
function MovimientoModal({ material, onClose, onSave }) {
  const [tipo, setTipo] = useState('entrada');
  const [cantidad, setCantidad] = useState('');
  const [motivo, setMotivo] = useState('');
  const [saving, setSaving] = useState(false);
  const unidad = material.unidadMedida?.abreviacion || material.unidadMedida?.nombre || 'unid';

  async function handleSubmit(e) {
    e.preventDefault();
    const qty = parseFloat(cantidad);
    if (!qty || qty <= 0) return;
    setSaving(true);
    try {
      await onSave({
        tipo,
        cantidad: qty,
        motivo: motivo.trim() || (tipo === 'entrada' ? 'Ajuste de stock' : 'Salida de stock'),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalPortal>
      <>
        <div
          className="fixed inset-0 z-[200] bg-slate-200/60 backdrop-blur-md"
          onClick={() => deferClose(onClose)}
        />
        <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden pointer-events-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0 gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 border border-blue-100 text-blue-600">
                  <Package size={18} strokeWidth={2.5} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-slate-800">Ajustar stock</h2>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{material.nombre}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => deferClose(onClose)}
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors shrink-0"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="overflow-y-auto px-5 py-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-2.5 py-1 font-medium">consumible</span>
                <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-600 px-2.5 py-1 font-medium">
                  Stock: {material.stockActual} {unidad}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                    tipo === 'entrada'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                  onClick={() => setTipo('entrada')}
                >
                  <ArrowDown size={16} /> Entrada
                </button>
                <button
                  type="button"
                  className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                    tipo === 'salida'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                  onClick={() => setTipo('salida')}
                >
                  <ArrowUp size={16} /> Salida
                </button>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Cantidad ({unidad}) *</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  placeholder="0"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Motivo (opcional)</label>
                <textarea
                  rows={2}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ej: Ajuste por conteo físico"
                  className={`${inputClass} resize-none`}
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => deferClose(onClose)}
                  disabled={saving}
                  className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-semibold text-sm text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-white rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-700 transition-opacity shadow-sm disabled:opacity-50"
                >
                  {saving ? 'Registrando…' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </>
    </ModalPortal>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export function InventarioPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = (user?.rol || 'visor').toUpperCase();
  const isImpresion = userRole === 'IMPRESIÓN' || userRole === 'IMPRESION';
  const lockedCategory = getInventarioCategoriaPorRol(user);
  const isAdmin = userRole === 'ADMIN' || userRole === 'ADMINISTRADOR';
  const showLoanKpis = !isImpresion;

  const [activeTab, setActiveTab] = useState(lockedCategory || 'all');
  const [subTipoFilter, setSubTipoFilter] = useState('all'); // 'all' | 'consumible' | 'herramienta'
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

  // ── Debounce Search ──────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page to 1 when filters or tabs change
  useEffect(() => {
    setPage(1);
  }, [activeTab, subTipoFilter, debouncedSearch]);

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

  const visibleTabs = lockedCategory
    ? TABS.filter(t => t.id === lockedCategory)
    : TABS;

  const loadMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const categoriaQuery = activeTab === 'all' ? undefined : activeTab;
      const tipoQuery = subTipoFilter === 'all' ? undefined : subTipoFilter;

      const res = await getMateriales(buildMaterialesQuery({
        tipo: tipoQuery,
        page,
        limit: ITEMS_PER_PAGE,
        search: debouncedSearch,
        ...(lockedCategory ? {} : { categoria: categoriaQuery }),
        // Vista de impresión: mostrar rollos individuales [R001],[R002]
        ...(isImpresion || categoriaQuery === 'Impresión' ? { incluirDerivados: true } : {}),
      }));
      setItems(res.items || []);
      setTotalItems(res.total || 0);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [activeTab, subTipoFilter, page, debouncedSearch, lockedCategory]);

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
        toast.success('Material actualizado correctamente.');
      } else {
        await createMaterial(form);
        toast.success('Material creado correctamente.');
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
      '¿Eliminar producto?',
      `¿Eliminar "${item.nombre}" del inventario? Esta acción no se puede deshacer.`,
      { confirmLabel: 'Eliminar', cancelLabel: 'Cancelar', type: 'danger' },
    );
    if (!confirmed) return;
    try {
      await deleteMaterial(item.id);
      deferClose(() => {
        toast.success('Material eliminado.');
        loadAll();
      });
    } catch (e) { toast.error(e.message); }
  }

  async function handleMovimiento(form) {
    try {
      await registrarMovimiento(movModal.id, form);
      toast.success(`Movimiento de ${form.tipo} registrado.`);
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
    <div className="space-y-3 sm:space-y-5 animate-slide-up inventario-page" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        .shadow-card { box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02); }
      `}</style>

      <ComprasPageHeader
        icon={Package}
        badge={isImpresion ? 'Impresión' : 'Materiales'}
        title="Inventario"
        subtitle={isImpresion ? 'Stock de materiales de impresión' : 'Consumibles, herramientas y control de stock'}
        action={
          isAdmin ? (
            <ComprasHeaderButton onClick={() => setMatModal('new')}>
              <Plus size={15} />
              Nuevo producto
            </ComprasHeaderButton>
          ) : undefined
        }
      />

      {/* KPI Cards — una fila en web; 2×2 solo en móvil */}
      <div className={`grid gap-2 sm:gap-3 ${showLoanKpis ? 'grid-cols-4 max-sm:grid-cols-2' : 'grid-cols-2'}`}>
        <div className="bg-white shadow-card rounded-xl border border-gray-100 border-t-2 border-t-blue-600 px-2.5 sm:px-4 py-3 sm:py-4 min-w-0">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Materiales</p>
          <p className="text-base sm:text-lg font-bold text-blue-600 mt-1 tabular-nums">
            {lockedCategory ? totalItems : stats.totalMateriales}
          </p>
        </div>
        <div className="bg-white shadow-card rounded-xl border border-gray-100 border-t-2 border-t-amber-500 px-2.5 sm:px-4 py-3 sm:py-4 min-w-0">
          <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Stock bajo</p>
          <p className="text-base sm:text-lg font-bold text-amber-600 mt-1 tabular-nums">{stats.totalLowStock}</p>
        </div>
        {showLoanKpis && (
          <>
            <button
              type="button"
              onClick={() => navigate('/inventario/prestamos')}
              className="bg-white shadow-card rounded-xl border border-gray-100 border-t-2 border-t-teal-500 px-2.5 sm:px-4 py-3 sm:py-4 text-left hover:bg-slate-50/80 transition-colors cursor-pointer min-w-0"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Préstamos activos</p>
                  <p className="text-base sm:text-lg font-bold text-teal-600 mt-1 tabular-nums">{stats.activeLoans}</p>
                </div>
                <ExternalLink size={14} className="text-slate-300 shrink-0 mt-0.5" />
              </div>
            </button>
            <button
              type="button"
              onClick={() => navigate('/inventario/prestamos')}
              className="bg-white shadow-card rounded-xl border border-gray-100 border-t-2 border-t-emerald-500 px-2.5 sm:px-4 py-3 sm:py-4 text-left hover:bg-slate-50/80 transition-colors cursor-pointer min-w-0"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">Devueltos</p>
                  <p className="text-base sm:text-lg font-bold text-emerald-600 mt-1 tabular-nums">{stats.returnedLoans}</p>
                </div>
                <ExternalLink size={14} className="text-slate-300 shrink-0 mt-0.5" />
              </div>
            </button>
          </>
        )}
      </div>

      {/* Clasificación + tabs de sección (misma fila, sin card) */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="max-w-xs w-full sm:w-auto">
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">Clasificación</label>
          <select
            value={subTipoFilter}
            onChange={(e) => setSubTipoFilter(e.target.value)}
            className={inputClass}
          >
            <option value="all">Todos</option>
            <option value="consumible">Consumibles</option>
            <option value="herramienta">Herramientas</option>
          </select>
        </div>
        {!lockedCategory && (
          <div className="flex items-center justify-start sm:justify-end gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto min-w-0">
            {visibleTabs.map((tab) => {
              const Icon = tab.Icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => { setActiveTab(tab.id); setSearch(''); }}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-blue-900 text-white shadow-md'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-card'
                  }`}
                >
                  <Icon size={15} className="shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Table Card */}
      <div className="bg-white shadow-card rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-gray-800">
              {isImpresion ? 'Materiales de impresión' : 'Lista de materiales'}
            </h2>
            <span className="text-xs font-medium text-gray-400">{totalItems} registros</span>
          </div>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o código..."
              aria-label="Buscar en inventario"
              className="pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 bg-gray-50 focus:bg-white w-full sm:w-80 sm:min-w-[280px] transition-colors"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-400 text-sm">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-200 border-t-blue-500" />
            <span>Cargando inventario…</span>
          </div>
        ) : (
          <>
            <InventoryTable
              items={items}
              activeTab={activeTab}
              isAdmin={isAdmin}
              onViewHistory={handleViewHistory}
              onEdit={setMatModal}
              onDelete={handleDeleteMaterial}
            />

            {totalItems > 0 && (
              <div className="px-4 sm:px-5 py-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="text-xs text-slate-400 text-center sm:text-left">
                  Página {page} de {Math.max(1, totalPages)} · {totalItems} materiales
                </p>
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      disabled={page === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    >
                      Anterior
                    </button>
                    {getPageNumbers().map((pNum, index) => {
                      if (pNum === '...') {
                        return <span key={`dots-${index}`} className="text-xs text-slate-400 px-1">...</span>;
                      }
                      return (
                        <button
                          key={pNum}
                          type="button"
                          onClick={() => setPage(pNum)}
                          className={`w-7 h-7 rounded-lg text-[11px] font-semibold transition-colors ${
                            page === pNum ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'
                          }`}
                        >
                          {pNum}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {matModal && (
        <ProductoFormModal
          item={matModal === 'new' ? null : matModal}
          unidades={unidades}
          lockedCategory={lockedCategory}
          onClose={() => setMatModal(null)}
          onSave={handleSaveMaterial}
          onImportComplete={loadAll}
        />
      )}
      {movModal && (
        <MovimientoModal
          material={movModal}
          onClose={() => setMovModal(null)}
          onSave={handleMovimiento}
        />
      )}
    </div>
  );
}
