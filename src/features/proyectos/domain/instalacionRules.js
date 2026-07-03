/**
 * Reglas de negocio para iniciar y cerrar una instalación en sitio.
 */

export function isInstalacionIniciada(datos = {}) {
  return Boolean(datos.fechaInstalacion && datos.horaInstalacion);
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
    faltantes.push('Inicia la instalación en obra (botón "Iniciar Instalación")');
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

/** Texto legible para fecha/hora de cierre de obra. */
export function formatFechaCierre(fechaFin, horaFin) {
  if (!fechaFin) return '';
  const iso = horaFin ? `${fechaFin}T${horaFin}:00` : `${fechaFin}T12:00:00`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(fechaFin);
  const fecha = d.toLocaleDateString('es-EC', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  if (!horaFin) return fecha;
  return `${fecha} a las ${horaFin}`;
}
