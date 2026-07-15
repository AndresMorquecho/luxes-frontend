// c:/Users/Morqu/OneDrive/Documentos/JAIMS/Luxes/luxes-frontend/src/features/nomina/ui/components/RolDePagoDoc.jsx

import React from 'react';

const formatUSD = (val) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(val);
};

export const RolDePagoDoc = ({ empleado, calculatedPayroll, activePeriod }) => {
  if (!empleado || !calculatedPayroll) return null;

  const handlePrint = () => {
    window.print();
  };

  const getFrecuenciaLabel = () => {
    if (activePeriod.type === '1ra_quincena') return 'PRIMERA QUINCENA';
    if (activePeriod.type === '2da_quincena') return 'SEGUNDA QUINCENA';
    return 'MENSUAL';
  };

  return (
    <div className="space-y-6">
      
      {/* Botones de acción - Ocultos en impresión */}
      <div className="flex justify-end gap-3 print:hidden">
        <button
          onClick={handlePrint}
          className="px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-900/10 transition-all duration-200 flex items-center gap-1.5"
        >
          <span>🖨️</span> Imprimir Rol
        </button>
      </div>

      {/* Contenedor del documento formal */}
      <div className="bg-white border-2 border-gray-800 p-8 shadow-sm max-w-4xl mx-auto text-gray-900 font-sans print:border-0 print:p-0 print:shadow-none print:max-w-full">
        
        {/* CSS para la impresión */}
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            body * {
              visibility: hidden;
            }
            .print-document-container, .print-document-container * {
              visibility: visible;
            }
            .print-document-container {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              border: none !important;
              padding: 0 !important;
              margin: 0 !important;
              box-shadow: none !important;
            }
            .print\\:hidden {
              display: none !important;
            }
          }
        `}} />

        <div className="print-document-container space-y-6">
          {/* Cabecera / Header */}
          <div className="text-center border-b-2 border-gray-800 pb-4">
            <h1 className="text-xl font-bold tracking-wide uppercase">LUXES S.A.</h1>
            <p className="text-xs font-semibold text-gray-600 mt-0.5">R.U.C. 0990001234001</p>
            <h2 className="text-sm font-bold tracking-wider uppercase mt-2 bg-gray-100 py-1.5 border-y border-gray-300">
              ROL DE PAGO - CONTRATO OCASIONAL ({getFrecuenciaLabel()})
            </h2>
            <p className="text-xs font-semibold text-gray-500 mt-1">
              PERÍODO: DESDE EL {calculatedPayroll.fechaInicio} HASTA EL {calculatedPayroll.fechaFin}
            </p>
          </div>

          {/* Datos del Empleado */}
          <div className="grid grid-cols-2 gap-y-2.5 gap-x-6 text-xs border-b border-gray-300 pb-4">
            <div className="flex">
              <span className="font-bold text-gray-700 w-24">Colaborador:</span>
              <span className="uppercase font-semibold">{empleado.nombre}</span>
            </div>
            <div className="flex">
              <span className="font-bold text-gray-700 w-24">Cédula:</span>
              <span>{empleado.cedula}</span>
            </div>
            <div className="flex">
              <span className="font-bold text-gray-700 w-24">Cargo:</span>
              <span className="uppercase">{empleado.cargo}</span>
            </div>
            <div className="flex">
              <span className="font-bold text-gray-700 w-24">Departamento:</span>
              <span className="uppercase">{empleado.departamento}</span>
            </div>
            <div className="flex">
              <span className="font-bold text-gray-700 w-24">Sueldo Diario:</span>
              <span>{formatUSD(empleado.sueldoDiario)} / día</span>
            </div>
            <div className="flex">
              <span className="font-bold text-gray-700 w-24">Días Laborados:</span>
              <span>{calculatedPayroll.diasLaborados} días</span>
            </div>
          </div>

          {/* Tabla de Conceptos: INGRESOS | EGRESOS */}
          <div className="grid grid-cols-2 border border-gray-800 text-xs">
            
            {/* Columna Ingresos */}
            <div className="border-r border-gray-800 flex flex-col">
              <div className="bg-gray-100 font-bold border-b border-gray-800 px-3 py-2 text-center text-green-800 uppercase tracking-wider">
                Ingresos
              </div>
              <div className="p-3 space-y-2.5 flex-1">
                <div className="flex justify-between">
                  <span>Sueldo Bruto ({calculatedPayroll.diasLaborados} días):</span>
                  <span className="font-semibold">{formatUSD(calculatedPayroll.totalBruto)}</span>
                </div>
                {calculatedPayroll.decimoTercero > 0 && (
                  <div className="flex justify-between">
                    <span>Décimo Tercero:</span>
                    <span>{formatUSD(calculatedPayroll.decimoTercero)}</span>
                  </div>
                )}
                {calculatedPayroll.decimoCuarto > 0 && (
                  <div className="flex justify-between">
                    <span>Décimo Cuarto:</span>
                    <span>{formatUSD(calculatedPayroll.decimoCuarto)}</span>
                  </div>
                )}
                {calculatedPayroll.ingresos.horasExtras > 0 && (
                  <div className="flex justify-between">
                    <span>Horas Extras:</span>
                    <span>{formatUSD(calculatedPayroll.ingresos.horasExtras)}</span>
                  </div>
                )}
                {calculatedPayroll.ingresos.trabajosEnEmpresa > 0 && (
                  <div className="flex justify-between">
                    <span>Trabajos en Empresa:</span>
                    <span>{formatUSD(calculatedPayroll.ingresos.trabajosEnEmpresa)}</span>
                  </div>
                )}
                {calculatedPayroll.ingresos.fondosReserva > 0 && (
                  <div className="flex justify-between">
                    <span>Fondos de Reserva:</span>
                    <span>{formatUSD(calculatedPayroll.ingresos.fondosReserva)}</span>
                  </div>
                )}
              </div>
              <div className="bg-gray-50 border-t border-gray-800 px-3 py-2 font-bold flex justify-between">
                <span>Total Ingresos (+):</span>
                <span className="text-green-800">
                  {formatUSD(
                    calculatedPayroll.totalBruto +
                      (calculatedPayroll.decimoTercero || 0) +
                      (calculatedPayroll.decimoCuarto || 0) +
                      calculatedPayroll.sumaIngresos
                  )}
                </span>
              </div>
            </div>

            {/* Columna Egresos */}
            <div className="flex flex-col">
              <div className="bg-gray-100 font-bold border-b border-gray-800 px-3 py-2 text-center text-red-800 uppercase tracking-wider">
                Egresos / Descuentos
              </div>
              <div className="p-3 space-y-2.5 flex-1">
                {calculatedPayroll.iess > 0 && (
                  <div className="flex justify-between">
                    <span>Aporte Personal IESS (9.45%):</span>
                    <span>{formatUSD(calculatedPayroll.iess)}</span>
                  </div>
                )}
                {calculatedPayroll.egresos.extensionConyuge > 0 && (
                  <div className="flex justify-between">
                    <span>Extensión Cónyuge IESS:</span>
                    <span>{formatUSD(calculatedPayroll.egresos.extensionConyuge)}</span>
                  </div>
                )}
                {calculatedPayroll.egresos.prestamoQuirografario > 0 && (
                  <div className="flex justify-between">
                    <span>Préstamo Quirografario:</span>
                    <span>{formatUSD(calculatedPayroll.egresos.prestamoQuirografario)}</span>
                  </div>
                )}
                {calculatedPayroll.egresos.anticipos > 0 && (
                  <div className="flex justify-between">
                    <span>Anticipos:</span>
                    <span>{formatUSD(calculatedPayroll.egresos.anticipos)}</span>
                  </div>
                )}
                {calculatedPayroll.valorPermisoHoras > 0 && (
                  <div className="flex justify-between">
                    <span>Dcto. Horas No Laboradas:</span>
                    <span>{formatUSD(calculatedPayroll.valorPermisoHoras)}</span>
                  </div>
                )}
                {calculatedPayroll.egresos.multas > 0 && (
                  <div className="flex justify-between">
                    <span>Multas:</span>
                    <span>{formatUSD(calculatedPayroll.egresos.multas)}</span>
                  </div>
                )}
                {calculatedPayroll.egresos.dctoFiesta > 0 && (
                  <div className="flex justify-between">
                    <span>Dcto. Fiesta Empresa:</span>
                    <span>{formatUSD(calculatedPayroll.egresos.dctoFiesta)}</span>
                  </div>
                )}
                {calculatedPayroll.egresos.dctoHerramientas > 0 && (
                  <div className="flex justify-between">
                    <span>Dcto. Herramientas:</span>
                    <span>{formatUSD(calculatedPayroll.egresos.dctoHerramientas)}</span>
                  </div>
                )}
                {calculatedPayroll.egresos.dctoGenerico > 0 && (
                  <div className="flex justify-between">
                    <span>Descuento Genérico:</span>
                    <span>{formatUSD(calculatedPayroll.egresos.dctoGenerico)}</span>
                  </div>
                )}
              </div>
              <div className="bg-gray-50 border-t border-gray-800 px-3 py-2 font-bold flex justify-between">
                <span>Total Egresos (-):</span>
                <span className="text-red-800">
                  {formatUSD(
                    (calculatedPayroll.iess || 0) +
                      (calculatedPayroll.valorPermisoHoras || 0) +
                      calculatedPayroll.sumaEgresos
                  )}
                </span>
              </div>
            </div>

          </div>

          {/* NETO A RECIBIR */}
          <div className="bg-gray-900 text-white border-2 border-gray-850 p-4 font-bold flex justify-between items-center text-sm">
            <span className="uppercase tracking-wider">Neto a Recibir:</span>
            <span className="text-lg tracking-wide">{formatUSD(calculatedPayroll.netoRecibir)}</span>
          </div>

          {/* Sección de Abonos parciales si aplican */}
          {calculatedPayroll.abonos.length > 0 && (
            <div className="bg-gray-50 border border-gray-300 p-4 rounded text-xs space-y-1.5">
              <div className="font-bold border-b border-gray-200 pb-1 uppercase tracking-wide text-gray-700">
                Historial de Abonos / Adelantos Recibidos:
              </div>
              {calculatedPayroll.abonos.map((a, i) => (
                <div key={i} className="flex justify-between text-gray-600">
                  <span>Abono #{i + 1} realizado el {a.fecha}:</span>
                  <span className="font-medium">{formatUSD(a.monto)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold border-t border-gray-200 pt-1 text-gray-800">
                <span>Total Abonado:</span>
                <span>{formatUSD(calculatedPayroll.totalAbonado)}</span>
              </div>
              <div className="flex justify-between font-bold text-blue-800">
                <span>Saldo Pendiente de Pago:</span>
                <span>{formatUSD(Math.max(0, calculatedPayroll.netoRecibir - calculatedPayroll.totalAbonado))}</span>
              </div>
            </div>
          )}

          {/* Firmas */}
          <div className="grid grid-cols-2 gap-16 pt-16 text-center text-xs">
            <div className="space-y-1.5 flex flex-col items-center">
              <div className="w-56 border-t border-gray-500"></div>
              <span className="font-bold uppercase">LUXES S.A.</span>
              <span className="text-gray-500 text-3xs uppercase">Entregado Por</span>
            </div>
            <div className="space-y-1.5 flex flex-col items-center">
              <div className="w-56 border-t border-gray-500"></div>
              <span className="font-bold uppercase">RECIBÍ CONFORME</span>
              <span className="text-gray-600 font-medium">C.I.: {empleado.cedula}</span>
              <span className="text-gray-500 text-3xs uppercase">Firma del Colaborador</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
