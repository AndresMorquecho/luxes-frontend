import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrdenes } from '../../../compras/application/comprasService';
import { toast } from '../../../../shared/ui/components/Toast';
import { RecepcionNav } from './RecepcionNav';
import { DateRangePicker } from '../../../../shared/ui/components/DateRangePicker.jsx';
import './RecepcionInsumos.css';

const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('es-EC', { year: 'numeric', month: 'short', day: 'numeric' })
  : '—';

const fmtDateTime = (d) => d
  ? new Date(d).toLocaleDateString('es-EC', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
  : '—';

export const HistorialRecepcionesPage = ({ basePath = '/compras/recepcion' }) => {
  const navigate = useNavigate();
  const [user] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const userRole = (user?.rol || '').toUpperCase();
  const isImpresion = userRole === 'IMPRESIÓN' || userRole === 'IMPRESION';
  const isTaller = userRole === 'TALLER';

  const [ordenes, setOrdenes] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [fechas, setFechas] = useState({ start: '', end: '' });
  const perPage = 25;
  const searchTimer = useRef(null);

  const loadOrdenes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOrdenes({
        page,
        limit: perPage,
        search: search || undefined,
        estado: 'recibida',
        creadorRol: (isImpresion || isTaller) ? user?.rol : undefined,
        fechaInicio: fechas.start || undefined,
        fechaFin: fechas.end || undefined
      });
      setOrdenes(data.items || []);
      setTotal(data.total || 0);
    } catch {
      setOrdenes([]);
      setTotal(0);
      toast.error('Error al cargar el historial de productos recibidos');
    } finally {
      setLoading(false);
    }
  }, [page, search, isImpresion, isTaller, user, fechas]);

  useEffect(() => {
    loadOrdenes();
  }, [loadOrdenes]);

  useEffect(() => {
    setPage(1);
  }, [fechas, search]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(val); }, 350);
  };

  const countRecibidos = (orden) =>
    (orden.detalles || []).filter(d => (d.cantidadRecibida ?? 0) > 0).length;

  const countInventario = (orden) =>
    (orden.detalles || []).filter(d => d.descargableInventario && (d.cantidadRecibida ?? 0) > 0).length;

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const renderPageButtons = () => {
    const buttons = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
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

  return (
    <div className="ri-page animate-slide-up">
      <div className="ri-card ri-header">
        <div>
          <h1 className="ri-title">Historial de productos recibidos</h1>
          <p className="ri-subtitle">Órdenes completas con fecha de llegada, responsable e ítems ingresados</p>
        </div>
        <div className="ri-stat-badge">
          <span>{total} registro{total !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <RecepcionNav basePath={basePath} />

      <div className="ri-card ri-table-card">
        <div className="ri-table-header" style={{ gap: '1rem', flexWrap: 'wrap' }}>
          <div className="flex items-center gap-2" style={{ flex: '1 1 200px' }}>
            <svg className="w-4 h-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              className="ri-search-inline"
              placeholder="Buscar por número, proveedor, concepto o solicitante…"
              onChange={handleSearchChange}
            />
          </div>
          <div className="prest-datepicker-container">
            <DateRangePicker
              value={fechas}
              onChange={(val) => setFechas({ start: val.start, end: val.end })}
              placeholder="Rango de fechas"
            />
          </div>
        </div>

        {/* Desktop View: Table */}
        <div className="overflow-x-auto relative devoluciones-desktop-only">
          {loading && (
            <div className="ri-loader-box ri-loader-overlay">
              <div className="ri-spinner" />
            </div>
          )}
          <table className="ri-table">
            <thead>
              <tr>
                <th>Orden</th>
                <th>Fecha de llegada</th>
                <th>Recibido por</th>
                <th>Solicitante</th>
                <th>Proveedor</th>
                <th className="text-center">Ítems</th>
                <th className="text-center">A inventario</th>
                <th className="text-center w-32">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {!loading && ordenes.map(o => (
                <tr key={o.id} className="ri-tr">
                  <td className="font-mono text-xs font-semibold text-slate-700">{o.numero}</td>
                  <td className="text-slate-600 text-xs font-medium">{fmtDateTime(o.fechaRecepcion)}</td>
                  <td className="text-slate-700 text-xs">{o.recibidoPor?.nombre || '—'}</td>
                  <td className="text-slate-600 text-xs">{o.usuario?.nombre || '—'}</td>
                  <td className="text-slate-700 text-xs font-medium">{o.proveedor?.nombre || '—'}</td>
                  <td className="text-center text-sm font-semibold text-slate-600">{countRecibidos(o)}</td>
                  <td className="text-center">
                    <span className="ri-badge-inv">{countInventario(o)}</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => navigate(`${basePath}/historial/${o.id}`)}
                      className="ri-btn-ver w-full justify-center"
                    >
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && ordenes.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-slate-400 text-sm">
                    No hay productos recibidos registrados aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Cards */}
        <div className="prest-devoluciones-mobile-only" style={{ padding: '1rem 1.25rem' }}>
          <div className="prest-mobile-cards">
            {loading && (
              <div className="flex justify-center py-8">
                <div className="ri-spinner" />
              </div>
            )}
            {!loading && ordenes.map(o => (
              <div key={o.id} className="prest-card">
                <div className="prest-card-header">
                  <div>
                    <span className="font-mono text-xs font-semibold text-slate-500" style={{ display: 'block' }}>{o.numero}</span>
                    <span className="prest-card-tool-name">{o.proveedor?.nombre || '—'}</span>
                  </div>
                  <span className="ri-badge-inv" style={{ fontSize: '0.7rem' }}>
                    {countRecibidos(o)} items
                  </span>
                </div>
                <div className="prest-card-body">
                  <div className="prest-card-field">
                    <span className="prest-card-field-label">Fecha de llegada</span>
                    <span className="prest-card-field-value">{fmtDateTime(o.fechaRecepcion)}</span>
                  </div>
                  <div className="prest-card-field">
                    <span className="prest-card-field-label">Recibido por</span>
                    <span className="prest-card-field-value">{o.recibidoPor?.nombre || '—'}</span>
                  </div>
                  <div className="prest-card-field">
                    <span className="prest-card-field-label">Solicitante</span>
                    <span className="prest-card-field-value">{o.usuario?.nombre || '—'}</span>
                  </div>
                  <div className="prest-card-field">
                    <span className="prest-card-field-label">A Inventario</span>
                    <span className="prest-card-field-value">
                      <span className="ri-badge-inv">{countInventario(o)}</span>
                    </span>
                  </div>
                </div>
                <div className="prest-card-footer">
                  <div className="prest-card-actions">
                    <button
                      type="button"
                      onClick={() => navigate(`${basePath}/historial/${o.id}`)}
                      className="ri-btn-ver"
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      Ver detalle
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {!loading && ordenes.length === 0 && (
              <div className="prest-empty text-center py-8">
                No hay productos recibidos registrados aún.
              </div>
            )}
          </div>
        </div>

        {totalPages > 1 && (
          <div className="prest-pagination">
            <span className="prest-pagination-info">
              {total} registros ({page} de {totalPages})
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
      </div>
    </div>
  );
};
