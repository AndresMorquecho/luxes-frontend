import React, { useState, useEffect } from 'react';
import { Printer, X, ZoomIn, ZoomOut, FileText, Download, Loader2 } from 'lucide-react';
import { ModalPortal, deferClose, useModalVisibility } from '../../../../shared/ui/components/ModalPortal';
import { getMovimientos } from '../../application/gastosService';
import '../../../../shared/ui/components/PDFPreviewModal.css';

const fmt = (num) => {
  return Number(num).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
};

const esMetodoEfectivo = (nombre) => {
  if (!nombre) return false;
  const n = nombre.toLowerCase();
  return n.includes('efectivo') || n.includes('caja') || n.includes('cash');
};

export function CierrePDFPreviewModal({ isOpen, onClose, cierre }) {
  const [zoom, setZoom] = useState(100);
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const shouldShow = Boolean(isOpen && cierre);
  const visible = useModalVisibility(shouldShow);

  useEffect(() => {
    if (shouldShow && cierre.fechaInicio && cierre.fechaFin) {
      loadMovimientosData();
    }
  }, [shouldShow, cierre]);

  const loadMovimientosData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMovimientos(cierre.fechaInicio, cierre.fechaFin);
      // Filter out commitments (non-cash flows) to show real incomes and expenses
      const cashFlows = (data?.movimientos || []).filter(m => !m.esCompromiso);
      setMovimientos(cashFlows);
    } catch (err) {
      console.error("Error al cargar movimientos para cierre PDF:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!visible || !cierre) return null;

  const handleClose = () => deferClose(onClose);

  const handleDownload = () => {
    const originalTitle = document.title;
    const formattedId = cierre.id ? cierre.id.substring(0, 8) : 'reporte';
    document.title = `Cierre_de_Caja_${formattedId}`;
    window.print();
    document.title = originalTitle;
  };

  const handlePrint = () => {
    window.print();
  };

  // Safe parsing of metodosDetalle
  let parsed = { metodos: [], efectivoFisicoContado: 0, diferenciaEfectivo: 0, seccionIngresos: {}, seccionEgresos: {}, usuariosDetalle: [] };
  try {
    if (typeof cierre.metodosDetalle === 'string') {
      parsed = JSON.parse(cierre.metodosDetalle);
    } else if (cierre.metodosDetalle) {
      parsed = cierre.metodosDetalle;
    }
    // Handle array case from older schemas
    if (Array.isArray(parsed)) {
      parsed = { metodos: parsed, efectivoFisicoContado: 0, diferenciaEfectivo: 0, seccionIngresos: {}, seccionEgresos: {}, usuariosDetalle: [] };
    }
  } catch (e) {
    console.error("Error parsing metodosDetalle in PDF Modal:", e);
  }

  const metodosArr = parsed.metodos || [];
  const totalEfectivoEsperado = metodosArr.filter(m => esMetodoEfectivo(m.nombre)).reduce((acc, m) => acc + Number(m.balance), 0);
  const physicalEfectivo = parsed.efectivoFisicoContado !== undefined ? Number(parsed.efectivoFisicoContado) : totalEfectivoEsperado;
  const diffEfectivo = parsed.diferenciaEfectivo !== undefined ? Number(parsed.diferenciaEfectivo) : 0;

  const formattedPeriodo = `${cierre.fechaInicio.split('T')[0]} al ${cierre.fechaFin.split('T')[0]}`;
  const formattedCierreDate = new Date(cierre.fecha || cierre.createdAt || new Date()).toLocaleString();

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
              <span className="pdf-doc-title">Cierre de Caja - Período: {formattedPeriodo}</span>
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
                {/* Header */}
                <div className="pdf-sheet-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #02188E', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
                  <div className="pdf-header-left" style={{ display: 'flex', alignItems: 'center', flex: 1, paddingRight: '20px' }}>
                    <img
                      src="/bannerProforma.png"
                      alt="LUXES Diseño y Publicidad"
                      style={{ maxWidth: '280px', display: 'block', height: 'auto' }}
                    />
                  </div>
                  <div className="pdf-header-right" style={{ textAlign: 'right' }}>
                    <div className="pdf-doc-badge" style={{ backgroundColor: '#02188E', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold', display: 'inline-block', marginBottom: '0.3rem' }}>
                      REPORTE DE CIERRE DE CAJA
                    </div>
                    <h2 className="pdf-doc-id" style={{ margin: 0, fontSize: '1.2rem', color: '#1e293b' }}>
                      {cierre.id ? `ID: ${cierre.id.substring(0, 8).toUpperCase()}` : 'VISTA PREVIA'}
                    </h2>
                    <p className="pdf-doc-date" style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                      <strong>Fecha de Arqueo:</strong> {formattedCierreDate}
                    </p>
                    <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                      <strong>Responsable:</strong> {cierre.usuario?.nombre || 'Administrador'}
                    </p>
                  </div>
                </div>

                {/* Meta Grid (Resumen Financiero) */}
                <div className="pdf-meta-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div className="pdf-meta-box" style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.75rem' }}>
                    <span className="pdf-box-title" style={{ fontSize: '0.65rem', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '0.4rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.2rem', textTransform: 'uppercase' }}>
                      PERÍODO DE CONTROL
                    </span>
                    <div className="pdf-box-content" style={{ fontSize: '0.75rem', color: '#334155', lineHeight: '1.4' }}>
                      <p style={{ margin: '0.15rem 0' }}><strong>Fecha Inicio:</strong> {cierre.fechaInicio.split('T')[0]}</p>
                      <p style={{ margin: '0.15rem 0' }}><strong>Fecha Fin:</strong> {cierre.fechaFin.split('T')[0]}</p>
                      <p style={{ margin: '0.15rem 0' }}><strong>Total Ingresos:</strong> <span style={{ color: '#10b981', fontWeight: 'bold' }}>{fmt(cierre.totalIngresos)}</span></p>
                      <p style={{ margin: '0.15rem 0' }}><strong>Total Egresos:</strong> <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{fmt(cierre.totalEgresos)}</span></p>
                      <p style={{ margin: '0.15rem 0' }}><strong>Balance Neto:</strong> <span style={{ color: '#2563eb', fontWeight: 'bold' }}>{fmt(cierre.balance)}</span></p>
                    </div>
                  </div>

                  <div className="pdf-meta-box" style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.75rem' }}>
                    <span className="pdf-box-title" style={{ fontSize: '0.65rem', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '0.4rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.2rem', textTransform: 'uppercase' }}>
                      ARQUEO FISICO Y CUADRE
                    </span>
                    <div className="pdf-box-content" style={{ fontSize: '0.75rem', color: '#334155', lineHeight: '1.4' }}>
                      <p style={{ margin: '0.15rem 0' }}><strong>Efectivo Esperado:</strong> {fmt(totalEfectivoEsperado)}</p>
                      <p style={{ margin: '0.15rem 0' }}><strong>Efectivo Contado:</strong> {fmt(physicalEfectivo)}</p>
                      <p style={{ margin: '0.15rem 0' }}>
                        <strong>Diferencia: </strong>
                        <span style={{ 
                          fontWeight: 'bold', 
                          color: diffEfectivo === 0 ? '#10b981' : (diffEfectivo < 0 ? '#ef4444' : '#f59e0b') 
                        }}>
                          {diffEfectivo === 0 ? 'Caja Cuadrada' : (diffEfectivo < 0 ? `Faltante: ${fmt(Math.abs(diffEfectivo))}` : `Sobrante: ${fmt(diffEfectivo)}`)}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Métodos de Pago Summary */}
                <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#1e293b', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '0.3rem', margin: '1.5rem 0 0.75rem 0' }}>
                  RESUMEN POR MÉTODOS DE PAGO
                </h3>
                <div className="pdf-table-container" style={{ marginBottom: '1.5rem' }}>
                  <table className="pdf-items-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#02188E', color: 'white', textAlign: 'left' }}>
                        <th style={{ padding: '0.5rem', fontSize: '0.75rem' }}>MÉTODO DE PAGO</th>
                        <th style={{ padding: '0.5rem', fontSize: '0.75rem' }}>TIPO</th>
                        <th style={{ padding: '0.5rem', fontSize: '0.75rem', textAlign: 'right' }}>INGRESOS (+)</th>
                        <th style={{ padding: '0.5rem', fontSize: '0.75rem', textAlign: 'right' }}>EGRESOS (-)</th>
                        <th style={{ padding: '0.5rem', fontSize: '0.75rem', textAlign: 'right' }}>BALANCE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metodosArr.length > 0 ? (
                        metodosArr.map((m, idx) => {
                          const isEfectivo = esMetodoEfectivo(m.nombre);
                          return (
                            <tr key={m.metodoPagoId || idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>{m.nombre}</td>
                              <td style={{ padding: '0.5rem' }}>{isEfectivo ? 'Efectivo / Caja' : 'Banco / Digital'}</td>
                              <td style={{ padding: '0.5rem', textAlign: 'right', color: '#10b981', fontFamily: 'monospace' }}>{fmt(m.ingresos)}</td>
                              <td style={{ padding: '0.5rem', textAlign: 'right', color: '#ef4444', fontFamily: 'monospace' }}>{fmt(m.egresos)}</td>
                              <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 'bold', fontFamily: 'monospace' }}>{fmt(m.balance)}</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="5" style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', italic: true }}>
                            No hay desglose por métodos de pago registrado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Detailed Movements Table */}
                <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#1e293b', borderBottom: '1.5px solid #e2e8f0', paddingBottom: '0.3rem', margin: '1.5rem 0 0.75rem 0' }}>
                  DETALLE DE INGRESOS Y EGRESOS DEL PERÍODO
                </h3>
                <div className="pdf-table-container" style={{ marginBottom: '1.5rem' }}>
                  {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0' }}>
                      <Loader2 className="animate-spin text-blue-500" size={28} />
                      <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>Cargando transacciones del período...</p>
                    </div>
                  ) : error ? (
                    <p style={{ padding: '1rem', textAlign: 'center', color: '#ef4444', fontSize: '0.75rem' }}>{error}</p>
                  ) : movimientos.length === 0 ? (
                    <p style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem', fontStyle: 'italic' }}>
                      No se encontraron transacciones financieras registradas en este período.
                    </p>
                  ) : (
                    <table className="pdf-items-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.7rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#02188E', color: 'white', textAlign: 'left' }}>
                          <th style={{ padding: '0.4rem 0.5rem', fontSize: '0.7rem', width: '12%' }}>FECHA</th>
                          <th style={{ padding: '0.4rem 0.5rem', fontSize: '0.7rem', width: '10%' }}>TIPO</th>
                          <th style={{ padding: '0.4rem 0.5rem', fontSize: '0.7rem', width: '22%' }}>DESCRIPCIÓN</th>
                          <th style={{ padding: '0.4rem 0.5rem', fontSize: '0.7rem', width: '15%' }}>MÉTODO PAGO</th>
                          <th style={{ padding: '0.4rem 0.5rem', fontSize: '0.7rem', width: '12%' }}>USUARIO</th>
                          <th style={{ padding: '0.4rem 0.5rem', fontSize: '0.7rem', width: '18%' }}>OBSERVACIÓN</th>
                          <th style={{ padding: '0.4rem 0.5rem', fontSize: '0.7rem', textAlign: 'right', width: '11%' }}>MONTO</th>
                        </tr>
                      </thead>
                      <tbody>
                        {movimientos.map((m) => {
                          const isIngreso = m.tipo === 'ingreso';
                          return (
                            <tr key={m.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '0.4rem 0.5rem', whiteSpace: 'nowrap' }}>
                                {new Date(m.fecha).toLocaleDateString()}
                              </td>
                              <td style={{ padding: '0.4rem 0.5rem' }}>
                                <span style={{ 
                                  fontWeight: 'bold', 
                                  color: isIngreso ? '#059669' : '#dc2626',
                                  fontSize: '0.65rem'
                                }}>
                                  {isIngreso ? 'INGRESOS' : 'EGRESOS'}
                                </span>
                              </td>
                              <td style={{ padding: '0.4rem 0.5rem', fontWeight: 'bold' }}>
                                {m.descripcion}
                              </td>
                              <td style={{ padding: '0.4rem 0.5rem' }}>{m.metodoPago}</td>
                              <td style={{ padding: '0.4rem 0.5rem' }}>{m.usuario}</td>
                              <td style={{ padding: '0.4rem 0.5rem', fontStyle: 'italic', color: '#64748b' }}>
                                {m.referencia || '—'}
                              </td>
                              <td style={{ 
                                padding: '0.4rem 0.5rem', 
                                textAlign: 'right', 
                                fontWeight: 'bold', 
                                fontFamily: 'monospace',
                                color: isIngreso ? '#059669' : '#dc2626'
                              }}>
                                {isIngreso ? '+' : '-'}{fmt(m.monto)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Observaciones Generales */}
                {cierre.observaciones && (
                  <div className="pdf-notes-section" style={{ border: '1px solid #fde68a', borderRadius: '4px', padding: '0.6rem', marginTop: '1rem', backgroundColor: '#fffbeb' }}>
                    <p className="pdf-notes-title" style={{ fontWeight: 'bold', fontSize: '0.65rem', color: '#b45309', margin: '0 0 0.15rem 0' }}>
                      NOTAS DE CIERRE GENERALES:
                    </p>
                    <p className="pdf-notes-text" style={{ fontSize: '0.75rem', color: '#78350f', margin: 0, lineHeight: 1.4 }}>
                      {cierre.observaciones}
                    </p>
                  </div>
                )}

                {/* Signatures */}
                <div className="pdf-signatures-row" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4rem', padding: '0 1rem' }}>
                  <div className="pdf-signature-field" style={{ flex: '1', maxWidth: '40%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className="pdf-signature-line" style={{ width: '100%', borderTop: '1px solid #94a3b8', marginBottom: '0.25rem' }} />
                    <span className="pdf-signature-lbl" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>
                      {cierre.usuario?.nombre || 'Administrador'}
                    </span>
                    <span className="pdf-signature-lbl-sub" style={{ fontSize: '0.65rem', color: '#64748b' }}>Responsable de Caja</span>
                  </div>
                  <div className="pdf-signature-field" style={{ flex: '1', maxWidth: '40%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className="pdf-signature-line" style={{ width: '100%', borderTop: '1px solid #94a3b8', marginBottom: '0.25rem' }} />
                    <span className="pdf-signature-lbl" style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>Autorizado Por</span>
                    <span className="pdf-signature-lbl-sub" style={{ fontSize: '0.65rem', color: '#64748b' }}>Administración Luxes</span>
                  </div>
                </div>

                {/* Footer */}
                <div className="pdf-sheet-footer" style={{ borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem', marginTop: '3rem', textAlign: 'center', fontSize: '0.6rem', color: '#94a3b8' }}>
                  Reporte de cierre de caja emitido electrónicamente en el Portal Operativo Luxes. Todos los derechos reservados.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
