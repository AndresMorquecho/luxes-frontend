// c:/Users/Morqu/OneDrive/Documentos/JAIMS/Luxes/luxes-frontend/src/features/nomina/domain/use-cases/obtenerResumenNomina.js

/**
 * Caso de uso: Obtener Resumen de Nómina.
 * Calcula las métricas generales de un período de nómina para mostrar en el pie de página de la tabla de nóminas y paneles de resumen.
 * 
 * @param {Array<Object>} calculadas - Lista de nóminas ya calculadas (resultado de calcularNomina)
 * @returns {Object} Resumen financiero global: brutoTotal, ingresosTotal, egresosTotal, netoTotal, abonadoTotal, cantidadPendientes, cantidadAbonoParcial, cantidadPagados
 */
export function obtenerResumenNomina(calculadas) {
  let brutoTotal = 0;
  let ingresosTotal = 0;
  let egresosTotal = 0;
  let netoTotal = 0;
  let abonadoTotal = 0;
  let pendienteTotal = 0;

  let pendientes = 0;
  let abonosParciales = 0;
  let pagados = 0;

  calculadas.forEach(item => {
    brutoTotal += item.totalBruto;
    ingresosTotal += item.sumaIngresos;
    egresosTotal += item.sumaEgresos;
    netoTotal += item.netoRecibir;
    abonadoTotal += item.totalAbonado;
    pendienteTotal += Math.max(0, (item.netoRecibir || 0) - (item.totalAbonado || 0));

    if (item.estadoPago === "PAGADO") {
      pagados++;
    } else if (item.estadoPago === "ABONO_PARCIAL") {
      abonosParciales++;
    } else {
      pendientes++;
    }
  });

  const roundTo2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

  return {
    brutoTotal: roundTo2(brutoTotal),
    ingresosTotal: roundTo2(ingresosTotal),
    egresosTotal: roundTo2(egresosTotal),
    netoTotal: roundTo2(netoTotal),
    abonadoTotal: roundTo2(abonadoTotal),
    pendienteTotal: roundTo2(pendienteTotal),
    conteoEstados: {
      PENDIENTE: pendientes,
      ABONO_PARCIAL: abonosParciales,
      PAGADO: pagados,
    },
    totalColaboradores: calculadas.length,
  };
}
