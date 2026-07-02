import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getOrdenes } from '../../application/comprasService';
import { getOrdenProyectoLabel, mapOrdenToPDFFormat } from '../../helpers/ordenCompraHelpers';
import { toast } from '../../../../shared/ui/components/Toast';
import { PDFPreviewModal } from '../../../../shared/ui/components/PDFPreviewModal.jsx';
import './ComprasPage.css';

const ESTADO_BADGES = {
  pendiente_aprobacion: { bg: 'rgba(245,158,11,0.1)',  color: '#f59e0b', label: 'Pendiente Aprobación' },
  aprobada:             { bg: 'rgba(16,185,129,0.1)',   color: '#10b981', label: 'Aprobada' },
  rechazada:            { bg: 'rgba(239,68,68,0.08)',   color: '#ef4444', label: 'Rechazada' },
  recibida:             { bg: 'rgba(59,130,246,0.1)',   color: '#3b82f6', label: 'Recibida' },
  cancelada:            { bg: 'rgba(239,68,68,0.08)',   color: '#ef4444', label: 'Cancelada' },
};

const fmt = (n) => '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-EC', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

export const AprobacionOrdenesPage = () => {
  const navigate = useNavigate();
  const [currentUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const userRole = (currentUser?.rol || '').toLowerCase();
  const isAdmin = userRole === 'admin' || userRole === 'administrador';
  const hasAprobacionPermission = currentUser?.permissions?.includes('aprobacion_ordenes_compra') || isAdmin;

  // Redirect if not authorized
  useEffect(() => {
    if (!hasAprobacionPermission) {
      toast.error('No tienes permisos para acceder a esta página');
      navigate('/compras');
    }
  }, [hasAprobacionPermission, navigate]);

  // ── States ──
  const [ordenes, setOrdenes] = useState([]);
  const [ordenPage, setOrdenPage] = useState(1);
  const [ordenTotal, setOrdenTotal] = useState(0);
  const [ordenSearch, setOrdenSearch] = useState('');
  const [ordenLoading, setOrdenLoading] = useState(true);
  const [estadoFilter, setEstadoFilter] = useState('pendiente_aprobacion'); // 'pendiente_aprobacion' or 'todas'
  const perPage = 8;

  // PDF Preview
  const [isPDFOpen, setIsPDFOpen] = useState(false);
  const [previewOC, setPreviewOC] = useState(null);

  const searchTimer = useRef(null);

  const loadOrdenes = useCallback(async () => {
    setOrdenLoading(true);
    try {
      const data = await getOrdenes({
        page: ordenPage,
        limit: perPage,
        search: ordenSearch || undefined,
        estado: estadoFilter === 'todas' ? undefined : estadoFilter
      });
      setOrdenes(data.items || []);
      setOrdenTotal(data.total || 0);
    } catch (err) {
      setOrdenes([]);
      setOrdenTotal(0);
      toast.error('Error al cargar las órdenes para aprobación');
    } finally {
      setOrdenLoading(false);
    }
  }, [ordenPage, ordenSearch, estadoFilter]);

  useEffect(() => {
    if (hasAprobacionPermission) {
      loadOrdenes();
    }
  }, [hasAprobacionPermission, loadOrdenes]);

  // ── Search debounce ──
  const handleOrdenSearchChange = (e) => {
    const val = e.target.value;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setOrdenSearch(val); setOrdenPage(1); }, 350);
  };

  const openPDFPreview = (orden) => {
    setPreviewOC(mapOrdenToPDFFormat(orden));
    setIsPDFOpen(true);
  };

  const ordenTotalPages = Math.max(1, Math.ceil(ordenTotal / perPage));

  if (!hasAprobacionPermission) return null;

  return (
    <div className="co-page animate-slide-up">
      {/* Header */}
      <div className="co-card co-header-aprobacion" style={{ border: '1.5px solid #e2e8f0', marginBottom: '1rem' }}>
        <button
          type="button"
          onClick={() => navigate('/compras')}
          className="co-back-top md:hidden"
        >
          ← Volver a Compras
        </button>

        <div className="co-header-aprobacion-body">
          <div className="min-w-0">
            <h1 className="co-title">Panel de Aprobaciones</h1>
            <p className="co-subtitle">Revisa, aprueba o rechaza solicitudes de órdenes de compra entrantes</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/compras')}
            className="co-btn-ghost hidden md:inline-flex"
            style={{ color: '#2563eb', fontWeight: 700, shrink: 0 }}
          >
            ← Volver a Compras
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="co-aprobacion-tabs mb-4">
        <button
          onClick={() => { setEstadoFilter('pendiente_aprobacion'); setOrdenPage(1); }}
          className={`co-aprobacion-tab ${
            estadoFilter === 'pendiente_aprobacion' ? 'co-aprobacion-tab--active' : ''
          }`}
        >
          <span className="md:hidden">Pendientes</span>
          <span className="hidden md:inline">Pendientes de Aprobación</span>
        </button>
        <button
          onClick={() => { setEstadoFilter('todas'); setOrdenPage(1); }}
          className={`co-aprobacion-tab ${
            estadoFilter === 'todas' ? 'co-aprobacion-tab--active' : ''
          }`}
        >
          <span className="md:hidden">Historial</span>
          <span className="hidden md:inline">Todas las Órdenes (Historial)</span>
        </button>
      </div>

      {/* Table Card */}
      <div className="co-card co-table-card" style={{ border: '1.5px solid #e2e8f0' }}>
        <div className="co-table-header">
          <svg className="w-4 h-4 shrink-0" style={{ color: '#94a3b8' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input className="co-search-inline" placeholder="Buscar por número, proveedor o concepto…" onChange={handleOrdenSearchChange} />
        </div>

        {ordenLoading ? (
          <div className="co-loader-box"><div className="co-spinner" /></div>
        ) : (
          <>
            <div className="overflow-x-auto devoluciones-desktop-only">
              <table className="co-table">
              <thead>
                <tr>
                  <th>Orden</th>
                  <th>Proveedor</th>
                  <th>Emisor</th>
                  <th>Proyecto</th>
                  <th>Fecha</th>
                  <th>Concepto</th>
                  <th>Observación / Notas</th>
                  <th className="text-right">Total</th>
                  <th className="text-center">Estado</th>
                  <th className="text-center w-48">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ordenes.map(o => (
                  <tr key={o.id} className="co-tr">
                    <td className="font-mono text-xs font-semibold text-slate-700">{o.numero}</td>
                    <td className="font-semibold text-slate-800">{o.proveedor?.nombre || '—'}</td>
                    <td className="text-slate-600 text-xs font-medium">{o.usuario?.nombre || '—'}</td>
                    <td className="text-slate-700 text-xs font-semibold max-w-[180px] truncate" title={getOrdenProyectoLabel(o) || ''}>
                      {getOrdenProyectoLabel(o) || '—'}
                    </td>
                    <td className="text-slate-500 text-xs">{fmtDate(o.fecha)}</td>
                    <td className="text-slate-700 text-xs font-semibold max-w-[200px] truncate" title={o.concepto}>{o.concepto || '—'}</td>
                    <td className="text-slate-400 text-xs max-w-[150px] truncate" title={o.notas}>{o.notas || '—'}</td>
                    <td className="text-right font-semibold text-slate-800">{fmt(o.total)}</td>
                    <td className="text-center">
                      <span className="co-badge" style={{ background: ESTADO_BADGES[o.estado]?.bg, color: ESTADO_BADGES[o.estado]?.color }}>
                        {ESTADO_BADGES[o.estado]?.label || o.estado}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Botón Ver - lleva a página de detalle */}
                        <button
                          onClick={() => navigate(`/compras/aprobacion/${o.id}`, { state: { ordenFromList: o } })}
                          className="px-3 py-1.5 text-xs font-bold text-white rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-1.5 shadow-sm"
                          title="Ver y aprobar/rechazar"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                          </svg>
                          Ver
                        </button>
                        
                        {/* Vista PDF opcional */}
                        {o.estado !== 'pendiente_aprobacion' && (
                          <button
                            onClick={() => openPDFPreview(o)}
                            className="co-action-btn co-action-blue"
                            title="Ver Previsualización PDF"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {ordenes.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-16 text-slate-400 text-sm font-medium">
                      No hay órdenes de compra {estadoFilter === 'pendiente_aprobacion' ? 'pendientes de aprobación' : 'registradas'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>

            <div className="prest-devoluciones-mobile-only" style={{ padding: '1rem 1.25rem' }}>
              <div className="prest-mobile-cards">
                {ordenes.map((o) => (
                  <div key={o.id} className="prest-card">
                    <div className="prest-card-header">
                      <div>
                        <span className="font-mono text-xs font-semibold text-slate-500" style={{ display: 'block' }}>{o.numero}</span>
                        <span className="prest-card-tool-name">{o.proveedor?.nombre || '—'}</span>
                      </div>
                      <span className="co-badge" style={{ background: ESTADO_BADGES[o.estado]?.bg, color: ESTADO_BADGES[o.estado]?.color, fontSize: '0.7rem' }}>
                        {ESTADO_BADGES[o.estado]?.label || o.estado}
                      </span>
                    </div>
                    <div className="prest-card-body">
                      <div className="prest-card-field">
                        <span className="prest-card-field-label">Emisor</span>
                        <span className="prest-card-field-value">{o.usuario?.nombre || '—'}</span>
                      </div>
                      <div className="prest-card-field">
                        <span className="prest-card-field-label">Fecha</span>
                        <span className="prest-card-field-value">{fmtDate(o.fecha)}</span>
                      </div>
                      <div className="prest-card-field" style={{ gridColumn: 'span 2' }}>
                        <span className="prest-card-field-label">Proyecto</span>
                        <span className="prest-card-field-value">{getOrdenProyectoLabel(o) || 'Gasto general'}</span>
                      </div>
                      <div className="prest-card-field" style={{ gridColumn: 'span 2' }}>
                        <span className="prest-card-field-label">Concepto</span>
                        <span className="prest-card-field-value">{o.concepto || '—'}</span>
                      </div>
                      {o.notas && (
                        <div className="prest-card-field" style={{ gridColumn: 'span 2' }}>
                          <span className="prest-card-field-label">Notas</span>
                          <span className="prest-card-field-value text-slate-500" style={{ fontSize: '0.75rem' }}>{o.notas}</span>
                        </div>
                      )}
                      <div className="prest-card-field">
                        <span className="prest-card-field-label">Total</span>
                        <span className="prest-card-field-value" style={{ fontWeight: 700 }}>{fmt(o.total)}</span>
                      </div>
                    </div>
                    <div className="prest-card-footer">
                      <div className="prest-card-actions" style={{ gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => navigate(`/compras/aprobacion/${o.id}`, { state: { ordenFromList: o } })}
                          className="co-action-btn co-action-blue"
                          style={{ flex: 2, height: '36px', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}
                        >
                          Ver y Aprobar
                        </button>
                        {o.estado !== 'pendiente_aprobacion' && (
                          <button
                            type="button"
                            onClick={() => openPDFPreview(o)}
                            className="co-action-btn co-action-blue"
                            style={{ flex: 1, height: '36px', justifyContent: 'center' }}
                            title="Ver PDF"
                          >
                            PDF
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {ordenes.length === 0 && (
                  <div className="prest-empty text-center py-8 text-slate-400 text-sm">
                    No hay órdenes de compra {estadoFilter === 'pendiente_aprobacion' ? 'pendientes de aprobación' : 'registradas'}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {ordenTotalPages > 1 && (
          <div className="co-pagination">
            <span className="text-xs font-medium text-slate-400">{ordenTotal} orden{ordenTotal !== 1 ? 'es' : ''}</span>
            <div className="flex items-center gap-1">
              <button disabled={ordenPage <= 1} onClick={() => setOrdenPage(p => p - 1)} className="co-page-btn">‹</button>
              <span className="text-xs font-semibold text-slate-500 px-2">{ordenPage} / {ordenTotalPages}</span>
              <button disabled={ordenPage >= ordenTotalPages} onClick={() => setOrdenPage(p => p + 1)} className="co-page-btn">›</button>
            </div>
          </div>
        )}
      </div>

      {/* Visor Reutilizable de PDF */}
      <PDFPreviewModal
        isOpen={isPDFOpen}
        onClose={() => setIsPDFOpen(false)}
        oc={previewOC}
        title="Orden de Compra"
      />
    </div>
  );
};
