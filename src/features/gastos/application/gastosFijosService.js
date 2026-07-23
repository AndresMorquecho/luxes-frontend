const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };
};

export async function getGastosFijos() {
  const res = await fetch('/api/gastos/fijos', { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al obtener gastos fijos');
  return data;
}

export async function getDeudasFijasCount() {
  const res = await fetch('/api/gastos/fijos/deudas-count', { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok || !data.success) return 0;
  return data.count || 0;
}

export async function saveGastoFijo(gastoFijo) {
  const isEdit = !!gastoFijo.id;
  const url = isEdit ? `/api/gastos/fijos/${gastoFijo.id}` : '/api/gastos/fijos';
  const method = isEdit ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    headers: getHeaders(),
    body: JSON.stringify(gastoFijo),
  });

  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al guardar gasto fijo');
  return data.data;
}

export async function deleteGastoFijo(id) {
  const res = await fetch(`/api/gastos/fijos/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al eliminar gasto fijo');
  return data.data;
}

export async function pagarGastoFijo(id, payload) {
  const res = await fetch(`/api/gastos/fijos/${id}/pagar`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al registrar el pago');
  return data.data;
}

export async function deleteGastoFijoPago(pagoId) {
  const res = await fetch(`/api/gastos/fijos/pagos/${pagoId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al eliminar el pago');
  return data;
}

