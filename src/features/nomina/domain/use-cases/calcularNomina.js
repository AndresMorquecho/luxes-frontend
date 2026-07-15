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

  const isFijo = empleado.tieneContrato !== false;
  const sueldoMensual = Number(empleado.sueldoDiario) >= 100 ? Number(empleado.sueldoDiario) : Number(empleado.sueldoDiario) * 30;

  // 1. Días Laborables
  const diasLaborables = isFijo ? 15 : (Number(nomina.diasLaborables) || 13);

  // 2. Tarifa Diaria Quincenal
  const sueldoDiario = sueldoDiarioEnQuincena(empleado.sueldoDiario, diasLaborables);

  // 3. Días Trabajados (Reales)
  const diasLaborados = Number(nomina.diasLaborados) || 0; // representará diasTrabajadosReales

  // 4. Bruto total de días
  const totalBruto = roundTo2(sueldoDiario * diasLaborados);

  // 5. Permisos/Atrasos
  const permisoHoras = Number(nomina.permisoHoras || 0);
  const valorPermisoHoras = roundTo2(permisoHoras * (sueldoDiario / 8));
  const subtotalDias = roundTo2(Math.max(0, totalBruto - valorPermisoHoras));

  // 6. Décimos
  let decimoCuarto = 0;
  let decimoTercero = 0;
  if (isFijo) {
    const dec4Val = empleado.decimoCuartoValor !== null && empleado.decimoCuartoValor !== undefined && empleado.decimoCuartoValor !== ''
      ? Number(empleado.decimoCuartoValor)
      : 40.16;
    decimoCuarto = roundTo2(dec4Val / 2);

    const dec3Val = empleado.decimoTerceroValor !== null && empleado.decimoTerceroValor !== undefined && empleado.decimoTerceroValor !== ''
      ? Number(empleado.decimoTerceroValor)
      : (sueldoMensual / 12);
    decimoTercero = roundTo2(dec3Val / 2);
  }

  // 7. IESS
  const iess = isFijo 
    ? (empleado.iessValor !== null && empleado.iessValor !== undefined && empleado.iessValor !== ''
      ? roundTo2(Number(empleado.iessValor) / 2)
      : roundTo2(sueldoMensual * 0.0945 / 2))
    : 0;

  // 8. Subtotal de Liquidación
  const subtotalLiquidacion = roundTo2(subtotalDias + decimoCuarto + decimoTercero - iess);

  // 9. Horas Extras y Trabajos en Empresa (Ingresos Adicionales)
  const horasExtras = Number(nomina.ingresos?.horasExtras || 0);
  const trabajosEmpresa = Number(nomina.ingresos?.trabajosEnEmpresa || 0);
  const fondosReserva = isFijo ? Number(nomina.ingresos?.fondosReserva || 0) : 0;

  const sumaIngresos = roundTo2(horasExtras + trabajosEmpresa + fondosReserva);

  // 10. Egresos Adicionales
  const extConyuge = Number(nomina.egresos?.extensionConyuge || 0);
  const quirografario = Number(nomina.egresos?.prestamoQuirografario || 0);
  const anticipos = Number(nomina.egresos?.anticipos || 0);
  const multas = Number(nomina.egresos?.multas || 0);
  const dctoFiesta = Number(nomina.egresos?.dctoFiesta || 0);
  const dctoHerramientas = Number(nomina.egresos?.dctoHerramientas || 0);
  const dctoGenerico = Number(nomina.egresos?.dctoGenerico || 0);

  const sumaEgresos = roundTo2(
    extConyuge + quirografario + anticipos + multas + dctoFiesta + dctoHerramientas + dctoGenerico
  );

  // 11. Neto a Recibir
  const netoRecibir = roundTo2(subtotalLiquidacion + sumaIngresos - sumaEgresos);

  const totalAbonado = roundTo2((nomina.abonos || []).reduce((sum, abono) => sum + abono.monto, 0));

  let estadoPago = 'PENDIENTE';
  if (nomina.estado === 'PAGADO' || (totalAbonado >= netoRecibir && netoRecibir > 0)) {
    estadoPago = 'PAGADO';
  } else if (nomina.estado === 'ABONO_PARCIAL' || totalAbonado > 0) {
    estadoPago = 'ABONO_PARCIAL';
  }

  return {
    empleadoId: empleado.id,
    nombreEmpleado: empleado.nombre,
    isFijo,
    tieneContrato: empleado.tieneContrato !== false,
    sueldoDiario,
    sueldoQuincenaBase: sueldoQuincenaBase(empleado.sueldoDiario),
    diasLaborables,
    diasLaborados,
    totalBruto,
    permisoHoras,
    valorPermisoHoras,
    subtotalDias,
    decimoCuarto,
    decimoTercero,
    iess,
    subtotalLiquidacion,
    ingresos: {
      decimoTercero,
      decimoCuarto,
      horasExtras,
      trabajosEnEmpresa: trabajosEmpresa,
      fondosReserva,
    },
    egresos: {
      iess,
      extensionConyuge: extConyuge,
      prestamoQuirografario: quirografario,
      anticipos,
      dctoHorasNoLaboradas: valorPermisoHoras,
      multas,
      dctoFiesta,
      dctoHerramientas,
      dctoGenerico,
    },
    sumaIngresos,
    sumaEgresos,
    netoRecibir,
    abonos: nomina.abonos || [],
    totalAbonado,
    estadoPago,
    provisiones: {
      decimo3: isFijo ? roundTo2(sueldoMensual / 12) : 0,
      decimo4: isFijo ? roundTo2(40.16) : 0,
      acumuladoDecimo3: 0,
      acumuladoDecimo4: 0,
    },
  };
}

export { provisionDecimoTerceroPeriodo, provisionDecimoCuartoPeriodo, ingresosGravadosPeriodo };
