// c:/Users/Morqu/OneDrive/Documentos/JAIMS/Luxes/luxes-frontend/src/features/nomina/domain/use-cases/calcularNomina.js

/**
 * Redondea un número a dos decimales de forma segura para contabilidad.
 * @param {number} num
 * @returns {number}
 */
const roundTo2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

/**
 * Caso de uso: Calcular Nómina de un empleado en un período.
 * Realiza los cálculos financieros de la nómina basándose en las planillas del Excel de la empresa.
 * 
 * @param {import('../entities/Empleado').Empleado} empleado - Datos del empleado
 * @param {import('../entities/Nomina').Nomina} nomina - Datos de la nómina
 * @returns {Object} Datos calculados de la nómina
 */
export function calcularNomina(empleado, nomina) {
  if (!empleado) throw new Error("Se requiere un empleado para realizar el cálculo de nómina.");
  if (!nomina) throw new Error("Se requiere una nómina para realizar el cálculo.");

  // 1. Calcular Bruto
  const totalBruto = roundTo2(empleado.sueldoDiario * nomina.diasLaborados);

  // 2. Valores automáticos si no vienen seteados explícitamente
  const tieneContrato = empleado.tieneContrato !== false;

  // Décimo tercero mensualizado: 1/12 de la base imponible (bruto + horas extras + trabajos empresa)
  const decimo3roBase = totalBruto + (nomina.ingresos.horasExtras || 0) + (nomina.ingresos.trabajosEnEmpresa || 0);
  const decimoTerceroCalculado = tieneContrato ? roundTo2(decimo3roBase / 12) : 0;
  const decimoTercero = tieneContrato
    ? (nomina.ingresos.decimoTercero > 0 ? Number(nomina.ingresos.decimoTercero) : decimoTerceroCalculado)
    : 0;

  // IESS Personal: 9.45% de la base imponible (Sueldo Bruto + Horas Extras + Trabajos en Empresa)
  const baseIess = totalBruto + (nomina.ingresos.horasExtras || 0) + (nomina.ingresos.trabajosEnEmpresa || 0);
  const iessCalculado = tieneContrato ? roundTo2(baseIess * 0.0945) : 0;
  const iess = tieneContrato
    ? (nomina.egresos.iess > 0 ? Number(nomina.egresos.iess) : iessCalculado)
    : 0;

  // 3. Sumar Ingresos
  // Décimo cuarto: se puede abonar en cualquier quincena del año (los empleados lo reciben
  // de poco a poco en la 1ra o 2da quincena). Es un valor manual; por defecto 0 hasta que se ingrese.
  const decimo4to = tieneContrato ? Number(nomina.ingresos.decimoCuarto || 0) : 0;
  const horasExtras = Number(nomina.ingresos.horasExtras || 0);
  const trabajosEmpresa = Number(nomina.ingresos.trabajosEnEmpresa || 0);
  const fondosReserva = tieneContrato ? Number(nomina.ingresos.fondosReserva || 0) : 0;

  const sumaIngresos = roundTo2(decimo4to + decimoTercero + horasExtras + trabajosEmpresa + fondosReserva);

  // 4. Sumar Egresos
  const extConyuge = Number(nomina.egresos.extensionConyuge || 0);
  const quirografario = Number(nomina.egresos.prestamoQuirografario || 0);
  const anticipos = Number(nomina.egresos.anticipos || 0);
  const dctoHoras = Number(nomina.egresos.dctoHorasNoLaboradas || 0);
  const multas = Number(nomina.egresos.multas || 0);
  const dctoFiesta = Number(nomina.egresos.dctoFiesta || 0);
  const dctoHerramientas = Number(nomina.egresos.dctoHerramientas || 0);
  const dctoGenerico = Number(nomina.egresos.dctoGenerico || 0);

  const sumaEgresos = roundTo2(
    iess + 
    extConyuge + 
    quirografario + 
    anticipos + 
    dctoHoras + 
    multas + 
    dctoFiesta + 
    dctoHerramientas + 
    dctoGenerico
  );

  // 5. Neto a Recibir
  const netoRecibir = roundTo2((totalBruto + sumaIngresos) - sumaEgresos);

  // 6. Calcular Estado de Pago según Abonos
  const totalAbonado = roundTo2(nomina.abonos.reduce((sum, abono) => sum + abono.monto, 0));
  
  let estadoPago = "PENDIENTE";
  if (nomina.estado === "PAGADO" || (totalAbonado >= netoRecibir && netoRecibir > 0)) {
    estadoPago = "PAGADO";
  } else if (nomina.estado === "ABONO_PARCIAL" || totalAbonado > 0) {
    estadoPago = "ABONO_PARCIAL";
  }

  return {
    empleadoId: empleado.id,
    nombreEmpleado: empleado.nombre,
    sueldoDiario: empleado.sueldoDiario,
    diasLaborados: nomina.diasLaborados,
    totalBruto,
    ingresos: {
      decimoCuarto: decimo4to,
      decimoTercero,
      horasExtras,
      trabajosEnEmpresa: trabajosEmpresa,
      fondosReserva,
    },
    egresos: {
      iess,
      extensionConyuge: extConyuge,
      prestamoQuirografario: quirografario,
      anticipos,
      dctoHorasNoLaboradas: dctoHoras,
      multas,
      dctoFiesta,
      dctoHerramientas,
      dctoGenerico,
    },
    sumaIngresos,
    sumaEgresos,
    netoRecibir,
    abonos: nomina.abonos,
    totalAbonado,
    estadoPago,
  };
}
