// src/features/inventario/ui/PrestamosPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowRightLeft, Search, Plus, Clock, CheckCircle2, User,
  Wrench, X,
} from 'lucide-react';
import {
  getMateriales, getPrestamos, registrarPrestamo, devolverPrestamo,
  buildMaterialesQuery,
} from '../application/inventarioService.js';
import { toast } from '../../../shared/ui/components/Toast.jsx';
import { ModalPortal, deferClose } from '../../../shared/ui/components/ModalPortal.jsx';
import './PrestamosPage.css';
import { unidadLabel } from './prestamosUtils.js';

// ── Helpers ─────────────────────────────────────────────────────────────────
const elapsed = (fechaSalida) => {
  const diff = Date.now() - new Date(fechaSalida).getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h >= 24) return `${Math.floor(h/24)}d ${h%24}h`;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};
const fmtDate = (d) => d ? new Date(d).toLocaleString('es-EC', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
}) : '—';
const fmtDateOnly = (d) => d ? new Date(d).toLocaleDateString('es-EC', {
  day: '2-digit', month: 'short', year: 'numeric',
}) : '—';
const isVencido = (p) => {
  if (p.estado !== 'prestado' || !p.fechaDevolucionEsperada) return false;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const limite = new Date(p.fechaDevolucionEsperada);
  limite.setHours(0, 0, 0, 0);
  return limite < hoy;
};

// ── Registro Modal ──────────────────────────────────────────────────────────
function NuevoPrestamoModal({ herramientas, onClose, onSave }) {
  const userId = JSON.parse(localStorage.getItem('user') || '{}').id ?? '';
  const [filterCategory, setFilterCategory] = useState('Taller'); // 'Taller' | 'Oficina' | 'Todos'

  // Filtrar solo herramientas que están disponibles (en bodega) y tienen stock
  const disponibles = React.useMemo(() => {
    return herramientas.filter(h => {
      const matchStockState = h.stockActual > 0 && h.estadoUso === 'BODEGA';
      if (!matchStockState) return false;
      if (filterCategory === 'Todos') return true;
      return h.categoria === filterCategory;
    });
  }, [herramientas, filterCategory]);

  const [materialId, setMaterialId] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [comentarios, setComentarios] = useState('');
  const [fechaDevolucionEsperada, setFechaDevolucionEsperada] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });

  // Sincronizar el material seleccionado por defecto cuando cambie la lista filtrada
  React.useEffect(() => {
    if (disponibles.length > 0) {
      if (!disponibles.some(d => d.id === materialId)) {
        setMaterialId(disponibles[0].id);
      }
    } else {
      setMaterialId('');
    }
  }, [disponibles, materialId]);

  const selected = disponibles.find(h => h.id === materialId);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!materialId) return;
    await onSave({ materialId, responsableId: userId, cantidad, comentarios, fechaDevolucionEsperada });
  }

  return (
    <ModalPortal>
      <div
        className="prest-overlay"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) deferClose(onClose);
        }}
      >
        <div className="prest-modal" onMouseDown={e => e.stopPropagation()}>
          <div className="prest-modal-header">
            <div className="prest-modal-header-left">
              <div className="prest-modal-header-icon">
                <ArrowRightLeft size={18} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <h3>Registrar Salida</h3>
                <p>El stock se reducirá y el ítem pasará a estado &quot;En Uso&quot;.</p>
              </div>
            </div>
            <button
              type="button"
              className="prest-modal-close"
              onClick={() => deferClose(onClose)}
              title="Cerrar"
            >
              <X size={14} />
            </button>
          </div>

          <div className="prest-modal-body">
            {/* Toggles de categoría para filtrar */}
            <div className="prest-label" style={{ marginBottom: '0.25rem' }}>Origen / Categoría</div>
            <div className="prest-modal-toggle-group">
              <button
                type="button"
                className={`prest-modal-toggle-btn ${filterCategory === 'Taller' ? 'active' : ''}`}
                onClick={() => setFilterCategory('Taller')}
              >
                Taller (Herramientas)
              </button>
              <button
                type="button"
                className={`prest-modal-toggle-btn ${filterCategory === 'Oficina' ? 'active' : ''}`}
                onClick={() => setFilterCategory('Oficina')}
              >
                Oficina (Equipos)
              </button>
              <button
                type="button"
                className={`prest-modal-toggle-btn ${filterCategory === 'Todos' ? 'active' : ''}`}
                onClick={() => setFilterCategory('Todos')}
              >
                Todos
              </button>
            </div>

            {disponibles.length === 0 ? (
              <div style={{ padding: '1.5rem 0', textAlign: 'center', color: '#64748b' }}>
                <Wrench size={24} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                <p style={{ fontSize: '0.85rem', margin: 0 }}>
                  No hay herramientas o equipos en <strong>{filterCategory === 'Todos' ? 'ninguna categoría' : filterCategory}</strong> disponibles en bodega.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <label className="prest-label">Seleccionar Ítem *
                  <select required value={materialId} onChange={e => setMaterialId(e.target.value)}>
                    {disponibles.map(h => (
                      <option key={h.id} value={h.id}>
                        {h.nombre} {h.codigo ? `(${h.codigo})` : ''} {filterCategory === 'Todos' ? `[${h.categoria}]` : ''} (disp. {h.stockActual})
                      </option>
                    ))}
                  </select>
                </label>

                {selected && (
                  <div className="prest-stock-pill">
                    <Wrench size={13}/>
                    <span>
                      Disponibles: <strong>{selected.stockActual}</strong> {selected.unidadMedida?.abreviacion || selected.unidadMedida?.nombre || 'unid'} |
                      Categoría: <strong>{selected.categoria || 'Taller'}</strong>
                    </span>
                  </div>
                )}

                <label className="prest-label">Cantidad *
                  <input type="number" min="1" max={selected?.stockActual || 99} required
                    value={cantidad} onChange={e => setCantidad(+e.target.value)} />
                </label>

                <label className="prest-label">Fecha de devolución esperada *
                  <input
                    type="date"
                    required
                    value={fechaDevolucionEsperada}
                    onChange={e => setFechaDevolucionEsperada(e.target.value)}
                  />
                </label>

                <label className="prest-label">Motivo / Descripción *
                  <textarea required rows={3} value={comentarios}
                    onChange={e => setComentarios(e.target.value)}
                    placeholder="Ej: Instalación letras corporativas Mall del Sol" />
                </label>

                <div className="prest-modal-footer">
                  <button type="button" className="prest-btn-ghost" onClick={() => deferClose(onClose)}>Cancelar</button>
                  <button type="submit" className="prest-btn-primary">
                    <ArrowRightLeft size={15}/> Registrar Salida
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export function PrestamosPage() {
  const [prestamos, setPrestamos]       = useState([]);
  const [herramientas, setHerramientas] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showModal, setShowModal]       = useState(false);

  // Filters
  const [searchTool, setSearchTool]     = useState('');   // buscar por herramienta
  const [filterPersona, setFilterPersona] = useState(''); // filtrar por nombre de responsable
  const [filterEstado, setFilterEstado]   = useState(''); // 'prestado' | 'devuelto' | ''

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, h] = await Promise.all([
        getPrestamos(),
        getMateriales(buildMaterialesQuery({ tipo: 'herramienta' })),
      ]);
      setPrestamos(p);
      setHerramientas(Array.isArray(h) ? h : h.items || []);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Derived filters ────────────────────────────────────────────────────────
  const personas = useMemo(() => {
    const names = new Set(prestamos.map(p => p.responsable?.nombre).filter(Boolean));
    return [...names].sort();
  }, [prestamos]);

  const filtered = useMemo(() => {
    return prestamos.filter(p => {
      const matchTool = !searchTool ||
        (p.material?.nombre || '').toLowerCase().includes(searchTool.toLowerCase());
      const matchPerson = !filterPersona ||
        (p.responsable?.nombre || '') === filterPersona;
      const matchEstado = !filterEstado || p.estado === filterEstado;
      return matchTool && matchPerson && matchEstado;
    });
  }, [prestamos, searchTool, filterPersona, filterEstado]);

  const activos   = prestamos.filter(p => p.estado === 'prestado').length;
  const devueltos = prestamos.filter(p => p.estado === 'devuelto').length;

  // ── Actions ────────────────────────────────────────────────────────────────
  async function handleNuevo(form) {
    try {
      await registrarPrestamo(form);
      toast.success('Salida de herramienta registrada.');
      setShowModal(false);
      load();
    } catch (e) { toast.error(e.message); }
  }

  async function handleDevolver(prestamo) {
    try {
      await devolverPrestamo(prestamo.id);
      toast.success(`${prestamo.material?.nombre} devuelta correctamente.`);
      load();
    } catch (e) { toast.error(e.message); }
  }

  const clearFilters = () => {
    setSearchTool('');
    setFilterPersona('');
    setFilterEstado('');
  };
  const hasFilters = searchTool || filterPersona || filterEstado;

  return (
    <div
      className="space-y-3 sm:space-y-5 animate-slide-up prest-page"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <style>{`
        .prest-page {
          font-family: 'Inter', system-ui, sans-serif !important;
          padding: 0 !important;
          width: 100%;
        }
        .shadow-card { box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02); }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-5 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 bg-blue-50 border-blue-100 text-blue-600">
              <ArrowRightLeft size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800">Préstamos</h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-blue-100 text-blue-700">
                  Herramientas
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Registro de salidas, responsables y devoluciones
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-white rounded-xl font-semibold text-sm whitespace-nowrap transition-opacity hover:opacity-90 shadow-sm w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
            >
              <Plus size={16} />
              Nueva Salida
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI Strip ── */}
      <div className="prest-kpi-strip">
        <div className="prest-kpi prest-kpi--amber">
          <Clock size={18}/>
          <div>
            <span className="prest-kpi-num">{activos}</span>
            <span className="prest-kpi-lbl">Activos</span>
          </div>
        </div>
        <div className="prest-kpi prest-kpi--green">
          <CheckCircle2 size={18}/>
          <div>
            <span className="prest-kpi-num">{devueltos}</span>
            <span className="prest-kpi-lbl">Devueltos</span>
          </div>
        </div>
        <div className="prest-kpi prest-kpi--blue">
          <ArrowRightLeft size={18}/>
          <div>
            <span className="prest-kpi-num">{prestamos.length}</span>
            <span className="prest-kpi-lbl">Total Registros</span>
          </div>
        </div>
        <div className="prest-kpi prest-kpi--slate">
          <Wrench size={18}/>
          <div>
            <span className="prest-kpi-num">{herramientas.length}</span>
            <span className="prest-kpi-lbl">Herramientas</span>
          </div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="prest-filter-bar">
        {/* Buscador de herramienta */}
        <div className="prest-search-wrap">
          <Search size={14} className="prest-search-ico"/>
          <input
            className="prest-search-inp"
            placeholder="Buscar herramienta..."
            value={searchTool}
            onChange={e => setSearchTool(e.target.value)}
          />
          {searchTool && (
            <button className="prest-clear-x" onClick={() => setSearchTool('')}><X size={12}/></button>
          )}
        </div>

        {/* Filtro por persona */}
        <div className="prest-select-wrap">
          <User size={14} className="prest-select-ico"/>
          <select
            className="prest-select"
            value={filterPersona}
            onChange={e => setFilterPersona(e.target.value)}
          >
            <option value="">Todas las personas</option>
            {personas.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Filtro por estado */}
        <div className="prest-estado-group">
          {[
            { val: '',          label: 'Todos'    },
            { val: 'prestado',  label: 'Activos'  },
            { val: 'devuelto',  label: 'Devueltos'},
          ].map(opt => (
            <button
              key={opt.val}
              className={`prest-estado-btn ${filterEstado === opt.val ? 'active' : ''}`}
              onClick={() => setFilterEstado(opt.val)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {hasFilters && (
          <button className="prest-clear-all" onClick={clearFilters}>
            <X size={13}/> Limpiar
          </button>
        )}

        <span className="prest-count">{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="prest-loading">
          <div className="prest-spinner"/>
          <span>Cargando préstamos…</span>
        </div>
      ) : (
        <div className="prest-table-card">
          <table className="prest-table">
            <thead>
              <tr>
                <th>Herramienta</th>
                <th>Responsable</th>
                <th>Cantidad</th>
                <th>Fecha Salida</th>
                <th>Devolución esperada</th>
                <th>Tiempo / Retorno</th>
                <th>Estado</th>
                <th>Motivo</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="prest-empty">
                    {hasFilters
                      ? 'No hay préstamos que coincidan con los filtros.'
                      : 'No hay préstamos registrados.'}
                  </td>
                </tr>
              ) : filtered.map(p => (
                <tr key={p.id} className={`prest-tr ${p.estado}${isVencido(p) ? ' prest-tr--vencido' : ''}`}>
                  {/* Herramienta */}
                  <td className="prest-td-tool">
                    <div className="prest-tool-cell">
                      <div className="prest-tool-icon"><Wrench size={13}/></div>
                      <div>
                        <span style={{ fontWeight: 600, color: '#0f172a' }}>{p.material?.nombre || '—'}</span>
                        {p.material?.codigo && (
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '0.75rem', color: '#64748b', marginTop: '0.1rem' }}>
                            {p.material?.codigo}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  {/* Responsable */}
                  <td className="prest-td-person">
                    <div className="prest-person-cell prest-person-cell--plain">
                      <div className="prest-person-name">{p.responsable?.nombre || 'Desconocido'}</div>
                      <div className="prest-person-user">@{p.responsable?.username || '—'}</div>
                    </div>
                  </td>
                  {/* Cantidad */}
                  <td className="prest-td-qty">
                    {p.cantidad} <span className="prest-unit">{unidadLabel(p.material?.unidadMedida)}</span>
                  </td>
                  {/* Fecha salida */}
                  <td className="prest-td-date">{fmtDate(p.fechaSalida)}</td>
                  <td className={`prest-td-date ${isVencido(p) ? 'prest-td-vencido' : ''}`}>
                    {p.fechaDevolucionEsperada ? (
                      <>
                        <strong>{fmtDateOnly(p.fechaDevolucionEsperada)}</strong>
                        {isVencido(p) && (
                          <span className="prest-vencido-badge">Vencido</span>
                        )}
                      </>
                    ) : '—'}
                  </td>
                  {/* Tiempo / retorno */}
                  <td>
                    {p.estado === 'prestado' ? (
                      <span className="prest-elapsed">
                        <Clock size={12}/> {elapsed(p.fechaSalida)} fuera
                      </span>
                    ) : (
                      <span className="prest-td-date">{fmtDate(p.fechaRetorno)}</span>
                    )}
                  </td>
                  {/* Estado */}
                  <td>
                    <span className={`prest-badge prest-badge--${p.estado}`}>
                      {p.estado === 'prestado' ? <Clock size={11}/> : <CheckCircle2 size={11}/>}
                      {p.estado === 'prestado' ? 'Activo' : 'Devuelto'}
                    </span>
                  </td>
                  {/* Motivo */}
                  <td className="prest-td-comment">{p.comentarios || '—'}</td>
                  {/* Acción */}
                  <td>
                    {p.estado === 'prestado' ? (
                      <button className="prest-btn-devolver" onClick={() => handleDevolver(p)}>
                        Devolver
                      </button>
                    ) : (
                      <span className="prest-returned-ok">✓ OK</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <NuevoPrestamoModal
          herramientas={herramientas}
          onClose={() => setShowModal(false)}
          onSave={handleNuevo}
        />
      )}
    </div>
  );
}
