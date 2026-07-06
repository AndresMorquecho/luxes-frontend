import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Wrench, Clock, User, RefreshCw, CheckCircle2, Search, X,
} from 'lucide-react';
import { getPrestamos, devolverPrestamo, sincronizarDevolucionesInstalacion } from '../application/inventarioService.js';
import { getEmpleados } from '../../empleados/application/empleadosService.js';
import { DateRangePicker } from '../../../shared/ui/components/DateRangePicker.jsx';
import { toast } from '../../../shared/ui/components/Toast.jsx';
import { ModalPortal, deferClose } from '../../../shared/ui/components/ModalPortal.jsx';
import './PrestamosPage.css';
import { unidadLabel } from './prestamosUtils.js';

const elapsed = (fechaSalida) => {
  const diff = Date.now() - new Date(fechaSalida).getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const fmtDate = (d) => (d
  ? new Date(d).toLocaleString('es-EC', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  : '—');

function getEncargadoDisplay(prestamo) {
  const match = (prestamo.comentarios || '').match(/Encargado:\s*([^|]+)/i);
  if (match?.[1]) return match[1].trim();
  return prestamo.responsable?.nombre || 'Desconocido';
}

function DevolucionModal({ prestamo, onClose, onConfirm }) {
  const [observacion, setObservacion] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onConfirm(observacion.trim());
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalPortal>
      <div
        className="prest-overlay"
        onMouseDown={(e) => { if (e.target === e.currentTarget) deferClose(onClose); }}
      >
        <div className="prest-modal" onMouseDown={(e) => e.stopPropagation()}>
          <div className="prest-modal-header">
            <div>
              <h3>Devolución realizada</h3>
              <p>
                <strong>{prestamo.material?.nombre}</strong>
                {' — a cargo de '}
                {prestamo.responsable?.nombre || '—'}
              </p>
            </div>
            <button type="button" className="prest-modal-close" onClick={() => deferClose(onClose)}>
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="prest-modal-body">
              <label className="prest-label">
                Observación (opcional)
                <textarea
                  rows={3}
                  placeholder="Ej: Herramienta en buen estado, falta accesorio…"
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                />
              </label>
              <div className="prest-modal-footer">
                <button
                  type="button"
                  className="prest-btn-ghost"
                  onClick={() => deferClose(onClose)}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button type="submit" className="prest-btn-primary" disabled={saving}>
                  {saving ? 'Registrando…' : 'Confirmar devolución'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}

export function DevolucionesPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [searchTool, setSearchTool] = useState('');
  const [filterPersona, setFilterPersona] = useState('');
  const [personas, setPersonas] = useState([]);
  const [filterEstado, setFilterEstado] = useState('prestado');
  const [selected, setSelected] = useState(null);
  const [fechas, setFechas] = useState({ start: '', end: '' });
  const [stats, setStats] = useState({ pendientes: 0, devueltos: 0 });

  const LIMIT = 20;

  const loadStats = useCallback(async () => {
    try {
      const [resPend, resHist] = await Promise.all([
        getPrestamos({ estado: 'prestado', page: 1, limit: 1 }),
        getPrestamos({ estado: 'devuelto', page: 1, limit: 1 })
      ]);
      setStats({
        pendientes: resPend.total ?? (Array.isArray(resPend) ? resPend.length : 0),
        devueltos: resHist.total ?? (Array.isArray(resHist) ? resHist.length : 0)
      });
    } catch (e) {
      console.error('Error fetching loan counts:', e);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPrestamos({
        estado: filterEstado,
        page,
        limit: LIMIT,
        fechaInicio: fechas.start || undefined,
        fechaFin: fechas.end || undefined,
        searchTool: searchTool || undefined,
        filterPersona: filterPersona || undefined
      });
      
      if (data && typeof data === 'object' && 'items' in data) {
        setItems(data.items || []);
        setTotal(data.total || 0);
      } else {
        setItems(data || []);
        setTotal((data || []).length);
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [filterEstado, page, fechas, searchTool, filterPersona]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await sincronizarDevolucionesInstalacion();
      } catch (err) {
        console.error('Sync devoluciones instalación:', err);
      }
      if (!cancelled) {
        loadData();
        loadStats();
      }
    })();
    return () => { cancelled = true; };
    // Solo al montar: sincroniza instalaciones ya cerradas y recarga la lista
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchPersonas = async () => {
      try {
        const emps = await getEmpleados();
        if (Array.isArray(emps)) {
          const names = emps.map(e => e.nombre).filter(Boolean);
          setPersonas([...new Set(names)].sort());
        }
      } catch (e) {
        console.error('Error loading employees for filter:', e);
      }
    };
    fetchPersonas();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTool, filterPersona, filterEstado, fechas]);

  const filtered = items;

  const handleDevolucion = async (observacionDevolucion) => {
    if (!selected) return;
    try {
      await devolverPrestamo(selected.id, {
        observacionDevolucion: observacionDevolucion || undefined,
      });
      toast.success(`"${selected.material?.nombre}" devuelta correctamente.`);
      setSelected(null);
      loadData();
      loadStats();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const clearFilters = () => {
    setSearchTool('');
    setFilterPersona('');
    setFechas({ start: '', end: '' });
  };
  const hasFilters = searchTool || filterPersona || fechas.start || fechas.end;

  const totalPages = Math.ceil(total / LIMIT) || 1;

  const renderPageButtons = () => {
    const buttons = [];
    const maxButtons = 5;
    let startPage = Math.max(1, page - 2);
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    
    if (endPage - startPage + 1 < maxButtons) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          type="button"
          className={`prest-page-btn ${page === i ? 'active-page' : ''}`}
          onClick={() => setPage(i)}
        >
          {i}
        </button>
      );
    }
    return buttons;
  };

  const load = () => {
    loadData();
    loadStats();
  };

  return (
    <div className="prest-page">
      <div className="prest-header">
        <div className="prest-header-main">
          <div>
            <h1 className="prest-title">Devoluciones</h1>
            <p className="prest-sub">Herramientas y equipos que salieron con un encargado</p>
          </div>
          <div className="prest-header-actions">
            <button type="button" className="prest-btn-ghost" onClick={load} title="Actualizar">
              <RefreshCw size={15} />
            </button>
          </div>
        </div>
      </div>

      <div className="prest-kpi-strip">
        <div className="prest-kpi prest-kpi--amber">
          <Clock size={18} />
          <div>
            <span className="prest-kpi-num">{stats.pendientes}</span>
            <span className="prest-kpi-lbl">Por devolver</span>
          </div>
        </div>
        <div className="prest-kpi prest-kpi--green">
          <CheckCircle2 size={18} />
          <div>
            <span className="prest-kpi-num">{stats.devueltos}</span>
            <span className="prest-kpi-lbl">Recientes devueltas</span>
          </div>
        </div>
      </div>

      <div className="prest-filter-bar">
        <div className="prest-search-wrap">
          <Search size={14} className="prest-search-ico" />
          <input
            className="prest-search-inp"
            placeholder="Buscar herramienta..."
            value={searchTool}
            onChange={(e) => setSearchTool(e.target.value)}
          />
          {searchTool && (
            <button type="button" className="prest-clear-x" onClick={() => setSearchTool('')}>
              <X size={12} />
            </button>
          )}
        </div>

        <div className="prest-select-wrap">
          <User size={14} className="prest-select-ico" />
          <select
            className="prest-select"
            value={filterPersona}
            onChange={(e) => setFilterPersona(e.target.value)}
          >
            <option value="">Todas las personas</option>
            {personas.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div className="prest-datepicker-container">
          <DateRangePicker
            value={fechas}
            onChange={(val) => setFechas({ start: val.start, end: val.end })}
            placeholder="Rango de fechas"
          />
        </div>

        <div className="prest-estado-group">
          {[
            { val: 'prestado', label: `Pendientes (${stats.pendientes})` },
            { val: 'devuelto', label: 'Historial' },
          ].map((opt) => (
            <button
              key={opt.val}
              type="button"
              className={`prest-estado-btn ${filterEstado === opt.val ? 'active' : ''}`}
              onClick={() => setFilterEstado(opt.val)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {hasFilters && (
          <button type="button" className="prest-clear-all" onClick={clearFilters}>
            <X size={13} /> Limpiar
          </button>
        )}

        <span className="prest-count">
          {total} registro{total !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <div className="prest-loading">
          <div className="prest-spinner" />
          <span>Cargando devoluciones…</span>
        </div>
      ) : (
        <>
          {/* Desktop View: Table */}
          <div className="prest-table-card devoluciones-desktop-only">
            <table className="prest-table">
              <thead>
                <tr>
                  <th>Herramienta</th>
                  <th>Encargado</th>
                  <th>Cantidad</th>
                  <th>Fecha Salida</th>
                  <th>Tiempo / Retorno</th>
                  <th>Estado</th>
                  <th>Motivo salida</th>
                  {filterEstado === 'devuelto' && <th>Observación</th>}
                  {filterEstado === 'prestado' && <th>Acción</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={filterEstado === 'devuelto' ? 8 : 8} className="prest-empty">
                      {hasFilters
                        ? 'No hay registros que coincidan con los filtros.'
                        : filterEstado === 'prestado'
                          ? 'No hay herramientas pendientes por devolver.'
                          : 'No hay devoluciones recientes.'}
                    </td>
                  </tr>
                ) : filtered.map((p) => (
                  <tr key={p.id} className={`prest-tr ${p.estado}`}>
                    <td className="prest-td-tool">
                      <div className="prest-tool-cell">
                        <div className="prest-tool-icon"><Wrench size={13} /></div>
                        <div>
                          <span style={{ fontWeight: 600, color: '#0f172a' }}>
                            {p.material?.nombre || '—'}
                          </span>
                          {p.material?.codigo && (
                            <div style={{
                              fontFamily: 'DM Mono, monospace',
                              fontSize: '0.75rem',
                              color: '#64748b',
                              marginTop: '0.1rem',
                            }}
                            >
                              {p.material.codigo}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="prest-td-person">
                      <div className="prest-person-cell prest-person-cell--plain">
                        <div className="prest-person-name">{getEncargadoDisplay(p)}</div>
                        <div className="prest-person-user">@{p.responsable?.username || '—'}</div>
                      </div>
                    </td>
                    <td className="prest-td-qty">
                      {p.cantidad}
                      {' '}
                      <span className="prest-unit">
                        {unidadLabel(p.material?.unidadMedida)}
                      </span>
                    </td>
                    <td className="prest-td-date">{fmtDate(p.fechaSalida)}</td>
                    <td>
                      {p.estado === 'prestado' ? (
                        <span className="prest-elapsed">
                          <Clock size={12} />
                          {' '}
                          {elapsed(p.fechaSalida)}
                          {' '}
                          fuera
                        </span>
                      ) : (
                        <span className="prest-td-date">{fmtDate(p.fechaRetorno)}</span>
                      )}
                    </td>
                    <td>
                      <span className={`prest-badge prest-badge--${p.estado}`}>
                        {p.estado === 'prestado' ? <Clock size={11} /> : <CheckCircle2 size={11} />}
                        {p.estado === 'prestado' ? 'Fuera' : 'Devuelta'}
                      </span>
                    </td>
                    <td className="prest-td-comment">{p.comentarios || '—'}</td>
                    {filterEstado === 'devuelto' && (
                      <td className="prest-td-comment">{p.observacionDevolucion || '—'}</td>
                    )}
                    {filterEstado === 'prestado' && (
                      <td>
                        <button
                          type="button"
                          className="prest-btn-devolver"
                          onClick={() => setSelected(p)}
                        >
                          Devolución realizada
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View: Cards */}
          <div className="prest-devoluciones-mobile-only">
            <div className="prest-mobile-cards">
              {filtered.length === 0 ? (
                <div className="prest-empty" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '1rem' }}>
                  {hasFilters
                    ? 'No hay registros que coincidan con los filtros.'
                    : filterEstado === 'prestado'
                      ? 'No hay herramientas pendientes por devolver.'
                      : 'No hay devoluciones recientes.'}
                </div>
              ) : (
                filtered.map((p) => (
                  <div key={p.id} className="prest-card">
                    <div className="prest-card-header">
                      <div className="prest-card-tool">
                        <div className="prest-tool-icon"><Wrench size={13} /></div>
                        <div>
                          <span className="prest-card-tool-name">{p.material?.nombre || '—'}</span>
                          {p.material?.codigo && (
                            <div className="prest-card-tool-code">{p.material.codigo}</div>
                          )}
                        </div>
                      </div>
                      <span className={`prest-badge prest-badge--${p.estado}`}>
                        {p.estado === 'prestado' ? <Clock size={11} /> : <CheckCircle2 size={11} />}
                        {p.estado === 'prestado' ? 'Fuera' : 'Devuelta'}
                      </span>
                    </div>

                    <div className="prest-card-body">
                      <div className="prest-card-field">
                        <span className="prest-card-field-label">Encargado</span>
                        <span className="prest-card-field-value">
                          {getEncargadoDisplay(p)}
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block' }}>
                            @{p.responsable?.username || '—'}
                          </span>
                        </span>
                      </div>
                      <div className="prest-card-field">
                        <span className="prest-card-field-label">Cantidad</span>
                        <span className="prest-card-field-value">
                          {p.cantidad} <span className="prest-unit">{unidadLabel(p.material?.unidadMedida)}</span>
                        </span>
                      </div>
                      <div className="prest-card-field">
                        <span className="prest-card-field-label">Fecha Salida</span>
                        <span className="prest-card-field-value">{fmtDate(p.fechaSalida)}</span>
                      </div>
                      <div className="prest-card-field">
                        <span className="prest-card-field-label">
                          {p.estado === 'prestado' ? 'Tiempo Fuera' : 'Fecha Retorno'}
                        </span>
                        <span className="prest-card-field-value">
                          {p.estado === 'prestado' ? (
                            <span className="prest-elapsed" style={{ fontSize: '0.75rem', padding: '0.1rem 0.4rem' }}>
                              <Clock size={10} /> {elapsed(p.fechaSalida)}
                            </span>
                          ) : (
                            fmtDate(p.fechaRetorno)
                          )}
                        </span>
                      </div>
                      <div className="prest-card-field" style={{ gridColumn: 'span 2' }}>
                        <span className="prest-card-field-label">Motivo salida</span>
                        <span className="prest-card-field-value" style={{ fontStyle: 'italic', fontWeight: 400 }}>
                          {p.comentarios || '—'}
                        </span>
                      </div>
                      {filterEstado === 'devuelto' && (
                        <div className="prest-card-field" style={{ gridColumn: 'span 2' }}>
                          <span className="prest-card-field-label">Observación</span>
                          <span className="prest-card-field-value" style={{ fontStyle: 'italic', fontWeight: 400 }}>
                            {p.observacionDevolucion || '—'}
                          </span>
                        </div>
                      )}
                    </div>

                    {filterEstado === 'prestado' && (
                      <div className="prest-card-footer">
                        <div className="prest-card-actions">
                          <button
                            type="button"
                            className="prest-btn-devolver"
                            onClick={() => setSelected(p)}
                          >
                            Devolución realizada
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="prest-pagination">
              <span className="prest-pagination-info">
                {total} registros encontrados ({page} de {totalPages})
              </span>
              <div className="prest-pagination-pages">
                <button
                  type="button"
                  className="prest-page-btn"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  &lt;
                </button>
                {renderPageButtons()}
                <button
                  type="button"
                  className="prest-page-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  &gt;
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {selected && (
        <DevolucionModal
          prestamo={selected}
          onClose={() => setSelected(null)}
          onConfirm={handleDevolucion}
        />
      )}
    </div>
  );
}
