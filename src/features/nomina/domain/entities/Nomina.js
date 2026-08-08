// c:/Users/Morqu/OneDrive/Documentos/JAIMS/Luxes/luxes-frontend/src/features/nomina/domain/entities/Nomina.js

/**
 * Entidad Nomina
 */
export class Nomina {
  /**
   * @param {Object} data
   * @param {number|string} data.empleadoId
   * @param {string} data.fechaInicio - Fecha de inicio de período (AAAA-MM-DD)
   * @param {string} data.fechaFin - Fecha de fin de período (AAAA-MM-DD)
   * @param {number} [data.diasLaborables] - Días laborables en el período (ej: 30)
   * @param {number} [data.diasLaborados] - Días laborados por el empleado (ej: 30)
   * @param {number} [data.permisoHoras] - Horas de permiso descontables
   * @param {Object} [data.ingresos] - Conceptos de ingresos
   * @param {number} [data.ingresos.decimoCuarto] - Décimo cuarto sueldo mensualizado (default: 40.17)
   * @param {number} [data.ingresos.decimoTercero] - Décimo tercer sueldo mensualizado
   * @param {number} [data.ingresos.horasExtras] - Valor de horas extras
   * @param {number} [data.ingresos.trabajosEnEmpresa] - Valor de trabajos extras en empresa
   * @param {number} [data.ingresos.fondosReserva] - Fondos de reserva
   * @param {Object} [data.egresos] - Conceptos de egresos
   * @param {number} [data.egresos.iess] - Aporte personal IESS (9.45% base gravable)
   * @param {number} [data.egresos.extensionConyuge] - Descuento por extensión de cónyuge
   * @param {number} [data.egresos.prestamoQuirografario] - Préstamo quirografario
   * @param {number} [data.egresos.anticipos] - Anticipos recibidos
   * @param {number} [data.egresos.dctoHorasNoLaboradas] - Descuento por horas no laboradas
   * @param {number} [data.egresos.multas] - Multas
   * @param {number} [data.egresos.dctoFiesta] - Descuento por fiesta de la empresa
   * @param {number} [data.egresos.dctoHerramientas] - Descuento por herramientas
   * @param {number} [data.egresos.dctoGenerico] - Descuento genérico / otros
   * @param {Array<{monto: number, fecha: string}>} [data.abonos] - Array de hasta 3 abonos realizados
   * @param {string} [data.estado] - Estado de pago ("PENDIENTE" | "ABONO_PARCIAL" | "PAGADO")
   */
  constructor({
    empleadoId,
    fechaInicio,
    fechaFin,
    diasLaborables = 30,
    diasLaborados = 30,
    permisoHoras = 0,
    ingresos = {},
    egresos = {},
    abonos = [],
    estado = "PENDIENTE",
  }) {
    this.empleadoId = empleadoId;
    this.fechaInicio = fechaInicio;
    this.fechaFin = fechaFin;
    this.diasLaborables = Number(diasLaborables);
    this.diasLaborados = Number(diasLaborados);
    this.permisoHoras = Number(permisoHoras);

    const ingresosObj = typeof ingresos === 'string'
      ? (() => { try { return JSON.parse(ingresos); } catch { return {}; } })()
      : (ingresos || {});

    const egresosObj = typeof egresos === 'string'
      ? (() => { try { return JSON.parse(egresos); } catch { return {}; } })()
      : (egresos || {});

    // Ingresos
    this.ingresos = {
      decimoCuarto: Number(ingresosObj.decimoCuarto ?? 0),
      decimoTercero: Number(ingresosObj.decimoTercero ?? 0),
      provisionDecimo3: Number(ingresosObj.provisionDecimo3 ?? 0),
      provisionDecimo4: Number(ingresosObj.provisionDecimo4 ?? 0),
      acumuladoDecimo3: Number(ingresosObj.acumuladoDecimo3 ?? 0),
      acumuladoDecimo4: Number(ingresosObj.acumuladoDecimo4 ?? 0),
      pagoDecimo3: Number(ingresosObj.pagoDecimo3 ?? 0),
      pagoDecimo4: Number(ingresosObj.pagoDecimo4 ?? 0),
      horasExtras: Number(ingresosObj.horasExtras ?? 0),
      trabajosEnEmpresa: Number(ingresosObj.trabajosEnEmpresa ?? 0),
      fondosReserva: Number(ingresosObj.fondosReserva ?? 0),
    };

    this.egresos = {
      iess: Number(egresosObj.iess ?? 0),
      extensionConyuge: Number(egresosObj.extensionConyuge ?? 0),
      prestamoQuirografario: Number(egresosObj.prestamoQuirografario ?? 0),
      anticipos: Number(egresosObj.anticipos ?? 0),
      dctoHorasNoLaboradas: Number(egresosObj.dctoHorasNoLaboradas ?? 0),
      multas: Number(egresosObj.multas ?? 0),
      dctoFiesta: Number(egresosObj.dctoFiesta ?? 0),
      dctoHerramientas: Number(egresosObj.dctoHerramientas ?? 0),
      dctoGenerico: Number(egresosObj.dctoGenerico ?? 0),
      permisosDetalle: Array.isArray(egresosObj.permisosDetalle) ? egresosObj.permisosDetalle : [],
    };

    this.abonos = abonos.map(abono => ({
      id: abono.id,
      monto: Number(abono.monto),
      fecha: abono.fecha,
      metodoPagoId: abono.metodoPagoId,
      metodoPagoNombre: abono.metodoPagoNombre,
      usuarioNombre: abono.usuarioNombre,
      fechaHora: abono.fechaHora,
      comprobanteUrl: abono.comprobanteUrl || null,
    }));

    this.estado = estado;
  }

  /**
   * Valida la nómina
   * @returns {boolean}
   */
  validate() {
    if (!this.empleadoId) throw new Error("El ID del empleado es obligatorio en la nómina.");
    if (!this.fechaInicio || !this.fechaFin) throw new Error("Las fechas de período de nómina son obligatorias.");
    if (this.abonos.length > 3) throw new Error("No se permiten más de 3 abonos por período de nómina.");
    return true;
  }
}
