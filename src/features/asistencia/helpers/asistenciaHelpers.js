export const groupAsistencias = (asistencias, desde, hasta, busqueda) => {
  const filtered = asistencias.filter(a => {
    const d = new Date(a.fechaHora).toISOString().split('T')[0];
    const matchFecha = d >= desde && d <= hasta;
    const matchNombre = busqueda
      ? a.nombreEmpleado.toLowerCase().includes(busqueda.toLowerCase())
      : true;
    return matchFecha && matchNombre;
  });
  const map = {};
  filtered.forEach(a => {
    const fecha = new Date(a.fechaHora).toLocaleDateString();
    const key   = `${a.empleadoId}-${fecha}`;
    if (!map[key]) {
      map[key] = {
        id: key,
        empleadoId: a.empleadoId,
        nombreEmpleado: a.nombreEmpleado,
        fechaTexto: fecha,
        fechaSort: a.fechaHora,
        entrada:        null,
        inicioAlmuerzo: null,
        finAlmuerzo:    null,
        salida:         null,
      };
    }
    if ((a.tipo === 'ENTRADA' || a.tipo === 'MARCACION') && !map[key].entrada) map[key].entrada = a;
    if (a.tipo === 'INICIO_ALMUERZO' && !map[key].inicioAlmuerzo) map[key].inicioAlmuerzo = a;
    if (a.tipo === 'FIN_ALMUERZO'    && !map[key].finAlmuerzo)    map[key].finAlmuerzo    = a;
    if (a.tipo === 'SALIDA'          && !map[key].salida)          map[key].salida         = a;
  });
  return Object.values(map).sort((a, b) => new Date(b.fechaSort) - new Date(a.fechaSort));
};

export const contarMarcaciones = (row) => {
  let count = 0;
  if (row.entrada) count++;
  if (row.inicioAlmuerzo) count++;
  if (row.finAlmuerzo) count++;
  if (row.salida) count++;
  return count;
};

export const QUICK_FILTERS = [
  { label: 'Hoy',     getRange: () => { const t = new Date(); return [t, t] } },
  { label: 'Esta semana', getRange: () => {
    const now = new Date();
    const lun = new Date(now); lun.setDate(lun.getDate() - ((lun.getDay() + 6) % 7));
    return [lun, now];
  }},
  { label: 'Este mes', getRange: () => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    return [first, now];
  }},
];

export const toDateStr = (d) => d.toISOString().split('T')[0];

export const SECUENCIA_MARCACIONES = [
  { tipo: 'ENTRADA',         label: 'Entrada'         },
  { tipo: 'INICIO_ALMUERZO', label: 'Inicio Almuerzo' },
  { tipo: 'FIN_ALMUERZO',    label: 'Fin Almuerzo'    },
  { tipo: 'SALIDA',          label: 'Salida'          },
];

export const MARCACION_SLOTS = [
  { tipo: 'ENTRADA', short: 'Entrada', color: 'emerald' },
  { tipo: 'INICIO_ALMUERZO', short: 'Sal. Alm.', color: 'amber' },
  { tipo: 'FIN_ALMUERZO', short: 'Reg. Alm.', color: 'sky' },
  { tipo: 'SALIDA', short: 'Salida', color: 'indigo' },
];

export function resolveProximaMarcacion(marks = []) {
  const tipos = new Set(marks.map((m) => m.tipo));
  const marcacionesRegistradas = marks.filter((m) =>
    SECUENCIA_MARCACIONES.some((s) => s.tipo === m.tipo)
  ).length;

  if (tipos.has('SALIDA') || tipos.has('PERMISO')) {
    return { proxima: null, permiteOmitirAlmuerzo: false, completado: true, marcacionesRegistradas };
  }
  if (!tipos.has('ENTRADA')) {
    return { proxima: SECUENCIA_MARCACIONES[0], permiteOmitirAlmuerzo: false, completado: false, marcacionesRegistradas };
  }
  if (tipos.has('INICIO_ALMUERZO') && !tipos.has('FIN_ALMUERZO')) {
    return { proxima: SECUENCIA_MARCACIONES[2], permiteOmitirAlmuerzo: false, completado: false, marcacionesRegistradas };
  }
  if (tipos.has('FIN_ALMUERZO') && !tipos.has('SALIDA')) {
    return { proxima: SECUENCIA_MARCACIONES[3], permiteOmitirAlmuerzo: false, completado: false, marcacionesRegistradas };
  }
  if (tipos.has('ENTRADA') && !tipos.has('INICIO_ALMUERZO') && !tipos.has('FIN_ALMUERZO') && !tipos.has('SALIDA')) {
    return {
      proxima: SECUENCIA_MARCACIONES[1],
      alternativa: SECUENCIA_MARCACIONES[3],
      permiteOmitirAlmuerzo: true,
      completado: false,
      marcacionesRegistradas,
    };
  }
  return { proxima: null, permiteOmitirAlmuerzo: false, completado: true, marcacionesRegistradas };
}

export function isDiaLaboralCompleto(marks = []) {
  const tipos = new Set(marks.map((m) => m.tipo));
  return tipos.has('SALIDA') || tipos.has('PERMISO');
}

export function mapMarcacionesByTipo(marks = []) {
  return Object.fromEntries(marks.map((m) => [m.tipo, m]));
}