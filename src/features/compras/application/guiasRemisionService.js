const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };
};

/**
 * Emit a new Guía de Remisión electronic voucher
 * @param {object} payload - The transport, plate, dates, and destination details.
 * @returns {Promise<object>} The SRI gateway response (id, estado, clave_acceso, mensaje).
 */
export async function emitirGuiaRemision(payload) {
  const res = await fetch('/api/guias-remision', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al emitir guía de remisión');
  }
  return data.data;
}

/**
 * Get the status of an already enqueued/emitted voucher
 * @param {string} id - The voucher ID returned by the SRI gateway.
 * @returns {Promise<object>} The status verification response (id, estado, clave_acceso, mensaje).
 */
export async function consultarEstadoGuia(id) {
  const res = await fetch(`/api/guias-remision/${id}`, {
    method: 'GET',
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al consultar estado de la guía');
  }
  return data.data;
}
