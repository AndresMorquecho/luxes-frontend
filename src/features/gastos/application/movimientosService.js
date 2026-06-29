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
