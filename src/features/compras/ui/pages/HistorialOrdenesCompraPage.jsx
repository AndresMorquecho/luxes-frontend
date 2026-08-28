import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { getOrdenes, deleteOrden } from '../../application/comprasService';
import { ComprasOperativoNav } from '../components/ComprasOperativoNav';
import { PDFPreviewModal } from '../../../../shared/ui/components/PDFPreviewModal.jsx';
import { ModalPortal, deferClose } from '../../../../shared/ui/components/ModalPortal.jsx';
import { isAdminUser } from '../../../../shared/utils/userRoleHelpers';
import {
  ESTADO_ORDEN_LABELS,
  FILTROS_HISTORIAL,
  fmtDate,
  fmtDateTime,
  mapOrdenToPDFFormat,
} from '../../helpers/ordenCompraHelpers';
import { toast } from '../../../../shared/ui/components/Toast';
import { DateRangePicker } from '../../../../shared/ui/components/DateRangePicker.jsx';
import { ComprasPageHeader, ComprasHeaderButton } from '../components/ComprasPageHeader';
import './ComprasPage.css';

export const HistorialOrdenesCompraPage = () => {
  const navigate = useNavigate();
  const [user] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const isAdmin = isAdminUser(user);
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

  // Modal Confirmación Eliminar Orden
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [ordenToDelete, setOrdenToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleOpenDeleteModal = (orden) => {
    setOrdenToDelete(orden);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!ordenToDelete?.id) return;
    setDeleting(true);
    try {
      await deleteOrden(ordenToDelete.id);
      toast.success(`Orden ${ordenToDelete.numero || ''} eliminada correctamente`);
      setDeleteModalOpen(false);
      setOrdenToDelete(null);
      loadOrdenes();
    } catch (err) {
      toast.error(err?.message || 'Error al eliminar la orden de compra');
    } finally {
      setDeleting(false);
    }
  };

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
      <ComprasPageHeader
        title="Historial de órdenes de compra"
        subtitle={`Registro completo de solicitudes del área de ${areaLabel}: estados, fechas y seguimiento`}
        action={(
          <>
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600">
              {total} orden{total !== 1 ? 'es' : ''}
            </div>
            <ComprasHeaderButton onClick={() => navigate('/compras/nueva')}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Nueva orden
            </ComprasHeaderButton>
          </>
        )}
      />

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
                      {(() => {
                        const tieneAbonos = (o.abonos && o.abonos.length > 0) || (o.cuentaPorPagar && Number(o.cuentaPorPagar.montoPagado || 0) > 0) || o.estadoPago === 'pagado' || o.estadoPago === 'parcial';
                        const cannotDelete = !isAdmin || tieneAbonos;

                        let deleteReasonTooltip = 'Eliminar orden de compra';
                        if (!isAdmin) {
                          deleteReasonTooltip = 'Solo los administradores pueden eliminar órdenes de compra';
                        } else if (tieneAbonos) {
                          deleteReasonTooltip = 'No se puede eliminar: tiene pagos registrados. Anule los abonos primero.';
                        }

                        return (
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
                            <button
                              type="button"
                              disabled={cannotDelete}
                              onClick={() => handleOpenDeleteModal(o)}
                              className={`co-action-btn ${
                                cannotDelete
                                  ? 'opacity-40 cursor-not-allowed text-slate-300'
                                  : 'text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer'
                              }`}
                              title={deleteReasonTooltip}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })()}
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
              const tieneAbonos = (o.abonos && o.abonos.length > 0) || (o.cuentaPorPagar && Number(o.cuentaPorPagar.montoPagado || 0) > 0) || o.estadoPago === 'pagado' || o.estadoPago === 'parcial';
              const cannotDelete = !isAdmin || tieneAbonos;

              let deleteReasonTooltip = 'Eliminar orden de compra';
              if (!isAdmin) {
                deleteReasonTooltip = 'Solo los administradores pueden eliminar órdenes de compra';
              } else if (tieneAbonos) {
                deleteReasonTooltip = 'No se puede eliminar: tiene pagos registrados. Anule los abonos primero.';
              }

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
                      <button
                        type="button"
                        disabled={cannotDelete}
                        onClick={() => handleOpenDeleteModal(o)}
                        className={`co-action-btn ${
                          cannotDelete
                            ? 'opacity-40 cursor-not-allowed text-slate-300'
                            : 'text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer'
                        }`}
                        style={{ width: '32px', height: '32px', justifyContent: 'center' }}
                        title={deleteReasonTooltip}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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

      {/* Modal Confirmar Eliminación de Orden */}
      <ModalPortal open={deleteModalOpen}>
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div
            className="fixed inset-0 transition-opacity"
            style={{ background: 'rgba(15, 23, 42, 0.35)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}
            onClick={() => !deleting && setDeleteModalOpen(false)}
          />
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden relative z-[201] animate-slide-up p-5 sm:p-6">
            <div className="flex items-center gap-3 mb-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800">Eliminar Orden de Compra</h3>
                <p className="text-xs text-slate-500 font-mono font-semibold">{ordenToDelete?.numero || 'OC'}</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 mb-4 leading-relaxed">
              ¿Estás seguro de que deseas eliminar permanentemente la orden de <strong className="text-slate-800">{ordenToDelete?.proveedor?.nombre || 'proveedor'}</strong> por un valor de <strong className="text-slate-800 font-mono">${Number(ordenToDelete?.total || 0).toFixed(2)}</strong>?
            </p>

            <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 text-[11px] sm:text-xs text-amber-800 mb-5 leading-relaxed">
              <strong>Nota:</strong> Como esta orden no tiene pagos registrados, se eliminará de forma segura sin afectar saldos de cuentas ni la caja.
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'Eliminando...' : 'Eliminar definitivamente'}
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
};
