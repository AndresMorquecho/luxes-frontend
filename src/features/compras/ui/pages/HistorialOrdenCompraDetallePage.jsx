import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getOrdenById } from '../../application/comprasService';
import { ComprasOperativoNav } from '../components/ComprasOperativoNav';
import { PDFPreviewModal } from '../../../../shared/ui/components/PDFPreviewModal.jsx';
import {
  ESTADO_ORDEN_LABELS,
  buildOrdenTimeline,
  fmtDate,
  fmtDateTime,
  fmtMoney,
  mapOrdenToPDFFormat,
  isOrdenEditablePorRecepcion,
} from '../../helpers/ordenCompraHelpers';
import { toast } from '../../../../shared/ui/components/Toast';
import './ComprasPage.css';

export const HistorialOrdenCompraDetallePage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [user] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const userRole = (user?.rol || '').toLowerCase();
  const isImpresion = userRole === 'impresión' || userRole === 'impresion';
  const isTaller = userRole === 'taller';

  const [orden, setOrden] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPDFOpen, setIsPDFOpen] = useState(false);

  const loadOrden = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOrdenById(id);
      const creadorRol = (data.usuario?.rol || '').toLowerCase();
      const allowed =
        !isImpresion && !isTaller ||
        (isImpresion && (creadorRol === 'impresión' || creadorRol === 'impresion')) ||
        (isTaller && creadorRol === 'taller');
      if (!allowed) {
        toast.error('No tienes acceso a esta orden de compra');
        navigate('/compras/historial');
        return;
      }
      setOrden(data);
    } catch (err) {
      toast.error(err.message || 'Error al cargar la orden');
      navigate('/compras/historial');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, isImpresion, isTaller]);

  useEffect(() => {
    loadOrden();
  }, [loadOrden]);

  if (loading) {
    return (
      <div className="co-page animate-slide-up">
        <div className="co-loader-box" style={{ minHeight: '320px' }}><div className="co-spinner" /></div>
      </div>
    );
  }

  if (!orden) return null;

  const badge = ESTADO_ORDEN_LABELS[orden.estado] || { bg: '#f1f5f9', color: '#64748b', label: orden.estado };
  const timeline = buildOrdenTimeline(orden);

  return (
    <div className="co-page animate-slide-up">
      <div className="co-card co-header">
        <div>
          <button type="button" onClick={() => navigate('/compras/historial')} className="co-back-link">
            ← Volver al historial
          </button>
          <h1 className="co-title mt-2">{orden.numero}</h1>
          <p className="co-subtitle">{orden.concepto || 'Orden de compra'}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="co-badge" style={{ background: badge.bg, color: badge.color, fontSize: '12px', padding: '6px 12px' }}>
            {badge.label}
          </span>
          <button type="button" onClick={() => setIsPDFOpen(true)} className="co-btn-primary">
            Ver PDF
          </button>
          {orden.estado === 'pendiente_aprobacion' && isOrdenEditablePorRecepcion(orden.estado) && (
            <button type="button" onClick={() => navigate(`/compras/editar/${orden.id}`)} className="co-btn-ghost" style={{ border: '1px solid #e2e8f0' }}>
              Editar
            </button>
          )}
        </div>
      </div>

      <ComprasOperativoNav />

      <div className="co-detail-grid">
        <div className="co-card co-detail-panel">
          <h2 className="co-detail-title">Información general</h2>
          <dl className="co-detail-list">
            <div><dt>Solicitante</dt><dd>{orden.usuario?.nombre || '—'}</dd></div>
            <div><dt>Proveedor</dt><dd>{orden.proveedor?.nombre || 'Sin proveedor asignado'}</dd></div>
            <div><dt>Fecha solicitud</dt><dd>{fmtDate(orden.fechaCreacion || orden.fecha)}</dd></div>
            <div><dt>Aprobación</dt><dd>{orden.fechaAprobacion ? fmtDateTime(orden.fechaAprobacion) : '—'}</dd></div>
            <div><dt>Recepción</dt><dd>{orden.fechaRecepcion ? fmtDateTime(orden.fechaRecepcion) : '—'}</dd></div>
            {orden.notas && (
              <div className="co-detail-full"><dt>Notas / observaciones</dt><dd>{orden.notas}</dd></div>
            )}
          </dl>
        </div>

        <div className="co-card co-detail-panel">
          <h2 className="co-detail-title">Seguimiento</h2>
          <ol className="co-timeline">
            {timeline.map((step) => (
              <li key={step.key} className={`co-timeline-item ${step.done ? 'done' : ''} ${step.failed ? 'failed' : ''}`}>
                <div className="co-timeline-dot" />
                <div>
                  <p className="co-timeline-label">{step.label}</p>
                  {step.date && <p className="co-timeline-date">{fmtDateTime(step.date)}</p>}
                  {step.detail && <p className="co-timeline-detail">{step.detail}</p>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="co-card co-table-card mt-6">
        <div className="co-table-header" style={{ borderBottom: '1px solid #f1f5f9' }}>
          <h2 className="co-detail-title" style={{ margin: 0 }}>Detalle de ítems</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="co-table">
            <thead>
              <tr>
                <th>Descripción</th>
                <th className="text-center">Cantidad</th>
                <th className="text-right">Precio unit.</th>
                <th className="text-right">Subtotal</th>
                <th className="text-center">Recibido</th>
              </tr>
            </thead>
            <tbody>
              {(orden.detalles || []).map((d) => (
                <tr key={d.id} className="co-tr">
                  <td className="text-slate-800 text-sm font-medium">{d.descripcion}</td>
                  <td className="text-center text-sm">{d.cantidad}</td>
                  <td className="text-right text-sm">{fmtMoney(d.precioUnitario)}</td>
                  <td className="text-right text-sm font-semibold">{fmtMoney(d.subtotal ?? d.cantidad * (d.precioUnitario || 0))}</td>
                  <td className="text-center text-sm text-slate-600">
                    {d.cantidadRecibida != null && d.cantidadRecibida > 0 ? d.cantidadRecibida : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <PDFPreviewModal
        isOpen={isPDFOpen}
        onClose={() => setIsPDFOpen(false)}
        oc={mapOrdenToPDFFormat(orden)}
      />
    </div>
  );
};
