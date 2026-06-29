/** Días laborables de referencia para convertir sueldo mensual ↔ diario (planilla Luxes). */
export const DIAS_SUELDO_MES = 30;

const roundMoney = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/** Sueldo diario a partir del sueldo base mensual ingresado en el formulario. */
export function sueldoDiarioFromMensual(sueldoMensual) {
  const mensual = Number(sueldoMensual) || 0;
  if (mensual <= 0) return 0;
  return roundMoney(mensual / DIAS_SUELDO_MES);
}

/** Sueldo mensual equivalente a partir del valor diario almacenado en BD. */
export function sueldoMensualFromDiario(sueldoDiario) {
  const diario = Number(sueldoDiario) || 0;
  if (diario <= 0) return 0;
  return roundMoney(diario * DIAS_SUELDO_MES);
}

/**
 * Valor mensual para mostrar en el formulario de empleado.
 * Si en BD quedó un monto alto (ej. 500) se asume que era mensual guardado por error.
 */
export function sueldoMensualForForm(sueldoDiario) {
  const stored = Number(sueldoDiario) || 0;
  if (stored <= 0) return '';
  if (stored >= 100) return roundMoney(stored);
  return sueldoMensualFromDiario(stored);
}

/** Sueldo mensual efectivo para mostrar en expediente / reportes. */
export function sueldoMensualEfectivo(sueldoDiarioAlmacenado) {
  const stored = Number(sueldoDiarioAlmacenado) || 0;
  if (stored <= 0) return 0;
  if (stored >= 100) return roundMoney(stored);
  return sueldoMensualFromDiario(stored);
}

/**
 * Sueldo diario efectivo para referencia (mensual ÷ 30).
 * Corrige registros viejos donde se guardó el monto mensual en sueldo_diario (ej. 500).
 */
export function sueldoDiarioEfectivo(sueldoDiarioAlmacenado) {
  const stored = Number(sueldoDiarioAlmacenado) || 0;
  if (stored <= 0) return 0;
  if (stored >= 100) return sueldoDiarioFromMensual(stored);
  return roundMoney(stored);
}

/** Mitad del sueldo mensual = base de cada quincena. */
export function sueldoQuincenaBase(sueldoAlmacenado) {
  const mensual = sueldoMensualEfectivo(sueldoAlmacenado);
  return mensual > 0 ? roundMoney(mensual / 2) : 0;
}

/** Tarifa diaria dentro de la quincena: (mensual ÷ 2) ÷ días laborables del período. */
export function sueldoDiarioEnQuincena(sueldoAlmacenado, diasLaborables) {
  const base = sueldoQuincenaBase(sueldoAlmacenado);
  if (base <= 0 || diasLaborables <= 0) return 0;
  return roundMoney(base / diasLaborables);
}

/**
 * Sueldo bruto de la quincena: mitad del mes prorrateada por días trabajados.
 * Ej. $500/mes, quincena completa → $250.
 */
export function calcSueldoBrutoQuincena(sueldoAlmacenado, diasLaborados, diasLaborables) {
  const base = sueldoQuincenaBase(sueldoAlmacenado);
  if (base <= 0 || diasLaborables <= 0) return 0;
  const ratio = Math.min(1, Math.max(0, Number(diasLaborados) / Number(diasLaborables)));
  return roundMoney(base * ratio);
}
