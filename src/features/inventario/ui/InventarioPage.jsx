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
  { id: 'all',        label: 'Todos',          Icon: Layers },
  { id: 'Oficina',    label: 'Inv. Oficina',   Icon: Monitor },
  { id: 'Taller',     label: 'Inv. Taller',    Icon: Wrench },
  { id: 'Impresión',  label: 'Inv. Impresión', Icon: Printer },
];

// MaterialModal removed — replaced by ProductoFormModal

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
            <span className="inv-chip consumible">consumible</span>
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
function PrestamoModal({ herramientas, onClose, onSave }) {
  const userId = JSON.parse(localStorage.getItem('user') || '{}').id;
  const [materialId, setMaterialId] = useState(herramientas[0]?.id || '');
  const [responsableId, setResponsableId] = useState(userId || '');
  const [cantidad, setCantidad] = useState(1);
  const [comentarios, setComentarios] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    await onSave({ materialId, responsableId, cantidad, comentarios });
  }

  return (
    <ModalPortal>
      <div className="inv-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) deferClose(onClose); }}>
        <div className="inv-modal inv-modal-sm" onMouseDown={e => e.stopPropagation()}>
        <div className="inv-modal-header">
          <h3>Registrar Salida de Herramienta</h3>
          <button type="button" className="inv-close" onClick={() => deferClose(onClose)}><X size={18}/></button>
        </div>
        <form onSubmit={handleSubmit} className="inv-modal-body">
          <label>Herramienta *
            <select required value={materialId} onChange={e=>setMaterialId(e.target.value)}>
              {herramientas.map(h => (
                <option key={h.id} value={h.id}>{h.nombre} (disp. {h.stockActual})</option>
              ))}
            </select>
          </label>
          <label>Cantidad *
            <input type="number" min="1" required value={cantidad} onChange={e=>setCantidad(+e.target.value)} />
          </label>
          <label>Motivo / Instalación *
            <textarea required rows={3} value={comentarios} onChange={e=>setComentarios(e.target.value)} placeholder="Ej: Instalación letras en Mall del Sol" />
          </label>
          <div className="inv-modal-footer">
            <button type="button" className="inv-btn-ghost" onClick={() => deferClose(onClose)}>Cancelar</button>
            <button type="submit" className="inv-btn-primary">Registrar Salida</button>
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
  const isImpresion = userRole === 'IMPRESIÓN' || userRole === 'IMPRESION';
  const isTaller = userRole === 'TALLER';
  const lockedCategory = getInventarioCategoriaPorRol(user);
  const isAdmin = userRole === 'ADMIN' || userRole === 'ADMINISTRADOR';

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
          <p className="inv-page-sub" style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>Consumibles, herramientas y préstamos de equipos</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', width: '100%', maxWidth: 'max-content' }}>
          {isAdmin && (
            <button type="button" className="inv-btn-primary" onClick={() => setMatModal('new')} style={{ padding: '0.6rem 1.25rem', whiteSpace: 'nowrap' }}>
              <Plus size={16}/> Nuevo producto
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      {!isImpresion && (
        <div className="inv-kpi-grid">
          <div className="inv-kpi-card">
            <div className="inv-kpi-icon blue"><Package size={20}/></div>
            <div>
              <span className="inv-kpi-value">{stats.totalMateriales}</span>
              <span className="inv-kpi-label">Materiales</span>
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
      )}

      {/* Filtros Avanzados */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '1rem', marginBottom: '1.5rem', position: 'relative', zIndex: 30, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid rgba(241, 245, 249, 0.8)', background: 'rgba(248, 250, 252, 0.6)', display: 'flex', alignItems: 'center', gap: '0.5rem', borderTopLeftRadius: '1rem', borderTopRightRadius: '1rem' }}>
          <Filter size={16} color="#94a3b8" />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filtros Avanzados</span>
        </div>
        <div style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {/* Sección Dropdown */}
          <div>
            <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginLeft: '0.25rem' }}>Sección</label>
            <select 
              value={activeTab} 
              onChange={e => { setActiveTab(e.target.value); setSearch(''); }}
              style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', backgroundColor: '#f8fafc', color: '#334155', fontWeight: 500, cursor: 'pointer', transition: 'background 0.2s' }}
              onMouseOver={e => e.target.style.backgroundColor = '#fff'}
              onMouseOut={e => e.target.style.backgroundColor = '#f8fafc'}
            >
              {visibleTabs.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Clasificación Dropdown */}
          <div>
            <label style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginLeft: '0.25rem' }}>Clasificación</label>
            <select 
              value={subTipoFilter} 
              onChange={e => setSubTipoFilter(e.target.value)}
              style={{ width: '100%', padding: '0.625rem 0.875rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontSize: '0.875rem', outline: 'none', backgroundColor: '#f8fafc', color: '#334155', fontWeight: 500, cursor: 'pointer', transition: 'background 0.2s' }}
              onMouseOver={e => e.target.style.backgroundColor = '#fff'}
              onMouseOut={e => e.target.style.backgroundColor = '#f8fafc'}
            >
              <option value="all">Todos</option>
              <option value="consumible">Consumibles</option>
              <option value="herramienta">Herramientas</option>
            </select>
          </div>
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
            {/* Buscador dentro del contenedor de la tabla */}
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid rgba(241, 245, 249, 0.8)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <svg style={{ width: '1rem', height: '1rem', color: '#94a3b8', flexShrink: 0 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input 
                placeholder="Buscar por nombre o código…" 
                value={search}
                onChange={e=>setSearch(e.target.value)} 
                aria-label="Buscar en inventario"
                style={{ border: 'none', background: 'transparent', padding: 0, outline: 'none', fontSize: '0.875rem', fontWeight: 500, color: '#334155', width: '100%', maxWidth: '320px' }}
              />
            </div>

            <InventoryTable 
              items={items}
              activeTab={activeTab}
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
                  <strong>{totalItems}</strong> materiales
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
