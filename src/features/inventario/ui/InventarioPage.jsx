// src/features/inventario/ui/InventarioPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, Wrench, ArrowRightLeft, Search, Plus, Edit2, Trash2,
  ArrowUp, ArrowDown, RefreshCw, AlertTriangle, CheckCircle2,
  Clock, X, Layers, User, ExternalLink, Filter, ChevronLeft, ChevronRight,
  Monitor, Printer
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

const TABS = [
  { id: 'all',         label: 'Todos',                    Icon: Layers },
  { id: 'herramienta', label: 'Herramientas',            Icon: Wrench },
  { id: 'consumible',  label: 'Productos y Materiales',  Icon: Package },
  { id: 'low_stock',   label: 'Stock Bajo',              Icon: AlertTriangle },
];

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
      <div className="inv-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) deferClose(onClose); }}>
        <div className="inv-modal inv-modal-sm" onMouseDown={e => e.stopPropagation()}>
        <div className="inv-modal-header">
          <h3>Ajustar stock</h3>
          <button type="button" className="inv-close" onClick={() => deferClose(onClose)}><X size={18}/></button>
        </div>
        <form onSubmit={handleSubmit} className="inv-modal-body">
          <div className="inv-material-info">
            <span className="inv-chip consumible">{material.tipo === 'herramienta' ? 'Herramienta' : 'Producto'}</span>
            <strong>{material.nombre}</strong>
            <span className="inv-stock-badge">Stock: {material.stockActual} {unidad}</span>
          </div>
          <div className="inv-tipo-toggle">
            <button type="button" className={`inv-tipo-btn ${tipo==='entrada'?'entrada':''}`} onClick={()=>setTipo('entrada')}>
              <ArrowDown size={16}/> Entrada
            </button>
            <button type="button" className={`inv-tipo-btn ${tipo==='salida'?'salida':''}`} onClick={()=>setTipo('salida')}>
              <ArrowUp size={16}/> Salida
            </button>
          </div>
          <label>Cantidad ({unidad}) *
            <input type="number" min="0.01" step="0.01" required placeholder="0" value={cantidad} onChange={e=>setCantidad(e.target.value)} />
          </label>
          <label>Motivo (opcional)
            <textarea rows={2} value={motivo} onChange={e=>setMotivo(e.target.value)} placeholder="Ej: Ajuste por conteo físico" />
          </label>
          <div className="inv-modal-footer">
            <button type="button" className="inv-btn-ghost" onClick={() => deferClose(onClose)} disabled={saving}>Cancelar</button>
            <button type="submit" className="inv-btn-primary" disabled={saving}>
              {saving ? 'Registrando…' : 'Registrar'}
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

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'herramienta' | 'consumible' | 'low_stock'
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
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page to 1 when filters or tabs change
  useEffect(() => {
    setPage(1);
  }, [activeTab, debouncedSearch]);

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
      let tipoQuery = undefined;
      if (activeTab === 'herramienta') tipoQuery = 'herramienta';
      else if (activeTab === 'consumible') tipoQuery = 'consumible';

      const res = await getMateriales(buildMaterialesQuery({
        tipo: tipoQuery,
        page,
        limit: ITEMS_PER_PAGE,
        search: debouncedSearch,
      }));
      
      let resItems = res.items || [];
      if (activeTab === 'low_stock') {
        resItems = resItems.filter(i => (i.stockActual || 0) <= (i.stockMinimo || 1));
      }
      setItems(resItems);
      setTotalItems(res.total || 0);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, debouncedSearch]);

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
          <p className="inv-page-sub" style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>Herramientas de trabajo y productos de fabricación</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', width: '100%', maxWidth: 'max-content' }}>
          {isAdmin && (
            <button type="button" className="inv-btn-primary" onClick={() => setMatModal('new')} style={{ padding: '0.6rem 1.25rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={16}/> Nuevo registro
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="inv-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="inv-kpi-card">
          <div className="inv-kpi-icon blue"><Layers size={20}/></div>
          <div>
            <span className="inv-kpi-value">{stats.totalMateriales}</span>
            <span className="inv-kpi-label">Total en Inventario</span>
          </div>
        </div>
        <div className="inv-kpi-card">
          <div className="inv-kpi-icon" style={{ background: '#e0f2fe', color: '#0284c7' }}><Wrench size={20}/></div>
          <div>
            <span className="inv-kpi-value">{items.filter(i => i.tipo === 'herramienta' || i.categoria === 'Taller').length || '—'}</span>
            <span className="inv-kpi-label">Herramientas</span>
          </div>
        </div>
        <div className="inv-kpi-card">
          <div className="inv-kpi-icon" style={{ background: '#dcfce7', color: '#16a34a' }}><Package size={20}/></div>
          <div>
            <span className="inv-kpi-value">{items.filter(i => i.tipo !== 'herramienta' && i.categoria !== 'Taller').length || '—'}</span>
            <span className="inv-kpi-label">Productos y Materiales</span>
          </div>
        </div>
        <div className="inv-kpi-card">
          <div className="inv-kpi-icon amber"><AlertTriangle size={20}/></div>
          <div>
            <span className="inv-kpi-value">{stats.totalLowStock}</span>
            <span className="inv-kpi-label">Stock Bajo</span>
          </div>
        </div>
      </div>

      {/* Simplified Filters & Search */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem', background: '#fff', padding: '0.85rem 1.25rem', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        {/* Tab Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
          {TABS.map(tab => {
            const Icon = tab.Icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setActiveTab(tab.id); setPage(1); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.9rem',
                  borderRadius: '9999px',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: isActive ? '1px solid #02188e' : '1px solid #e2e8f0',
                  background: isActive ? '#02188e' : '#f8fafc',
                  color: isActive ? '#fff' : '#475569',
                }}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.625rem', padding: '0.45rem 0.85rem', width: '100%', maxWidth: '320px' }}>
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
          unidades={unidades}
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
