// c:/Users/Morqu/OneDrive/Documentos/JAIMS/Luxes/luxes-frontend/src/features/nomina/domain/entities/Abono.js

/**
 * Entidad Abono
 */
export class Abono {
  /**
   * @param {Object} data
   * @param {string} [data.id] - ID único del abono (GTO-XXX)
   * @param {number} data.monto - Monto abonado
   * @param {string} data.fecha - Fecha del abono (AAAA-MM-DD)
   * @param {string} data.metodoPagoId - ID del método de pago/caja
   * @param {string} [data.metodoPagoNombre] - Nombre del método de pago/caja
   * @param {string} [data.usuarioNombre] - Nombre del usuario que registró el pago
   * @param {string} [data.fechaHora] - Fecha y hora formateada local
   * @param {string} [data.comprobanteUrl] - URL del comprobante de pago (opcional)
   */
  constructor({ id, monto, fecha, metodoPagoId, metodoPagoNombre, usuarioNombre, fechaHora, comprobanteUrl }) {
    this.id = id;
    this.monto = Number(monto);
    this.fecha = fecha;
    this.metodoPagoId = metodoPagoId;
    this.metodoPagoNombre = metodoPagoNombre;
    this.usuarioNombre = usuarioNombre;
    this.fechaHora = fechaHora;
    this.comprobanteUrl = comprobanteUrl || null;
  }

  /**
   * Valida el abono
   * @returns {boolean}
   */
  validate() {
    if (isNaN(this.monto) || this.monto <= 0) throw new Error("El monto del abono debe ser mayor a cero.");
    if (!this.fecha) throw new Error("La fecha del abono es obligatoria.");
    if (!this.metodoPagoId) throw new Error("La cuenta de pago (caja) es obligatoria.");
    return true;
  }
}

