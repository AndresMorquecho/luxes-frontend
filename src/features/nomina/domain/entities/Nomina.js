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

    // Ingresos
    this.ingresos = {
      // Décimo cuarto: abono manual que puede registrarse en cualquier quincena (de poco a poco).
      // Por defecto 0; conserva el valor ingresado si existe.
      decimoCuarto: Number(ingresos.decimoCuarto ?? 0),
      decimoTercero: Number(ingresos.decimoTercero ?? 0),
      horasExtras: Number(ingresos.horasExtras ?? 0),
      trabajosEnEmpresa: Number(ingresos.trabajosEnEmpresa ?? 0),
      fondosReserva: Number(ingresos.fondosReserva ?? 0),
    };

    // Egresos
    this.egresos = {
      iess: Number(egresos.iess ?? 0),
      extensionConyuge: Number(egresos.extensionConyuge ?? 0),
      prestamoQuirografario: Number(egresos.prestamoQuirografario ?? 0),
      anticipos: Number(egresos.anticipos ?? 0),
      dctoHorasNoLaboradas: Number(egresos.dctoHorasNoLaboradas ?? 0),
      multas: Number(egresos.multas ?? 0),
      dctoFiesta: Number(egresos.dctoFiesta ?? 0),
      dctoHerramientas: Number(egresos.dctoHerramientas ?? 0),
      dctoGenerico: Number(egresos.dctoGenerico ?? 0),
    };

    this.abonos = abonos.map(abono => ({
      monto: Number(abono.monto),
      fecha: abono.fecha,
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
