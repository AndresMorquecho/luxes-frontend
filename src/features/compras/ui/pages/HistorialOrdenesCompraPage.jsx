import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrdenes } from '../../application/comprasService';
import { ComprasOperativoNav } from '../components/ComprasOperativoNav';
import { PDFPreviewModal } from '../../../../shared/ui/components/PDFPreviewModal.jsx';
import {
  ESTADO_ORDEN_LABELS,
  FILTROS_HISTORIAL,
  fmtDate,
  fmtDateTime,
  mapOrdenToPDFFormat,
} from '../../helpers/ordenCompraHelpers';
import { toast } from '../../../../shared/ui/components/Toast';
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
  const perPage = 12;
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
  }, [page, search, filtroEstado, isImpresion, isTaller, user]);

  useEffect(() => {
    loadOrdenes();
  }, [loadOrdenes]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(val); setPage(1); }, 350);
  };

  const openPDFPreview = (orden) => {
    setPreviewOC(mapOrdenToPDFFormat(orden));
    setIsPDFOpen(true);
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));

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
            onClick={() => { setFiltroEstado(f.id); setPage(1); }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="co-card co-table-card">
        <div className="co-table-header">
          <svg className="w-4 h-4 shrink-0" style={{ color: '#94a3b8' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            className="co-search-inline"
            placeholder="Buscar por número, proveedor, concepto o solicitante…"
            onChange={handleSearchChange}
          />
        </div>

        {loading ? (
          <div className="co-loader-box"><div className="co-spinner" /></div>
        ) : (
          <div className="overflow-x-auto">
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
                {ordenes.map((o) => {
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
                {ordenes.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-16 text-slate-400 text-sm font-medium">
                      No hay órdenes en este filtro
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="co-pagination">
            <span className="text-xs font-medium text-slate-400">{total} orden{total !== 1 ? 'es' : ''}</span>
            <div className="flex items-center gap-1">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="co-page-btn">‹</button>
              <span className="text-xs font-semibold text-slate-500 px-2">{page} / {totalPages}</span>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="co-page-btn">›</button>
            </div>
          </div>
        )}
      </div>

      <PDFPreviewModal isOpen={isPDFOpen} onClose={() => setIsPDFOpen(false)} oc={previewOC} />
    </div>
  );
};
