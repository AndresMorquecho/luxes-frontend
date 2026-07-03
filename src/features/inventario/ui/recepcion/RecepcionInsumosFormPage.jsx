import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getOrdenById, recepcionarOrden } from '../../../compras/application/comprasService';
import { toast } from '../../../../shared/ui/components/Toast';
import { PDFPreviewModal } from '../../../../shared/ui/components/PDFPreviewModal.jsx';
import { ModalPortal, deferClose } from '../../../../shared/ui/components/ModalPortal';
import { formatDateOnlyES, toDateInputValue, todayDateInputValue } from '../../../../shared/utils/dateOnly.js';
import './RecepcionInsumos.css';

const fmtDate = (d) => formatDateOnlyES(d, { year: 'numeric', month: 'long', day: 'numeric' });

const mapDetalleFromOrden = (d) => ({
  id: d.id,
  descripcion: d.descripcion,
  materialId: d.materialId,
  cantidadSolicitada: d.cantidad,
  cantidadRecibida: d.cantidadRecibida != null ? String(d.cantidadRecibida) : String(d.cantidad),
  precioUnitario: d.precioUnitario,
  observacion: '',
  descargableInventario: d.descargableInventario ?? !!d.materialId,
  fechaRecepcion: d.fechaRecepcion
    ? toDateInputValue(d.fechaRecepcion)
    : todayDateInputValue(),
  yaRecibido: (d.cantidadRecibida ?? 0) > 0,
});

export const RecepcionInsumosFormPage = ({ basePath = '/compras/recepcion' }) => {
  const { ordenId } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const isTaller = user?.rol === 'taller';

  const [orden, setOrden] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detalles, setDetalles] = useState([]);
  const [observaciones, setObservaciones] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [showOrdenPDF, setShowOrdenPDF] = useState(false);

  const loadOrden = useCallback(async () => {
    const data = await getOrdenById(ordenId);
    const estadosValidos = ['aprobada', 'parcialmente_recibida'];
    if (!estadosValidos.includes(data.estado)) {
      toast.error('Esta orden no tiene productos pendientes por recibir');
      navigate(basePath);
      return null;
    }
    setOrden(data);
    setObservaciones(data.notasRecepcion || '');
    setDetalles((data.detalles || []).map(mapDetalleFromOrden));
    return data;
  }, [ordenId, basePath, navigate]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        if (cancelled) return;
        await loadOrden();
      } catch (err) {
        if (!cancelled) {
          toast.error('Error al cargar la orden: ' + err.message);
          navigate(basePath);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [loadOrden, basePath, navigate]);

  const updateDetalle = (index, patch) => {
    setDetalles(prev => prev.map((item, idx) => (idx === index ? { ...item, ...patch } : item)));
  };

  const handleRecepcionarItem = async (index) => {
    const detalle = detalles[index];
    if (detalle.yaRecibido) return;

    const cantidad = parseFloat(detalle.cantidadRecibida) || 0;
    if (cantidad <= 0) {
      toast.error('Indica una cantidad recibida mayor a 0');
      return;
    }
    if (!detalle.fechaRecepcion) {
      toast.error('Indica la fecha en que llegó el producto');
      return;
    }

    setSavingId(detalle.id);
    try {
      const payload = {
        notasRecepcion: observaciones || undefined,
        detalles: [{
          detalleId: detalle.id,
          materialId: detalle.materialId,
          cantidad,
          fechaRecepcion: detalle.fechaRecepcion,
          descargableInventario: detalle.descargableInventario === true && !!detalle.materialId,
          observacion: detalle.observacion || undefined,
        }],
      };

      const updated = await recepcionarOrden(orden.id, payload);

      const ingresoInventario = payload.detalles[0].descargableInventario;
      if (ingresoInventario) {
        toast.success(`"${detalle.descripcion}" recibido e ingresado al inventario.`);
      } else {
        toast.success(`"${detalle.descripcion}" recibido correctamente.`);
      }

      if (updated.estado === 'recibida') {
        toast.success('Orden de compra recibida en su totalidad');
        navigate(basePath);
      } else {
        await loadOrden();
      }
    } catch (err) {
      toast.error('Error al recibir el producto: ' + err.message);
    } finally {
      setSavingId(null);
    }
  };

  const mapOrdenToPDFFormat = (ordenData) => {
    if (!ordenData) return null;
    return {
      id: ordenData.numero,
      fechaCreacion: fmtDate(ordenData.fecha),
      estado: ordenData.estado?.toUpperCase() || 'APROBADA',
      proyectoNombre: ordenData.concepto || 'Sin especificar',
      proyectoId: 'N/D',
      comentarios: ordenData.notas || 'Sin observaciones',
      items: (ordenData.detalles || []).map(d => ({
        sku: d.materialId || 'N/D',
        nombre: d.descripcion,
        cantidad: d.cantidad,
        cantidadSolicitada: d.cantidad,
        unidad: 'unidad',
        precioUnitario: d.precioUnitario,
      })),
    };
  };

  if (loading) {
    return (
      <div className="ri-form-page">
        <div className="ri-card" style={{ padding: '4rem 2rem' }}>
          <div className="flex flex-col items-center gap-3">
            <div className="ri-spinner" />
            <p className="text-slate-500 font-medium">Cargando orden de compra...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!orden) return null;

  const pendientes = detalles.filter(d => !d.yaRecibido);
  const recibidos = detalles.filter(d => d.yaRecibido);

  return (
    <div className="ri-form-page animate-slide-up">
      <div className="ri-form-header">
        <button type="button" onClick={() => navigate(basePath)} className="ri-back-btn">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Volver
        </button>
      </div>

      <div className="ri-order-bar">
        <div className="ri-order-bar-main">
          <span className="ri-order-bar-num">{orden.numero}</span>
          <span className="ri-order-bar-sep">·</span>
          <span className="ri-order-bar-prov">{orden.proveedor?.nombre || 'Sin proveedor'}</span>
        </div>
        <div className="ri-order-bar-actions">
          <span className="ri-badge-parcial">{recibidos.length}/{detalles.length} recibidos</span>
          {!isTaller && (
            <button type="button" onClick={() => setShowOrdenPDF(true)} className="ri-btn-link">
              Ver OC
            </button>
          )}
        </div>
      </div>

      <div className="ri-card ri-products-panel">
        <p className="ri-hint">Registra un producto a la vez: cantidad, fecha de llegada y si suma al inventario.</p>

        <div className="ri-product-list">
          {detalles.map((detalle, index) => (
            <div
              key={detalle.id}
              className={`ri-product-card ${detalle.yaRecibido ? 'ri-product-card--done' : ''}`}
            >
              <div className="ri-product-card-head">
                <h4 className="ri-product-name">{detalle.descripcion}</h4>
                {detalle.yaRecibido ? (
                  <span className="ri-tag-recibido">Recibido</span>
                ) : (
                  <span className="ri-product-pedido">Pedido: {detalle.cantidadSolicitada}</span>
                )}
              </div>

              {detalle.yaRecibido ? (
                <div className="ri-product-summary">
                  <span><strong>{detalle.cantidadRecibida}</strong> u.</span>
                  <span>{fmtDate(detalle.fechaRecepcion)}</span>
                  {detalle.descargableInventario && detalle.materialId ? (
                    <span className="ri-badge-inv">Inventario</span>
                  ) : null}
                </div>
              ) : (
                <div className="ri-product-form">
                  <div className="ri-product-field">
                    <label>Cantidad recibida</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={detalle.cantidadRecibida}
                      onChange={(e) => updateDetalle(index, { cantidadRecibida: e.target.value })}
                      className="ri-input"
                    />
                  </div>
                  <div className="ri-product-field">
                    <label>Fecha de llegada</label>
                    <input
                      type="date"
                      value={detalle.fechaRecepcion}
                      onChange={(e) => updateDetalle(index, { fechaRecepcion: e.target.value })}
                      className="ri-input"
                    />
                  </div>
                  <label
                    className={`ri-product-inv ${!detalle.materialId ? 'ri-product-inv--off' : ''}`}
                    title={detalle.materialId ? 'Sumar al stock' : 'Sin material en inventario'}
                  >
                    <input
                      type="checkbox"
                      checked={detalle.descargableInventario && !!detalle.materialId}
                      disabled={!detalle.materialId}
                      onChange={(e) => updateDetalle(index, { descargableInventario: e.target.checked })}
                    />
                    <span>Sumar a inventario</span>
                  </label>
                  <button
                    type="button"
                    disabled={savingId === detalle.id}
                    onClick={() => handleRecepcionarItem(index)}
                    className="ri-btn-item-recepcionar ri-btn-item-recepcionar--block"
                  >
                    {savingId === detalle.id ? <div className="ri-spinner-sm" /> : 'Recibir producto'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {pendientes.length > 0 && (
          <details className="ri-notes-details">
            <summary>Notas opcionales</summary>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Alguna nota sobre esta orden..."
              className="ri-textarea"
              rows={2}
            />
          </details>
        )}

        <div className="ri-form-actions ri-form-actions--compact">
          <button type="button" onClick={() => navigate(basePath)} className="ri-btn-cancel">
            {pendientes.length === 0 ? 'Volver' : 'Continuar después'}
          </button>
        </div>
      </div>

      {showOrdenPDF && orden && (
        <PDFPreviewModal
          isOpen
          onClose={() => setShowOrdenPDF(false)}
          oc={mapOrdenToPDFFormat(orden)}
          proyecto={{
            nombre: orden?.concepto || 'Sin proyecto asignado',
            id: 'N/D',
            responsable: orden?.usuario?.nombre || 'N/D',
            cliente: {
              empresa: orden?.proveedor?.nombre || 'Sin proveedor',
              nombre: orden?.proveedor?.contacto || 'N/D',
              direccion: orden?.proveedor?.direccion || 'N/D',
            },
          }}
          title="Orden de Compra"
        />
      )}
    </div>
  );
};
