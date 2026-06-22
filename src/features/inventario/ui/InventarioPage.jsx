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
} from '../application/inventarioService.js';
import { toast } from '../../../shared/ui/components/Toast.jsx';
import './InventarioPage.css';

// ── Helper ─────────────────────────────────────────────────────────────────
const fmt = (n) => `$${Number(n).toFixed(2)}`;
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

// ── Material Form Modal ────────────────────────────────────────────────────
function MaterialModal({ item, onClose, onSave, unidades = [] }) {
  const [form, setForm] = useState(() => {
    if (item) {
      return {
        ...item,
        codigo: item.codigo || '',
        marca: item.marca || '',
        modelo: item.modelo || '',
        serie: item.serie || '',
        categoria: item.categoria || 'Taller',
        estadoUso: item.estadoUso || 'BODEGA',
        aCargo: item.aCargo || '',
      };
    }
    const defaultUnit = unidades.find(u => u.nombre.toLowerCase() === 'unidades') || unidades[0];
    return {
      nombre: '', tipo: 'consumible',
      unidadMedidaId: defaultUnit?.id || '',
      unidadMedida: defaultUnit?.nombre || 'unidades',
      stockActual: 1, stockMinimo: 0, precioCosto: 0,
      codigo: '', marca: '', modelo: '', serie: '',
      categoria: 'Taller', estadoUso: 'BODEGA', aCargo: '',
    };
  });

  const set = (k, v) => setForm(f => {
    const updated = { ...f, [k]: v };
    // Si cambia a BODEGA, limpiar responsable
    if (k === 'estadoUso' && v === 'BODEGA') {
      updated.aCargo = '';
    }
    // Si cambia a consumible, limpiar campos de herramienta
    if (k === 'tipo' && v === 'consumible') {
      const defaultConsUnit = unidades.find(u => u.nombre.toLowerCase() === 'metros') || unidades[0];
      updated.unidadMedidaId = defaultConsUnit?.id || '';
      updated.unidadMedida = defaultConsUnit?.nombre || 'metros';
    } else if (k === 'tipo' && v === 'herramienta') {
      const defaultHerrUnit = unidades.find(u => u.nombre.toLowerCase() === 'unidades') || unidades[0];
      updated.unidadMedidaId = defaultHerrUnit?.id || '';
      updated.unidadMedida = defaultHerrUnit?.nombre || 'unidades';
    }
    return updated;
  });

  async function handleSubmit(e) {
    e.preventDefault();
    await onSave(form);
  }

  return (
    <div className="inv-overlay" onClick={onClose}>
      <div className="inv-modal" onClick={e => e.stopPropagation()}>
        <div className="inv-modal-header">
          <h3>{item ? 'Editar Material' : 'Nuevo Material'}</h3>
          <button className="inv-close" onClick={onClose}><X size={18}/></button>
        </div>
        <form onSubmit={handleSubmit} className="inv-modal-body">
          <label>Nombre del Material *
            <input required value={form.nombre} onChange={e => set('nombre', e.target.value)} />
          </label>
          <div className="inv-row">
            <label>Tipo *
              <select value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                <option value="consumible">Consumible</option>
                <option value="herramienta">Herramienta / Equipo</option>
              </select>
            </label>
            <label>Unidad de Medida *
              <select
                required
                value={form.unidadMedidaId || ''}
                onChange={e => {
                  const val = e.target.value;
                  const selectedUnit = unidades.find(u => u.id === val);
                  setForm(f => ({
                    ...f,
                    unidadMedidaId: val,
                    unidadMedida: selectedUnit ? selectedUnit.nombre : ''
                  }));
                }}
              >
                <option value="" disabled>Seleccionar Unidad</option>
                {unidades.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} {u.abreviacion ? `(${u.abreviacion})` : ''}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="inv-row">
            <label>Stock Actual
              <input type="number" min="0" value={form.stockActual} onChange={e => set('stockActual', +e.target.value)} />
            </label>
            <label>Stock Mínimo
              <input type="number" min="0" value={form.stockMinimo} onChange={e => set('stockMinimo', +e.target.value)} />
            </label>
            <label>Precio Costo ($)
              <input type="number" min="0" step="0.01" value={form.precioCosto} onChange={e => set('precioCosto', +e.target.value)} />
            </label>
          </div>

          {form.tipo === 'herramienta' && (
            <>
              <div className="inv-row">
                <label>Código Inventario / Barra
                  <input value={form.codigo} onChange={e => set('codigo', e.target.value)} placeholder="Ej: ADC001" />
                </label>
                <label>Categoría *
                  <select value={form.categoria} onChange={e => set('categoria', e.target.value)}>
                    <option value="Taller">Taller</option>
                    <option value="Oficina">Oficina</option>
                  </select>
                </label>
              </div>
              <div className="inv-row">
                <label>Marca
                  <input value={form.marca} onChange={e => set('marca', e.target.value)} placeholder="Ej: Milwaukee" />
                </label>
                <label>Modelo
                  <input value={form.modelo} onChange={e => set('modelo', e.target.value)} placeholder="Ej: GSB 18V" />
                </label>
              </div>
              <label>Serie / Características / Descripción
                <input value={form.serie} onChange={e => set('serie', e.target.value)} placeholder="Ej: 19.5 LED, 7 diagonal cutting plier..." />
              </label>
              <div className="inv-row">
                <label>Estado de Uso
                  <select value={form.estadoUso} onChange={e => set('estadoUso', e.target.value)}>
                    <option value="BODEGA">En Bodega / Disponible</option>
                    <option value="EN USO">En Uso / Asignado</option>
                    <option value="NO SIRVE">No Sirve / Dañado</option>
                    <option value="EN REPARACION">En Reparación</option>
                  </select>
                </label>
                <label>A Cargo De
                  <input value={form.aCargo} onChange={e => set('aCargo', e.target.value)} placeholder="Ej: Jimmy, Víctor, etc." disabled={form.estadoUso === 'BODEGA'} />
                </label>
              </div>
            </>
          )}

          <div className="inv-modal-footer">
            <button type="button" className="inv-btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="inv-btn-primary">
              {item ? 'Guardar Cambios' : 'Crear Material'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Movimiento Modal ───────────────────────────────────────────────────────
function MovimientoModal({ material, onClose, onSave }) {
  const [tipo, setTipo] = useState('salida');
  const [cantidad, setCantidad] = useState(1);
  const [motivo, setMotivo] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    await onSave({ tipo, cantidad, motivo });
  }

  return (
    <div className="inv-overlay" onClick={onClose}>
      <div className="inv-modal inv-modal-sm" onClick={e => e.stopPropagation()}>
        <div className="inv-modal-header">
          <h3>Registrar Movimiento</h3>
          <button className="inv-close" onClick={onClose}><X size={18}/></button>
        </div>
        <form onSubmit={handleSubmit} className="inv-modal-body">
          <div className="inv-material-info">
            <span className="inv-chip consumible">consumible</span>
            <strong>{material.nombre}</strong>
            <span className="inv-stock-badge">Stock: {material.stockActual} {material.unidadMedida?.nombre || material.unidadMedida?.abreviacion || 'unid'}</span>
          </div>
          <div className="inv-tipo-toggle">
            <button type="button" className={`inv-tipo-btn ${tipo==='entrada'?'entrada':''}`} onClick={()=>setTipo('entrada')}>
              <ArrowDown size={16}/> Entrada
            </button>
            <button type="button" className={`inv-tipo-btn ${tipo==='salida'?'salida':''}`} onClick={()=>setTipo('salida')}>
              <ArrowUp size={16}/> Salida
            </button>
          </div>
          <label>Cantidad ({material.unidadMedida?.nombre || material.unidadMedida?.abreviacion || 'unid'}) *
            <input type="number" min="0.01" step="0.01" required value={cantidad} onChange={e=>setCantidad(+e.target.value)} />
          </label>
          <label>Motivo / Descripción *
            <textarea required rows={3} value={motivo} onChange={e=>setMotivo(e.target.value)} placeholder="Ej: Uso en instalación cliente Banco del Pacífico" />
          </label>
          <div className="inv-modal-footer">
            <button type="button" className="inv-btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="inv-btn-primary">Registrar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Préstamo Modal ─────────────────────────────────────────────────────────
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
    <div className="inv-overlay" onClick={onClose}>
      <div className="inv-modal inv-modal-sm" onClick={e => e.stopPropagation()}>
        <div className="inv-modal-header">
          <h3>Registrar Salida de Herramienta</h3>
          <button className="inv-close" onClick={onClose}><X size={18}/></button>
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
            <button type="button" className="inv-btn-ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="inv-btn-primary">Registrar Salida</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export function InventarioPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = (user?.rol || 'visor').toUpperCase();
  const isImpresion = userRole === 'IMPRESIÓN' || userRole === 'IMPRESION';

  const [activeTab, setActiveTab] = useState('consumibles');
  const [activeCategory, setActiveCategory] = useState(isImpresion ? 'Impresión' : ''); // '' | 'Taller' | 'Oficina'
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

  const [matModal, setMatModal] = useState(null);    // null | 'new' | item
  const [movModal, setMovModal] = useState(null);    // null | item

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

  const loadMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const tipo = activeTab === 'consumibles' ? 'consumible' : 'herramienta';
      const res = await getMateriales({
        tipo,
        page,
        limit: 10,
        search: debouncedSearch,
        categoria: isImpresion ? 'Impresión' : activeCategory,
      });
      setItems(res.items || []);
      setTotalItems(res.total || 0);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, debouncedSearch, activeCategory, isImpresion]);

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
  async function handleSaveMaterial(form) {
    try {
      if (matModal && matModal !== 'new') {
        await updateMaterial(matModal.id, form);
        toast.success('Material actualizado correctamente.');
      } else {
        await createMaterial(form);
        toast.success('Material creado correctamente.');
      }
      setMatModal(null);
      loadAll();
    } catch (e) { toast.error(e.message); }
  }

  async function handleDeleteMaterial(item) {
    try {
      await deleteMaterial(item.id);
      toast.success('Material eliminado.');
      loadAll();
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
    if (item.stockActual === 0) return <span className="inv-badge empty">Agotado</span>;
    if (item.stockActual <= item.stockMinimo) return <span className="inv-badge low">Stock Bajo</span>;
    return <span className="inv-badge ok">En Stock</span>;
  };

  const totalPages = Math.ceil(totalItems / 10);

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
        <div>
          <h1 className="inv-page-title">Control de Inventario</h1>
          <p className="inv-page-sub">Consumibles, herramientas y préstamos de equipos</p>
        </div>
        <button className="inv-btn-refresh" onClick={loadAll} title="Actualizar">
          <RefreshCw size={16}/>
        </button>
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
              <span className="inv-kpi-label">Préstamos Activos</span>
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
        {!isImpresion && (
          <div className="inv-tab-bar">
            {TABS.map(t => (
              <button key={t.id} className={`inv-tab ${activeTab===t.id?'active':''}`}
                onClick={() => { setActiveTab(t.id); setSearch(''); }}>
                <t.Icon size={15}/> {t.label}
              </button>
            ))}
            <button className="inv-tab inv-tab--external" onClick={() => navigate('/inventario/prestamos')}>
              <ArrowRightLeft size={15}/> Préstamos
              <ExternalLink size={11}/>
            </button>
          </div>
        )}
        <div className="inv-toolbar-right" style={isImpresion ? { width: '100%', justifyContent: 'space-between' } : {}}>
          {!isImpresion && (
            <div className="inv-select-wrap">
              <Filter size={14} className="inv-select-ico"/>
              <select
                className="inv-select"
                value={activeCategory}
                onChange={e => setActiveCategory(e.target.value)}
              >
                <option value="">Todas las Categorías</option>
                <option value="Taller">Taller</option>
                <option value="Oficina">Oficina</option>
                <option value="Impresión">Impresión</option>
              </select>
            </div>
          )}
          <div className="inv-search-box" style={isImpresion ? { flex: 1, marginRight: 0 } : {}}>
            <Search size={15} className="inv-search-icon"/>
            <input className="inv-search-inp" placeholder="Buscar..." value={search}
              onChange={e=>setSearch(e.target.value)}/>
          </div>
          {!isImpresion && (
            <button className="inv-btn-primary" onClick={() => setMatModal('new')}>
              <Plus size={16}/> Nuevo Material
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
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr><td colSpan={8} className="inv-empty">Sin consumibles registrados.</td></tr>
                  )}
                  {items.map(item => (
                    <tr key={item.id} className={item.stockActual <= item.stockMinimo ? 'inv-row-warn' : ''}>
                      <td className="inv-td-name">{item.nombre}</td>
                      <td>{item.unidadMedida?.nombre || item.unidadMedida?.abreviacion || 'unid'}</td>
                      <td className="inv-td-stock">
                        <strong>{item.stockActual}</strong>
                      </td>
                      <td className="inv-td-min">{item.stockMinimo}</td>
                      <td>{stockBadge(item)}</td>
                      <td>{fmt(item.precioCosto)}</td>
                      <td style={{ fontWeight: 600, color: '#1e40af', fontFamily: 'DM Mono, monospace' }}>
                        {fmt(item.costoPromedioPonderado !== undefined ? item.costoPromedioPonderado : item.precioCosto)}
                      </td>
                      <td className="inv-td-actions">
                        <button className="inv-act-btn move" title="Movimiento" onClick={() => setMovModal(item)}>
                          <ArrowRightLeft size={14}/>
                        </button>
                        {!isImpresion && (
                          <>
                            <button className="inv-act-btn edit" title="Editar" onClick={() => setMatModal(item)}>
                              <Edit2 size={14}/>
                            </button>
                            <button className="inv-act-btn del" title="Eliminar" onClick={() => handleDeleteMaterial(item)}>
                              <Trash2 size={14}/>
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalPages > 1 && (
                <div className="inv-pagination">
                  <div className="inv-pagination-info">
                    Mostrando <strong>{Math.min(totalItems, (page - 1) * 10 + 1)}</strong> a{' '}
                    <strong>{Math.min(totalItems, page * 10)}</strong> de{' '}
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
                  {items.map(item => (
                    <tr key={item.id} className={item.stockActual <= item.stockMinimo ? 'inv-row-warn' : ''}>
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
                        <button className="inv-act-btn edit" title="Editar" onClick={() => setMatModal(item)}>
                          <Edit2 size={14}/>
                        </button>
                        <button className="inv-act-btn del" title="Eliminar" onClick={() => handleDeleteMaterial(item)}>
                          <Trash2 size={14}/>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalPages > 1 && (
                <div className="inv-pagination">
                  <div className="inv-pagination-info">
                    Mostrando <strong>{Math.min(totalItems, (page - 1) * 10 + 1)}</strong> a{' '}
                    <strong>{Math.min(totalItems, page * 10)}</strong> de{' '}
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
        <MaterialModal
          item={matModal === 'new' ? null : matModal}
          unidades={unidades}
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
