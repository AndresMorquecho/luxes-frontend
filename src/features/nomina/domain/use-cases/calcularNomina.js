// c:/Users/Morqu/OneDrive/Documentos/JAIMS/Luxes/luxes-frontend/src/features/nomina/domain/use-cases/calcularNomina.js

import {
  sueldoDiarioEnQuincena,
  calcSueldoBrutoQuincena,
  sueldoQuincenaBase,
} from '../../../../shared/utils/sueldoHelpers.js';
import {
  ingresosGravadosPeriodo,
  provisionDecimoTerceroPeriodo,
  provisionDecimoCuartoPeriodo,
  computeDecimosProvisions,
  SBU_DEFAULT_ECUADOR,
} from '../../../../shared/utils/decimosEcuadorHelpers.js';

const roundTo2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

/**
 * Caso de uso: Calcular Nómina de un empleado en un período.
 */
export function calcularNomina(empleado, nomina, options = {}) {
  if (!empleado) throw new Error('Se requiere un empleado para realizar el cálculo de nómina.');
  if (!nomina) throw new Error('Se requiere una nómina para realizar el cálculo.');

  const diasLaborables = Number(nomina.diasLaborables) || 15;
  const diasLaborados = Number(nomina.diasLaborados) || 0;
  const tieneContrato = empleado.tieneContrato !== false;
  const sbuVigente = Number(options.sbuVigente) || SBU_DEFAULT_ECUADOR;

  const sueldoDiario = sueldoDiarioEnQuincena(empleado.sueldoDiario, diasLaborables);
  const baseQuincena = sueldoQuincenaBase(empleado.sueldoDiario);
  const totalBruto = calcSueldoBrutoQuincena(empleado.sueldoDiario, diasLaborados, diasLaborables);

  const horasExtras = Number(nomina.ingresos.horasExtras || 0);
  const trabajosEmpresa = Number(nomina.ingresos.trabajosEnEmpresa || 0);
  const fondosReserva = tieneContrato ? Number(nomina.ingresos.fondosReserva || 0) : 0;

  const gravado = ingresosGravadosPeriodo(totalBruto, horasExtras, trabajosEmpresa);

  const ing = nomina.ingresos || {};
  const tieneProvisionesGuardadas =
    ing.provisionDecimo3 != null || ing.acumuladoDecimo3 != null;

  const decimos = tieneProvisionesGuardadas
    ? {
        provisionDecimo3: Number(ing.provisionDecimo3 ?? 0),
        provisionDecimo4: Number(ing.provisionDecimo4 ?? 0),
        acumuladoDecimo3: Number(ing.acumuladoDecimo3 ?? 0),
        acumuladoDecimo4: Number(ing.acumuladoDecimo4 ?? 0),
        pagoDecimo3: Number(ing.pagoDecimo3 ?? 0),
        pagoDecimo4: Number(ing.pagoDecimo4 ?? 0),
        decimoTercero: 0,
        decimoCuarto: 0,
        enVentanaPagoDecimo3: Boolean(ing.enVentanaPagoDecimo3),
        enVentanaPagoDecimo4: Boolean(ing.enVentanaPagoDecimo4),
      }
    : computeDecimosProvisions({
        gravado,
        sbuVigente,
        fechaInicio: nomina.fechaInicio,
        fechaFin: nomina.fechaFin,
        tieneContrato,
        decimoTerceroMensualizado: Boolean(empleado.decimoTerceroMensualizado),
        decimoCuartoMensualizado: Boolean(empleado.decimoCuartoMensualizado),
        region: empleado.region === 'sierra' ? 'sierra' : 'costa',
        nominasPreviasAnio: options.nominasPreviasAnio || [],
      });

  const pagoDecimo3 = decimos.pagoDecimo3;
  const pagoDecimo4 = decimos.pagoDecimo4;

  const baseIess = gravado;
  const iessCalculado = tieneContrato ? roundTo2(baseIess * 0.0945) : 0;
  const iess = tieneContrato
    ? (nomina.egresos.iess > 0 ? Number(nomina.egresos.iess) : iessCalculado)
    : 0;

  // Ingresos al neto: solo pagos mensualizados de décimos (no provisiones)
  const sumaIngresos = roundTo2(
    pagoDecimo3 + pagoDecimo4 + horasExtras + trabajosEmpresa + fondosReserva,
  );

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
      dctoGenerico,
  );

  const netoRecibir = roundTo2(totalBruto + sumaIngresos - sumaEgresos);

  const totalAbonado = roundTo2(nomina.abonos.reduce((sum, abono) => sum + abono.monto, 0));

  let estadoPago = 'PENDIENTE';
  if (nomina.estado === 'PAGADO' || (totalAbonado >= netoRecibir && netoRecibir > 0)) {
    estadoPago = 'PAGADO';
  } else if (nomina.estado === 'ABONO_PARCIAL' || totalAbonado > 0) {
    estadoPago = 'ABONO_PARCIAL';
  }

  return {
    empleadoId: empleado.id,
    nombreEmpleado: empleado.nombre,
    sueldoDiario,
    sueldoQuincenaBase: baseQuincena,
    diasLaborables,
    diasLaborados: nomina.diasLaborados,
    totalBruto,
    ingresos: {
      ...decimos,
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
    provisiones: {
      decimo3: decimos.provisionDecimo3,
      decimo4: decimos.provisionDecimo4,
      acumuladoDecimo3: decimos.acumuladoDecimo3,
      acumuladoDecimo4: decimos.acumuladoDecimo4,
    },
  };
}

export { provisionDecimoTerceroPeriodo, provisionDecimoCuartoPeriodo, ingresosGravadosPeriodo };
