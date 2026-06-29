// c:/Users/Morqu/OneDrive/Documentos/JAIMS/Luxes/luxes-frontend/src/features/nomina/domain/ports/NominaRepositoryPort.js

/**
 * Puerto de Repositorio para el módulo de Nómina (Hexagonal).
 * Define las operaciones que la infraestructura debe implementar.
 * 
 * @interface
 */
export class NominaRepositoryPort {
  /**
   * Obtiene la lista de todos los colaboradores activos
   * @returns {Promise<Array<import('../entities/Empleado').Empleado>>}
   */
  async getEmployees() {
    throw new Error("Método 'getEmployees' no implementado.");
  }

  /**
   * Obtiene la nómina de un período específico (fechaInicio - fechaFin)
   * @param {string} fechaInicio - AAAA-MM-DD
   * @param {string} fechaFin - AAAA-MM-DD
   * @returns {Promise<Array<import('../entities/Nomina').Nomina>>}
   */
  async getPayrolls(fechaInicio, fechaFin) {
    throw new Error("Método 'getPayrolls' no implementado.");
  }

  /**
   * Guarda o actualiza una nómina en el repositorio
   * @param {import('../entities/Nomina').Nomina} nomina
   * @returns {Promise<import('../entities/Nomina').Nomina>}
   */
  async savePayroll(nomina) {
    throw new Error("Método 'savePayroll' no implementado.");
  }

  /**
   * Obtiene la lista de horas extras registradas en un rango de fechas
   * @param {string} fechaInicio - AAAA-MM-DD
   * @param {string} fechaFin - AAAA-MM-DD
   * @returns {Promise<Array<import('../entities/HoraExtra').HoraExtra>>}
   */
  async getOvertime(fechaInicio, fechaFin) {
    throw new Error("Método 'getOvertime' no implementado.");
  }

  /**
   * Guarda o actualiza una lista de horas extras en el repositorio
   * @param {Array<import('../entities/HoraExtra').HoraExtra>} horasExtras
   * @returns {Promise<Array<import('../entities/HoraExtra').HoraExtra>>}
   */
  async saveOvertime(horasExtras) {
    throw new Error("Método 'saveOvertime' requiere fechaInicio y fechaFin. Use la firma extendida del adaptador API.");
  }

  /**
   * Obtiene la lista de vacaciones registradas
   * @returns {Promise<Array<object>>}
   */
  async getVacations() {
    throw new Error("Método 'getVacations' no implementado.");
  }

  /**
   * Guarda o actualiza un registro de vacaciones
   * @param {string} empleadoId
   * @param {number} año
   * @param {Array<string>} diasTomados
   * @returns {Promise<object>}
   */
  async saveVacation(empleadoId, año, diasTomados) {
    throw new Error("Método 'saveVacation' no implementado.");
  }
}
