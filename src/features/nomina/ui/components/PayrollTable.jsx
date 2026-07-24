// c:/Users/Morqu/OneDrive/Documentos/JAIMS/Luxes/luxes-frontend/src/features/nomina/ui/components/PayrollTable.jsx

import React from 'react';

const formatUSD = (val) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(val);
};

export const PayrollTable = ({ calculatedPayrolls, globalSummary, onEdit, onViewRol }) => {
  return (
    <div className="premium-card rounded-xl overflow-hidden flex flex-col">
      <div className="overflow-x-auto max-h-[500px] sticky-scrollbar">
        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm sticky-table-header">
            <tr>
              <th className="px-4 py-3.5 font-bold text-gray-600 uppercase tracking-wider text-2xs">Colaborador</th>
              <th className="px-4 py-3.5 font-bold text-gray-600 uppercase tracking-wider text-2xs text-center">Sueldo Diario</th>
              <th className="px-4 py-3.5 font-bold text-gray-600 uppercase tracking-wider text-2xs text-center">Días Lab.</th>
              <th className="px-4 py-3.5 font-bold text-gray-600 uppercase tracking-wider text-2xs text-center">Total</th>
              <th className="px-4 py-3.5 font-bold text-gray-600 uppercase tracking-wider text-2xs text-center">Días Trab.</th>
              <th className="px-4 py-3.5 font-bold text-gray-600 uppercase tracking-wider text-2xs text-center">Permisos Horas</th>
              <th className="px-4 py-3.5 font-bold text-gray-600 uppercase tracking-wider text-2xs text-center">Subtotal Días</th>
              <th className="px-4 py-3.5 font-bold text-gray-600 uppercase tracking-wider text-2xs text-center">Décimo 4to</th>
              <th className="px-4 py-3.5 font-bold text-gray-600 uppercase tracking-wider text-2xs text-center">Décimo 3ro</th>
              <th className="px-4 py-3.5 font-bold text-gray-600 uppercase tracking-wider text-2xs text-center">IESS</th>
              <th className="px-4 py-3.5 font-bold text-gray-700 uppercase tracking-wider text-2xs text-center">Subtotal</th>
              <th className="px-4 py-3.5 font-bold text-green-800 uppercase tracking-wider text-2xs text-center">Ingresos</th>
              <th className="px-4 py-3.5 font-bold text-red-800 uppercase tracking-wider text-2xs text-center">Egresos</th>
              <th className="px-4 py-3.5 font-bold text-gray-700 uppercase tracking-wider text-2xs text-center">Total Pagar</th>
              <th className="px-4 py-3.5 font-bold text-gray-600 uppercase tracking-wider text-2xs text-center">Abonado</th>
              <th className="px-4 py-3.5 font-bold text-gray-600 uppercase tracking-wider text-2xs text-center">Estado</th>
              <th className="px-4 py-3.5 font-bold text-gray-600 uppercase tracking-wider text-2xs text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {calculatedPayrolls.map((row) => {
              const contractLabel = row.tieneContrato ? "Fijo" : "Eventual";
              const contractBadge = row.tieneContrato
                ? "bg-blue-50 text-blue-700 border-blue-100"
                : "bg-amber-50 text-amber-700 border-amber-100";
              const totalTeorico = row.sueldoDiario * row.diasLaborables;

              return (
                <tr key={row.empleadoId} className="table-row-interactive transition-all duration-150">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900 uppercase tracking-wide text-xs">{row.nombreEmpleado}</span>
                      <span className={`inline-flex w-fit px-1.5 py-0.5 rounded text-[9px] font-bold border mt-1 ${contractBadge}`}>
                        {contractLabel}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center text-gray-700 font-semibold text-xs">
                    {formatUSD(row.sueldoDiario)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center text-gray-600 text-xs font-semibold">
                    {row.diasLaborables}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center text-gray-700 font-semibold text-xs">
                    {formatUSD(totalTeorico)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center text-gray-600 text-xs font-bold">
                    {row.diasLaborados}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center text-gray-600 text-xs font-semibold">
                    {formatUSD(row.valorPermisoHoras)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center text-gray-700 font-bold text-xs">
                    {formatUSD(row.subtotalDias)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center text-gray-600 text-xs font-semibold">
                    {row.decimoCuarto > 0 ? formatUSD(row.decimoCuarto) : "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center text-gray-600 text-xs font-semibold">
                    {row.decimoTercero > 0 ? formatUSD(row.decimoTercero) : "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center text-red-500 text-xs font-semibold">
                    {row.iess > 0 ? `-${formatUSD(row.iess)}` : "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center text-gray-700 font-bold text-xs">
                    {formatUSD(row.subtotalLiquidacion)}
                  </td>
                  <td
                    className="px-4 py-3 whitespace-nowrap text-center text-green-600 font-bold text-xs cursor-pointer hover:bg-green-50 transition-colors"
                    onClick={() => onEdit(row.empleadoId)}
                    title="Haga clic para editar ingresos"
                  >
                    +{formatUSD(row.sumaIngresos)}
                  </td>
                  <td
                    className="px-4 py-3 whitespace-nowrap text-center text-red-500 font-bold text-xs cursor-pointer hover:bg-red-50 transition-colors"
                    onClick={() => onEdit(row.empleadoId)}
                    title="Haga clic para editar egresos"
                  >
                    -{formatUSD(row.sumaEgresos)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center text-blue-900 font-black text-sm">
                    {formatUSD(row.netoRecibir)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center text-gray-700 font-semibold text-xs">
                    {formatUSD(row.totalAbonado)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        row.estadoPago === "PAGADO"
                          ? "bg-green-100/80 text-green-800 border-green-200 glow-badge-active"
                          : row.estadoPago === "ABONO_PARCIAL"
                          ? "bg-orange-100/80 text-orange-800 border-orange-200 glow-badge-partial"
                          : "bg-red-100/80 text-red-800 border-red-200 glow-badge-pending"
                      }`}
                    >
                      {row.estadoPago === "PENDIENTE" ? "PENDIENTE" : row.estadoPago === "ABONO_PARCIAL" ? "ABONO PARCIAL" : "PAGADO"}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => onEdit(row.empleadoId)}
                        className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg text-2xs font-extrabold transition-all duration-200 cursor-pointer"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => onViewRol(row.empleadoId)}
                        className="px-2 py-1 bg-gray-50 text-gray-700 hover:bg-gray-800 hover:text-white rounded-lg text-2xs font-extrabold transition-all duration-200 cursor-pointer"
                      >
                        Rol
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-50 font-bold border-t border-gray-200">
            <tr>
              <td className="px-4 py-3 text-gray-800 uppercase tracking-widest text-2xs font-black">Totales</td>
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3"></td>
              <td className="px-4 py-3 text-center text-green-600 text-xs font-extrabold">+{formatUSD(globalSummary.ingresosTotal)}</td>
              <td className="px-4 py-3 text-center text-red-500 text-xs font-extrabold">-{formatUSD(globalSummary.egresosTotal)}</td>
              <td className="px-4 py-3 text-center text-blue-900 text-sm font-black">{formatUSD(globalSummary.netoTotal)}</td>
              <td className="px-4 py-3 text-center text-gray-900 text-xs font-extrabold">{formatUSD(globalSummary.abonadoTotal)}</td>
              <td className="px-4 py-3 text-center">
                <div className="flex flex-col text-[10px] font-semibold text-gray-500 text-left leading-normal p-1 max-w-[130px] mx-auto gap-0.5">
                  <div>🟢 Pagados: <span className="font-bold text-gray-700">{globalSummary.conteoEstados.PAGADO}</span></div>
                  <div>🟡 Parcial: <span className="font-bold text-gray-700">{globalSummary.conteoEstados.ABONO_PARCIAL}</span></div>
                  <div>🔴 Pendiente: <span className="font-bold text-gray-700">{globalSummary.conteoEstados.PENDIENTE}</span></div>
                </div>
              </td>
              <td className="px-4 py-3"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
