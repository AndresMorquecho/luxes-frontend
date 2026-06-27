/**
 * Reglas de negocio para iniciar y cerrar una instalación en sitio.
 */

export function isInstalacionIniciada(datos = {}) {
  return Boolean(datos.fechaInstalacion && datos.horaInstalacion);
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

  const ocSinRecibir = ordenes.filter((oc) => (oc.estado || '').toUpperCase() === 'APROBADA');
  if (ocSinRecibir.length > 0) {
    faltantes.push(
      `Recibe ${ocSinRecibir.length} orden(es) de compra aprobada(s) antes de cerrar la obra`,
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
  return getInstalacionCompletionBlockers(datos, opts).length === 0;
}
