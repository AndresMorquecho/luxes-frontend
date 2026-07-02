/** Proyecto con entrega vencida y aún en curso (no cerrado). */
export function proyectoEstaVencido(proyecto) {
  if (!proyecto?.fechaEntregaEstimada) return false;
  if (proyecto.estado === 'COMPLETADO' || proyecto.faseActual === 'COMPLETADO') return false;
  return new Date(proyecto.fechaEntregaEstimada) < new Date();
}

/** Proyecto aún abierto: se puede vincular a órdenes, gastos, etc. */
export function isProyectoEnCurso(proyecto) {
  if (!proyecto) return false;
  if (proyecto.estado === 'COMPLETADO' || proyecto.estado === 'CANCELADO') return false;
  if (proyecto.faseActual === 'COMPLETADO') return false;
  return true;
}

/** Lista para selects: solo en curso; opcionalmente conserva un proyecto ya vinculado (edición). */
export function filterProyectosAsociables(proyectos, { incluirProyectoId } = {}) {
  const list = Array.isArray(proyectos) ? proyectos : [];
  const activos = list.filter(isProyectoEnCurso);
  if (incluirProyectoId && !activos.some((p) => p.id === incluirProyectoId)) {
    const vinculado = list.find((p) => p.id === incluirProyectoId);
    if (vinculado) return [vinculado, ...activos];
  }
  return activos;
}
