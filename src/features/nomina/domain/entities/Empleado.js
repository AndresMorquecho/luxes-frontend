// c:/Users/Morqu/OneDrive/Documentos/JAIMS/Luxes/luxes-frontend/src/features/nomina/domain/entities/Empleado.js

/**
 * Entidad Empleado (vista nómina)
 */
export class Empleado {
  /**
   * @param {Object} data
   */
  constructor(data = {}) {
    this.id = data.id;
    this.nombre = data.nombre ?? '';
    this.sueldoDiario = Number(data.sueldoDiario) || 0;
    this.departamento = data.departamento ?? '';
    this.cargo = data.cargo ?? '';
    this.cedula = data.cedula ?? '';
    this.tipoContrato = data.tipoContrato ?? 'CONTRATO OCASIONAL';
    this.banco = data.banco ?? '';
    this.cuentaBanco = data.cuentaBanco ?? '';
    this.tieneContrato = data.tieneContrato !== false;
    this.region = data.region === 'sierra' ? 'sierra' : 'costa';
    this.decimoTerceroMensualizado = Boolean(data.decimoTerceroMensualizado);
    this.decimoCuartoMensualizado = Boolean(data.decimoCuartoMensualizado);
    this.decimoTerceroValor = data.decimoTerceroValor !== null && data.decimoTerceroValor !== undefined ? Number(data.decimoTerceroValor) : null;
    this.decimoCuartoValor = data.decimoCuartoValor !== null && data.decimoCuartoValor !== undefined ? Number(data.decimoCuartoValor) : null;
    this.iessValor = data.iessValor !== null && data.iessValor !== undefined ? Number(data.iessValor) : null;
  }

  validate() {
    if (!this.id) throw new Error('El ID del empleado es obligatorio.');
    if (!this.nombre || this.nombre.trim() === '') throw new Error('El nombre del empleado es obligatorio.');
    if (!this.cedula || this.cedula.trim() === '') throw new Error('La cédula del empleado es obligatoria.');
    return true;
  }
}
