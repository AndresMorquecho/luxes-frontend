import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Wrench, Clock, User, RefreshCw, CheckCircle2, Search, X,
} from 'lucide-react';
import { getPrestamos, devolverPrestamo } from '../application/inventarioService.js';
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
  const [pendientes, setPendientes] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTool, setSearchTool] = useState('');
  const [filterPersona, setFilterPersona] = useState('');
  const [filterEstado, setFilterEstado] = useState('prestado');
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [activos, devueltos] = await Promise.all([
        getPrestamos('prestado'),
        getPrestamos('devuelto'),
      ]);
      setPendientes(activos || []);
      setHistorial((devueltos || []).slice(0, 30));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const allItems = useMemo(
    () => [...pendientes, ...historial],
    [pendientes, historial],
  );

  const personas = useMemo(() => {
    const names = new Set(allItems.map((p) => p.responsable?.nombre).filter(Boolean));
    return [...names].sort();
  }, [allItems]);

  const filtered = useMemo(() => {
    const base = filterEstado === 'prestado' ? pendientes : historial;
    return base.filter((p) => {
      const matchTool = !searchTool
        || (p.material?.nombre || '').toLowerCase().includes(searchTool.toLowerCase());
      const matchPerson = !filterPersona
        || (p.responsable?.nombre || '') === filterPersona;
      return matchTool && matchPerson;
    });
  }, [pendientes, historial, filterEstado, searchTool, filterPersona]);

  const handleDevolucion = async (observacionDevolucion) => {
    if (!selected) return;
    try {
      await devolverPrestamo(selected.id, {
        observacionDevolucion: observacionDevolucion || undefined,
      });
      toast.success(`"${selected.material?.nombre}" devuelta correctamente.`);
      setSelected(null);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const clearFilters = () => {
    setSearchTool('');
    setFilterPersona('');
  };
  const hasFilters = searchTool || filterPersona;

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
            <span className="prest-kpi-num">{pendientes.length}</span>
            <span className="prest-kpi-lbl">Por devolver</span>
          </div>
        </div>
        <div className="prest-kpi prest-kpi--green">
          <CheckCircle2 size={18} />
          <div>
            <span className="prest-kpi-num">{historial.length}</span>
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

        <div className="prest-estado-group">
          {[
            { val: 'prestado', label: `Pendientes (${pendientes.length})` },
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
          {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {loading ? (
        <div className="prest-loading">
          <div className="prest-spinner" />
          <span>Cargando devoluciones…</span>
        </div>
      ) : (
        <div className="prest-table-card">
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
                      <div className="prest-person-name">{p.responsable?.nombre || 'Desconocido'}</div>
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
