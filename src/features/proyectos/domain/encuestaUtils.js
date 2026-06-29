/**
 * Obtiene los resultados de encuesta guardados en el proyecto.
 * @param {object} proyecto
 * @returns {object|null}
 */
export function getEncuestaSatisfaccion(proyecto) {
  if (!proyecto?.fases) return null;

  const desdeInstalacion = proyecto.fases.INSTALACION?.datos?.encuestaSatisfaccion;
  if (desdeInstalacion?.completada) return desdeInstalacion;

  const desdeCompletado = proyecto.fases.COMPLETADO?.datos?.encuestaSatisfaccion;
  if (desdeCompletado?.completada) return desdeCompletado;

  return null;
}

export function instalacionListaParaEncuesta(proyecto) {
  const datos = proyecto?.fases?.INSTALACION?.datos || {};
  return datos.instalacionCompletada === true || proyecto?.instalacion?.instalacionCompletada === true;
}

export function encuestaFueEnviada(proyecto) {
  const datos = proyecto?.fases?.INSTALACION?.datos || {};
  return datos.encuestaEnviada === true;
}
