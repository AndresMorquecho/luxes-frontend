import React from 'react';
import { CheckCircle, AlertCircle, FileText, ArrowUpRight, ArrowDownRight, Save, Lock, Printer } from 'lucide-react';

const fmt = (num) => {
  if (num === null || num === undefined || isNaN(num)) return '$ -';
  const val = Number(num);
  if (val === 0) return '$ -';
  return val.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
};

const formatDateLong = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return String(dateStr).toUpperCase();
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
    const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${d.getDate()}-${months[d.getMonth()]}`;
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

export const ExcelCierreSheet = ({ 
  cierreData, 
  cierreDates,
  setCierreDates,
  efectivoFisicoContado = '', 
  setEfectivoFisicoContado = null,
  handleSaveCierre = null,
  savingCierre = false,
  handleExportPdf = null
}) => {
  if (!cierreData) return null;

  const metodosDetalle = cierreData.metodosDetalle || [];
  const itemsIngresos = cierreData.seccionIngresos?.items || [];
  const itemsEgresos = cierreData.seccionEgresos?.items || [];
  const esCerrado = cierreData.esCerrado || false;

  const esEfectivoName = (nombre = '') => {
    const n = nombre.toLowerCase();
    return n.includes('efectivo') || n.includes('caja') || n.includes('cash');
  };

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

  const cashPhysicalNum = efectivoFisicoContado === '' ? saldoFinalEfectivo : Number(efectivoFisicoContado);
  const diffCash = cashPhysicalNum - saldoFinalEfectivo;

  return (
    <div className="w-full space-y-6 font-sans select-none my-2 animate-slide-up relative z-[90]">
      {/* CABECERA UNIFICADA DE LA HOJA (UI/UX AMIGABLE Y ESTRUCTURADA EN 2 BLOQUES) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-[100]">
        {/* BLOQUE IZQUIERDO: ETIQUETA + SELECTOR DE FECHA + TÍTULO DINÁMICO */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200 shrink-0">
            <FileText size={20} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                FECHA DE CIERRE A CONSULTAR:
              </label>
              {esCerrado && (
                <span className="text-[10px] font-extrabold text-slate-600 flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  <Lock size={11} className="text-slate-600" />
                  DÍA CERRADO
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {cierreDates && setCierreDates && (
                <div className="relative">
                  <input
                    type="date"
                    value={cierreDates?.desde || ''}
                    onChange={(e) => {
                      const sel = e.target.value;
                      if (sel) {
                        setCierreDates({ desde: sel, hasta: sel });
                      }
                    }}
                    className="bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg px-3 py-1 text-xs font-mono font-extrabold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 cursor-pointer shadow-2xs transition-colors"
                  />
                </div>
              )}
              <span className="text-sm font-black text-slate-800 uppercase tracking-wide">
                {formatDateLong(cierreData.fechaInicio)}
              </span>
            </div>
          </div>
        </div>

        {/* BLOQUE DERECHO: TOTALES INGRESOS Y EGRESOS + BOTÓN PDF */}
        <div className="flex flex-wrap items-center gap-3 shrink-0 self-start md:self-auto">
          <div className="flex items-center gap-3 text-xs font-mono font-bold bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 text-slate-700">
            <span>INGRESOS: <strong className="text-emerald-700 font-extrabold">{fmt(cierreData.totalIngresos)}</strong></span>
            <span className="text-slate-300">|</span>
            <span>EGRESOS: <strong className="text-rose-700 font-extrabold">{fmt(cierreData.totalEgresos)}</strong></span>
          </div>

          {handleExportPdf && (
            <button
              type="button"
              onClick={handleExportPdf}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-xs rounded-xl transition-all flex items-center gap-2 shadow-xs cursor-pointer"
              title="Ver o Imprimir Reporte PDF en hoja horizontal"
            >
              <Printer size={15} />
              <span>Ver / Imprimir PDF</span>
            </button>
          )}
        </div>
      </div>

      {/* ── TABLA 1: INGRESOS DEL DÍA Y ARRASTRE INICIAL ── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* BANNER ENCABEZADO DE SECCIÓN ESTILO NÓMINA DEL MES */}
        <div className="bg-slate-700 text-white px-5 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowUpRight size={16} className="text-emerald-400" />
            <h4 className="text-xs font-extrabold uppercase tracking-wider">
              INGRESOS Y ARRASTRE DE SALDOS
            </h4>
          </div>
          <span className="text-[11px] font-bold text-slate-300 font-mono">
            {itemsIngresos.length} transacción{itemsIngresos.length === 1 ? '' : 'es'}
          </span>
        </div>

        {/* BANNER INDICADOR PARA MÓVIL */}
        <div className="md:hidden bg-slate-100 text-slate-600 text-[10px] font-extrabold px-3 py-1 flex items-center justify-between border-b border-slate-200 uppercase tracking-wider">
          <span>Desliza horizontalmente para ver cuentas</span>
          <span className="font-mono text-slate-500 font-black">↔</span>
        </div>

        <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
          <table className="w-full text-xs text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-100 text-[10px] font-black text-slate-700 uppercase border-b border-slate-200 h-12">
                <th className="py-2 px-2.5 w-24 text-center border-r border-slate-200">FECHA Y HORA</th>
                <th className="py-2 px-3 w-44 border-r border-slate-200">CLIENTE / ORIGEN</th>
                {/* COLUMNA EFECTIVO: UNIFORME w-24 */}
                <th className="py-2 px-1.5 w-24 text-center border-r border-slate-200 font-black bg-amber-100/70 text-slate-900 leading-tight">
                  EFECTIVO
                </th>
                {/* COLUMNAS BANCARIAS: MISMOS ANCHOS UNIFORMES w-24 */}
                {columnasBancarias.map((b, idx) => (
                  <th key={`ing-col-${idx}`} className="py-2 px-1.5 w-24 text-center border-r border-slate-200 font-extrabold leading-tight">
                    <span className="line-clamp-2 uppercase text-[9px] leading-tight block">{b.nombre}</span>
                  </th>
                ))}
                {/* COLUMNA UNIFICADA PROFORMA / ORDEN # */}
                <th className="py-2 px-2 w-28 text-center border-r border-slate-200 leading-tight">
                  <span className="line-clamp-2 uppercase text-[9.5px]">PROFORMA / ORDEN #</span>
                </th>
                <th className="py-2 px-1.5 w-24 text-center border-r border-slate-200 font-black bg-amber-100/70 text-slate-900 leading-tight">VALOR</th>
                <th className="py-2 px-3">DETALLE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {/* FILA 1: ARRASTRE CAJA ANTERIOR (SUAVE Y SOBRIO) */}
              <tr className="bg-slate-50/80 hover:bg-slate-100/80 transition-colors font-semibold h-10 border-b border-slate-200">
                <td className="py-2 px-2.5 text-center font-mono text-slate-500 border-r border-slate-200 whitespace-nowrap">
                  {formatDateShort(cierreData.fechaInicio)}
                </td>
                <td className="py-2 px-3 font-extrabold text-slate-800 uppercase border-r border-slate-200 truncate flex items-center gap-1.5">
                  <span className="text-slate-400 font-semibold text-[9.5px] tracking-wider uppercase">(ARRAS.)</span>
                  <span className="truncate">SALDO ANTERIOR CAJA CHICA</span>
                </td>
                <td className="py-2 px-1.5 text-right font-mono font-black text-slate-900 border-r border-slate-200 bg-amber-50/80 text-xs whitespace-nowrap">
                  {fmt(saldoInicialEfectivo)}
                </td>
                {columnasBancarias.map((_, idx) => (
                  <td key={`arr-emp-${idx}`} className="py-2 px-1.5 text-right font-mono text-slate-400 border-r border-slate-200 whitespace-nowrap">$ -</td>
                ))}
                <td className="py-2 px-2 text-center font-mono text-slate-400 border-r border-slate-200 whitespace-nowrap">—</td>
                <td className="py-2 px-1.5 text-right font-mono font-black text-slate-900 border-r border-slate-200 bg-amber-50/80 text-xs whitespace-nowrap">{fmt(saldoInicialEfectivo)}</td>
                <td className="py-2 px-3 text-slate-500 italic text-[11px] truncate">Saldo inicial de caja chica del cierre anterior</td>
              </tr>

              {/* FILA 2: ARRASTRE BANCOS ANTERIOR (SUAVE Y SOBRIO) */}
              {columnasBancarias.length > 0 && (
                <tr className="bg-slate-50/80 hover:bg-slate-100/80 transition-colors font-semibold h-10 border-b-2 border-b-slate-300">
                  <td className="py-2 px-2.5 text-center font-mono text-slate-500 border-r border-slate-200 whitespace-nowrap">
                    {formatDateShort(cierreData.fechaInicio)}
                  </td>
                  <td className="py-2 px-3 font-bold text-slate-700 uppercase border-r border-slate-200 truncate flex items-center gap-1.5">
                    <span className="text-slate-400 font-semibold text-[9.5px] tracking-wider uppercase">(ARRAS.)</span>
                    <span className="truncate">SALDO ANTERIOR BANCOS</span>
                  </td>
                  <td className="py-2 px-1.5 text-right font-mono text-slate-400 border-r border-slate-200 whitespace-nowrap">$ -</td>
                  {columnasBancarias.map((b, idx) => (
                    <td key={`arr-bnk-${idx}`} className="py-2 px-1.5 text-right font-mono font-extrabold text-slate-800 border-r border-slate-200 bg-blue-50/30 whitespace-nowrap">
                      {fmt(Number(b.saldoInicial || 0))}
                    </td>
                  ))}
                  <td className="py-2 px-2 text-center font-mono text-slate-400 border-r border-slate-200 whitespace-nowrap">—</td>
                  <td className="py-2 px-1.5 text-right font-mono text-slate-400 border-r border-slate-200 whitespace-nowrap">$ -</td>
                  <td className="py-2 px-3 text-slate-500 italic text-[11px] truncate">Saldos iniciales bancarios de apertura de cuentas</td>
                </tr>
              )}

              {/* MOVIMIENTOS DE INGRESOS REALES (CON FECHA Y HORA) */}
              {itemsIngresos.map((item, idx) => {
                const isEfectivo = esEfectivoName(item.metodoPagoNombre) || item.metodoPagoId === metodoEfectivo.metodoPagoId;
                const proformaOrdenText = [item.proformaNumero, item.ordenPedido].filter(Boolean).join(' / ') || '—';

                return (
                  <tr key={item.id || idx} className="hover:bg-slate-50 transition-colors h-10">
                    <td className="py-2 px-2.5 text-center font-mono text-slate-600 border-r border-slate-200 whitespace-nowrap font-bold text-[11px]">
                      {formatDateWithTime(item.fecha)}
                    </td>
                    <td className="py-2 px-3 font-bold text-slate-800 uppercase border-r border-slate-200 truncate" title={item.cliente}>{item.cliente}</td>
                    <td className="py-2 px-1.5 text-right font-mono font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap">
                      {isEfectivo ? fmt(item.monto) : '$ -'}
                    </td>
                    {columnasBancarias.map((b, bIdx) => {
                      const isThisBank = item.metodoPagoId === b.metodoPagoId || (item.metodoPagoNombre || '').toLowerCase().includes((b.nombre || '').toLowerCase());
                      return (
                        <td key={`ing-val-${bIdx}`} className="py-2 px-1.5 text-right font-mono font-bold text-slate-800 border-r border-slate-200 whitespace-nowrap">
                          {isThisBank ? fmt(item.monto) : '$ -'}
                        </td>
                      );
                    })}
                    <td className="py-2 px-2 text-center font-mono font-semibold text-slate-700 border-r border-slate-200 truncate text-[11px]" title={proformaOrdenText}>{proformaOrdenText}</td>
                    <td className="py-2 px-1.5 text-right font-mono font-extrabold text-emerald-700 border-r border-slate-200 whitespace-nowrap">{fmt(item.monto)}</td>
                    <td className="py-2 px-3 text-slate-600 font-medium uppercase text-[11px] truncate" title={item.detalle}>{item.detalle}</td>
                  </tr>
                );
              })}

              {itemsIngresos.length === 0 && (
                <tr>
                  <td colSpan={6 + columnasBancarias.length} className="py-6 text-center text-slate-400 font-medium italic">
                    No existen ingresos ni abonos registrados para la fecha seleccionada.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 text-slate-900 font-black text-xs border-t-2 border-slate-300 h-10">
                <td className="py-2 px-2.5 text-center border-r border-slate-300"></td>
                <td className="py-2 px-3 uppercase tracking-wider text-[10px] border-r border-slate-300 truncate">TOTAL INGRESOS + ARRASTRE INICIAL</td>
                <td className="py-2 px-1.5 text-right font-mono font-black text-slate-900 border-r border-slate-300 bg-amber-200/60 text-xs whitespace-nowrap">
                  {fmt(totalIngresosEfectivoAcumulado)}
                </td>
                {columnasBancarias.map((b, bIdx) => {
                  const sInit = Number(b.saldoInicial || 0);
                  const sIng = ingresosPorMetodo[b.metodoPagoId] || 0;
                  return (
                    <td key={`tot-ing-banco-${bIdx}`} className="py-2 px-1.5 text-right font-mono font-black text-slate-900 border-r border-slate-300 whitespace-nowrap">
                      {fmt(sInit + sIng)}
                    </td>
                  );
                })}
                <td className="py-2 px-2 border-r border-slate-300"></td>
                <td className="py-2 px-1.5 text-right font-mono font-black text-emerald-800 border-r border-slate-300 text-xs whitespace-nowrap">
                  {fmt(totalIngresosEfectivoAcumulado)}
                </td>
                <td className="py-2 px-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── TABLA 2: EGRESOS DEL DÍA (DIRECTAMENTE DEBAJO) ── */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {/* BANNER ENCABEZADO DE SECCIÓN ESTILO NÓMINA DEL MES */}
        <div className="bg-slate-700 text-white px-5 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowDownRight size={16} className="text-rose-400" />
            <h4 className="text-xs font-extrabold uppercase tracking-wider">
              EGRESOS Y GASTOS DEL DÍA
            </h4>
          </div>
          <span className="text-[11px] font-bold text-slate-300 font-mono">
            {itemsEgresos.length} transacción{itemsEgresos.length === 1 ? '' : 'es'}
          </span>
        </div>

        {/* BANNER INDICADOR PARA MÓVIL */}
        <div className="md:hidden bg-slate-100 text-slate-600 text-[10px] font-extrabold px-3 py-1 flex items-center justify-between border-b border-slate-200 uppercase tracking-wider">
          <span>Desliza horizontalmente para ver cuentas</span>
          <span className="font-mono text-slate-500 font-black">↔</span>
        </div>

        <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
          <table className="w-full text-xs text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-100 text-[10px] font-black text-slate-700 uppercase border-b border-slate-200 h-12">
                <th className="py-2 px-2.5 w-24 text-center border-r border-slate-200">FECHA Y HORA</th>
                <th className="py-2 px-3 w-44 border-r border-slate-200">PROVEEDOR / BENEFICIARIO</th>
                {/* COLUMNA EFECTIVO: UNIFORME w-24 */}
                <th className="py-2 px-1.5 w-24 text-center border-r border-slate-200 font-black bg-amber-100/70 text-slate-900 leading-tight">
                  EFECTIVO
                </th>
                {/* COLUMNAS BANCARIAS: MISMOS ANCHOS UNIFORMES w-24 */}
                {columnasBancarias.map((b, idx) => (
                  <th key={`egr-col-${idx}`} className="py-2 px-1.5 w-24 text-center border-r border-slate-200 font-extrabold leading-tight">
                    <span className="line-clamp-2 uppercase text-[9px] leading-tight block">{b.nombre}</span>
                  </th>
                ))}
                <th className="py-2 px-2 w-32 text-center border-r border-slate-200">FACTURA #</th>
                <th className="py-2 px-1.5 w-14 text-center border-r border-slate-200">IVA %</th>
                <th className="py-2 px-1.5 w-24 text-center border-r border-slate-200 font-black bg-amber-100/70 text-slate-900 leading-tight">EFECTIVO</th>
                <th className="py-2 px-3">DETALLE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {/* MOVIMIENTOS DE EGRESOS REALES (CON FECHA Y HORA) */}
              {itemsEgresos.map((item, idx) => {
                const isEfectivo = esEfectivoName(item.metodoPagoNombre) || item.metodoPagoId === metodoEfectivo.metodoPagoId;

                return (
                  <tr key={item.id || idx} className="hover:bg-slate-50 transition-colors h-10">
                    <td className="py-2 px-2.5 text-center font-mono text-slate-600 border-r border-slate-200 whitespace-nowrap font-bold text-[11px]">
                      {formatDateWithTime(item.fecha)}
                    </td>
                    <td className="py-2 px-3 font-bold text-slate-800 uppercase border-r border-slate-200 truncate" title={item.proveedor}>{item.proveedor}</td>
                    <td className="py-2 px-1.5 text-right font-mono font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap">
                      {isEfectivo ? fmt(item.monto) : '$ -'}
                    </td>
                    {columnasBancarias.map((b, bIdx) => {
                      const isThisBank = item.metodoPagoId === b.metodoPagoId || (item.metodoPagoNombre || '').toLowerCase().includes((b.nombre || '').toLowerCase());
                      return (
                        <td key={`egr-val-${bIdx}`} className="py-2 px-1.5 text-right font-mono font-bold text-slate-800 border-r border-slate-200 whitespace-nowrap">
                          {isThisBank ? fmt(item.monto) : '$ -'}
                        </td>
                      );
                    })}
                    <td className="py-2 px-2 text-center font-mono font-semibold text-slate-700 border-r border-slate-200 truncate text-[11px]" title={item.facturaNumero}>{item.facturaNumero || '—'}</td>
                    <td className="py-2 px-1.5 text-center font-mono text-slate-500 border-r border-slate-200 whitespace-nowrap">{item.ivaPorcentaje ? `${item.ivaPorcentaje}%` : '—'}</td>
                    <td className="py-2 px-1.5 text-right font-mono font-extrabold text-rose-700 border-r border-slate-200 whitespace-nowrap">{isEfectivo ? fmt(item.monto) : '$ -'}</td>
                    <td className="py-2 px-3 text-slate-600 font-medium uppercase text-[11px] truncate" title={item.detalle}>{item.detalle}</td>
                  </tr>
                );
              })}

              {itemsEgresos.length === 0 && (
                <tr>
                  <td colSpan={6 + columnasBancarias.length} className="py-6 text-center text-slate-400 font-medium italic">
                    No existen egresos ni gastos registrados para la fecha seleccionada.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 text-slate-900 font-black text-xs border-t-2 border-slate-300 h-10">
                <td className="py-2 px-2.5 text-center border-r border-slate-300"></td>
                <td className="py-2 px-3 uppercase tracking-wider text-[10px] border-r border-slate-300 truncate">SALDO DE TRANSFERENCIA / EGRESOS TOTAL</td>
                <td className="py-2 px-1.5 text-right font-mono font-black text-slate-900 border-r border-slate-300 bg-rose-200/60 text-xs whitespace-nowrap">
                  {fmt(egresosEfectivoSum)}
                </td>
                {columnasBancarias.map((b, bIdx) => {
                  const sEgr = egresosPorMetodo[b.metodoPagoId] || 0;
                  return (
                    <td key={`tot-egr-banco-${bIdx}`} className="py-2 px-1.5 text-right font-mono font-black text-slate-900 border-r border-slate-300 whitespace-nowrap">
                      {fmt(sEgr)}
                    </td>
                  );
                })}
                <td className="py-2 px-2 border-r border-slate-300"></td>
                <td className="py-2 px-1.5 text-center font-extrabold uppercase text-[10px] border-r border-slate-300">TOTAL</td>
                <td className="py-2 px-1.5 text-right font-mono font-black text-rose-800 border-r border-slate-300 text-xs whitespace-nowrap">
                  {fmt(egresosEfectivoSum)}
                </td>
                <td className="py-2 px-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── CUADRO CONTROL DE SALDOS FINALES CON BOTÓN GUARDAR AL FINAL ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="bg-slate-700 text-white px-4 py-2 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h4 className="text-xs font-extrabold uppercase tracking-wider">
            CUADRO CONTROL DE SALDOS FINALES AL CIERRE
          </h4>
          <span className="text-[10px] font-bold text-slate-300 font-mono uppercase">
            Saldo Final = Ingresos Acumulados - Egresos
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* TABLA DE FILAS DE SALDOS CALCULADOS */}
          <div className="lg:col-span-7 border border-slate-200 rounded-lg overflow-x-auto -webkit-overflow-scrolling-touch">
            {/* BANNER INDICADOR PARA MÓVIL */}
            <div className="md:hidden bg-slate-100 text-slate-600 text-[10px] font-extrabold px-3 py-1 flex items-center justify-between border-b border-slate-200 uppercase tracking-wider">
              <span>Desliza horizontalmente para ver saldos</span>
              <span className="font-mono text-slate-500 font-black">↔</span>
            </div>

            <table className="w-full text-xs text-left min-w-[460px]">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-black uppercase text-[10px] h-9">
                  <th className="py-2 px-3 min-w-[170px]">Cuenta / Método</th>
                  <th className="py-2 px-2 text-right min-w-[85px]">Ingresos</th>
                  <th className="py-2 px-2 text-right min-w-[85px]">Egresos</th>
                  <th className="py-2 px-3 text-right font-black text-slate-900 min-w-[105px]">Saldo Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-semibold text-slate-800">
                {/* FILA CAJA CHICA / EFECTIVO */}
                <tr className="hover:bg-amber-50/30 bg-amber-50/20 h-10">
                  <td className="py-2 px-4 font-extrabold text-slate-900 uppercase flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    SALDO DE CAJA (EFECTIVO)
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-slate-600 whitespace-nowrap">{fmt(totalIngresosEfectivoAcumulado)}</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-600 whitespace-nowrap">{fmt(egresosEfectivoSum)}</td>
                  <td className="py-2 px-4 text-right font-mono font-black text-slate-900 text-xs bg-amber-100/50 whitespace-nowrap">
                    {fmt(saldoFinalEfectivo)}
                  </td>
                </tr>

                {/* FILAS DE CUENTAS BANCARIAS */}
                {columnasBancarias.map((b, bIdx) => {
                  const sInit = Number(b.saldoInicial || 0);
                  const sIng = ingresosPorMetodo[b.metodoPagoId] || 0;
                  const sEgr = egresosPorMetodo[b.metodoPagoId] || 0;
                  const sFinalBank = sInit + sIng - sEgr;

                  return (
                    <tr key={`res-row-${bIdx}`} className="hover:bg-slate-50 h-10">
                      <td className="py-2 px-4 font-extrabold text-slate-800 uppercase flex items-center gap-2 truncate">
                        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                        SALDO {b.nombre}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600 whitespace-nowrap">{fmt(sInit + sIng)}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600 whitespace-nowrap">{fmt(sEgr)}</td>
                      <td className="py-2 px-4 text-right font-mono font-extrabold text-slate-900 whitespace-nowrap">
                        {fmt(sFinalBank)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* CAMPO INTERACTIVO PARA DIGITAR EFECTIVO FÍSICO Y BOTÓN GUARDAR AL FINAL */}
          {setEfectivoFisicoContado && (
            <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3.5">
              <div>
                <label className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider block">
                  ARQUEO FÍSICO DE EFECTIVO CONTADO EN CAJA
                </label>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Digita el valor contado para verificar el cuadre automático contra el sistema ({fmt(saldoFinalEfectivo)}).
                </p>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-bold text-xs">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={efectivoFisicoContado}
                    onChange={(e) => setEfectivoFisicoContado(e.target.value)}
                    placeholder={saldoFinalEfectivo.toFixed(2)}
                    className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-sm font-mono font-black text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs"
                  />
                </div>

                <div className={`px-3.5 py-2 rounded-lg border text-xs font-mono font-extrabold flex items-center justify-between shadow-xs ${diffCash === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : (diffCash < 0 ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-amber-50 border-amber-200 text-amber-700')}`}>
                  <span className="text-[10px] uppercase font-bold text-slate-500">DIAGNÓSTICO</span>
                  {diffCash === 0 ? (
                    <span className="flex items-center gap-1.5"><CheckCircle size={15} /> CAJA CUADRADA</span>
                  ) : (
                    <span className="flex items-center gap-1.5"><AlertCircle size={15} /> {diffCash < 0 ? `FALTANTE: -${fmt(Math.abs(diffCash))}` : `SOBRANTE: +${fmt(diffCash)}`}</span>
                  )}
                </div>

                {/* BOTÓN PRINCIPAL PARA GUARDAR CIERRE DE CAJA AL FINAL (SOLO SI NO ESTÁ CERRADO HISTÓRICAMENTE) */}
                {handleSaveCierre && !esCerrado && (
                  <button
                    type="button"
                    onClick={handleSaveCierre}
                    disabled={savingCierre}
                    className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 uppercase tracking-wider"
                  >
                    {savingCierre ? (
                      <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" aria-hidden="true" />
                    ) : (
                      <Save size={15} />
                    )}
                    <span>Guardar Cierre de Caja</span>
                  </button>
                )}

                {esCerrado && (
                  <div className="w-full mt-2 py-2 px-3 bg-slate-100 border border-slate-200 text-slate-600 font-bold text-xs rounded-lg text-center flex items-center justify-center gap-1.5">
                    <Lock size={14} className="text-slate-500" />
                    <span>DÍA CERRADO Y REGISTRADO</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
