const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };
};

export const CATEGORIAS = ['oficina', 'mantenimiento', 'servicios', 'logistica', 'vehiculos', 'varios'];

export async function getMetodosPago() {
  const res = await fetch('/api/compras/metodos-pago', { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al obtener métodos de pago');
  return data.data;
}

// ── Gastos Generales ─────────────────────────────────────────────────────────

export async function getGastos() {
  const res = await fetch('/api/gastos', { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al obtener gastos');
  return data.data;
}

export async function saveGasto(gasto) {
  const isEdit = !!gasto.id;
  const url = isEdit ? `/api/gastos/${gasto.id}` : '/api/gastos';
  const method = isEdit ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    headers: getHeaders(),
    body: JSON.stringify(gasto),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al guardar gasto');
  return data.data;
}

export async function deleteGasto(id) {
  const res = await fetch(`/api/gastos/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al eliminar gasto');
  return data.data;
}

// ── Vehículos ────────────────────────────────────────────────────────────────

export async function getVehiculos() {
  const res = await fetch('/api/vehiculos', { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al obtener vehículos');
  return data.data;
}

export async function getVehiculoDetails(id) {
  const res = await fetch(`/api/vehiculos/${id}`, { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al obtener detalles del vehículo');
  return data.data;
}

export async function saveVehiculo(vehiculo) {
  const isEdit = !!vehiculo.id;
  const url = isEdit ? `/api/vehiculos/${vehiculo.id}` : '/api/vehiculos';
  const method = isEdit ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    headers: getHeaders(),
    body: JSON.stringify(vehiculo),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al guardar vehículo');
  return data.data;
}

export async function deleteVehiculo(id) {
  const res = await fetch(`/api/vehiculos/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al eliminar vehículo');
  return data.data;
}

// ── Mantenimientos de Vehículo ───────────────────────────────────────────────

export async function addMantenimiento(vehiculoId, mantenimiento) {
  const res = await fetch(`/api/vehiculos/${vehiculoId}/mantenimientos`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(mantenimiento),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al registrar mantenimiento');
  return data.data;
}

export async function updateMantenimiento(mantenimientoId, mantenimiento) {
  const res = await fetch(`/api/vehiculos/mantenimientos/${mantenimientoId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(mantenimiento),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al actualizar mantenimiento');
  return data.data;
}

export async function deleteMantenimiento(mantenimientoId) {
  const res = await fetch(`/api/vehiculos/mantenimientos/${mantenimientoId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al eliminar mantenimiento');
  return data.data;
}

// ── Cierres de Caja y Reportes ───────────────────────────────────────────────

export async function getCierrePreview(desde, hasta) {
  const res = await fetch(`/api/gastos/cierre/preview?desde=${desde}&hasta=${hasta}`, { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al obtener vista previa de cierre');
  return data.data;
}

export async function saveCierre(cierre) {
  const res = await fetch('/api/gastos/cierre', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(cierre),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al guardar cierre de caja');
  return data.data;
}

export async function getCierres() {
  const res = await fetch('/api/gastos/cierre', { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al obtener cierres de caja');
  return data.data;
}

export async function getFinancialDashboard(desde = '', hasta = '') {
  let url = '/api/gastos/reportes/dashboard';
  if (desde || hasta) {
    url += `?desde=${desde}&hasta=${hasta}`;
  }
  const res = await fetch(url, { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al obtener reportes financieros');
  return data.data;
}

