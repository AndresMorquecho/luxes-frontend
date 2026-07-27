import React, { useState, useRef } from 'react';
import { Printer, X, ZoomIn, ZoomOut, FileText, Download } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { ModalPortal, deferClose } from '../../../../shared/ui/components/ModalPortal.jsx';
import '../../../../shared/ui/components/PDFPreviewModal.css';

const formatUSD = (val) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val ?? 0);

export const ProformaPDF = ({ proforma, configuracion, onClose }) => {
  const [zoom, setZoom] = useState(100);
  const contentRef = useRef(null);

  const subTotal = proforma.items.reduce((s, i) => s + (i.cantidad || 0) * (i.precioUnitario || 0), 0);
  const ivaVal = subTotal * (proforma.iva ?? 0.12);
  const total = subTotal + ivaVal;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!contentRef.current) return;
    
    const element = contentRef.current;
    const opt = {
      margin: 0,
      filename: `Proforma_${proforma.id || 'Borrador'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait'
      }
    };

    html2pdf().set(opt).from(element).save();
  };

  return (
    <ModalPortal>
    <div className="pdf-modal-overlay" onClick={() => deferClose(onClose)}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        .lx-pdf * { font-family: 'Inter', Arial, sans-serif; box-sizing: border-box; }

        /* ── Estilos de impresión (window.print) ── */
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          html, body {
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: visible !important;
          }
          .pdf-modal-overlay {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
            z-index: 99999 !important;
          }
          .pdf-modal-container {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100vh !important;
            max-width: none !important;
            max-height: none !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .pdf-toolbar {
            display: none !important;
          }
          .pdf-scroll-area {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100vh !important;
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            display: block !important;
          }
          .pdf-page-container {
            width: 100% !important;
            height: 100vh !important;
            transform: none !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            display: block !important;
          }
          .pdf-sheet {
            width: 100% !important;
            height: 100vh !important;
            min-height: 100vh !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          /* Forzar la impresión exacta de colores y fondos */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          .lx-table th {
            background: #34d399 !important;
            color: white !important;
          }
          .lx-footer {
            background: linear-gradient(135deg, #e8b84b 0%, #d4a017 100%) !important;
          }
        }

        /* ── Tabla ── */
        .lx-table { width: 100%; border-collapse: collapse; }
        .lx-table th {
          background: #34d399;
          color: white;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 7px 8px;
          border: 1px solid #1f2937;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          color-adjust: exact;
        }
        .lx-table td {
          font-size: 10px;
          color: #1e293b;
          padding: 4px 8px;
          border: 1px solid #e5e7eb;
          background: white;
        }
        .lx-table tbody tr:nth-child(even) td { background: #f9fafb; }
        .lx-table tbody tr:nth-child(odd) td { background: white; }

        /* ── Footer dorado ── */
        .lx-footer {
          background: linear-gradient(135deg, #e8b84b 0%, #d4a017 100%);
          padding: 6px 14px;
          margin-top: 0;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          color-adjust: exact;
        }
        .lx-footer-title {
          font-size: 10px;
          font-weight: 800;
          color: #7c3f00;
          text-decoration: underline;
          margin-bottom: 3px;
        }
        .lx-footer p {
          font-size: 8.5px;
          color: #4a2000;
          margin: 1.5px 0;
          font-weight: 500;
          line-height: 1.3;
        }
      `}</style>

      <div className="pdf-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* PDF Toolbar Chrome */}
        <div className="pdf-toolbar print:hidden">
          <div className="pdf-toolbar-left">
            <FileText size={18} className="text-blue-500" />
            <span className="pdf-doc-title">Vista previa — Proforma {proforma.id || 'Borrador'}</span>
          </div>

          <div className="pdf-toolbar-center">
            <button 
              onClick={() => setZoom(Math.max(50, zoom - 10))} 
              className="pdf-tool-btn" 
              title="Reducir"
            >
              <ZoomOut size={16} />
            </button>
            <span className="pdf-zoom-text">{zoom}%</span>
            <button 
              onClick={() => setZoom(Math.min(150, zoom + 10))} 
              className="pdf-tool-btn" 
              title="Aumentar"
            >
              <ZoomIn size={16} />
            </button>
          </div>

          <div className="pdf-toolbar-right">
            <span className="pdf-page-indicator">Pág. 1 de 1</span>
            <button onClick={handleDownload} className="pdf-download-btn" title="Guardar / Descargar PDF">
              <Download size={14} />
              Descargar PDF
            </button>
            <button onClick={handlePrint} className="pdf-print-btn" title="Imprimir documento">
              <Printer size={14} />
              Imprimir
            </button>
            <button onClick={onClose} className="pdf-close-btn" title="Cerrar">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* PDF Document Canvas Scroll Area */}
        <div className="pdf-scroll-area">
          <div 
            className="pdf-page-container" 
            style={{ 
              transform: `scale(${zoom / 100})`, 
              transformOrigin: 'top center' 
            }}
          >
            {/* Sheet Page layout styled for A4 look */}
            <div 
              ref={contentRef}
              className="pdf-sheet lx-pdf lx-doc" 
              style={{
                background: 'white',
                width: '794px',
                height: '1050px',
                minHeight: '1050px',
                padding: '0px',
                margin: '0 auto',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >

                <div>
                  {/* ENCABEZADO — BANNER CENTRADO */}
                  <div style={{ 
                    borderBottom: '1px solid #e9ecef',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    padding: '10px 0'
                  }}>
                    <img
                      src="/bannerProforma.png"
                      alt="LUXES Diseño y Publicidad"
                      style={{ maxWidth: '100%', display: 'block', height: 'auto' }}
                    />
                  </div>

                  {/* Datos de contacto de la empresa */}
                  {configuracion && (
                    <div style={{
                      background: '#f8fafc',
                      padding: '4px 18px',
                      fontSize: '8.5px',
                      color: '#475569',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid #e2e8f0',
                      fontWeight: 500,
                    }}>
                      <span>Dirección: {configuracion.direccion}</span>
                      <span>Celular: {configuracion.celular} | Email: {configuracion.email}</span>
                    </div>
                  )}

                  {/* DATOS DEL CLIENTE */}
                  <div style={{
                    padding: '6px 18px',
                    display: 'grid', gridTemplateColumns: '1fr 1fr',
                    gap: '3px 24px',
                    borderBottom: '1px solid #e9ecef',
                  }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#1e293b', minWidth: 70 }}>CLIENTE:</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: '#1e293b' }}>{proforma.cliente?.toUpperCase()}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#1e293b', minWidth: 78 }}>FECHA:</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: '#1e293b' }}>{proforma.fecha}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#1e293b', minWidth: 70 }}>TELÉFONO:</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: '#1e293b' }}>{proforma.telefono}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#1e293b', minWidth: 78 }}>VENCE:</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: '#1e293b' }}>{proforma.vencimiento || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#1e293b', minWidth: 70 }}>EMAIL:</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: '#1e293b' }}>{proforma.email || '—'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#1e293b', minWidth: 78 }}>ATIENDE:</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: '#1e293b' }}>{proforma.atiende?.toUpperCase() || '—'}</span>
                    </div>
                  </div>

                  {/* TÍTULO PROFORMA */}
                  <div style={{
                    textAlign: 'center',
                    padding: '6px 18px 5px',
                    borderBottom: '1px solid #e9ecef',
                  }}>
                    <h2 style={{
                      fontSize: 16, fontWeight: 900, color: '#0f172a',
                      letterSpacing: '0.15em', textTransform: 'uppercase',
                      margin: 0,
                    }}>PROFORMA</h2>
                    <span style={{ fontSize: 9, color: '#64748b', fontWeight: 600 }}>N° {proforma.id}</span>
                  </div>

                  {/* TABLA DE ÍTEMS */}
                  <div style={{ padding: '0 18px 0' }}>
                    <table className="lx-table">
                      <thead>
                        <tr>
                          <th style={{ width: 70, textAlign: 'center' }}>CANTIDAD</th>
                          <th style={{ textAlign: 'left', paddingLeft: 14 }}>DESCRIPCIÓN</th>
                          <th style={{ width: 90, textAlign: 'right' }}>SUBTOTAL</th>
                          <th style={{ width: 90, textAlign: 'right' }}>TOTAL + IVA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {proforma.items.map((item, i) => {
                          const sub = (item.cantidad || 0) * (item.precioUnitario || 0);
                          const withIva = sub + sub * (proforma.iva ?? 0.12);
                          return (
                            <tr key={i}>
                              <td style={{ textAlign: 'center', fontWeight: 600 }}>
                                {item.cantidad}
                              </td>
                              <td style={{ paddingLeft: 14 }}>{item.descripcion}</td>
                              <td style={{ textAlign: 'right' }}>
                                {formatUSD(sub)}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                {formatUSD(withIva)}
                              </td>
                            </tr>
                          );
                        })}

                        {/* Fila de totales - Sin celdas vacías */}
                        <tr>
                          <td colSpan={2} style={{
                            fontSize: 10, fontWeight: 800, color: '#34d399',
                            textAlign: 'right', borderTop: '2px solid #34d399',
                            background: 'white', border: '1px solid #e5e7eb', borderTop: '2px solid #34d399',
                          }}>
                            TOTAL SIN IVA
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 600, background: 'white', border: '1px solid #e5e7eb', borderTop: '2px solid #34d399' }}>
                            {formatUSD(subTotal)}
                          </td>
                          <td style={{
                            textAlign: 'right', fontWeight: 700,
                            background: 'white', border: '1px solid #e5e7eb', borderTop: '2px solid #34d399',
                          }}>
                            {formatUSD(subTotal)}
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={2} style={{
                            fontSize: 10, fontWeight: 800, color: '#34d399',
                            textAlign: 'right', background: '#f9fafb', border: '1px solid #e5e7eb',
                          }}>
                            IVA ({((proforma.iva ?? 0.12) * 100).toFixed(0)}%)
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 600, background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                            {formatUSD(ivaVal)}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                            {formatUSD(ivaVal)}
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={2} style={{
                            fontSize: 11, fontWeight: 900, color: '#0f172a',
                            textAlign: 'right', background: 'white',
                            border: '1px solid #e5e7eb', borderTop: '2px solid #34d399',
                          }}>
                            TOTAL
                          </td>
                          <td style={{
                            textAlign: 'center', fontWeight: 900, fontSize: 13,
                            background: 'white', color: '#0f172a',
                            border: '1px solid #e5e7eb', borderTop: '2px solid #34d399',
                          }}>
                            {formatUSD(total)}
                          </td>
                          <td style={{
                            textAlign: 'right', fontWeight: 900, fontSize: 13,
                            background: 'white', color: '#0f172a',
                            border: '1px solid #e5e7eb', borderTop: '2px solid #34d399',
                          }}>
                            {formatUSD(total)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Notas libres solo si las hay */}
                  {(proforma.notes || proforma.notas) && (
                    <div style={{ padding: '6px 18px 3px' }}>
                      <p style={{ fontSize: '9.5px', color: '#475569', fontStyle: 'italic', margin: 0 }}>
                        <strong>Nota:</strong> {proforma.notes || proforma.notas}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  {/* FOOTER DORADO — CONDICIONES */}
                  <div className="lx-footer" style={{ marginTop: 6 }}>
                    <div className="lx-footer-title">CONDICIONES Y FORMAS DE PAGO</div>
                    {proforma.condiciones ? (
                      proforma.condiciones.split('\n').map((line, idx) => {
                        const cleanLine = line
                          .replace(/d\?\?as/gi, 'días')
                          .replace(/h\?\?biles/gi, 'hábiles')
                          .replace(/despu\?\?s/gi, 'después')
                          .replace(/confirmaci\?\?n/gi, 'confirmación')
                          .replace(/dise\?\?o/gi, 'diseño')
                          .replace(/cotizaci\?\?n/gi, 'cotización')
                          .replace(/v\?\?lida/gi, 'válida')
                          .replace(/garant\?\?a/gi, 'garantía')
                          .replace(/m\?\?nimo/gi, 'mínimo')
                          .replace(/da\?\?os/gi, 'daños')
                          .replace(/instalaci\?\?n/gi, 'instalación');
                        return <p key={idx}>{cleanLine}</p>;
                      })
                    ) : (
                      <>
                        <p>60% de anticipo y 40% contra entrega, efectivo o transferencias bancarias</p>
                        <p>Entrega en 15 días hábiles después de la confirmación de diseño</p>
                        <p>Esta cotización es válida por 3 días después de su fecha de emisión</p>
                        <p>Nuestros productos cuentan con garantía mínimo de 12 meses, no cubre daños por mal uso o instalación incorrecta</p>
                      </>
                    )}
                  </div>

                  {/* Firma */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr',
                    gap: 24, padding: '8px 40px 8px',
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ borderBottom: '1.5px solid #94a3b8', marginBottom: 3, paddingTop: 16 }} />
                      <span style={{ fontSize: 9, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Firma Autorizada — {proforma.atiende ? proforma.atiende.toUpperCase() : 'LUXES'}
                      </span>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ borderBottom: '1.5px solid #94a3b8', marginBottom: 3, paddingTop: 16 }} />
                      <span style={{ fontSize: 9, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Firma Cliente — {proforma.cliente ? proforma.cliente.toUpperCase() : ''}
                      </span>
                    </div>
                  </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};
