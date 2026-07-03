// src/features/inventario/ui/InventarioPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, Wrench, ArrowRightLeft, Search, Plus, Edit2, Trash2,
  ArrowUp, ArrowDown, RefreshCw, AlertTriangle, CheckCircle2,
  Clock, X, Layers, User, ExternalLink, Filter, ChevronLeft, ChevronRight
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
  { id: 'consumibles',  label: 'Consumibles',  Icon: Layers },
  { id: 'herramientas', label: 'Herramientas', Icon: Wrench },
];

const usoBadge = (estado) => {
  const est = (estado || 'BODEGA').toUpperCase();
  if (est === 'EN USO') return <span className="inv-badge warning">En Uso</span>;
  if (est === 'NO SIRVE') return <span className="inv-badge danger">Dañado</span>;
  if (est === 'EN REPARACION') return <span className="inv-badge info">Reparación</span>;
  return <span className="inv-badge success">Bodega</span>;
};

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

  const [activeTab, setActiveTab] = useState('consumibles');
  const [activeCategory, setActiveCategory] = useState(lockedCategory || '');
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
  }, [activeTab, activeCategory, debouncedSearch]);

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

  const visibleTabs = (isImpresion || isTaller)
    ? TABS.filter(t => t.id !== 'herramientas')
    : TABS;

  const loadMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const tipo = activeTab === 'consumibles' ? 'consumible' : 'herramienta';
      const res = await getMateriales(buildMaterialesQuery({
        tipo,
        page,
        limit: ITEMS_PER_PAGE,
        search: debouncedSearch,
        ...(lockedCategory ? {} : { categoria: activeCategory || undefined }),
      }));
      setItems(res.items || []);
      setTotalItems(res.total || 0);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, debouncedSearch, activeCategory, lockedCategory]);

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

  // ── Stock badge ───────────────────────────────────────────────────────────
  const stockBadge = (item) => {
    // Use descargaStock to determine if stock tracking applies (falls back to old category logic for unmigrated data)
    const tracksStock = item.descargaStock !== undefined ? item.descargaStock : !(item.categoria?.toLowerCase() === 'taller' || item.categoria?.toLowerCase() === 'oficina');
    if (!tracksStock) return <span className="inv-badge success" style={{ background: '#f1f5f9', color: '#475569', borderColor: '#cbd5e1' }}>Solo registro</span>;
    if (item.stockActual === 0) return <span className="inv-badge empty">Agotado</span>;
    if (item.stockActual <= item.stockMinimo) return <span className="inv-badge low">Stock Bajo</span>;
    return <span className="inv-badge ok">En Stock</span>;
  };

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
      <div className="inv-page-header">
        <div className="inv-page-header-text">
          <div className="inv-page-title-row">
            <h1 className="inv-page-title">Control de Inventario</h1>
            <button type="button" className="inv-btn-refresh" onClick={loadAll} title="Actualizar">
              <RefreshCw size={16}/>
            </button>
          </div>
          <p className="inv-page-sub">Consumibles, herramientas y préstamos de equipos</p>
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
          <div className="inv-kpi-card inv-kpi-card--link" onClick={() => navigate('/inventario/prestamos')}>
            <div className="inv-kpi-icon teal"><ArrowRightLeft size={20}/></div>
            <div>
              <span className="inv-kpi-value">{stats.activeLoans}</span>
              <span className="inv-kpi-label">
                <span className="inv-kpi-label-long">Préstamos Activos</span>
                <span className="inv-kpi-label-short">Préstamos</span>
              </span>
            </div>
            <ExternalLink size={14} className="inv-kpi-link-icon"/>
          </div>
          <div className="inv-kpi-card inv-kpi-card--link" onClick={() => navigate('/inventario/prestamos')}>
            <div className="inv-kpi-icon green"><CheckCircle2 size={20}/></div>
            <div>
              <span className="inv-kpi-value">{stats.returnedLoans}</span>
              <span className="inv-kpi-label">Devueltos</span>
            </div>
            <ExternalLink size={14} className="inv-kpi-link-icon"/>
          </div>
        </div>
      )}

      <div className="inv-toolbar">
        <div className="inv-tab-bar" role="tablist" aria-label="Tipo de inventario">
          {visibleTabs.map(t => (
            <button key={t.id} type="button" role="tab" aria-selected={activeTab===t.id}
              className={`inv-tab ${activeTab===t.id?'active':''}`}
              onClick={() => { setActiveTab(t.id); setSearch(''); }}>
              <t.Icon size={15}/>
              <span>{t.label}</span>
            </button>
          ))}
          {!isImpresion && !isTaller && (
            <button type="button" className="inv-tab inv-tab--external" onClick={() => navigate('/inventario/prestamos')}>
              <ArrowRightLeft size={15}/>
              <span>Préstamos</span>
              <ExternalLink size={11} className="inv-tab-ext-icon"/>
            </button>
          )}
        </div>
        <div className="inv-toolbar-filters">
          {!isImpresion && !isTaller && (
            <div className="inv-select-wrap">
              <Filter size={14} className="inv-select-ico"/>
              <select
                className="inv-select"
                value={activeCategory}
                onChange={e => setActiveCategory(e.target.value)}
                aria-label="Filtrar por categoría"
              >
                <option value="">Todas las categorías</option>
                <option value="Taller">Taller</option>
                <option value="Oficina">Oficina</option>
                <option value="Impresión">Impresión</option>
              </select>
            </div>
          )}
          <div className="inv-search-box">
            <Search size={15} className="inv-search-icon"/>
            <input className="inv-search-inp" placeholder="Buscar material…" value={search}
              onChange={e=>setSearch(e.target.value)} aria-label="Buscar en inventario"/>
          </div>
          {isAdmin && (
            <button type="button" className="inv-btn-primary inv-btn-primary--compact" onClick={() => setMatModal('new')}>
              <Plus size={16}/> <span className="inv-btn-text">Nuevo producto</span>
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
          {/* ── Consumibles Tab ── */}
          {activeTab === 'consumibles' && (
            <div className="inv-table-card">
              <div className="inv-desktop-only">
                <table className="inv-table">
                  <thead>
                    <tr>
                      <th>Material</th>
                      <th>Unidad</th>
                      <th>Stock</th>
                      <th>Mínimo</th>
                      <th>Estado</th>
                      <th>Costo Unit.</th>
                      <th>CPP</th>
                      {!isTaller && <th>Últ. compra</th>}
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 && (
                      <tr><td colSpan={isTaller ? 8 : 9} className="inv-empty">Sin consumibles registrados.</td></tr>
                    )}
                    {items.map(item => {
                      const tracksStock = item.descargaStock !== undefined ? item.descargaStock : !(item.categoria?.toLowerCase() === 'taller' || item.categoria?.toLowerCase() === 'oficina');
                      const isWarn = tracksStock && item.stockActual <= item.stockMinimo;
                      return (
                        <tr key={item.id} className={isWarn ? 'inv-row-warn' : ''}>
                          <td className="inv-td-name">{item.nombre}</td>
                          <td>{item.unidadMedida?.nombre || item.unidadMedida?.abreviacion || 'unid'}</td>
                          <td className="inv-td-stock">
                            <strong style={!tracksStock ? { color: '#64748b', fontWeight: 500 } : {}}>{item.stockActual}</strong>
                          </td>
                          <td className="inv-td-min" style={!tracksStock ? { color: '#94a3b8' } : {}}>{tracksStock ? item.stockMinimo : '—'}</td>
                          <td>{stockBadge(item)}</td>
                          <td>{fmt(item.precioCosto)}</td>
                          <td style={{ fontWeight: 600, color: '#1e40af', fontFamily: 'DM Mono, monospace' }}>
                            {fmt(item.costoPromedioPonderado !== undefined ? item.costoPromedioPonderado : item.precioCosto)}
                          </td>
                          {!isTaller && (
                            <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                              {fmtCompra(item.ultimaFechaCompra)}
                            </td>
                          )}
                          <td className="inv-td-actions">
                            <button className="inv-act-btn history" title="Historial" onClick={() => navigate(`/inventario/historial/${item.codigo || item.id}`)} style={{ background: '#f8fafc', color: '#6366f1', borderColor: '#e0e7ff' }}>
                              <Clock size={14}/>
                            </button>
                            {isAdmin && (
                              <button className="inv-act-btn edit" title="Editar" onClick={() => setMatModal(item)}>
                                <Edit2 size={14}/>
                              </button>
                            )}
                            {isAdmin && (
                              <button className="inv-act-btn del" title="Eliminar" onClick={() => handleDeleteMaterial(item)}>
                                <Trash2 size={14}/>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="inv-mobile-only">
                <div className="inv-mobile-cards-grid">
                  {items.length === 0 && (
                    <div className="inv-empty-mobile">Sin consumibles registrados.</div>
                  )}
                  {items.map(item => {
                    const tracksStock = item.descargaStock !== undefined ? item.descargaStock : !(item.categoria?.toLowerCase() === 'taller' || item.categoria?.toLowerCase() === 'oficina');
                    const isWarn = tracksStock && item.stockActual <= item.stockMinimo;
                    const unidad = item.unidadMedida?.nombre || item.unidadMedida?.abreviacion || 'unid';
                    return (
                      <div key={item.id} className={`inv-mobile-card ${isWarn ? 'warn' : ''}`}>
                        <div className="inv-card-header">
                          <span className="inv-card-title">{item.nombre}</span>
                          {stockBadge(item)}
                        </div>
                        <div className="inv-card-body">
                          <div className="inv-card-row">
                            <span className="inv-card-label">Unidad</span>
                            <span className="inv-card-value">{unidad}</span>
                          </div>
                          <div className="inv-card-row">
                            <span className="inv-card-label">Stock</span>
                            <span className="inv-card-value highlight" style={!tracksStock ? { color: '#64748b', fontWeight: 500 } : {}}>{item.stockActual}</span>
                          </div>
                          <div className="inv-card-row">
                            <span className="inv-card-label">Mínimo</span>
                            <span className="inv-card-value" style={!tracksStock ? { color: '#94a3b8' } : {}}>{tracksStock ? item.stockMinimo : '—'}</span>
                          </div>
                          <div className="inv-card-row">
                            <span className="inv-card-label">Costo</span>
                            <span className="inv-card-value">{fmt(item.precioCosto)}</span>
                          </div>
                          <div className="inv-card-row">
                            <span className="inv-card-label">CPP</span>
                            <span className="inv-card-value cpp">{fmt(item.costoPromedioPonderado !== undefined ? item.costoPromedioPonderado : item.precioCosto)}</span>
                          </div>
                          {!isTaller && (
                            <div className="inv-card-row col-span-2">
                              <span className="inv-card-label">Última compra</span>
                              <span className="inv-card-value date">{fmtCompra(item.ultimaFechaCompra)}</span>
                            </div>
                          )}
                        </div>
                        <div className="inv-card-actions">
                          <button type="button" className="inv-act-btn history" title="Historial" onClick={() => navigate(`/inventario/historial/${item.codigo || item.id}`)}>
                            <Clock size={15}/>
                            <span>Historial</span>
                          </button>
                          {isAdmin && (
                            <button type="button" className="inv-act-btn edit" title="Editar" onClick={() => setMatModal(item)}>
                              <Edit2 size={15}/>
                              <span>Editar</span>
                            </button>
                          )}
                          {isAdmin && (
                            <button type="button" className="inv-act-btn del" title="Eliminar" onClick={() => handleDeleteMaterial(item)}>
                              <Trash2 size={15}/>
                              <span>Eliminar</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
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
          )}

          {/* ── Herramientas Tab ── */}
          {activeTab === 'herramientas' && (
            <div className="inv-table-card">
              <div className="inv-desktop-only">
                <table className="inv-table">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Herramienta / Equipo</th>
                      <th>Marca / Modelo</th>
                      <th>Serie / Características</th>
                      <th>Categoría</th>
                      <th>Estado Uso</th>
                      <th>Disponibles</th>
                      <th>A Cargo</th>
                      <th>Valor</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 && (
                      <tr><td colSpan={10} className="inv-empty">Sin herramientas registradas.</td></tr>
                    )}
                    {items.map(item => {
                      const isLogistico = item.categoria?.toLowerCase() === 'taller' || item.categoria?.toLowerCase() === 'oficina';
                      const isWarn = !isLogistico && item.stockActual <= item.stockMinimo;
                      return (
                        <tr key={item.id} className={isWarn ? 'inv-row-warn' : ''}>
                          <td style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.8rem', color: '#64748b' }}>
                            {item.codigo || '—'}
                          </td>
                          <td className="inv-td-name">
                            <Wrench size={14} className="inv-row-icon"/>
                            {item.nombre}
                          </td>
                          <td>
                            {item.marca || item.modelo ? `${item.marca || ''} ${item.modelo ? `/ ${item.modelo}` : ''}` : '—'}
                          </td>
                          <td style={{ fontSize: '0.8rem', color: '#475569', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.serie}>
                            {item.serie || '—'}
                          </td>
                          <td>
                            <span className={`inv-cat-badge ${String(item.categoria || 'Taller').toLowerCase()}`}>
                              {item.categoria || 'Taller'}
                            </span>
                          </td>
                          <td>
                            {usoBadge(item.estadoUso)}
                          </td>
                          <td className="inv-td-stock"><strong>{item.stockActual}</strong></td>
                          <td style={{ fontSize: '0.8rem', fontWeight: 500, color: '#334155' }}>
                            {item.estadoUso === 'EN USO' ? (item.aCargo || 'Asignado') : '—'}
                          </td>
                          <td>{fmt(item.precioCosto)}</td>
                          <td className="inv-td-actions">
                            <button className="inv-act-btn history" title="Historial" onClick={() => navigate(`/inventario/historial/${item.codigo || item.id}`)} style={{ background: '#f8fafc', color: '#6366f1', borderColor: '#e0e7ff' }}>
                              <Clock size={14}/>
                            </button>
                            {isAdmin && (
                              <button className="inv-act-btn edit" title="Editar" onClick={() => setMatModal(item)}>
                                <Edit2 size={14}/>
                              </button>
                            )}
                            {isAdmin && (
                              <button className="inv-act-btn del" title="Eliminar" onClick={() => handleDeleteMaterial(item)}>
                                <Trash2 size={14}/>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="inv-mobile-only">
                <div className="inv-mobile-cards-grid">
                  {items.length === 0 && (
                    <div className="inv-empty-mobile">Sin herramientas registradas.</div>
                  )}
                  {items.map(item => {
                    const isLogistico = item.categoria?.toLowerCase() === 'taller' || item.categoria?.toLowerCase() === 'oficina';
                    const isWarn = !isLogistico && item.stockActual <= item.stockMinimo;
                    return (
                      <div key={item.id} className={`inv-mobile-card ${isWarn ? 'warn' : ''}`}>
                        <div className="inv-card-header">
                          <div className="inv-card-title-group">
                            <span className="inv-card-code">{item.codigo || 'S/C'}</span>
                            <span className="inv-card-title">{item.nombre}</span>
                          </div>
                          {usoBadge(item.estadoUso)}
                        </div>
                        <div className="inv-card-body">
                          <div className="inv-card-row">
                            <span className="inv-card-label">Marca / modelo</span>
                            <span className="inv-card-value">{item.marca || item.modelo ? `${item.marca || ''} ${item.modelo ? `/ ${item.modelo}` : ''}` : '—'}</span>
                          </div>
                          <div className="inv-card-row">
                            <span className="inv-card-label">Disponibles</span>
                            <span className="inv-card-value highlight">{item.stockActual}</span>
                          </div>
                          <div className="inv-card-row col-span-2">
                            <span className="inv-card-label">Serie / descripción</span>
                            <span className="inv-card-value desc" title={item.serie}>{item.serie || '—'}</span>
                          </div>
                          <div className="inv-card-row">
                            <span className="inv-card-label">Categoría</span>
                            <span className={`inv-cat-badge ${String(item.categoria || 'Taller').toLowerCase()}`}>{item.categoria || 'Taller'}</span>
                          </div>
                          <div className="inv-card-row">
                            <span className="inv-card-label">A cargo</span>
                            <span className="inv-card-value">{item.estadoUso === 'EN USO' ? (item.aCargo || 'Asignado') : '—'}</span>
                          </div>
                          <div className="inv-card-row">
                            <span className="inv-card-label">Valor</span>
                            <span className="inv-card-value">{fmt(item.precioCosto)}</span>
                          </div>
                        </div>
                        <div className="inv-card-actions">
                          <button type="button" className="inv-act-btn history" title="Historial" onClick={() => navigate(`/inventario/historial/${item.codigo || item.id}`)}>
                            <Clock size={15}/>
                            <span>Historial</span>
                          </button>
                          {isAdmin && (
                            <button type="button" className="inv-act-btn edit" title="Editar" onClick={() => setMatModal(item)}>
                              <Edit2 size={15}/>
                              <span>Editar</span>
                            </button>
                          )}
                          {isAdmin && (
                            <button type="button" className="inv-act-btn del" title="Eliminar" onClick={() => handleDeleteMaterial(item)}>
                              <Trash2 size={15}/>
                              <span>Eliminar</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
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
          )}
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
