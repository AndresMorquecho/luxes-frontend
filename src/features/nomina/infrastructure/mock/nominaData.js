// c:/Users/Morqu/OneDrive/Documentos/JAIMS/Luxes/luxes-frontend/src/features/nomina/infrastructure/mock/nominaData.js

export const empleadosMock = [
  { id: 1, nombre: "MORQUECHO IVETTE", sueldoDiario: 21, departamento: "ADMINISTRATIVO", cargo: "COORDINADORA", cedula: "0900000001", tipoContrato: "CONTRATO OCASIONAL", banco: "Pichincha", cuentaBanco: "00123456789012345678" },
  { id: 2, nombre: "CRISTOFER SUAREZ", sueldoDiario: 16.07, departamento: "OPERATIVO", cargo: "PERSONAL DE IMPRESIÓN", cedula: "0900000002", tipoContrato: "CONTRATO OCASIONAL", banco: "Bolivariano", cuentaBanco: "00234567890123456789" },
  { id: 3, nombre: "CHRISTIAN PAREDES", sueldoDiario: 16.07, departamento: "OPERATIVO", cargo: "PERSONAL DE IMPRESIÓN", cedula: "0900000003", tipoContrato: "CONTRATO OCASIONAL", banco: "Guayaquil", cuentaBanco: "00345678901234567890" },
  { id: 4, nombre: "PAOLA CARRANZA", sueldoDiario: 20, departamento: "DISEÑO", cargo: "DISEÑADORA", cedula: "0900000004", tipoContrato: "CONTRATO OCASIONAL", banco: "Pichincha", cuentaBanco: "00456789012345678901" },
  { id: 5, nombre: "EDINSON MONCADA", sueldoDiario: 18, departamento: "OPERATIVO", cargo: "INSTALADOR", cedula: "0900000005", tipoContrato: "CONTRATO OCASIONAL", banco: "Pacifico", cuentaBanco: "00567890123456789012" },
  { id: 6, nombre: "JIMMY EVANGELISTA", sueldoDiario: 25.83, departamento: "OPERATIVO", cargo: "JEFE OPERATIVO", cedula: "0900000006", tipoContrato: "CONTRATO OCASIONAL", banco: "Internacional", cuentaBanco: "00678901234567890123" },
];

export const nominasMock = [
  {
    empleadoId: 1,
    fechaInicio: "2026-05-01",
    fechaFin: "2026-05-31",
    diasLaborables: 30,
    diasLaborados: 30,
    permisoHoras: 0,
    ingresos: {
      decimoCuarto: 38.33,
      decimoTercero: 52.50, // (21 * 30) / 12 = 52.50
      horasExtras: 0,
      trabajosEnEmpresa: 120.00,
      fondosReserva: 52.48, // ~8.33% de bruto
    },
    egresos: {
      iess: 70.88, // (630 + 0 + 120) * 0.0945 = 70.88
      extensionConyuge: 0,
      prestamoQuirografario: 50.00,
      anticipos: 150.00,
      dctoHorasNoLaboradas: 0,
      multas: 0,
      dctoFiesta: 10.00,
      dctoHerramientas: 0,
      dctoGenerico: 0,
    },
    abonos: [
      { monto: 200.00, fecha: "2026-05-15" }
    ],
    estado: "ABONO_PARCIAL"
  },
  {
    empleadoId: 2,
    fechaInicio: "2026-05-01",
    fechaFin: "2026-05-31",
    diasLaborables: 30,
    diasLaborados: 28, // 28 días laborados
    permisoHoras: 0,
    ingresos: {
      decimoCuarto: 38.33,
      decimoTercero: 37.50,
      horasExtras: 25.00, // 10 horas
      trabajosEnEmpresa: 0,
      fondosReserva: 0,
    },
    egresos: {
      iess: 44.88, // (16.07 * 28 + 25) * 0.0945 = 44.88
      extensionConyuge: 0,
      prestamoQuirografario: 0,
      anticipos: 100.00,
      dctoHorasNoLaboradas: 0,
      multas: 5.00,
      dctoFiesta: 10.00,
      dctoHerramientas: 15.00,
      dctoGenerico: 0,
    },
    abonos: [
      { monto: 342.79, fecha: "2026-05-30" }
    ],
    estado: "PAGADO"
  },
  {
    empleadoId: 3,
    fechaInicio: "2026-05-01",
    fechaFin: "2026-05-31",
    diasLaborables: 30,
    diasLaborados: 30,
    permisoHoras: 2,
    ingresos: {
      decimoCuarto: 38.33,
      decimoTercero: 40.18,
      horasExtras: 12.50,
      trabajosEnEmpresa: 50.00,
      fondosReserva: 40.16,
    },
    egresos: {
      iess: 51.46, // (482.1 + 12.5 + 50) * 0.0945 = 51.46
      extensionConyuge: 15.00,
      prestamoQuirografario: 0,
      anticipos: 100.00,
      dctoHorasNoLaboradas: 4.02, // 2 horas de descuento (16.07 / 8) * 2 = 4.02
      multas: 0,
      dctoFiesta: 10.00,
      dctoHerramientas: 0,
      dctoGenerico: 0,
    },
    abonos: [],
    estado: "PENDIENTE"
  },
  {
    empleadoId: 4,
    fechaInicio: "2026-05-01",
    fechaFin: "2026-05-31",
    diasLaborables: 30,
    diasLaborados: 30,
    permisoHoras: 0,
    ingresos: {
      decimoCuarto: 38.33,
      decimoTercero: 50.00,
      horasExtras: 0,
      trabajosEnEmpresa: 0,
      fondosReserva: 49.98,
    },
    egresos: {
      iess: 56.70, // 600 * 0.0945 = 56.70
      extensionConyuge: 0,
      prestamoQuirografario: 100.00,
      anticipos: 200.00,
      dctoHorasNoLaboradas: 0,
      multas: 0,
      dctoFiesta: 10.00,
      dctoHerramientas: 0,
      dctoGenerico: 0,
    },
    abonos: [],
    estado: "PENDIENTE"
  },
  {
    empleadoId: 5,
    fechaInicio: "2026-05-01",
    fechaFin: "2026-05-31",
    diasLaborables: 30,
    diasLaborados: 30,
    permisoHoras: 0,
    ingresos: {
      decimoCuarto: 38.33,
      decimoTercero: 45.00,
      horasExtras: 37.50,
      trabajosEnEmpresa: 60.00,
      fondosReserva: 0,
    },
    egresos: {
      iess: 60.24, // (540 + 37.5 + 60) * 0.0945 = 60.24
      extensionConyuge: 0,
      prestamoQuirografario: 0,
      anticipos: 150.00,
      dctoHorasNoLaboradas: 0,
      multas: 10.00,
      dctoFiesta: 10.00,
      dctoHerramientas: 20.00,
      dctoGenerico: 0,
    },
    abonos: [
      { monto: 100.00, fecha: "2026-05-15" },
      { monto: 150.00, fecha: "2026-05-25" }
    ],
    estado: "ABONO_PARCIAL"
  },
  {
    empleadoId: 6,
    fechaInicio: "2026-05-01",
    fechaFin: "2026-05-31",
    diasLaborables: 30,
    diasLaborados: 30,
    permisoHoras: 0,
    ingresos: {
      decimoCuarto: 38.33,
      decimoTercero: 64.58,
      horasExtras: 50.00,
      trabajosEnEmpresa: 150.00,
      fondosReserva: 64.55,
    },
    egresos: {
      iess: 92.13, // (774.9 + 50 + 150) * 0.0945 = 92.13
      extensionConyuge: 0,
      prestamoQuirografario: 150.00,
      anticipos: 300.00,
      dctoHorasNoLaboradas: 0,
      multas: 0,
      dctoFiesta: 10.00,
      dctoHerramientas: 0,
      dctoGenerico: 0,
    },
    abonos: [],
    estado: "PENDIENTE"
  }
];

export const horasExtrasMock = [
  { id: "he-1", fecha: "2026-05-05", colaboradorId: 2, horas: 4, detalleHorario: "17:30 - 21:30", descripcion: "Impresión de lonas publicitarias urgentes", valorPorHora: 2.50, total: 10.00 },
  { id: "he-2", fecha: "2026-05-12", colaboradorId: 2, horas: 6, detalleHorario: "17:30 - 23:30", descripcion: "Acabado de carpetas corporativas", valorPorHora: 2.50, total: 15.00 },
  { id: "he-3", fecha: "2026-05-08", colaboradorId: 3, horas: 5, detalleHorario: "17:30 - 22:30", descripcion: "Corte de material publicitario", valorPorHora: 2.50, total: 12.50 },
  { id: "he-4", fecha: "2026-05-15", colaboradorId: 5, horas: 8, detalleHorario: "18:00 - 02:00", descripcion: "Instalación nocturna en centro comercial", valorPorHora: 2.50, total: 20.00 },
  { id: "he-5", fecha: "2026-05-22", colaboradorId: 5, horas: 7, detalleHorario: "18:00 - 01:00", descripcion: "Desmontaje de feria corporativa", valorPorHora: 2.50, total: 17.50 },
  { id: "he-6", fecha: "2026-05-10", colaboradorId: 6, horas: 10, detalleHorario: "08:30 - 18:30", descripcion: "Supervisión de montaje en domingo", valorPorHora: 5.00, total: 50.00 }
];
