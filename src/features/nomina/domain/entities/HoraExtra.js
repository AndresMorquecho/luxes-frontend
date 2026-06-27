// c:/Users/Morqu/OneDrive/Documentos/JAIMS/Luxes/luxes-frontend/src/features/nomina/domain/entities/HoraExtra.js

/**
 * Entidad HoraExtra
 */
export class HoraExtra {
  /**
   * @param {Object} data
   * @param {string} [data.id] - Identificador único de la hora extra
   * @param {string} data.fecha - Fecha en la que se laboró (AAAA-MM-DD)
   * @param {number|string} data.colaboradorId - ID del colaborador/empleado
   * @param {number} data.horas - Cantidad de horas extras laboradas
   * @param {string} data.detalleHorario - Detalle del horario (ej: "17:30 - 20:00")
   * @param {string} data.descripcion - Descripción del trabajo realizado
   * @param {number} [data.valorPorHora] - Valor a pagar por cada hora (default: 2.50)
   * @param {number} [data.total] - Total a pagar por la jornada (horas * valorPorHora)
   */
  constructor({
    id,
    fecha,
    colaboradorId,
    horas,
    detalleHorario,
    descripcion,
    valorPorHora = 2.50,
    total,
    estado = 'DEUDOR',
  }) {
    this.id = id || Math.random().toString(36).substr(2, 9);
    this.fecha = fecha;
    this.colaboradorId = colaboradorId;
    this.horas = Number(horas);
    this.detalleHorario = detalleHorario;
    this.descripcion = descripcion;
    this.valorPorHora = Number(valorPorHora);
    this.total = total !== undefined ? Number(total) : this.horas * this.valorPorHora;
    this.estado = estado;
  }

  /**
   * Valida la hora extra
   * @returns {boolean}
   */
  validate() {
    if (!this.fecha) throw new Error("La fecha de la hora extra es obligatoria.");
    if (!this.colaboradorId) throw new Error("El ID del colaborador es obligatorio.");
    if (isNaN(this.horas) || this.horas <= 0) throw new Error("La cantidad de horas debe ser mayor a cero.");
    if (isNaN(this.valorPorHora) || this.valorPorHora < 0) throw new Error("El valor por hora debe ser un número positivo.");
    return true;
  }
}
