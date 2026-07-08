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

      <div className="inv-toolbar" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end', background: '#fff', padding: '1.25rem', borderRadius: '1rem', border: '1px solid #e2e8f0', marginBottom: '1.5rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
        <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: '300px' }}>
          {/* Sección Dropdown */}
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sección</label>
            <select 
              value={activeTab} 
              onChange={e => { setActiveTab(e.target.value); setSearch(''); }}
              style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none', backgroundColor: '#f8fafc', color: '#1e293b', fontWeight: 600, cursor: 'pointer' }}
            >
              {visibleTabs.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Clasificación Dropdown */}
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Clasificación</label>
            <select 
              value={subTipoFilter} 
              onChange={e => setSubTipoFilter(e.target.value)}
              style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.875rem', outline: 'none', backgroundColor: '#f8fafc', color: '#1e293b', fontWeight: 600, cursor: 'pointer' }}
            >
              <option value="all">Todos</option>
              <option value="consumible">Consumibles</option>
              <option value="herramienta">Herramientas</option>
            </select>
          </div>
        </div>

        <div style={{ flex: 2, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', minWidth: '300px' }}>
          <div className="inv-search-box" style={{ flex: 1, maxWidth: '400px', margin: 0 }}>
            <Search size={15} className="inv-search-icon"/>
            <input className="inv-search-inp" placeholder="Buscar material…" value={search}
              onChange={e=>setSearch(e.target.value)} aria-label="Buscar en inventario"
              style={{ padding: '0.6rem 0.75rem 0.6rem 2.25rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
            />
          </div>
          {isAdmin && (
            <button type="button" className="inv-btn-primary inv-btn-primary--compact" onClick={() => setMatModal('new')} style={{ padding: '0.6rem 1rem' }}>
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
          <div className="inv-table-card">
            <div className="inv-desktop-only">
              <table className="inv-table">
                <thead>
                  <tr>
                    <th>Producto / Equipo</th>
                    <th>Clasificación</th>
                    {activeTab === 'all' && <th>Sección</th>}
                    <th>Stock / Disp.</th>
                    <th>Mínimo</th>
                    <th>Estado</th>
                    <th>Costo Unit.</th>
                    <th>CPP</th>
                    <th>A Cargo</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr><td colSpan={activeTab === 'all' ? 10 : 9} className="inv-empty">Sin productos registrados.</td></tr>
                  )}
                  {items.map(item => {
                    const tracksStock = item.descargaStock !== undefined ? item.descargaStock : !(item.categoria?.toLowerCase() === 'taller' || item.categoria?.toLowerCase() === 'oficina');
                    const isWarn = tracksStock && item.stockActual <= item.stockMinimo;
                    const isTool = item.tipo === 'herramienta';

                    // Get human-readable classification
                    const getClassificationLabel = (sub) => {
                      if (sub === 'herramienta') return 'Herramienta';
                      if (sub === 'consumible_descargable') return 'Consumible (Descargable)';
                      if (sub === 'consumible_registro') return 'Consumible (Solo registro)';
                      if (sub === 'activo_fijo') return 'Activo Fijo';
                      return item.tipo === 'herramienta' ? 'Herramienta' : 'Consumible';
                    };

                    return (
                      <tr key={item.id} className={isWarn ? 'inv-row-warn' : ''}>
                        <td className="inv-td-name">
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              {isTool ? <Wrench size={13} style={{ color: '#64748b' }} /> : <Package size={13} style={{ color: '#64748b' }} />}
                              <strong style={{ color: '#0f172a' }}>{item.nombre}</strong>
                            </div>
                            {item.codigo && (
                              <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.15rem' }}>
                                Cod: {item.codigo}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ fontSize: '0.78rem', color: '#475569' }}>
                          {getClassificationLabel(item.subtipo)}
                        </td>
                        {activeTab === 'all' && (
                          <td>
                            <span className={`inv-cat-badge ${String(item.categoria || 'Taller').toLowerCase()}`}>
                              {item.categoria || 'Taller'}
                            </span>
                          </td>
                        )}
                        <td className="inv-td-stock">
                          <strong style={!tracksStock ? { color: '#64748b', fontWeight: 500 } : {}}>
                            {item.stockActual} {item.unidadMedida?.abreviacion || item.unidadMedida?.nombre || 'unid'}
                          </strong>
                        </td>
                        <td className="inv-td-min" style={!tracksStock ? { color: '#94a3b8' } : {}}>
                          {tracksStock ? item.stockMinimo : '—'}
                        </td>
                        <td>
                          {isTool ? (
                            usoBadge(item.estadoUso)
                          ) : (
                            stockBadge(item)
                          )}
                        </td>
                        <td>{fmt(item.precioCosto)}</td>
                        <td style={{ fontWeight: 600, color: '#1e40af' }}>
                          {fmt(item.costoPromedioPonderado !== undefined ? item.costoPromedioPonderado : item.precioCosto)}
                        </td>
                        <td style={{ fontSize: '0.8rem', fontWeight: 500, color: '#334155' }}>
                          {isTool && item.estadoUso === 'EN USO' ? (item.aCargoEmpleado?.nombre || item.aCargo || 'Asignado') : '—'}
                        </td>
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
                  <div className="inv-empty-mobile">Sin productos registrados.</div>
                )}
                {items.map(item => {
                  const tracksStock = item.descargaStock !== undefined ? item.descargaStock : !(item.categoria?.toLowerCase() === 'taller' || item.categoria?.toLowerCase() === 'oficina');
                  const isWarn = tracksStock && item.stockActual <= item.stockMinimo;
                  const isTool = item.tipo === 'herramienta';
                  const unidad = item.unidadMedida?.nombre || item.unidadMedida?.abreviacion || 'unid';
                  
                  return (
                    <div key={item.id} className={`inv-mobile-card ${isWarn ? 'warn' : ''}`}>
                      <div className="inv-card-header">
                        <div className="inv-card-title-group">
                          {item.codigo && <span className="inv-card-code">{item.codigo}</span>}
                          <span className="inv-card-title">{item.nombre}</span>
                        </div>
                        {isTool ? usoBadge(item.estadoUso) : stockBadge(item)}
                      </div>
                      <div className="inv-card-body">
                        <div className="inv-card-row">
                          <span className="inv-card-label">Clasificación</span>
                          <span className="inv-card-value">{item.subtipo || (isTool ? 'Herramienta' : 'Consumible')}</span>
                        </div>
                        {activeTab === 'all' && (
                          <div className="inv-card-row">
                            <span className="inv-card-label">Sección</span>
                            <span className={`inv-cat-badge ${String(item.categoria || 'Taller').toLowerCase()}`}>{item.categoria}</span>
                          </div>
                        )}
                        <div className="inv-card-row">
                          <span className="inv-card-label">Stock</span>
                          <span className="inv-card-value highlight" style={!tracksStock ? { color: '#64748b', fontWeight: 500 } : {}}>{item.stockActual} {unidad}</span>
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
                        {isTool && item.estadoUso === 'EN USO' && (
                          <div className="inv-card-row">
                            <span className="inv-card-label">A cargo</span>
                            <span className="inv-card-value">{item.aCargoEmpleado?.nombre || item.aCargo || 'Asignado'}</span>
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
