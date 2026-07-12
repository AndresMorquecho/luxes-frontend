const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };
};

export async function getMovimientos({ desde, hasta, tipo, metodoPagoId } = {}) {
  const params = new URLSearchParams();
  if (desde) params.append('desde', desde);
  if (hasta) params.append('hasta', hasta);
  if (tipo && tipo !== 'todos') params.append('tipo', tipo);
  if (metodoPagoId) params.append('metodoPagoId', metodoPagoId);

  const url = `/api/gastos/movimientos${params.toString() ? '?' + params.toString() : ''}`;
  const res = await fetch(url, { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al obtener movimientos');
  return data.data;
}

export async function getIngresosCaja({ desde, hasta, metodoPagoId, search, page, limit } = {}) {
  const params = new URLSearchParams();
  if (desde) params.append('startDate', desde);
  if (hasta) params.append('endDate', hasta);
  if (metodoPagoId) params.append('metodoPagoId', metodoPagoId);
  if (search) params.append('search', search);
  if (page) params.append('page', page);
  if (limit) params.append('limit', limit);

  const url = `/api/gastos/ingresos?${params.toString()}`;
  const res = await fetch(url, { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al obtener ingresos');
  return data.data;
}

export async function createIngresoCaja(body) {
  const res = await fetch('/api/gastos/ingresos', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al registrar ingreso');
  return data.data;
}

export async function deleteIngresoCaja(id) {
  const res = await fetch(`/api/gastos/ingresos/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al eliminar ingreso');
  return data.data;
}

export async function getTransferencias({ desde, hasta, origenMetodoId, destinoMetodoId, search, page, limit } = {}) {
  const params = new URLSearchParams();
  if (desde) params.append('startDate', desde);
  if (hasta) params.append('endDate', hasta);
  if (origenMetodoId) params.append('origenMetodoId', origenMetodoId);
  if (destinoMetodoId) params.append('destinoMetodoId', destinoMetodoId);
  if (search) params.append('search', search);
  if (page) params.append('page', page);
  if (limit) params.append('limit', limit);

  const url = `/api/gastos/transferencias?${params.toString()}`;
  const res = await fetch(url, { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al obtener transferencias');
  return data.data;
}

export async function createTransferencia(body) {
  const res = await fetch('/api/gastos/transferencias', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al realizar transferencia');
  return data.data;
}

export async function deleteTransferencia(id) {
  const res = await fetch(`/api/gastos/transferencias/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al eliminar transferencia');
  return data.data;
}
