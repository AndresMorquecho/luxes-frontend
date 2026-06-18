import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { getOrdenById, recepcionarOrden } from '../../../compras/application/comprasService';
import { toast } from '../../../../shared/ui/components/Toast';
import { PDFPreviewModal } from '../../../../shared/ui/components/PDFPreviewModal.jsx';
import './RecepcionInsumos.css';

const fmt = (n) => '$' + Number(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-EC', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

export const RecepcionInsumosFormPage = () => {
  const { ordenId } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const isTaller = user?.rol === 'taller';

  const [orden, setOrden] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detalles, setDetalles] = useState([]);
  const [observaciones, setObservaciones] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const [recepcionData, setRecepcionData] = useState(null);
  const [showOrdenPDF, setShowOrdenPDF] = useState(false);

  useEffect(() => {
    loadOrden();
  }, [ordenId]);

  const loadOrden = async () => {
    setLoading(true);
    try {
      const data = await getOrdenById(ordenId);
      if (data.estado !== 'aprobada') {
        toast.error('Esta orden no está en estado aprobada');
        navigate('/inventario/recepcion');
        return;
      }
      setOrden(data);
      
      // Inicializar detalles con cantidades para editar
      const initialDetalles = (data.detalles || []).map(d => ({
        id: d.id,
        descripcion: d.descripcion,
        materialId: d.materialId,
        cantidadSolicitada: d.cantidad,
        cantidadRecibida: String(d.cantidad), // String to allow clearing
        precioUnitario: d.precioUnitario,
        observacion: ''
      }));
      setDetalles(initialDetalles);
    } catch (err) {
      toast.error('Error al cargar la orden: ' + err.message);
      navigate('/inventario/recepcion');
    } finally {
      setLoading(false);
    }
  };

  const handleCantidadChange = (index, value) => {
    setDetalles(prev => prev.map((item, idx) =>
      idx === index ? { ...item, cantidadRecibida: value } : item
    ));
  };

  const handleObservacionChange = (index, value) => {
    setDetalles(prev => prev.map((item, idx) =>
      idx === index ? { ...item, observacion: value } : item
    ));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar que al menos un item tenga cantidad > 0
    const hasItems = detalles.some(d => (parseFloat(d.cantidadRecibida) || 0) > 0);
    if (!hasItems) {
      toast.error('Debe recepcionar al menos un item con cantidad mayor a 0');
      return;
    }

    setSaving(true);
    try {
      const payload = detalles
        .filter(d => (parseFloat(d.cantidadRecibida) || 0) > 0)
        .map(d => ({
          materialId: d.materialId,
          cantidad: parseFloat(d.cantidadRecibida) || 0,
        }));

      await recepcionarOrden(orden.id, payload);
      
      // Preparar datos para el PDF
      const recepcion = {
        numeroOrden: orden.numero,
        fecha: new Date().toISOString(),
        proveedor: orden.proveedor?.nombre || '—',
        solicitante: orden.usuario?.nombre || '—',
        observaciones: observaciones || 'Sin observaciones',
        items: detalles.filter(d => (parseFloat(d.cantidadRecibida) || 0) > 0).map(d => ({
          ...d,
          cantidadRecibida: parseFloat(d.cantidadRecibida) || 0
        })),
        total: orden.total
      };
      
      setRecepcionData(recepcion);
      setShowPDFPreview(true);
      
      toast.success('Insumos recibidos e ingresados al inventario con éxito');
    } catch (err) {
      toast.error('Error al recepcionar: ' + err.message);
      setSaving(false);
    }
  };

  const handleClosePDF = () => {
    setShowPDFPreview(false);
    navigate('/inventario/recepcion');
  };

  const handleVerPDF = () => {
    setShowOrdenPDF(true);
  };

  const handleCloseOrdenPDF = () => {
    setShowOrdenPDF(false);
  };

  // Mapear la orden al formato esperado por PDFPreviewModal
  const mapOrdenToPDFFormat = (orden) => {
    if (!orden) return null;
    
    return {
      id: orden.numero,
      fechaCreacion: fmtDate(orden.fecha),
      estado: orden.estado?.toUpperCase() || 'APROBADA',
      proyectoNombre: orden.concepto || 'Sin especificar',
      proyectoId: 'N/D',
      comentarios: orden.notas || 'Sin observaciones',
      items: (orden.detalles || []).map(d => ({
        sku: d.materialId || 'N/D',
        nombre: d.descripcion,
        cantidad: d.cantidad,
        cantidadSolicitada: d.cantidad,
        unidad: 'unidad',
        precioUnitario: d.precioUnitario
      }))
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

  if (!orden) {
    return null;
  }

  const totalSolicitado = detalles.reduce((sum, d) => sum + d.cantidadSolicitada, 0);
  const totalRecibido = detalles.reduce((sum, d) => sum + (parseFloat(d.cantidadRecibida) || 0), 0);

  return (
    <div className="ri-form-page animate-slide-up">
      {/* Header */}
      <div className="ri-form-header">
        <button onClick={() => navigate('/inventario/recepcion')} className="ri-back-btn">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Volver
        </button>
      </div>

      {/* Info Card */}
      <div className="ri-info-card">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold mb-0.5">Recepción de Insumos</h2>
            <p className="text-sm opacity-90">Registra la cantidad recibida de cada item y observaciones</p>
          </div>
          {!isTaller && (
            <button
              type="button"
              onClick={handleVerPDF}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-blue-300 bg-white/40 hover:bg-blue-50 text-blue-700 font-bold transition-all text-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
              </svg>
              Ver Orden de Compra
            </button>
          )}
        </div>
        
        <div className="ri-info-grid">
          <div className="ri-info-item">
            <label>Orden de Compra</label>
            <p className="font-mono">{orden.numero}</p>
          </div>
          <div className="ri-info-item">
            <label>Proveedor</label>
            <p>{orden.proveedor?.nombre || '—'}</p>
          </div>
          <div className="ri-info-item">
            <label>Solicitante</label>
            <p>{orden.usuario?.nombre || '—'}</p>
          </div>
          <div className="ri-info-item">
            <label>Fecha Orden</label>
            <p>{fmtDate(orden.fecha)}</p>
          </div>
          {orden.fechaAprobacion && (
            <>
              <div className="ri-info-item">
                <label>Aprobada el</label>
                <p className="font-semibold text-green-700">{fmtDate(orden.fechaAprobacion)}</p>
              </div>
              <div className="ri-info-item">
                <label>Aprobada por</label>
                <p className="font-semibold text-green-700">{orden.aprobadoPor?.nombre || '—'}</p>
              </div>
            </>
          )}
          {!isTaller && (
            <div className="ri-info-item">
              <label>Total Orden</label>
              <p className="font-bold">{fmt(orden.total)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="ri-card">
        <div className="ri-form-section">
          <h3 className="ri-section-title">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
            </svg>
            Items de la Orden
          </h3>

          <div className="ri-alert ri-alert-info">
            <strong>Instrucciones:</strong> Ingresa la cantidad real recibida de cada item. Puedes dejar en 0 los items que no se recibieron aún. Las observaciones son opcionales.
          </div>

          <div className="overflow-x-auto">
            <table className="ri-items-table">
              <thead>
                <tr>
                  <th style={{ width: isTaller ? '40%' : '35%' }}>Descripción</th>
                  <th style={{ width: '15%', textAlign: 'center' }}>Solicitada</th>
                  <th style={{ width: '15%', textAlign: 'center' }}>Recibida</th>
                  {!isTaller && <th style={{ width: '15%', textAlign: 'right' }}>Precio Unit.</th>}
                  <th style={{ width: isTaller ? '30%' : '20%' }}>Observaciones</th>
                </tr>
              </thead>
              <tbody>
                {detalles.map((detalle, index) => (
                  <tr key={index}>
                    <td className="font-semibold text-slate-700">{detalle.descripcion}</td>
                    <td style={{ textAlign: 'center' }} className="font-bold text-slate-600">{detalle.cantidadSolicitada}</td>
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={detalle.cantidadRecibida}
                        onChange={(e) => handleCantidadChange(index, e.target.value)}
                        className="ri-input"
                        style={{ maxWidth: '100px', textAlign: 'center', margin: '0 auto' }}
                      />
                    </td>
                    {!isTaller && <td style={{ textAlign: 'right' }} className="font-semibold text-slate-700">{fmt(detalle.precioUnitario)}</td>}
                    <td>
                      <input
                        type="text"
                        value={detalle.observacion}
                        onChange={(e) => handleObservacionChange(index, e.target.value)}
                        placeholder="Opcional..."
                        className="ri-input"
                        style={{ fontSize: '0.8125rem' }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'rgba(248,250,252,0.9)', borderTop: '2px solid rgba(226,232,240,0.8)' }}>
                  <td className="font-bold text-slate-800">TOTALES</td>
                  <td style={{ textAlign: 'center' }} className="font-bold text-slate-800">{totalSolicitado}</td>
                  <td style={{ textAlign: 'center' }} className="font-bold text-blue-700 text-lg">{totalRecibido}</td>
                  <td colSpan={isTaller ? 1 : 2}></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div style={{ marginTop: '2rem' }}>
            <label className="ri-label">Observaciones Generales de la Recepción</label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Escribe cualquier observación sobre la recepción de estos insumos..."
              className="ri-textarea"
            />
          </div>
        </div>

        <div className="ri-form-actions">
          <button type="button" onClick={() => navigate('/inventario/recepcion')} className="ri-btn-cancel">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="ri-btn-submit">
            {saving && <div className="ri-spinner-sm" />}
            {saving ? 'Guardando...' : 'Guardar Recepción'}
          </button>
        </div>
      </form>

      {/* PDF Preview Modal - Recepción */}
      {showPDFPreview && recepcionData && createPortal(
        <PDFRecepcionModal 
          recepcion={recepcionData} 
          onClose={handleClosePDF}
        />,
        document.body
      )}

      {/* PDF Preview Modal - Orden de Compra (Reutilizable) */}
      <PDFPreviewModal
        isOpen={showOrdenPDF}
        onClose={handleCloseOrdenPDF}
        oc={mapOrdenToPDFFormat(orden)}
        proyecto={{
          nombre: orden?.concepto || 'Sin proyecto asignado',
          id: 'N/D',
          responsable: orden?.usuario?.nombre || 'N/D',
          cliente: {
            empresa: orden?.proveedor?.nombre || 'Sin proveedor',
            nombre: orden?.proveedor?.contacto || 'N/D',
            direccion: orden?.proveedor?.direccion || 'N/D'
          }
        }}
        title="Orden de Compra"
      />
    </div>
  );
};

// Componente Modal para vista previa y descarga del PDF
const PDFRecepcionModal = ({ recepcion, onClose }) => {
  const handleDownload = () => {
    // Generar PDF usando la biblioteca jsPDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Título
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('COMPROBANTE DE RECEPCIÓN DE INSUMOS', 105, 20, { align: 'center' });

    // Info de la recepción
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Orden de Compra: ${recepcion.numeroOrden}`, 20, 35);
    doc.text(`Fecha de Recepción: ${fmtDate(recepcion.fecha)}`, 20, 42);
    doc.text(`Proveedor: ${recepcion.proveedor}`, 20, 49);
    doc.text(`Recibido por: ${recepcion.solicitante}`, 20, 56);

    // Tabla de items
    doc.setFont(undefined, 'bold');
    doc.text('Descripción', 20, 70);
    doc.text('Cant. Solicitada', 120, 70);
    doc.text('Cant. Recibida', 160, 70);
    
    doc.setLineWidth(0.5);
    doc.line(20, 72, 190, 72);

    let y = 80;
    doc.setFont(undefined, 'normal');
    recepcion.items.forEach((item) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(item.descripcion.substring(0, 45), 20, y);
      doc.text(String(item.cantidadSolicitada), 130, y, { align: 'center' });
      doc.text(String(item.cantidadRecibida), 170, y, { align: 'center' });
      if (item.observacion) {
        y += 6;
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(`Obs: ${item.observacion}`, 25, y);
        doc.setFontSize(10);
        doc.setTextColor(0);
      }
      y += 10;
    });

    // Observaciones generales
    if (recepcion.observaciones && recepcion.observaciones !== 'Sin observaciones') {
      y += 10;
      doc.setFont(undefined, 'bold');
      doc.text('Observaciones Generales:', 20, y);
      y += 7;
      doc.setFont(undefined, 'normal');
      const obsLines = doc.splitTextToSize(recepcion.observaciones, 170);
      doc.text(obsLines, 20, y);
    }

    // Footer con firmas
    y = 250;
    doc.line(20, y, 80, y);
    doc.text('Firma Bodeguero', 50, y + 7, { align: 'center' });
    
    doc.line(110, y, 170, y);
    doc.text('Firma Proveedor', 140, y + 7, { align: 'center' });

    // Guardar
    doc.save(`Recepcion_${recepcion.numeroOrden}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm" 
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
        <div 
          className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl animate-co-modal-in flex flex-col"
          style={{ maxHeight: '90vh' }}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Recepción Completada</h2>
              <p className="text-xs text-slate-500 mt-0.5">Descarga el comprobante de recepción</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="overflow-y-auto p-6 flex-1">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-green-900 mb-1">¡Recepción Exitosa!</h3>
                  <p className="text-sm text-green-700">Los insumos han sido ingresados al inventario. Descarga el comprobante para tus registros.</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 font-medium">Orden de Compra:</span>
                <span className="font-mono font-bold text-slate-800">{recepcion.numeroOrden}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 font-medium">Proveedor:</span>
                <span className="font-semibold text-slate-800">{recepcion.proveedor}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 font-medium">Items Recibidos:</span>
                <span className="font-bold text-blue-700">{recepcion.items.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 font-medium">Total Unidades:</span>
                <span className="font-bold text-blue-700">{recepcion.items.reduce((sum, i) => sum + i.cantidadRecibida, 0)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 shrink-0 bg-slate-50">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-white font-semibold transition-colors text-sm">
              Cerrar
            </button>
            <button onClick={handleDownload} className="flex items-center gap-2 px-5 py-2 rounded-lg text-white font-bold transition-all hover:shadow-lg text-sm"
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Descargar PDF
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
