// src/shared/ui/components/PDFPreviewModal.jsx

import React, { useState, useEffect } from 'react';
import { Printer, X, ZoomIn, ZoomOut, FileText, Download } from 'lucide-react';
import { ModalPortal, deferClose } from './ModalPortal';
import './PDFPreviewModal.css';

/**
 * Reusable premium PDF-styled print preview modal.
 */
export function PDFPreviewModal({ isOpen, onClose, oc, proyecto, title = 'Orden de Compra' }) {
  const [zoom, setZoom] = useState(100);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen && oc) {
      setVisible(true);
    }
  }, [isOpen, oc]);

  useEffect(() => {
    if (!isOpen && visible) {
      const frame = window.requestAnimationFrame(() => {
        setVisible(false);
      });
      return () => window.cancelAnimationFrame(frame);
    }
  }, [isOpen, visible]);

  if (!visible || !oc) return null;

  const handleClose = () => deferClose(onClose);

  const handleDownload = () => {
    const originalTitle = document.title;
    document.title = `Orden_de_Compra_${oc.id || 'Borrador'}`;
    window.print();
    document.title = originalTitle;
  };

  const handlePrint = () => {
    window.print();
  };

  const totalEstimado = oc.items?.reduce(
    (sum, item) => sum + ((item.cantidadSolicitada || item.cantidad || 0) * (item.precioUnitario || 0)),
    0
  ) || 0;

  return (
    <ModalPortal>
      <div
        className="pdf-modal-overlay"
        onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      >
        <div className="pdf-modal-container" onMouseDown={(e) => e.stopPropagation()}>
          <div className="pdf-toolbar print:hidden">
            <div className="pdf-toolbar-left">
              <FileText size={18} className="text-blue-500" />
              <span className="pdf-doc-title">{title} - {oc.id || 'Borrador'}</span>
            </div>

            <div className="pdf-toolbar-center">
              <button
                type="button"
                onClick={() => setZoom(Math.max(50, zoom - 10))}
                className="pdf-tool-btn"
                title="Reducir"
              >
                <ZoomOut size={16} />
              </button>
              <span className="pdf-zoom-text">{zoom}%</span>
              <button
                type="button"
                onClick={() => setZoom(Math.min(150, zoom + 10))}
                className="pdf-tool-btn"
                title="Aumentar"
              >
                <ZoomIn size={16} />
              </button>
            </div>

            <div className="pdf-toolbar-right">
              <span className="pdf-page-indicator">Pág. 1 de 1</span>
              <button type="button" onClick={handleDownload} className="pdf-download-btn" title="Guardar / Descargar PDF">
                <Download size={14} />
                Descargar PDF
              </button>
              <button type="button" onClick={handlePrint} className="pdf-print-btn" title="Imprimir documento">
                <Printer size={14} />
                Imprimir
              </button>
              <button type="button" onClick={handleClose} className="pdf-close-btn" title="Cerrar">
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="pdf-scroll-area">
            <div
              className="pdf-page-container"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
            >
              <div className="pdf-sheet">
                <div className="pdf-sheet-header">
                  <div className="pdf-header-left">
                    <h1 className="pdf-brand-title">LUXES 2026</h1>
                    <p className="pdf-brand-subtitle">PORTAL &amp; ILUMINACIÓN</p>
                    <p className="pdf-brand-meta">
                      RUC: 0991234567001<br />
                      Taller de Diseño, Producción e Instalación<br />
                      Guayaquil, Ecuador • Telf: (04) 255-8899
                    </p>
                  </div>
                  <div className="pdf-header-right">
                    <div className="pdf-doc-badge">ORDEN DE COMPRA</div>
                    <h2 className="pdf-doc-id">{oc.id || 'BORRADOR'}</h2>
                    <p className="pdf-doc-date">Fecha Solicitud: {oc.fechaCreacion || new Date().toISOString().split('T')[0]}</p>
                    <p className="pdf-doc-status">Estado: {oc.estado || 'PENDIENTE'}</p>
                  </div>
                </div>

                <div className="pdf-meta-grid">
                  <div className="pdf-meta-box">
                    <span className="pdf-box-title">DATOS DEL PROYECTO</span>
                    <div className="pdf-box-content">
                      <p><strong>Proyecto:</strong> {proyecto?.nombre || oc.proyectoNombre || 'No especificado'}</p>
                      <p><strong>ID Proyecto:</strong> {proyecto?.id || oc.proyectoId || 'N/D'}</p>
                      <p><strong>Responsable:</strong> {proyecto?.responsable || 'Taller de Instalación'}</p>
                    </div>
                  </div>

                  <div className="pdf-meta-box">
                    <span className="pdf-box-title">DESTINATARIO / INSTALACIÓN</span>
                    <div className="pdf-box-content">
                      <p><strong>Cliente:</strong> {proyecto?.cliente?.empresa || 'Cliente Particular'}</p>
                      <p><strong>Contacto:</strong> {proyecto?.cliente?.nombre || 'N/D'}</p>
                      <p><strong>Ubicación:</strong> {proyecto?.fases?.INSTALACION?.datos?.direccionInstalacion || proyecto?.cliente?.direccion || 'Guayaquil, Ecuador'}</p>
                    </div>
                  </div>
                </div>

                <div className="pdf-table-container">
                  <table className="pdf-items-table">
                    <thead>
                      <tr>
                        <th style={{ width: '15%' }}>SKU / CÓDIGO</th>
                        <th style={{ width: '45%' }}>DESCRIPCIÓN DEL MATERIAL</th>
                        <th style={{ width: '15%', textAlign: 'center' }}>CANTIDAD</th>
                        <th style={{ width: '12%', textAlign: 'right' }}>P. UNIT.</th>
                        <th style={{ width: '13%', textAlign: 'right' }}>TOTAL EST.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {oc.items && oc.items.length > 0 ? (
                        oc.items.map((item, idx) => {
                          const cant = item.cantidadSolicitada !== undefined ? item.cantidadSolicitada : (item.cantidad || 0);
                          const totalItem = cant * (item.precioUnitario || 0);
                          return (
                            <tr key={idx}>
                              <td className="font-mono text-xs">{item.sku}</td>
                              <td className="font-bold">{item.nombre}</td>
                              <td style={{ textAlign: 'center' }}>{cant} {item.unidad}s</td>
                              <td style={{ textAlign: 'right' }}>${(item.precioUnitario || 0).toFixed(2)}</td>
                              <td style={{ textAlign: 'right' }} className="font-bold">${totalItem.toFixed(2)}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center', fontStyle: 'italic', padding: '2rem' }}>
                            Sin materiales enlistados en esta orden.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="4" className="pdf-total-label">COSTO TOTAL ESTIMADO (USD):</td>
                        <td className="pdf-total-val">${totalEstimado.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="pdf-notes-section">
                  <p className="pdf-notes-title">OBSERVACIONES Y NOTAS:</p>
                  <p className="pdf-notes-text">
                    {oc.comentarios || 'Esta solicitud de materiales ha sido generada por el personal de montaje en sitio. Los precios cargados corresponden a estimaciones y cotizaciones referenciales del inventario.'}
                  </p>
                </div>

                <div className="pdf-signatures-row">
                  <div className="pdf-signature-field">
                    <div className="pdf-signature-line" />
                    <span className="pdf-signature-lbl">Solicitante Técnico</span>
                    <span className="pdf-signature-lbl-sub">Taller de Montaje e Instalaciones</span>
                  </div>
                  <div className="pdf-signature-field">
                    <div className="pdf-signature-line" />
                    <span className="pdf-signature-lbl">Autorizado Por</span>
                    <span className="pdf-signature-lbl-sub">Administración de Proyectos - LUXES</span>
                  </div>
                </div>

                <div className="pdf-sheet-footer">
                  Documento generado electrónicamente en el Portal Operativo Luxes 2026. Todos los derechos reservados.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
