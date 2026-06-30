/** Proyecto con entrega vencida y aún en curso (no cerrado). */
export function proyectoEstaVencido(proyecto) {
  if (!proyecto?.fechaEntregaEstimada) return false;
  if (proyecto.estado === 'COMPLETADO' || proyecto.faseActual === 'COMPLETADO') return false;
  return new Date(proyecto.fechaEntregaEstimada) < new Date();
}
