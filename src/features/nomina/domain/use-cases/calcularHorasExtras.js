// c:/Users/Morqu/OneDrive/Documentos/JAIMS/Luxes/luxes-frontend/src/features/nomina/domain/use-cases/calcularHorasExtras.js

/**
 * Caso de uso: Calcular Horas Extras.
 * Recibe la lista completa de registros de horas extras y de empleados, y devuelve un resumen consolidado por empleado.
 * 
 * @param {Array<import('../entities/Empleado').Empleado>} empleados - Lista de empleados
 * @param {Array<import('../entities/HoraExtra').HoraExtra>} horasExtras - Lista de horas extras ingresadas
 * @returns {Object} Resumen consolidado: { porColaborador: Object, totalGeneral: number, totalHorasGeneral: number }
 */
export function calcularHorasExtras(empleados, horasExtras) {
  const porColaborador = {};
  let totalGeneral = 0;
  let totalHorasGeneral = 0;

  // Inicializar acumuladores para todos los empleados
  empleados.forEach(emp => {
    porColaborador[emp.id] = {
      empleadoId: emp.id,
      nombre: emp.nombre,
      horas: 0,
      total: 0,
      registros: [],
    };
  });

  // Acumular horas extras
  horasExtras.forEach(registro => {
    if (registro.aprobacionEstado && registro.aprobacionEstado !== 'APROBADA') return;
    const colId = registro.colaboradorId;
    if (porColaborador[colId]) {
      const totalRegistro = Number(registro.horas) * Number(registro.valorPorHora);
      porColaborador[colId].horas += Number(registro.horas);
      porColaborador[colId].total += totalRegistro;
      porColaborador[colId].registros.push({
        ...registro,
        total: totalRegistro,
      });

      totalGeneral += totalRegistro;
      totalHorasGeneral += Number(registro.horas);
    }
  });

  // Redondear a 2 decimales
  Object.keys(porColaborador).forEach(id => {
    porColaborador[id].total = Math.round((porColaborador[id].total + Number.EPSILON) * 100) / 100;
  });

  totalGeneral = Math.round((totalGeneral + Number.EPSILON) * 100) / 100;

  return {
    porColaborador,
    totalGeneral,
    totalHorasGeneral,
  };
}
