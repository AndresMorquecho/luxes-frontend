/**
 * Reglas de negocio para iniciar y cerrar una instalación en sitio.
 */

export function isInstalacionIniciada(datos = {}) {
  if (datos.instalacionCompletada === true) return true;
  return Boolean(datos.fechaInstalacion && datos.horaInstalacion);
}

/** Hay registro guardado de cierre (fotos, notas o fecha de fin). */
export function tieneRegistroCierreObra(datos = {}) {
  if (datos.instalacionCompletada === true) return true;
  if (Array.isArray(datos.evidencias) && datos.evidencias.length > 0) return true;
  if (String(datos.notasCierre || '').trim()) return true;
  if (datos.fechaFin) return true;
  return false;
}

/**
 * Equipo y materiales listos para trabajar cierre en sitio.
 */
export function tieneEquipoYMateriales(datos = {}) {
  return Boolean(datos.personalAsignado?.length && datos.materiales?.length);
}

/** Si el tab Cierre de Obra debe mostrar el formulario/registro (no el aviso vacío). */
export function puedeAccederCierreObra(datos = {}) {
  return (
    isInstalacionIniciada(datos) ||
    tieneRegistroCierreObra(datos) ||
    tieneEquipoYMateriales(datos)
  );
}

/** Payload de inicio en obra si aún no se registró fecha/hora. */
export function buildInicioObraSiFalta(datos = {}, now = new Date()) {
  if (datos.fechaInstalacion && datos.horaInstalacion) return {};
  return {
    fechaInstalacion: now.toISOString().split('T')[0],
    horaInstalacion: now.toTimeString().slice(0, 5),
  };
}

/** Herramientas de la lista sin responsable asignado. */
export function getHerramientasSinResponsable(materiales = []) {
  return (materiales || []).filter(
    (m) => m.tipo === 'herramienta' && !(String(m.responsable || '').trim()),
  );
}

export function tieneHerramientasSinResponsable(materiales = []) {
  return getHerramientasSinResponsable(materiales).length > 0;
}

/**
 * @param {object} datos - fases.INSTALACION.datos
 * @param {object} [opts]
 * @param {Array} [opts.ordenesCompra] - órdenes del proyecto
 * @returns {string[]} mensajes de requisitos pendientes
 */
export function getInstalacionCompletionBlockers(datos = {}, opts = {}) {
  const faltantes = [];
  const ordenes = opts.ordenesCompra || [];

  if (!isInstalacionIniciada(datos)) {
    faltantes.push(
      'Registra el inicio en obra (botón "Iniciar Instalación" o sube al menos una evidencia fotográfica)',
    );
  }
  if (!datos.personalAsignado?.length) {
    faltantes.push('Asigna al menos un miembro al equipo técnico');
  }
  if (!datos.materiales?.length) {
    faltantes.push('Registra al menos un material para la obra');
  }

  const herramientasSinResponsable = getHerramientasSinResponsable(datos.materiales);
  if (herramientasSinResponsable.length > 0) {
    faltantes.push(
      `Asigna responsable a las herramientas: ${herramientasSinResponsable.map((m) => m.nombre).join(', ')}`,
    );
  }

  if (!datos.evidencias?.length) {
    faltantes.push('Sube al menos una evidencia fotográfica del trabajo realizado');
  }

  if (datos.instalacionCompletada === true) {
    faltantes.push('La instalación ya fue marcada como completada');
  }

  return faltantes;
}

export function canCompletarInstalacion(datos = {}, opts = {}) {
  if (datos.instalacionCompletada === true) return false;
  return getInstalacionCompletionBlockers(datos, opts).length === 0;
}

const TZ_ECUADOR = 'America/Guayaquil';

/** Hora local HH:mm desde ISO o Date. */
export function extractHoraLocal(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    const m = String(value).match(/(\d{1,2}:\d{2})/);
    return m ? m[1] : '';
  }
  return d.toLocaleTimeString('es-EC', {
    timeZone: TZ_ECUADOR,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** Fecha y hora locales al cerrar obra (YYYY-MM-DD + HH:mm). */
export function nowCierreObra(now = new Date()) {
  const fechaFin = now.toLocaleDateString('en-CA', { timeZone: TZ_ECUADOR });
  const horaFin = extractHoraLocal(now);
  return { fechaFin, horaFin };
}

/** Mismo formato que "Inicio en Obra": YYYY-MM-DD HH:mm */
export function formatFechaHoraObra(fecha, hora) {
  if (!fecha) return '';
  const fechaNorm = String(fecha).slice(0, 10);
  const horaNorm = String(hora || '').trim();
  if (!horaNorm) return fechaNorm;
  return `${fechaNorm} ${horaNorm}`;
}

/**
 * Resuelve fecha/hora de cierre desde datos de fase o timestamp de completado.
 * @param {object} datos
 * @param {{ fechaCompletada?: string, fechaCompletadaAt?: string }} [faseMeta]
 */
export function resolveFechaHoraFin(datos = {}, faseMeta = {}) {
  const fechaFin =
    datos.fechaFin ||
    (faseMeta.fechaCompletada ? String(faseMeta.fechaCompletada).slice(0, 10) : '');
  let horaFin = String(datos.horaFin || '').trim();
  if (!horaFin && faseMeta.fechaCompletadaAt) {
    horaFin = extractHoraLocal(faseMeta.fechaCompletadaAt);
  }
  return { fechaFin, horaFin };
}

/** Texto legible para fecha/hora de cierre de obra (incluye hora si existe). */
export function formatFechaCierre(fechaFin, horaFin, faseMeta = null) {
  const resolved = resolveFechaHoraFin(
    { fechaFin, horaFin },
    faseMeta || {},
  );
  return formatFechaHoraObra(resolved.fechaFin, resolved.horaFin);
}
