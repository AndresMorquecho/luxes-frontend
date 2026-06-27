/** Fecha local de hoy en formato YYYY-MM-DD */
export function getTodayDateISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Días transcurridos desde una fecha YYYY-MM-DD (fecha de inicio del proyecto) */
export function calcularDiasDesde(fechaStr) {
  if (!fechaStr || typeof fechaStr !== 'string') return 0;
  const parts = fechaStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return 0;

  const [y, m, d] = parts;
  const inicio = new Date(y, m - 1, d);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  inicio.setHours(0, 0, 0, 0);

  const diff = Math.floor((hoy - inicio) / (1000 * 60 * 60 * 24));
  return Number.isFinite(diff) ? Math.max(0, diff) : 0;
}
