/** Etiqueta corta de unidad (evita "metros"/"METRO" en la tabla). */
export function unidadLabel(unidad) {
  if (!unidad) return 'unid';
  if (typeof unidad === 'string') {
    const key = unidad.trim().toLowerCase();
    if (key === 'metros' || key === 'metro') return 'm';
    if (key === 'unidades' || key === 'unidad') return 'unid';
    return unidad.length > 6 ? unidad.slice(0, 6) : unidad;
  }
  if (unidad.abreviacion) return unidad.abreviacion;
  return unidadLabel(unidad.nombre);
}
