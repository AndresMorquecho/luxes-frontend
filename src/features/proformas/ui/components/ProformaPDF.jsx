import React, { useState, useRef, useEffect } from 'react';
import { Printer, X, ZoomIn, ZoomOut, FileText, Download } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { ModalPortal, deferClose } from '../../../../shared/ui/components/ModalPortal.jsx';
import '../../../../shared/ui/components/PDFPreviewModal.css';
import aluxBannerLogo from '../../../../assets/aluxBanner.png';
import { getConfiguracion } from '../../../configuracion/application/configuracionService.js';

const formatUSD = (val) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val ?? 0);


const parseNum = (v) => {
  if (v === undefined || v === null || v === '') return 0;
  const num = parseFloat(String(v).replace(',', '.'));
  return isNaN(num) ? 0 : num;
};

const getItemCalc = (item, idx = 0) => {
  const cant = parseNum(item.cantidad) || 1;
  const ancho = parseNum(item.ancho);
  const alto = parseNum(item.alto);
  const metraje = (ancho > 0 && alto > 0) ? (ancho * alto) : (parseNum(item.metraje) || 0);
  const metrajeTotal = (ancho > 0 && alto > 0) ? (cant * metraje) : (parseNum(item.metrajeTotal) || (metraje > 0 ? cant * metraje : cant));
  const precioUnitario = parseNum(item.precioUnitario);
  const valor = (item.valor !== undefined && item.valor !== null && !isNaN(parseNum(item.valor)) && parseNum(item.valor) > 0)
    ? parseNum(item.valor)
    : (metrajeTotal > 0 ? metrajeTotal * precioUnitario : cant * precioUnitario);

  return {
    cod: item.cod || item.codigo || `V${idx + 1}`,
    cant,
    ancho: ancho > 0 ? Number(ancho).toFixed(2) : (item.ancho ? Number(item.ancho).toFixed(2) : '—'),
    alto: alto > 0 ? Number(alto).toFixed(2) : (item.alto ? Number(item.alto).toFixed(2) : '—'),
    metraje: metraje > 0 ? Number(metraje).toFixed(2) : (item.metraje ? Number(item.metraje).toFixed(2) : '—'),
    metrajeTotal: metrajeTotal > 0 ? Number(metrajeTotal).toFixed(2) : (item.metrajeTotal ? Number(item.metrajeTotal).toFixed(2) : cant.toFixed(2)),
    descripcion: item.descripcion || '',
    precioUnitario,
    valor
  };
};

export const ProformaPDF = ({ proforma, configuracion, onClose }) => {
  const [zoom, setZoom] = useState(100);
  const contentRef = useRef(null);
  const [config, setConfig] = useState(configuracion || null);

  useEffect(() => {
    if (!configuracion) {
      getConfiguracion().then(c => setConfig(c)).catch(() => {});
    } else {
      setConfig(configuracion);
    }
  }, [configuracion]);

  const termsText = proforma.condiciones || config?.condicionesPago || `60% de anticipo y 40% contra entrega, efectivo o transferencias bancarias\nEntrega en 15 días hábiles después de la confirmación de diseño\nEsta cotización es válida por 3 días después de su fecha de emisión\nNuestros productos cuentan con garantía mínimo de 12 meses, no cubre daños por mal uso o instalación incorrecta`;

  const itemsCalculated = (proforma.items || []).map((it, idx) => getItemCalc(it, idx));
  const subTotal = itemsCalculated.reduce((s, i) => s + i.valor, 0);
  const descuento = parseFloat(proforma.descuento) || 0;
  const total = Math.max(0, subTotal - descuento);

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
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }

        /* ── Estilos Alux ── */
        .alux-table { width: 100%; border-collapse: collapse; border: 1px solid #1f2937; }
        .alux-table th {
          background: #2b3647;
          color: white;
          font-size: 9.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 6px 4px;
          border: 1px solid #1f2937;
          text-align: center;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .alux-table td {
          font-size: 9.5px;
          color: #1e293b;
          padding: 5px 6px;
          border: 1px solid #94a3b8;
          background: white;
        }
        .alux-table tbody tr:nth-child(even) td { background: #f8fafc; }
        .alux-totals-table { border-collapse: collapse; margin-left: auto; width: 280px; }
        .alux-totals-table th {
          background: #2b3647;
          color: white;
          font-size: 10px;
          font-weight: 800;
          padding: 5px 12px;
          text-align: center;
          border: 1px solid #1f2937;
          width: 110px;
          -webkit-print-color-adjust: exact;
        }
        .alux-totals-table td {
          background: white;
          color: #1e293b;
          font-size: 10.5px;
          font-weight: 800;
          padding: 5px 12px;
          text-align: right;
          border: 1px solid #1f2937;
        }
        .alux-terms-header {
          background: #009688;
          color: white;
          font-size: 9.5px;
          font-weight: 800;
          padding: 4px 10px;
          display: inline-block;
          border-radius: 2px 2px 0 0;
          font-family: 'Inter', Arial, sans-serif;
          -webkit-print-color-adjust: exact;
        }
        .alux-terms-box {
          background: #e2e8f0;
          padding: 6px 12px;
          font-size: 9.5px;
          color: #1e293b;
          font-weight: 600;
          line-height: 1.5;
          font-family: 'Inter', Arial, sans-serif;
          -webkit-print-color-adjust: exact;
        }
      `}</style>

      <div className="pdf-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* PDF Toolbar Chrome */}
        <div className="pdf-toolbar print:hidden">
          <div className="pdf-toolbar-left">
            <FileText size={18} className="text-blue-500" />
            <span className="pdf-doc-title">Vista previa — Proforma Alux {proforma.id || 'Borrador'}</span>
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
                padding: '24px 28px',
                margin: '0 auto',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                {/* ENCABEZADO — BANNER ALUX FULL WIDTH ELEGANTE */}
                <div style={{
                  width: '100%',
                  height: '110px',
                  marginBottom: '14px',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <img
                    src={proforma.bannerUrl || proforma.logoUrl || configuracion?.logoUrl || aluxBannerLogo}
                    alt="Alux Constructores en Aluminio & Vidrio"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block'
                    }}
                  />
                </div>

                {/* DATOS DEL CLIENTE */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 1fr 1fr',
                  gap: '4px 16px',
                  fontSize: '9.5px',
                  padding: '8px 12px',
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '4px',
                  marginBottom: '10px'
                }}>
                  <div>
                    <strong style={{ color: '#0f2537' }}>CLIENTE:</strong> {proforma.cliente || '—'}
                  </div>
                  <div>
                    <strong style={{ color: '#0f2537' }}>FECHA:</strong> {proforma.fecha || '—'}
                  </div>
                  <div>
                    <strong style={{ color: '#0f2537' }}>CELULAR:</strong> {proforma.telefono || proforma.celular || '—'}
                  </div>
                  <div style={{ gridColumn: proforma.email ? 'span 2' : 'span 3' }}>
                    <strong style={{ color: '#0f2537' }}>DIRECCIÓN:</strong> {proforma.direccion || '—'}
                  </div>
                  {proforma.email && (
                    <div>
                      <strong style={{ color: '#0f2537' }}>CORREO:</strong> {proforma.email}
                    </div>
                  )}
                </div>

                {/* TÍTULO PROFORMA */}
                <div style={{
                  textAlign: 'center',
                  margin: '10px 0 12px'
                }}>
                  <h2 style={{
                    fontSize: '15px',
                    fontWeight: 900,
                    color: '#0f2537',
                    letterSpacing: '0.08em',
                    margin: 0,
                    textTransform: 'uppercase'
                  }}>
                    PROFORMA {proforma.id ? (proforma.id.toString().startsWith('PROFORMA') ? proforma.id : `${proforma.id}`) : ''}
                  </h2>
                </div>

                {/* TABLA DE ÍTEMS */}
                <table className="alux-table">
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>COD</th>
                      <th style={{ width: '45px' }}>CANT</th>
                      <th style={{ width: '50px' }}>ANCHO</th>
                      <th style={{ width: '50px' }}>ALTO</th>
                      <th style={{ width: '60px' }}>METRAJE</th>
                      <th style={{ width: '65px' }}>METRAJE TOTAL</th>
                      <th style={{ textAlign: 'left', paddingLeft: '8px' }}>DESCRIPCIÓN</th>
                      <th style={{ width: '100px', textAlign: 'right', paddingRight: '8px' }}>VALOR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsCalculated.map((it, idx) => (
                      <tr key={idx}>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{it.cod}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{it.cant}</td>
                        <td style={{ textAlign: 'center' }}>{it.ancho}</td>
                        <td style={{ textAlign: 'center' }}>{it.alto}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{it.metraje}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{it.metrajeTotal}</td>
                        <td style={{ paddingLeft: '8px', fontWeight: 500 }}>{it.descripcion}</td>
                        <td style={{ textAlign: 'right', paddingRight: '8px', fontWeight: 800 }}>
                          $ {it.valor.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {itemsCalculated.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ textAlign: 'center', padding: '16px', color: '#94a3b8' }}>
                          No hay ítems registrados
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* BLOQUE RESUMEN DE TOTALES */}
                <div style={{ marginTop: '8px', display: 'flex', justify: 'flex-end' }}>
                  <table className="alux-totals-table">
                    <tbody>
                      <tr>
                        <th>SUBTOTAL</th>
                        <td>$ {subTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                      {descuento > 0 && (
                        <tr>
                          <th>Descuento</th>
                          <td>$ {descuento.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                      )}
                      <tr>
                        <th>TOTAL</th>
                        <td>$ {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* NOTAS LIBRES ADICIONALES */}
                {(proforma.notes || proforma.notas) && (
                  <div style={{ marginTop: '8px', fontSize: '9.5px', color: '#334155' }}>
                    <strong style={{ color: '#0f2537' }}>Observación:</strong> {proforma.notes || proforma.notas}
                  </div>
                )}
              </div>

              {/* SECCIÓN INFERIOR — AVISO Y CONDICIONES */}
              <div style={{ marginTop: '16px' }}>
                <div style={{
                  color: '#dc2626',
                  fontSize: '9.5px',
                  fontWeight: 900,
                  fontStyle: 'italic',
                  marginBottom: '8px'
                }}>
                  NUESTROS PRECIOS NO INCLUYEN IVA
                </div>

                <div>
                  <div className="alux-terms-header">
                    CONDICIONES Y FORMAS DE PAGO
                  </div>
                  <div className="alux-terms-box">
                    {termsText.split('\n').filter(Boolean).map((line, idx) => (
                      <div key={idx}>{line}</div>
                    ))}
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

