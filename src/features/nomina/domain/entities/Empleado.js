// c:/Users/Morqu/OneDrive/Documentos/JAIMS/Luxes/luxes-frontend/src/features/nomina/domain/entities/Empleado.js

/**
 * Entidad Empleado
 */
export class Empleado {
  /**
   * @param {Object} data
   * @param {number|string} data.id
   * @param {string} data.nombre
   * @param {number} data.sueldoDiario
   * @param {string} data.departamento
   * @param {string} data.cargo
   * @param {string} data.cedula
   * @param {string} [data.tipoContrato]
   * @param {string} [data.banco]
   * @param {string} [data.cuentaBanco]
   */
  constructor({ id, nombre, sueldoDiario, departamento, cargo, cedula, tipoContrato = "CONTRATO OCASIONAL", banco = '', cuentaBanco = '' }) {
    this.id = id;
    this.nombre = nombre;
    this.sueldoDiario = Number(sueldoDiario);
    this.departamento = departamento;
    this.cargo = cargo;
    this.cedula = cedula;
    this.tipoContrato = tipoContrato;
    this.banco = banco;
    this.cuentaBanco = cuentaBanco;
  }

  /**
   * Valida la integridad del empleado
   * @returns {boolean}
   * @throws {Error}
   */
  validate() {
    if (!this.id) throw new Error("El ID del empleado es obligatorio.");
    if (!this.nombre || this.nombre.trim() === "") throw new Error("El nombre del empleado es obligatorio.");
    if (isNaN(this.sueldoDiario) || this.sueldoDiario <= 0) throw new Error("El sueldo diario debe ser un número mayor a cero.");
    if (!this.cedula || this.cedula.trim() === "") throw new Error("La cédula del empleado es obligatoria.");
    return true;
  }
}
