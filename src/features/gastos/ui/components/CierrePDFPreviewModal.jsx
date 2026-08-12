import React, { useState } from 'react';
import { Printer, FileText, Download, ArrowUpRight, ArrowDownRight, CheckCircle, AlertCircle, X } from 'lucide-react';
import { ModalPortal, deferClose, useModalVisibility } from '../../../../shared/ui/components/ModalPortal';
import '../../../../shared/ui/components/PDFPreviewModal.css';

const fmt = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '$ -';
  const val = Number(num);
  if (val === 0) return '$ -';
  return val.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
};

const formatDateLong = (dateStr) => {
  if (!dateStr) return '';
  try {
    const onlyDate = String(dateStr).split('T')[0];
    const [year, month, day] = onlyDate.split('-').map(Number);
    if (!year || !month || !day) return String(dateStr).toUpperCase();
    const d = new Date(year, month - 1, day);
    const days = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
    const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    return `${days[d.getDay()]} ${String(d.getDate()).padStart(2, '0')} DE ${months[d.getMonth()]} DEL ${d.getFullYear()}`;
  } catch (e) {
    return String(dateStr).toUpperCase();
  }
};

const formatDateShort = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const onlyDate = String(dateStr).split('T')[0];
    const [year, month, day] = onlyDate.split('-').map(Number);
    if (!year || !month || !day) return dateStr;
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${day}-${months[month - 1]}`;
  } catch (e) {
    return dateStr;
  }
};

const formatDateWithTime = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const dateFormatted = `${d.getDate()}-${months[d.getMonth()]}`;
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${dateFormatted} ${hours}:${minutes}`;
  } catch (e) {
    return dateStr;
  }
};

const esEfectivoName = (nombre = '') => {
  const n = nombre.toLowerCase();
  return n.includes('efectivo') || n.includes('caja') || n.includes('cash');
};

export function CierrePDFPreviewModal({ isOpen, onClose, cierre }) {
  const [zoom, setZoom] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 768) ? 50 : 100);

  const shouldShow = Boolean(isOpen && cierre);
  const visible = useModalVisibility(shouldShow);

  if (!visible || !cierre) return null;

  const handleClose = () => deferClose(onClose);

  const handleDownload = () => {
    const originalTitle = document.title;
    const dateStr = cierre.fechaInicio ? cierre.fechaInicio.split('T')[0] : 'reporte';
    document.title = `Reporte_Cierre_Caja_${dateStr}`;
    window.print();
    document.title = originalTitle;
  };

  const handlePrint = () => {
    window.print();
  };

  // Obtención del usuario real (desde props o de la sesión guardada en localStorage)
  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch (e) {
      return {};
    }
  })();

  const nombreUsuario = (
    cierre.usuario?.nombre || 
    cierre.usuarioNom || 
    storedUser.nombre || 
    storedUser.name || 
    'IVETTE STEPHANIA MORQUECHO SEVILLANO'
  ).toUpperCase();

  // Desestructuración segura del objeto de cierre
  let metodosDetalle = [];
  let itemsIngresos = cierre.seccionIngresos?.items || [];
  let itemsEgresos = cierre.seccionEgresos?.items || [];
  let efectivoFisicoContadoVal = cierre.efectivoFisicoContado;

  try {
    if (typeof cierre.metodosDetalle === 'string') {
      const parsed = JSON.parse(cierre.metodosDetalle);
      if (Array.isArray(parsed)) {
        metodosDetalle = parsed;
      } else if (parsed && typeof parsed === 'object') {
        metodosDetalle = parsed.metodos || parsed.metodosDetalle || [];
        if (parsed.seccionIngresos?.items?.length) itemsIngresos = parsed.seccionIngresos.items;
        if (parsed.seccionEgresos?.items?.length) itemsEgresos = parsed.seccionEgresos.items;
        if (parsed.efectivoFisicoContado !== undefined) efectivoFisicoContadoVal = parsed.efectivoFisicoContado;
      }
    } else if (Array.isArray(cierre.metodosDetalle)) {
      metodosDetalle = cierre.metodosDetalle;
      if (cierre.seccionIngresos?.items?.length) itemsIngresos = cierre.seccionIngresos.items;
      if (cierre.seccionEgresos?.items?.length) itemsEgresos = cierre.seccionEgresos.items;
    } else if (cierre.metodosDetalle && typeof cierre.metodosDetalle === 'object') {
      metodosDetalle = cierre.metodosDetalle.metodos || cierre.metodosDetalle.metodosDetalle || [];
      if (cierre.metodosDetalle.seccionIngresos?.items?.length) itemsIngresos = cierre.metodosDetalle.seccionIngresos.items;
      if (cierre.metodosDetalle.seccionEgresos?.items?.length) itemsEgresos = cierre.metodosDetalle.seccionEgresos.items;
    }
  } catch (e) {
    console.error("Error al desempaquetar metodosDetalle para el PDF:", e);
  }

  const metodoEfectivo = metodosDetalle.find(m => esEfectivoName(m.nombre)) || metodosDetalle[0] || { id: 'efectivo', nombre: 'EFECTIVO CAJA CHICA', saldoInicial: 0, ingresos: 0, egresos: 0, saldoFinal: 0 };
  const metodosBancarios = metodosDetalle.filter(m => !esEfectivoName(m.nombre));
  const columnasBancarias = metodosBancarios;

  const saldoInicialEfectivo = Number(metodoEfectivo.saldoInicial || 0);

  const ingresosPorMetodo = {};
  itemsIngresos.forEach(i => {
    const mId = i.metodoPagoId || 'no_especificado';
    ingresosPorMetodo[mId] = (ingresosPorMetodo[mId] || 0) + Number(i.monto);
  });

  const ingresosEfectivoSum = itemsIngresos
    .filter(i => esEfectivoName(i.metodoPagoNombre) || i.metodoPagoId === metodoEfectivo.metodoPagoId)
    .reduce((s, i) => s + Number(i.monto), 0);

  const totalIngresosEfectivoAcumulado = saldoInicialEfectivo + ingresosEfectivoSum;

  const egresosPorMetodo = {};
  itemsEgresos.forEach(i => {
    const mId = i.metodoPagoId || 'no_especificado';
    egresosPorMetodo[mId] = (egresosPorMetodo[mId] || 0) + Number(i.monto);
  });

  const egresosEfectivoSum = itemsEgresos
    .filter(i => esEfectivoName(i.metodoPagoNombre) || i.metodoPagoId === metodoEfectivo.metodoPagoId)
    .reduce((s, i) => s + Number(i.monto), 0);

  const saldoFinalEfectivo = totalIngresosEfectivoAcumulado - egresosEfectivoSum;

  const cashPhysicalNum = (efectivoFisicoContadoVal === '' || efectivoFisicoContadoVal === undefined || efectivoFisicoContadoVal === null)
    ? saldoFinalEfectivo 
    : Number(efectivoFisicoContadoVal);

  const rawDiff = cashPhysicalNum - saldoFinalEfectivo;
  const diffCash = Math.abs(rawDiff) < 0.009 ? 0 : rawDiff;

  const formattedCierreDate = formatDateLong(cierre.fechaInicio || cierre.fecha);

  return (
    <ModalPortal>
      <div
        className="pdf-modal-overlay"
        onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      >
        <div className="pdf-modal-container max-w-[1220px]" onMouseDown={(e) => e.stopPropagation()}>
          {/* BARRA DE HERRAMIENTAS DE IMPRESIÓN EN TONOS CLAROS - ADAPTADA A MÓVIL */}
          <div className="bg-white text-slate-800 px-3 md:px-5 py-2.5 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 border-b border-slate-200 shrink-0 select-none print:hidden">
            <div className="flex items-center gap-2 truncate">
              <FileText size={16} className="text-slate-600 shrink-0" />
              <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wide truncate">
                Cierre {formattedCierreDate}
              </span>
            </div>

            <div className="flex items-center gap-2 ml-auto sm:ml-0">
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button 
                  type="button" 
                  onClick={() => setZoom(z => Math.max(30, z - 10))} 
                  className="w-6 h-6 hover:bg-slate-200 text-slate-700 font-bold rounded text-xs flex items-center justify-center transition-colors" 
                  title="Reducir zoom"
                >
                  -
                </button>
                <span className="text-[11px] font-mono font-bold text-slate-700 min-w-[36px] text-center">{zoom}%</span>
                <button 
                  type="button" 
                  onClick={() => setZoom(z => Math.min(150, z + 10))} 
                  className="w-6 h-6 hover:bg-slate-200 text-slate-700 font-bold rounded text-xs flex items-center justify-center transition-colors" 
                  title="Aumentar zoom"
                >
                  +
                </button>
              </div>

              <button 
                type="button" 
                onClick={handleDownload} 
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs rounded-lg transition-colors flex items-center gap-1.5 border border-slate-300 shadow-2xs cursor-pointer"
                title="Descargar PDF"
              >
                <Download size={14} className="text-slate-600 shrink-0" />
                <span className="hidden sm:inline">Descargar PDF</span>
                <span className="sm:hidden text-[11px]">PDF</span>
              </button>

              <button 
                type="button" 
                onClick={handlePrint} 
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Imprimir documento"
              >
                <Printer size={14} className="text-white shrink-0" />
                <span className="hidden sm:inline">Imprimir</span>
              </button>

              <button 
                type="button" 
                onClick={handleClose} 
                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0" 
                title="Cerrar"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* ÁREA DE SCROLL Y VISTA PREVIA HORIZONTAL */}
          <div className="pdf-scroll-area">
            <div
              className="pdf-page-container flex justify-center py-6"
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
            >
              {/* HOJA IMPRESA ORIENTACIÓN HORIZONTAL (TAMAÑO A4 LANDSCAPE: 297mm x 210mm) */}
              <div 
                className="pdf-sheet bg-white text-slate-800 p-8 shadow-xl font-sans rounded-sm"
                style={{ width: '297mm', minHeight: '210mm', boxSizing: 'border-box' }}
              >
                {/* ── ENCABEZADO OFICIAL CON LOGO LUXES Y DATOS DEL REGISTRO ── */}
                <div className="flex items-center justify-between border-b-2 border-slate-700 pb-4 mb-5">
                  <div className="flex items-center gap-4">
                    <img
                      src="/bannerProforma.png"
                      alt="LUXES Publicidad"
                      className="h-12 w-auto max-w-[260px] object-contain"
                    />
                  </div>
                  <div className="text-right space-y-1">
                    <div className="bg-slate-700 text-white text-[10px] font-black uppercase px-3 py-1 rounded inline-block tracking-wider">
                      REPORTE DE CIERRE DE CAJA
                    </div>
                    <h2 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                      FECHA DE CONTROL: {formattedCierreDate}
                    </h2>
                    <p className="text-[11px] text-slate-500 font-medium">
                      <strong>Responsable:</strong> {nombreUsuario}
                    </p>
                  </div>
                </div>

                {/* ── TABLA 1: INGRESOS DEL DÍA Y ARRASTRE INICIAL ── */}
                <div className="border border-slate-300 rounded-lg overflow-hidden mb-5">
                  <div className="bg-slate-700 text-white px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ArrowUpRight size={15} className="text-emerald-400" />
                      <h4 className="text-xs font-extrabold uppercase tracking-wider">
                        INGRESOS Y ARRASTRE DE SALDOS
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-slate-300 font-mono">
                      {itemsIngresos.length} transacción{itemsIngresos.length === 1 ? '' : 'es'}
                    </span>
                  </div>

                  <table className="w-full text-xs text-left border-collapse table-fixed">
                    <thead>
                      <tr className="bg-slate-100 text-[10px] font-black text-slate-700 uppercase border-b border-slate-300 h-10">
                        <th className="py-2 px-2.5 w-24 text-center border-r border-slate-300">FECHA Y HORA</th>
                        <th className="py-2 px-3 w-44 border-r border-slate-300">CLIENTE / ORIGEN</th>
                        <th className="py-2 px-1.5 w-24 text-center border-r border-slate-300 font-black bg-amber-100/70 text-slate-900 leading-tight">
                          EFECTIVO
                        </th>
                        {columnasBancarias.map((b, idx) => (
                          <th key={`pdf-ing-col-${idx}`} className="py-2 px-1.5 w-24 text-center border-r border-slate-300 font-extrabold leading-tight">
                            <span className="line-clamp-2 uppercase text-[9px] leading-tight block">{b.nombre}</span>
                          </th>
                        ))}
                        <th className="py-2 px-2 w-28 text-center border-r border-slate-300 leading-tight">
                          <span className="line-clamp-2 uppercase text-[9.5px]">PROFORMA / ORDEN #</span>
                        </th>
                        <th className="py-2 px-1.5 w-24 text-center border-r border-slate-300 font-black bg-amber-100/70 text-slate-900 leading-tight">VALOR</th>
                        <th className="py-2 px-3">DETALLE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      {/* FILA 1: ARRASTRE CAJA ANTERIOR */}
                      <tr className="bg-slate-50 font-semibold h-9 border-b border-slate-200">
                        <td className="py-1.5 px-2.5 text-center font-mono text-slate-500 border-r border-slate-200 whitespace-nowrap text-[11px]">
                          {formatDateShort(cierre.fechaInicio)}
                        </td>
                        <td className="py-1.5 px-3 font-extrabold text-slate-800 uppercase border-r border-slate-200 truncate flex items-center gap-1">
                          <span className="text-slate-400 font-semibold text-[9px] tracking-wider uppercase">(ARRAS.)</span>
                          <span className="truncate">SALDO ANTERIOR CAJA CHICA</span>
                        </td>
                        <td className="py-1.5 px-1.5 text-right font-mono font-black text-slate-900 border-r border-slate-200 bg-amber-50 text-xs whitespace-nowrap">
                          {fmt(saldoInicialEfectivo)}
                        </td>
                        {columnasBancarias.map((_, idx) => (
                          <td key={`pdf-arr-emp-${idx}`} className="py-1.5 px-1.5 text-right font-mono text-slate-400 border-r border-slate-200 whitespace-nowrap">$ -</td>
                        ))}
                        <td className="py-1.5 px-2 text-center font-mono text-slate-400 border-r border-slate-200 whitespace-nowrap">—</td>
                        <td className="py-1.5 px-1.5 text-right font-mono font-black text-slate-900 border-r border-slate-200 bg-amber-50 text-xs whitespace-nowrap">{fmt(saldoInicialEfectivo)}</td>
                        <td className="py-1.5 px-3 text-slate-500 italic text-[10.5px] truncate">Saldo inicial de caja chica del cierre anterior</td>
                      </tr>

                      {/* FILA 2: ARRASTRE BANCOS ANTERIOR */}
                      {columnasBancarias.length > 0 && (
                        <tr className="bg-slate-50 font-semibold h-9 border-b-2 border-b-slate-300">
                          <td className="py-1.5 px-2.5 text-center font-mono text-slate-500 border-r border-slate-200 whitespace-nowrap text-[11px]">
                            {formatDateShort(cierre.fechaInicio)}
                          </td>
                          <td className="py-1.5 px-3 font-bold text-slate-700 uppercase border-r border-slate-200 truncate flex items-center gap-1">
                            <span className="text-slate-400 font-semibold text-[9px] tracking-wider uppercase">(ARRAS.)</span>
                            <span className="truncate">SALDO ANTERIOR BANCOS</span>
                          </td>
                          <td className="py-1.5 px-1.5 text-right font-mono text-slate-400 border-r border-slate-200 whitespace-nowrap">$ -</td>
                          {columnasBancarias.map((b, idx) => (
                            <td key={`pdf-arr-bnk-${idx}`} className="py-1.5 px-1.5 text-right font-mono font-extrabold text-slate-800 border-r border-slate-200 bg-blue-50/40 whitespace-nowrap">
                              {fmt(Number(b.saldoInicial || 0))}
                            </td>
                          ))}
                          <td className="py-1.5 px-2 text-center font-mono text-slate-400 border-r border-slate-200 whitespace-nowrap">—</td>
                          <td className="py-1.5 px-1.5 text-right font-mono text-slate-400 border-r border-slate-200 whitespace-nowrap">$ -</td>
                          <td className="py-1.5 px-3 text-slate-500 italic text-[10.5px] truncate">Saldos iniciales bancarios de apertura de cuentas</td>
                        </tr>
                      )}

                      {/* ITEMS DE INGRESOS */}
                      {itemsIngresos.map((item, idx) => {
                        const isEfectivo = esEfectivoName(item.metodoPagoNombre) || item.metodoPagoId === metodoEfectivo.metodoPagoId;
                        const proformaOrdenText = [item.proformaNumero, item.ordenPedido].filter(Boolean).join(' / ') || '—';
                        const isTransfer = Boolean(item.esTransferencia);

                        return (
                          <tr key={item.id || idx} className={`h-9 ${isTransfer ? 'bg-blue-50/30' : ''}`}>
                            <td className="py-1.5 px-2.5 text-center font-mono text-slate-600 border-r border-slate-200 whitespace-nowrap font-bold text-[10.5px]">
                              {formatDateWithTime(item.fecha)}
                            </td>
                            <td className="py-1.5 px-3 font-bold text-slate-800 uppercase border-r border-slate-200 truncate" title={item.cliente}>
                              <div className="flex items-center gap-1 truncate">
                                {isTransfer && (
                                  <span className="text-[8.5px] font-extrabold px-1 py-0.2 bg-blue-100 text-blue-800 border border-blue-200 rounded shrink-0">
                                    TRANSF.
                                  </span>
                                )}
                                <span className="truncate">{item.cliente}</span>
                              </div>
                            </td>
                            <td className="py-1.5 px-1.5 text-right font-mono font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap">
                              {isEfectivo ? fmt(item.monto) : '$ -'}
                            </td>
                            {columnasBancarias.map((b, bIdx) => {
                              const isThisBank = item.metodoPagoId === b.metodoPagoId || (item.metodoPagoNombre || '').toLowerCase().includes((b.nombre || '').toLowerCase());
                              return (
                                <td key={`pdf-ing-val-${bIdx}`} className="py-1.5 px-1.5 text-right font-mono font-bold text-slate-800 border-r border-slate-200 whitespace-nowrap">
                                  {isThisBank ? fmt(item.monto) : '$ -'}
                                </td>
                              );
                            })}
                            <td className="py-1.5 px-2 text-center font-mono font-semibold text-slate-700 border-r border-slate-200 truncate text-[10.5px]">{proformaOrdenText}</td>
                            <td className="py-1.5 px-1.5 text-right font-mono font-extrabold text-emerald-700 border-r border-slate-200 whitespace-nowrap">{fmt(item.monto)}</td>
                            <td className="py-1.5 px-3 text-slate-600 font-medium uppercase text-[10.5px] truncate">{item.detalle}</td>
                          </tr>
                        );
                      })}

                      {itemsIngresos.length === 0 && (
                        <tr>
                          <td colSpan={6 + columnasBancarias.length} className="py-4 text-center text-slate-400 font-medium italic text-xs">
                            No existen ingresos ni abonos registrados para la fecha seleccionada.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 text-slate-900 font-black text-xs border-t-2 border-slate-300 h-9">
                        <td className="py-1.5 px-2.5 text-center border-r border-slate-300"></td>
                        <td className="py-1.5 px-3 uppercase tracking-wider text-[10px] border-r border-slate-300 truncate">TOTAL INGRESOS + ARRASTRE INICIAL</td>
                        <td className="py-1.5 px-1.5 text-right font-mono font-black text-slate-900 border-r border-slate-300 bg-amber-200/60 text-xs whitespace-nowrap">
                          {fmt(totalIngresosEfectivoAcumulado)}
                        </td>
                        {columnasBancarias.map((b, bIdx) => {
                          const sInit = Number(b.saldoInicial || 0);
                          const sIng = ingresosPorMetodo[b.metodoPagoId] || 0;
                          return (
                            <td key={`pdf-tot-ing-banco-${bIdx}`} className="py-1.5 px-1.5 text-right font-mono font-black text-slate-900 border-r border-slate-300 whitespace-nowrap">
                              {fmt(sInit + sIng)}
                            </td>
                          );
                        })}
                        <td className="py-1.5 px-2 border-r border-slate-300"></td>
                        <td className="py-1.5 px-1.5 text-right font-mono font-black text-emerald-800 border-r border-slate-300 text-xs whitespace-nowrap">
                          {fmt(totalIngresosEfectivoAcumulado)}
                        </td>
                        <td className="py-1.5 px-3"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* ── TABLA 2: EGRESOS DEL DÍA ── */}
                <div className="border border-slate-300 rounded-lg overflow-hidden mb-5">
                  <div className="bg-slate-700 text-white px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ArrowDownRight size={15} className="text-rose-400" />
                      <h4 className="text-xs font-extrabold uppercase tracking-wider">
                        EGRESOS Y GASTOS DEL DÍA
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-slate-300 font-mono">
                      {itemsEgresos.length} transacción{itemsEgresos.length === 1 ? '' : 'es'}
                    </span>
                  </div>

                  <table className="w-full text-xs text-left border-collapse table-fixed">
                    <thead>
                      <tr className="bg-slate-100 text-[10px] font-black text-slate-700 uppercase border-b border-slate-300 h-10">
                        <th className="py-2 px-2.5 w-24 text-center border-r border-slate-300">FECHA Y HORA</th>
                        <th className="py-2 px-3 w-44 border-r border-slate-300">PROVEEDOR / BENEFICIARIO</th>
                        <th className="py-2 px-1.5 w-24 text-center border-r border-slate-300 font-black bg-amber-100/70 text-slate-900 leading-tight">
                          EFECTIVO
                        </th>
                        {columnasBancarias.map((b, idx) => (
                          <th key={`pdf-egr-col-${idx}`} className="py-2 px-1.5 w-24 text-center border-r border-slate-300 font-extrabold leading-tight">
                            <span className="line-clamp-2 uppercase text-[9px] leading-tight block">{b.nombre}</span>
                          </th>
                        ))}
                        <th className="py-2 px-2 w-32 text-center border-r border-slate-300">FACTURA #</th>
                        <th className="py-2 px-1.5 w-14 text-center border-r border-slate-300">IVA %</th>
                        <th className="py-2 px-1.5 w-24 text-center border-r border-slate-300 font-black bg-rose-100/70 text-slate-900 leading-tight">VALOR</th>
                        <th className="py-2 px-3">DETALLE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      {itemsEgresos.map((item, idx) => {
                        const isEfectivo = esEfectivoName(item.metodoPagoNombre) || item.metodoPagoId === metodoEfectivo.metodoPagoId;
                        const isTransfer = Boolean(item.esTransferencia);

                        return (
                          <tr key={item.id || idx} className={`h-9 ${isTransfer ? 'bg-blue-50/30' : ''}`}>
                            <td className="py-1.5 px-2.5 text-center font-mono text-slate-600 border-r border-slate-200 whitespace-nowrap font-bold text-[10.5px]">
                              {formatDateWithTime(item.fecha)}
                            </td>
                            <td className="py-1.5 px-3 font-bold text-slate-800 uppercase border-r border-slate-200 truncate" title={item.proveedor}>
                              <div className="flex items-center gap-1 truncate">
                                {isTransfer && (
                                  <span className="text-[8.5px] font-extrabold px-1 py-0.2 bg-blue-100 text-blue-800 border border-blue-200 rounded shrink-0">
                                    TRANSF.
                                  </span>
                                )}
                                <span className="truncate">{item.proveedor}</span>
                              </div>
                            </td>
                            <td className="py-1.5 px-1.5 text-right font-mono font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap">
                              {isEfectivo ? fmt(item.monto) : '$ -'}
                            </td>
                            {columnasBancarias.map((b, bIdx) => {
                              const isThisBank = item.metodoPagoId === b.metodoPagoId || (item.metodoPagoNombre || '').toLowerCase().includes((b.nombre || '').toLowerCase());
                              return (
                                <td key={`pdf-egr-val-${bIdx}`} className="py-1.5 px-1.5 text-right font-mono font-bold text-slate-800 border-r border-slate-200 whitespace-nowrap">
                                  {isThisBank ? fmt(item.monto) : '$ -'}
                                </td>
                              );
                            })}
                            <td className="py-1.5 px-2 text-center font-mono font-semibold text-slate-700 border-r border-slate-200 truncate text-[10.5px]">{item.facturaNumero || '—'}</td>
                            <td className="py-1.5 px-1.5 text-center font-mono text-slate-500 border-r border-slate-200 whitespace-nowrap">{item.ivaPorcentaje ? `${item.ivaPorcentaje}%` : '—'}</td>
                            <td className="py-1.5 px-1.5 text-right font-mono font-extrabold text-rose-700 border-r border-slate-200 whitespace-nowrap">{fmt(item.monto)}</td>
                            <td className="py-1.5 px-3 text-slate-600 font-medium uppercase text-[10.5px] truncate">{item.detalle}</td>
                          </tr>
                        );
                      })}

                      {itemsEgresos.length === 0 && (
                        <tr>
                          <td colSpan={6 + columnasBancarias.length} className="py-4 text-center text-slate-400 font-medium italic text-xs">
                            No existen egresos ni gastos registrados para la fecha seleccionada.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 text-slate-900 font-black text-xs border-t-2 border-slate-300 h-9">
                        <td className="py-1.5 px-2.5 text-center border-r border-slate-300"></td>
                        <td className="py-1.5 px-3 uppercase tracking-wider text-[10px] border-r border-slate-300 truncate">SALDO DE TRANSFERENCIA / EGRESOS TOTAL</td>
                        <td className="py-1.5 px-1.5 text-right font-mono font-black text-slate-900 border-r border-slate-300 bg-rose-200/60 text-xs whitespace-nowrap">
                          {fmt(egresosEfectivoSum)}
                        </td>
                        {columnasBancarias.map((b, bIdx) => {
                          const sEgr = egresosPorMetodo[b.metodoPagoId] || 0;
                          return (
                            <td key={`pdf-tot-egr-banco-${bIdx}`} className="py-1.5 px-1.5 text-right font-mono font-black text-slate-900 border-r border-slate-300 whitespace-nowrap">
                              {fmt(sEgr)}
                            </td>
                          );
                        })}
                        <td className="py-1.5 px-2 border-r border-slate-300"></td>
                        <td className="py-1.5 px-1.5 text-center font-extrabold uppercase text-[10px] border-r border-slate-300">TOTAL</td>
                        <td className="py-1.5 px-1.5 text-right font-mono font-black text-rose-800 border-r border-slate-300 text-xs whitespace-nowrap">
                          {fmt(egresosEfectivoSum)}
                        </td>
                        <td className="py-1.5 px-3"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* ── CUADRO CONTROL DE SALDOS FINALES CON ARQUEO Y DIAGNÓSTICO ── */}
                <div className="border border-slate-300 rounded-lg p-4 bg-slate-50/50 mb-6">
                  <div className="bg-slate-700 text-white px-3 py-1.5 rounded text-[11px] font-extrabold uppercase tracking-wider mb-3 flex items-center justify-between">
                    <span>CUADRO CONTROL DE SALDOS FINALES Y ARQUEO FÍSICO DE CAJA</span>
                    <span className="font-mono text-[9.5px] text-slate-300">Saldo Final = Ingresos Acumulados - Egresos</span>
                  </div>

                  <div className="grid grid-cols-12 gap-4 items-start">
                    {/* TABLA DE SALDOS POR CUENTA */}
                    <div className="col-span-7 border border-slate-300 rounded bg-white overflow-hidden">
                      <table className="w-full text-[11px] text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-black uppercase text-[9.5px]">
                            <th className="py-1.5 px-3">Cuenta / Método</th>
                            <th className="py-1.5 px-2 text-right">Ingresos</th>
                            <th className="py-1.5 px-2 text-right">Egresos</th>
                            <th className="py-1.5 px-3 text-right font-black text-slate-900">Saldo Final</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-semibold text-slate-800">
                          <tr className="bg-amber-50/30">
                            <td className="py-1.5 px-3 font-extrabold text-slate-900 uppercase">SALDO DE CAJA (EFECTIVO)</td>
                            <td className="py-1.5 px-2 text-right font-mono">{fmt(totalIngresosEfectivoAcumulado)}</td>
                            <td className="py-1.5 px-2 text-right font-mono">{fmt(egresosEfectivoSum)}</td>
                            <td className="py-1.5 px-3 text-right font-mono font-black text-slate-900 bg-amber-100/60">{fmt(saldoFinalEfectivo)}</td>
                          </tr>
                          {columnasBancarias.map((b, bIdx) => {
                            const sInit = Number(b.saldoInicial || 0);
                            const sIng = ingresosPorMetodo[b.metodoPagoId] || 0;
                            const sEgr = egresosPorMetodo[b.metodoPagoId] || 0;
                            return (
                              <tr key={`pdf-res-banco-${bIdx}`}>
                                <td className="py-1.5 px-3 font-bold text-slate-800 uppercase">SALDO {b.nombre}</td>
                                <td className="py-1.5 px-2 text-right font-mono">{fmt(sInit + sIng)}</td>
                                <td className="py-1.5 px-2 text-right font-mono">{fmt(sEgr)}</td>
                                <td className="py-1.5 px-3 text-right font-mono font-extrabold text-slate-900">{fmt(sInit + sIng - sEgr)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* ARQUEO FÍSICO Y DIAGNÓSTICO */}
                    <div className="col-span-5 border border-slate-300 rounded bg-white p-3 space-y-2 text-xs">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block border-b border-slate-200 pb-1">
                        RESULTADO DEL ARQUEO FÍSICO
                      </span>
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-600 font-bold">Efectivo Sistema:</span>
                        <strong className="text-slate-900 font-extrabold">{fmt(saldoFinalEfectivo)}</strong>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-600 font-bold">Efectivo Físico Contado:</span>
                        <strong className="text-slate-900 font-black">{fmt(cashPhysicalNum)}</strong>
                      </div>
                      <div className={`p-2 rounded border text-[11px] font-mono font-extrabold flex items-center justify-between ${diffCash === 0 ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : (diffCash < 0 ? 'bg-rose-50 border-rose-300 text-rose-800' : 'bg-amber-50 border-amber-300 text-amber-800')}`}>
                        <span className="text-[9px] uppercase font-bold text-slate-500">DIAGNÓSTICO</span>
                        {diffCash === 0 ? (
                          <span className="flex items-center gap-1"><CheckCircle size={13} /> CAJA CUADRADA</span>
                        ) : (
                          <span className="flex items-center gap-1"><AlertCircle size={13} /> {diffCash < 0 ? `FALTANTE: -${fmt(Math.abs(diffCash))}` : `SOBRANTE: +${fmt(diffCash)}`}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* OBSERVACIONES */}
                {cierre.observaciones && (
                  <div className="border border-amber-200 bg-amber-50/50 rounded-lg p-2.5 mb-6 text-xs text-amber-900">
                    <strong className="text-[10px] font-black uppercase text-amber-800 block mb-0.5">OBSERVACIONES Y NOTAS DE CIERRE:</strong>
                    <p className="font-medium leading-relaxed">{cierre.observaciones}</p>
                  </div>
                )}

                {/* ── SECCIÓN DE FIRMA ÚNICA CENTRADA ── */}
                <div className="mt-10 pt-4">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="w-72 border-t border-slate-500 mb-2" />
                    <p className="text-xs font-black text-slate-900 uppercase tracking-wide">
                      {nombreUsuario}
                    </p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                      Responsable de Caja Chica
                    </p>
                  </div>
                  <div className="text-center text-[9px] text-slate-400 font-medium mt-8">
                    Reporte de Cierre de Caja emitido automáticamente por el Sistema Operativo Luxes.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
