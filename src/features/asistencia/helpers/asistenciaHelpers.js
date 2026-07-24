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
    if (a.tipo === 'FIN_HORAS_EXTRA' && !map[key].finHorasExtra)   map[key].finHorasExtra  = a;
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
  { tipo: 'SALIDA_PERMISO', short: 'Salida c/perm.', color: 'violet' },
  { tipo: 'FIN_HORAS_EXTRA', short: 'H. Extras', color: 'violet' },
];

export const TIPOS_SELECCIONABLES = [
  { tipo: 'ENTRADA', label: 'Entrada', shortLabel: 'Entrada' },
  { tipo: 'INICIO_ALMUERZO', label: 'Salida almuerzo', shortLabel: 'Sal. almuerzo' },
  { tipo: 'FIN_ALMUERZO', label: 'Regreso almuerzo', shortLabel: 'Reg. almuerzo' },
  { tipo: 'SALIDA', label: 'Salida', shortLabel: 'Salida' },
  { tipo: 'FIN_HORAS_EXTRA', label: 'Fin horas extras', shortLabel: 'Horas extras' },
  { tipo: 'SALIDA_PERMISO', label: 'Salida con permiso', shortLabel: 'Salida c/permiso' },
];

/**
 * Devuelve si la hora actual ya superó (o igualó) la hora de salida configurada.
 * @param {string|null|undefined} horaSalidaConfig - Hora en formato "HH:MM", ej: "17:30"
 */
function yaEsHoraDeSalida(horaSalidaConfig) {
  if (!horaSalidaConfig) return false;
  const match = horaSalidaConfig.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return false;
  const ahora = new Date();
  const totalAhora = ahora.getHours() * 60 + ahora.getMinutes();
  const totalSalida = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  return totalAhora >= totalSalida;
}

/**
 * Devuelve si ya pasaron 30 minutos desde la hora de salida configurada.
 * A partir de este punto, FIN_HORAS_EXTRA está disponible aunque no haya SALIDA marcada.
 */
function yaEstaEnHorasExtras(horaSalidaConfig) {
  if (!horaSalidaConfig) return false;
  const match = horaSalidaConfig.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return false;
  const ahora = new Date();
  const totalAhora = ahora.getHours() * 60 + ahora.getMinutes();
  const totalSalida = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  return totalAhora >= totalSalida + 30;
}

export function getOpcionesMarcacion(marks = [], tipoContrato = 'Tiempo Completo', horaSalidaConfig = null) {
  const tipos = new Set(marks.map((m) => m.tipo));
  if (tipos.has('PERMISO') || tipos.has('FIN_HORAS_EXTRA') || tipos.has('SALIDA_PERMISO')) return [];

  // Si ya pasó la hora de salida configurada, SALIDA_PERMISO ya no tiene sentido
  const permisoDisponible = !yaEsHoraDeSalida(horaSalidaConfig);
  // Si ya pasaron 30 min de la salida, FIN_HORAS_EXTRA disponible (con o sin SALIDA previa)
  const enHorasExtras = yaEstaEnHorasExtras(horaSalidaConfig);

  if (!tipos.has('ENTRADA')) return [TIPOS_SELECCIONABLES[0]];

  if (tipoContrato === 'Medio Día') {
    if (!tipos.has('SALIDA')) return [TIPOS_SELECCIONABLES[3]];
    return [];
  }

  const enAlmuerzo = tipos.has('INICIO_ALMUERZO') && !tipos.has('FIN_ALMUERZO');
  if (enAlmuerzo) return [TIPOS_SELECCIONABLES[2]];

  if (!tipos.has('SALIDA')) {
    if (!tipos.has('INICIO_ALMUERZO')) {
      const resultado = [TIPOS_SELECCIONABLES[1]]; // Salida almuerzo siempre
      if (yaEsHoraDeSalida(horaSalidaConfig)) resultado.push(TIPOS_SELECCIONABLES[3]); // Salida
      if (enHorasExtras) resultado.push(TIPOS_SELECCIONABLES[4]); // Fin horas extras
      if (permisoDisponible) resultado.push(TIPOS_SELECCIONABLES[5]); // Salida con permiso
      return resultado;
    }
    if (tipos.has('FIN_ALMUERZO')) {
      const resultado = [TIPOS_SELECCIONABLES[3]]; // Salida
      if (enHorasExtras) resultado.push(TIPOS_SELECCIONABLES[4]); // Fin horas extras
      if (permisoDisponible) resultado.push(TIPOS_SELECCIONABLES[5]); // Salida con permiso
      return resultado;
    }
    return [];
  }

  if (tipos.has('SALIDA')) return [TIPOS_SELECCIONABLES[4]];
  return [];
}

export function puedeRegistrarMarcacion(marks = [], tipoContrato = 'Tiempo Completo', horaSalidaConfig = null) {
  return getOpcionesMarcacion(marks, tipoContrato, horaSalidaConfig).length > 0;
}

export function previewHorasExtras(marks = [], horaSalidaConfig = null) {
  const ahora = new Date();
  let inicioRef;

  // Prefer the configured exit time (matches backend's calcularHorasExtrasDesdeConfig)
  if (horaSalidaConfig) {
    const match = horaSalidaConfig.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      const ref = new Date(ahora);
      ref.setHours(parseInt(match[1], 10), parseInt(match[2], 10), 0, 0);
      inicioRef = ref;
    }
  }

  // Fallback: use the SALIDA mark time
  if (!inicioRef) {
    const salida = marks.find((m) => m.tipo === 'SALIDA');
    if (!salida?.fechaHora) return null;
    inicioRef = new Date(salida.fechaHora);
  }

  const ms = ahora.getTime() - inicioRef.getTime();
  if (ms <= 0) return null;
  const horas = Math.round((ms / 3600000) * 100) / 100;
  const fmt = (d) => d.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
  return { horas, detalle: `${fmt(inicioRef)} - ${fmt(ahora)}` };
}

export function resolveProximaMarcacion(marks = [], tipoContrato = 'Tiempo Completo', horaSalidaConfig = null) {
  const opciones = getOpcionesMarcacion(marks, tipoContrato, horaSalidaConfig);
  if (opciones.length === 0) {
    return { proxima: null, permiteOmitirAlmuerzo: false, completado: true, marcacionesRegistradas: marks.length };
  }
  const marcacionesRegistradas = marks.filter((m) =>
    SECUENCIA_MARCACIONES.some((s) => s.tipo === m.tipo) || m.tipo === 'SALIDA_PERMISO' || m.tipo === 'FIN_HORAS_EXTRA',
  ).length;
  const proxima = opciones[0];
  const alternativa = opciones.find((o) => o.tipo === 'SALIDA' && proxima.tipo === 'INICIO_ALMUERZO');
  return {
    proxima: { tipo: proxima.tipo, label: proxima.label },
    alternativa: alternativa ? { tipo: alternativa.tipo, label: alternativa.label } : undefined,
    permiteOmitirAlmuerzo: Boolean(alternativa),
    completado: false,
    marcacionesRegistradas,
    opciones,
  };
}

export function isDiaLaboralCompleto(marks = []) {
  const tipos = new Set(marks.map((m) => m.tipo));
  return tipos.has('PERMISO') || tipos.has('SALIDA') || tipos.has('SALIDA_PERMISO') || tipos.has('FIN_HORAS_EXTRA');
}

export function mapMarcacionesByTipo(marks = []) {
  return Object.fromEntries(marks.map((m) => [m.tipo, m]));
}