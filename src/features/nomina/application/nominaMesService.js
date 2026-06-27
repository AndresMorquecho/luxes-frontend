const STORAGE_KEY = 'luxes_nomina_mes';

function getMonthKey(mes, anio) {
  return `${anio}-${String(mes).padStart(2, '0')}`;
}

export async function getPagosPorMes(mes, anio) {
  const key = getMonthKey(mes, anio);
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const all = stored ? JSON.parse(stored) : {};
    return all[key] || [];
  } catch {
    return [];
  }
}

export async function marcarPagado(empleadoId, mes, anio, monto) {
  const key = getMonthKey(mes, anio);
  const stored = localStorage.getItem(STORAGE_KEY);
  const all = stored ? JSON.parse(stored) : {};
  const list = all[key] || [];
  const idx = list.findIndex(p => p.empleadoId === empleadoId);
  const pago = { empleadoId, monto, fechaPago: new Date().toISOString().split('T')[0], estado: 'pagado' };
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...pago };
  } else {
    list.push(pago);
  }
  all[key] = list;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return pago;
}

export async function marcarPendiente(empleadoId, mes, anio) {
  const key = getMonthKey(mes, anio);
  const stored = localStorage.getItem(STORAGE_KEY);
  const all = stored ? JSON.parse(stored) : {};
  const list = all[key] || [];
  const idx = list.findIndex(p => p.empleadoId === empleadoId);
  if (idx >= 0) {
    list.splice(idx, 1);
    all[key] = list;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }
}

export function calcularSalarioMensual(sueldoDiario) {
  return sueldoDiario * 30;
}
