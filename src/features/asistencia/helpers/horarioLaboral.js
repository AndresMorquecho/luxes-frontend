/**
 * Horario laboral de referencia Luxes (defaults + helpers con config editable).
 */

export const DEFAULT_HORARIOS_CONFIG = {
  semana: {
    titulo: 'Lun–Vie',
    entrada: '08:00',
    inicioAlmuerzo: '13:00',
    finAlmuerzo: '14:00',
    salida: '17:30',
    almuerzoOpcional: false,
  },
  sabado: {
    titulo: 'Sábado',
    entrada: '09:00',
    inicioAlmuerzo: null,
    finAlmuerzo: null,
    salida: '14:00',
    almuerzoOpcional: true,
    nota: 'almuerzo opcional',
  },
};

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

const slot = (hour, minute, label) => ({
  hour,
  minute,
  label: label ?? `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
});

export function parseTimeSlot(value) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!TIME_RE.test(trimmed)) return null;
  const [h, m] = trimmed.split(':').map(Number);
  return slot(h, m);
}

function normalizeDia(raw, fallback) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const almuerzoOpcional = src.almuerzoOpcional === true;
  return {
    titulo: String(src.titulo || fallback.titulo).trim() || fallback.titulo,
    entrada: parseTimeSlot(src.entrada || fallback.entrada)?.label || fallback.entrada,
    inicioAlmuerzo: almuerzoOpcional
      ? (parseTimeSlot(src.inicioAlmuerzo)?.label ?? null)
      : (parseTimeSlot(src.inicioAlmuerzo ?? fallback.inicioAlmuerzo)?.label ?? fallback.inicioAlmuerzo),
    finAlmuerzo: almuerzoOpcional
      ? (parseTimeSlot(src.finAlmuerzo)?.label ?? null)
      : (parseTimeSlot(src.finAlmuerzo ?? fallback.finAlmuerzo)?.label ?? fallback.finAlmuerzo),
    salida: parseTimeSlot(src.salida || fallback.salida)?.label || fallback.salida,
    almuerzoOpcional,
    nota: src.nota != null ? String(src.nota).trim() : fallback.nota,
  };
}

export function normalizeHorariosConfig(raw) {
  if (!raw || typeof raw !== 'object') return DEFAULT_HORARIOS_CONFIG;
  return {
    semana: normalizeDia(raw.semana, DEFAULT_HORARIOS_CONFIG.semana),
    sabado: normalizeDia(raw.sabado, DEFAULT_HORARIOS_CONFIG.sabado),
  };
}

export const MARCACION_TIPOS = ['ENTRADA', 'INICIO_ALMUERZO', 'FIN_ALMUERZO', 'SALIDA'];

export function isSabado(dateStr) {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).getDay() === 6;
}

export function getDiaConfig(config, dateStr) {
  const cfg = config || DEFAULT_HORARIOS_CONFIG;
  return isSabado(dateStr) ? cfg.sabado : cfg.semana;
}

export function buildHorarioEsperadoSlots(dia) {
  const useAlmuerzo = !dia.almuerzoOpcional || (dia.inicioAlmuerzo && dia.finAlmuerzo);
  return {
    ENTRADA: parseTimeSlot(dia.entrada),
    INICIO_ALMUERZO: useAlmuerzo ? parseTimeSlot(dia.inicioAlmuerzo) : null,
    FIN_ALMUERZO: useAlmuerzo ? parseTimeSlot(dia.finAlmuerzo) : null,
    SALIDA: parseTimeSlot(dia.salida),
  };
}

export function getHorarioEsperado(dateStr, config) {
  return buildHorarioEsperadoSlots(getDiaConfig(config, dateStr));
}

export function getHorarioLabel(dateStr, config) {
  return formatHorarioResumen(getDiaConfig(config, dateStr));
}

export function formatHorarioResumen(d) {
  if (d.almuerzoOpcional || (!d.inicioAlmuerzo && !d.finAlmuerzo)) {
    const base = `${d.titulo} · ${d.entrada} – ${d.salida}`;
    if (d.nota) return `${base} (${d.nota})`;
    if (d.almuerzoOpcional) return `${base} (almuerzo opcional)`;
    return base;
  }
  return `${d.titulo} · ${d.entrada} – ${d.inicioAlmuerzo} · almuerzo ${d.inicioAlmuerzo}–${d.finAlmuerzo} · ${d.finAlmuerzo} – ${d.salida}`;
}

export function getHorariosResumen(config) {
  const cfg = normalizeHorariosConfig(config);
  return [
    {
      key: 'semana',
      titulo: cfg.semana.titulo,
      label: formatHorarioResumen(cfg.semana),
      esperado: buildHorarioEsperadoSlots(cfg.semana),
    },
    {
      key: 'sabado',
      titulo: cfg.sabado.titulo,
      label: formatHorarioResumen(cfg.sabado),
      esperado: buildHorarioEsperadoSlots(cfg.sabado),
    },
  ];
}

/** Compatibilidad con código que importaba constantes fijas */
export const HORARIO_LUN_VIE = buildHorarioEsperadoSlots(DEFAULT_HORARIOS_CONFIG.semana);
export const HORARIO_SABADO = buildHorarioEsperadoSlots(DEFAULT_HORARIOS_CONFIG.sabado);

function toMinutes(hour, minute) {
  return hour * 60 + minute;
}

function markToMinutes(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

export function diffMinutosVsEsperado(iso, esperado) {
  if (!iso || !esperado) return null;
  return markToMinutes(iso) - toMinutes(esperado.hour, esperado.minute);
}

export function formatDiffMinutos(diff) {
  if (diff === null || diff === undefined) return '';
  if (diff === 0) return 'a tiempo';
  const abs = Math.abs(diff);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const parte = h > 0 ? `${h}h ${m}m` : `${m}m`;
  return diff > 0 ? `+${parte} tarde` : `-${parte} temprano`;
}

export function getEstadoAlmuerzo(marcaciones = [], dateStr, config) {
  const horario = getHorarioEsperado(dateStr, config);
  const tipos = new Set(marcaciones.map((m) => m.tipo));
  if (tipos.has('PERMISO')) return { status: 'PERMISO', label: 'Permiso pagado', cls: 'indigo' };

  const inicio = marcaciones.find((m) => m.tipo === 'INICIO_ALMUERZO');
  const fin = marcaciones.find((m) => m.tipo === 'FIN_ALMUERZO');
  const salida = marcaciones.find((m) => m.tipo === 'SALIDA');
  const entrada = marcaciones.find((m) => m.tipo === 'ENTRADA');
  const dia = getDiaConfig(config, dateStr);

  if (dia.almuerzoOpcional && !horario.INICIO_ALMUERZO) {
    if (!entrada) return { status: 'SIN_DATOS', label: '—', cls: 'slate' };
    if (inicio && fin) {
      const mins = Math.floor((new Date(fin.fechaHora) - new Date(inicio.fechaHora)) / 60000);
      return { status: 'COMPLETO', label: `Almorzó ${mins} min`, cls: 'emerald' };
    }
    if (salida && !inicio && !fin) {
      return { status: 'SIN_ALMUERZO', label: 'Sin almuerzo', cls: 'amber' };
    }
    if (inicio && !fin) return { status: 'PARCIAL', label: 'Almuerzo incompleto', cls: 'orange' };
    return { status: 'PENDIENTE', label: 'En jornada', cls: 'slate' };
  }

  if (!entrada) return { status: 'SIN_DATOS', label: '—', cls: 'slate' };

  if (inicio && fin) {
    const mins = Math.floor((new Date(fin.fechaHora) - new Date(inicio.fechaHora)) / 60000);
    const diffInicio = diffMinutosVsEsperado(inicio.fechaHora, horario.INICIO_ALMUERZO);
    let detalle = `${mins} min`;
    if (diffInicio !== null && Math.abs(diffInicio) > 5) {
      detalle += ` · salida ${formatDiffMinutos(diffInicio)}`;
    }
    return { status: 'COMPLETO', label: `Almorzó ${detalle}`, cls: 'emerald', duracionMin: mins };
  }

  if (salida && !inicio && !fin) {
    return { status: 'OMITIDO', label: 'No almorzó', cls: 'amber' };
  }

  if (inicio && !fin) {
    return { status: 'PARCIAL', label: 'En almuerzo / sin regreso', cls: 'orange' };
  }

  if (entrada && !salida) {
    return { status: 'PENDIENTE', label: 'Pendiente almuerzo', cls: 'slate' };
  }

  return { status: 'SIN_DATOS', label: '—', cls: 'slate' };
}

export function buildResumenHorario(marcaciones = [], dateStr, config) {
  const horario = getHorarioEsperado(dateStr, config);
  const byTipo = Object.fromEntries(marcaciones.map((m) => [m.tipo, m]));

  return MARCACION_TIPOS.map((tipo) => {
    const esperado = horario[tipo];
    const real = byTipo[tipo];
    const diff = real && esperado ? diffMinutosVsEsperado(real.fechaHora, esperado) : null;
    return {
      tipo,
      esperado,
      real: real ?? null,
      diffMin: diff,
      omitido: !real && esperado === null && tipo.includes('ALMUERZO'),
    };
  });
}
