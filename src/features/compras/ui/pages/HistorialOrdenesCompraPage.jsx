import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrdenes } from '../../application/comprasService';
import { ComprasOperativoNav } from '../components/ComprasOperativoNav';
import { PDFPreviewModal } from '../../../../shared/ui/components/PDFPreviewModal.jsx';
import { deferClose } from '../../../../shared/ui/components/ModalPortal.jsx';
import {
  ESTADO_ORDEN_LABELS,
  FILTROS_HISTORIAL,
  fmtDate,
  fmtDateTime,
  mapOrdenToPDFFormat,
} from '../../helpers/ordenCompraHelpers';
import { toast } from '../../../../shared/ui/components/Toast';
import { DateRangePicker } from '../../../../shared/ui/components/DateRangePicker.jsx';
import './ComprasPage.css';

export const HistorialOrdenesCompraPage = () => {
  const navigate = useNavigate();
  const [user] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const userRole = (user?.rol || '').toLowerCase();
  const isImpresion = userRole === 'impresión' || userRole === 'impresion';
  const isTaller = userRole === 'taller';
  const areaLabel = isImpresion ? 'Impresión' : isTaller ? 'Taller' : 'Compras';

  const [ordenes, setOrdenes] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todas');
  const [loading, setLoading] = useState(true);
  const [isPDFOpen, setIsPDFOpen] = useState(false);
  const [previewOC, setPreviewOC] = useState(null);
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
        estado: filtroEstado !== 'todas' ? filtroEstado : undefined,
        creadorRol: (isImpresion || isTaller) ? user?.rol : undefined,
        fechaInicio: fechas.start || undefined,
        fechaFin: fechas.end || undefined
      });
      setOrdenes(data.items || []);
      setTotal(data.total || 0);
    } catch {
      setOrdenes([]);
      setTotal(0);
      toast.error('Error al cargar el historial de órdenes');
    } finally {
      setLoading(false);
    }
  }, [page, search, filtroEstado, isImpresion, isTaller, user, fechas]);

  useEffect(() => {
    loadOrdenes();
  }, [loadOrdenes]);

  useEffect(() => {
    setPage(1);
  }, [fechas, search, filtroEstado]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(val); }, 350);
  };

  const openPDFPreview = (orden) => {
    setPreviewOC(mapOrdenToPDFFormat(orden));
    setIsPDFOpen(true);
  };

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
    <div className="co-page animate-slide-up">
      <div className="co-card co-header">
        <div>
          <h1 className="co-title">Historial de órdenes de compra</h1>
          <p className="co-subtitle">
            Registro completo de solicitudes del área de {areaLabel}: estados, fechas y seguimiento
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="co-stat-badge">
            <span>{total} orden{total !== 1 ? 'es' : ''}</span>
          </div>
          <button type="button" onClick={() => navigate('/compras/nueva')} className="co-btn-primary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nueva orden
          </button>
        </div>
      </div>

      <ComprasOperativoNav />

      <div className="co-filter-chips">
        {FILTROS_HISTORIAL.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`co-filter-chip ${filtroEstado === f.id ? 'co-filter-chip-active' : ''}`}
            onClick={() => { setFiltroEstado(f.id); }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="co-card co-table-card">
        <div className="co-table-header" style={{ gap: '1rem', flexWrap: 'wrap' }}>
          <div className="flex items-center gap-2" style={{ flex: '1 1 200px' }}>
            <svg className="w-4 h-4 shrink-0" style={{ color: '#94a3b8' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              className="co-search-inline"
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
            <div className="co-loader-box co-loader-overlay">
              <div className="co-spinner" />
            </div>
          )}
          <table className="co-table">
            <thead>
              <tr>
                <th>Orden</th>
                <th>Fecha solicitud</th>
                <th>Solicitante</th>
                <th>Proveedor</th>
                <th>Concepto</th>
                <th className="text-center">Ítems</th>
                <th className="text-center">Estado</th>
                <th>Última actualización</th>
                <th className="text-center w-36">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {!loading && ordenes.map((o) => {
                const badge = ESTADO_ORDEN_LABELS[o.estado] || { bg: '#f1f5f9', color: '#64748b', label: o.estado };
                const ultimaFecha = o.fechaRecepcion || o.fechaAprobacion || o.fechaCreacion || o.fecha;
                return (
                  <tr key={o.id} className="co-tr">
                    <td className="font-mono text-xs font-semibold text-slate-700">{o.numero}</td>
                    <td className="text-slate-500 text-xs">{fmtDate(o.fechaCreacion || o.fecha)}</td>
                    <td className="text-slate-600 text-xs font-medium">{o.usuario?.nombre || '—'}</td>
                    <td className="font-semibold text-slate-800 text-xs">{o.proveedor?.nombre || '—'}</td>
                    <td className="text-slate-700 text-xs max-w-[180px] truncate" title={o.concepto}>{o.concepto || '—'}</td>
                    <td className="text-center text-sm font-semibold text-slate-600">{(o.detalles || []).length}</td>
                    <td className="text-center">
                      <span className="co-badge" style={{ background: badge.bg, color: badge.color }}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="text-slate-500 text-xs">{fmtDateTime(ultimaFecha)}</td>
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <button type="button" onClick={() => navigate(`/compras/historial/${o.id}`)} className="co-action-btn co-action-blue" title="Ver detalle">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                          </svg>
                        </button>
                        <button type="button" onClick={() => openPDFPreview(o)} className="co-action-btn co-action-blue" title="Ver PDF">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                          </svg>
                        </button>
                        {o.estado === 'pendiente_aprobacion' && (
                          <button type="button" onClick={() => navigate(`/compras/editar/${o.id}`)} className="co-action-btn co-action-blue" title="Editar">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && ordenes.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-slate-400 text-sm font-medium">
                    No hay órdenes en este filtro
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
            {!loading && ordenes.map(o => {
              const badge = ESTADO_ORDEN_LABELS[o.estado] || { bg: '#f1f5f9', color: '#64748b', label: o.estado };
              const ultimaFecha = o.fechaRecepcion || o.fechaAprobacion || o.fechaCreacion || o.fecha;
              return (
                <div key={o.id} className="prest-card">
                  <div className="prest-card-header">
                    <div>
                      <span className="font-mono text-xs font-semibold text-slate-500" style={{ display: 'block' }}>{o.numero}</span>
                      <span className="prest-card-tool-name">{o.proveedor?.nombre || '—'}</span>
                    </div>
                    <span className="co-badge" style={{ background: badge.bg, color: badge.color, fontSize: '0.7rem' }}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="prest-card-body">
                    <div className="prest-card-field">
                      <span className="prest-card-field-label">Fecha Solicitud</span>
                      <span className="prest-card-field-value">{fmtDate(o.fechaCreacion || o.fecha)}</span>
                    </div>
                    <div className="prest-card-field">
                      <span className="prest-card-field-label">Solicitante</span>
                      <span className="prest-card-field-value">{o.usuario?.nombre || '—'}</span>
                    </div>
                    <div className="prest-card-field" style={{ gridColumn: 'span 2' }}>
                      <span className="prest-card-field-label">Concepto</span>
                      <span className="prest-card-field-value">{o.concepto || '—'}</span>
                    </div>
                    <div className="prest-card-field">
                      <span className="prest-card-field-label">Ítems</span>
                      <span className="prest-card-field-value">{(o.detalles || []).length} items</span>
                    </div>
                    <div className="prest-card-field">
                      <span className="prest-card-field-label">Actualizado</span>
                      <span className="prest-card-field-value">{fmtDateTime(ultimaFecha)}</span>
                    </div>
                  </div>
                  <div className="prest-card-footer">
                    <div className="prest-card-actions" style={{ gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => navigate(`/compras/historial/${o.id}`)}
                        className="co-action-btn co-action-blue"
                        style={{ flex: 2, height: '32px', justifyContent: 'center' }}
                      >
                        Ver Detalle
                      </button>
                      <button
                        type="button"
                        onClick={() => openPDFPreview(o)}
                        className="co-action-btn co-action-blue"
                        style={{ flex: 1, height: '32px', justifyContent: 'center' }}
                      >
                        PDF
                      </button>
                      {o.estado === 'pendiente_aprobacion' && (
                        <button
                          type="button"
                          onClick={() => navigate(`/compras/editar/${o.id}`)}
                          className="co-action-btn co-action-blue"
                          style={{ flex: 1.2, height: '32px', justifyContent: 'center' }}
                        >
                          Editar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {!loading && ordenes.length === 0 && (
              <div className="prest-empty text-center py-8">
                No hay órdenes en este filtro
              </div>
            )}
          </div>
        </div>

        {totalPages > 1 && (
          <div className="prest-pagination">
            <span className="prest-pagination-info">
              {total} órdenes ({page} de {totalPages})
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

      {isPDFOpen && previewOC && (
        <PDFPreviewModal
          isOpen
          onClose={() => {
            setIsPDFOpen(false);
            deferClose(() => setPreviewOC(null));
          }}
          oc={previewOC}
        />
      )}
    </div>
  );
};
