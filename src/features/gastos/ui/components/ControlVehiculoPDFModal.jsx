import React, { useState, useEffect } from 'react';
import { Printer, X, ZoomIn, ZoomOut, FileText, Download } from 'lucide-react';
import { ModalPortal, deferClose, useModalVisibility } from '../../../../shared/ui/components/ModalPortal';
import '../../../../shared/ui/components/PDFPreviewModal.css';

// ── Check columns definition ─────────────────────────────────────────────────
const CHECKS = [
  { key: 'nivelAceite',      short: 'Aceite' },
  { key: 'nivelAgua',        short: 'Agua' },
  { key: 'aceiteHidraulico', short: 'Hidráulico' },
  { key: 'liquidoFrenos',    short: 'Frenos' },
  { key: 'gataLlave',        short: 'Gata/Llave' },
  { key: 'extintorBotiquin', short: 'Extintor' },
  { key: 'bandas',           short: 'Bandas' },
];

const FUEL_LABEL = { bajo: 'Bajo', medio: 'Medio', bueno: 'Bueno' };

function fmtDateTime(d) {
  return new Date(d).toLocaleString('es-EC', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}
function fmtDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('es-EC');
}

// Cell style helpers
const thStyle = (extra = {}) => ({
  padding: '5px 6px',
  fontSize: '8px',
  fontWeight: '800',
  textTransform: 'uppercase',
  letterSpacing: '.04em',
  color: '#ffffff',
  backgroundColor: '#1d4ed8',
  borderRight: '1px solid rgba(255,255,255,0.2)',
  textAlign: 'center',
  verticalAlign: 'middle',
  whiteSpace: 'nowrap',
  ...extra,
});

const tdStyle = (extra = {}) => ({
  padding: '5px 6px',
  fontSize: '9px',
  color: '#334155',
  borderBottom: '1px solid #e2e8f0',
  borderRight: '1px solid #f1f5f9',
  verticalAlign: 'middle',
  ...extra,
});

const checkCellStyle = (ok) => ({
  padding: '5px 4px',
  fontSize: '11px',
  fontWeight: '800',
  color: ok ? '#166534' : '#9ca3af',
  backgroundColor: ok ? '#f0fdf4' : 'transparent',
  borderBottom: '1px solid #e2e8f0',
  borderRight: '1px solid #f1f5f9',
  textAlign: 'center',
  verticalAlign: 'middle',
});

export function ControlVehiculoPDFModal({ isOpen, onClose, vehiculo, controles, desde, hasta }) {
  const [zoom, setZoom] = useState(90);

  const shouldShow = Boolean(isOpen && vehiculo && controles);
  const visible = useModalVisibility(shouldShow);

  // Inject landscape @page rule while this modal is open
  useEffect(() => {
    if (!visible) return;
    const style = document.createElement('style');
    style.id = 'ctrl-vehiculo-landscape';
    style.textContent = '@media print { @page { size: A4 landscape; margin: 8mm; } }';
    document.head.appendChild(style);
    return () => { document.getElementById('ctrl-vehiculo-landscape')?.remove(); };
  }, [visible]);

  if (!visible) return null;

  const handleClose = () => deferClose(onClose);
  const handlePrint = () => window.print();

  // Opens a standalone print window pre-configured for landscape
  // so the browser's "Save as PDF" dialog uses the correct filename & orientation
  const handleDownload = () => {
    const filename = `Control_Vehiculo_${vehiculo.placa}_${new Date().toISOString().slice(0, 10)}`;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="UTF-8" />
      <title>${filename}</title>
      <style>
        @page { size: A4 landscape; margin: 8mm; }
        body { margin: 0; }
        @media print { html, body { width: 297mm; } }
      </style>
    </head><body>
      <script>
        window.onload = function() {
          window.focus();
          window.print();
          setTimeout(function() { window.close(); }, 500);
        };
      </scr` + `ipt>
      <div id="content"></div>
    </body></html>`);
    // Clone the sheet node into the new window
    const sheet = document.querySelector('.pdf-sheet');
    if (sheet) {
      win.document.getElementById('content').innerHTML = sheet.outerHTML;
    }
    win.document.close();
  };

  const rangeLabel = (desde || hasta)
    ? `${desde ? fmtDate(desde) : '—'}  al  ${hasta ? fmtDate(hasta) : '—'}`
    : 'Todos los registros';

  return (
    <ModalPortal>
      <div
        className="pdf-modal-overlay"
        onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      >
        <div className="pdf-modal-container" onMouseDown={(e) => e.stopPropagation()}>

          {/* ── Toolbar ── */}
          <div className="pdf-toolbar print:hidden">
            <div className="pdf-toolbar-left">
              <FileText size={18} className="text-blue-400" />
              <span className="pdf-doc-title">
                Registro de Control Vehicular — {vehiculo.placa}
              </span>
            </div>
            <div className="pdf-toolbar-center">
              <button type="button" onClick={() => setZoom(z => Math.max(50, z - 10))} className="pdf-tool-btn" title="Reducir">
                <ZoomOut size={16} />
              </button>
              <span className="pdf-zoom-text">{zoom}%</span>
              <button type="button" onClick={() => setZoom(z => Math.min(150, z + 10))} className="pdf-tool-btn" title="Aumentar">
                <ZoomIn size={16} />
              </button>
            </div>
            <div className="pdf-toolbar-right">
              <button type="button" onClick={handleDownload} className="pdf-download-btn">
                <Download size={14} /> Descargar PDF
              </button>
              <button type="button" onClick={handlePrint} className="pdf-print-btn">
                <Printer size={14} /> Imprimir
              </button>
              <button type="button" onClick={handleClose} className="pdf-close-btn">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* ── Scroll area ── */}
          <div className="pdf-scroll-area">
            <div
              className="pdf-page-container"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
            >
              <div className="pdf-sheet" style={{ width: '1123px', minHeight: '794px' }}>

                {/* ── Document Header ── */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '2px solid #1d4ed8', paddingBottom: '14px', marginBottom: '14px' }}>
                  <div>
                    <img src="/bannerProforma.png" alt="LUXES" style={{ maxWidth: '220px', height: 'auto', display: 'block' }} />
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ backgroundColor: '#1d4ed8', color: 'white', padding: '3px 10px', borderRadius: '4px', fontSize: '8px', fontWeight: '800', letterSpacing: '.06em', display: 'inline-block', marginBottom: '4px' }}>
                      REGISTRO DE CONTROL DE VEHÍCULO CIRCULAR
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '900', color: '#0f172a', lineHeight: 1 }}>{vehiculo.placa}</div>
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{vehiculo.marca} {vehiculo.modelo} · {vehiculo.anio || '—'} · {vehiculo.color || '—'}</div>
                    <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '1px' }}>Emitido: {new Date().toLocaleString('es-EC')}</div>
                  </div>
                </div>

                {/* ── Vehicle & Period Summary ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                  {[
                    ['Responsable Principal', vehiculo.responsable || '—'],
                    ['Período', rangeLabel],
                    ['Km Actual', `${(vehiculo.kilometraje || 0).toLocaleString()} km`],
                    ['Total Registros', controles.length],
                  ].map(([lbl, val]) => (
                    <div key={lbl} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '6px 8px' }}>
                      <div style={{ fontSize: '7px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '.06em', color: '#94a3b8', marginBottom: '2px' }}>{lbl}</div>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#1e293b' }}>{val}</div>
                    </div>
                  ))}
                </div>

                {/* ── Main Table ── */}
                {controles.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '0.8rem', fontStyle: 'italic' }}>
                    No hay controles registrados en este período.
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
                    <thead>
                      <tr>
                        {/* Fixed cols */}
                        <th style={thStyle({ width: '22px', textAlign: 'center' })}>N°</th>
                        <th style={thStyle({ width: '100px', textAlign: 'left' })}>Fecha y Hora</th>
                        <th style={thStyle({ width: '80px', textAlign: 'left' })}>Operador</th>
                        <th style={thStyle({ width: '52px', textAlign: 'right' })}>KM</th>
                        <th style={thStyle({ width: '44px' })}>Comb.</th>
                        {/* Check columns */}
                        {CHECKS.map(c => (
                          <th key={c.key} style={thStyle({ width: '46px' })}>{c.short}</th>
                        ))}
                        {/* Extra check + notes */}
                        <th style={thStyle({ width: '60px' })}>Extra</th>
                        <th style={thStyle({ width: '120px', textAlign: 'left' })}>Obs / Sugerencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {controles.map((log, idx) => {
                        const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
                        const fuelColor = log.combustible === 'bajo' ? '#dc2626' : log.combustible === 'medio' ? '#d97706' : '#16a34a';
                        const obsText = [
                          log.observacion ? `Obs: ${log.observacion}` : '',
                          log.sugerencia  ? `Sug: ${log.sugerencia}`  : '',
                        ].filter(Boolean).join(' / ') || '—';

                        const extraText = log.otroCheckNombre
                          ? `${log.otroCheckNombre}: ${log.otroCheckValor ? '✓' : '✗'}`
                          : '—';

                        return (
                          <tr key={log.id} style={{ backgroundColor: rowBg }}>
                            <td style={tdStyle({ textAlign: 'center', fontWeight: '700', color: '#64748b' })}>{idx + 1}</td>
                            <td style={tdStyle({ whiteSpace: 'nowrap', fontWeight: '600', color: '#1e293b' })}>{fmtDateTime(log.fecha)}</td>
                            <td style={tdStyle({ fontWeight: '600' })}>{log.usuarioNom || '—'}</td>
                            <td style={tdStyle({ textAlign: 'right', fontWeight: '700', color: '#1d4ed8' })}>{(log.kilometraje || 0).toLocaleString()}</td>
                            <td style={{ ...tdStyle({ textAlign: 'center' }), fontWeight: '700', color: fuelColor }}>{FUEL_LABEL[log.combustible] || log.combustible}</td>
                            {/* Check cells */}
                            {CHECKS.map(c => (
                              <td key={c.key} style={checkCellStyle(Boolean(log[c.key]))}>
                                {log[c.key] ? '✓' : '✗'}
                              </td>
                            ))}
                            {/* Extra check */}
                            <td style={tdStyle({ textAlign: 'center', fontSize: '8px', color: '#475569' })}>{extraText}</td>
                            {/* Obs / Sug */}
                            <td style={tdStyle({ fontSize: '8px', color: '#475569', fontStyle: obsText === '—' ? 'italic' : 'normal' })}>{obsText}</td>
                          </tr>
                        );
                      })}
                    </tbody>

                    {/* ── Legend row ── */}
                    <tfoot>
                      <tr>
                        <td colSpan={5 + CHECKS.length + 2} style={{ padding: '6px 8px', fontSize: '7.5px', color: '#94a3b8', borderTop: '2px solid #e2e8f0', textAlign: 'left' }}>
                          <strong>✓ = OK &nbsp;&nbsp; ✗ = No OK</strong>
                          &nbsp;&nbsp;|&nbsp;&nbsp;
                          Checks: Aceite · Agua · Aceite Hidráulico/Líquido · Líquido de Frenos · Gata y Llave de Ruedas · Extintor y Botiquín · Juego de Bandas
                          &nbsp;&nbsp;|&nbsp;&nbsp;
                          Generado: {new Date().toLocaleString('es-EC')}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                )}

                {/* ── Signatures ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem', padding: '0 1rem' }}>
                  <div style={{ flex: 1, maxWidth: '38%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '100%', borderTop: '1px solid #94a3b8', marginBottom: '4px' }} />
                    <span style={{ fontSize: '10px', fontWeight: '700', color: '#334155' }}>{vehiculo.responsable || 'Operador'}</span>
                    <span style={{ fontSize: '8px', color: '#94a3b8' }}>Responsable Principal</span>
                  </div>
                  <div style={{ flex: 1, maxWidth: '38%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '100%', borderTop: '1px solid #94a3b8', marginBottom: '4px' }} />
                    <span style={{ fontSize: '10px', fontWeight: '700', color: '#334155' }}>Autorizado Por</span>
                    <span style={{ fontSize: '8px', color: '#94a3b8' }}>Administración Luxes</span>
                  </div>
                </div>

                {/* ── Footer ── */}
                <div className="pdf-sheet-footer">
                  Reporte de control vehicular emitido electrónicamente en el Portal Operativo Luxes. Todos los derechos reservados.
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </ModalPortal>
  );
}
