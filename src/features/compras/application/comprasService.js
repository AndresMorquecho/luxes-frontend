const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };
};

const countDetalles = (orden) => {
  if (!orden) return 0;
  const raw = orden.detalles || orden.items || [];
  return Array.isArray(raw) ? raw.length : 0;
};

const mapDetallesPayload = (detalles) =>
  (detalles || []).map((d) => ({
    descripcion: d.descripcion || d.nombre || '',
    cantidad: Number(d.cantidad) || 0,
    precioUnitario: parseFloat(d.precioUnitario ?? d.precio ?? 0) || 0,
    materialId: d.materialId || null,
  }));

// ── Proveedores ─────────────────────────────────────────────────────────────

export async function getProveedores() {
  const res = await fetch('/api/compras/proveedores', { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al obtener proveedores');
  return data.data;
}

// ── Órdenes de Compra ───────────────────────────────────────────────────────

export async function getOrdenes(options = {}) {
  const params = new URLSearchParams();
  const { page, limit, search, estado, estados, estadoPago, creadorRol, creadorId, pendienteRecepcion, fechaInicio, fechaFin } = options;
  if (page) params.append('page', page);
  if (limit) params.append('limit', limit);
  if (search) params.append('search', search);
  if (estado) params.append('estado', estado);
  if (estados?.length) params.append('estados', estados.join(','));
  if (estadoPago) params.append('estadoPago', estadoPago);
  if (creadorRol) params.append('creadorRol', creadorRol);
  if (creadorId) params.append('creadorId', creadorId);
  if (pendienteRecepcion) params.append('pendienteRecepcion', 'true');
  if (fechaInicio) params.append('fechaInicio', fechaInicio);
  if (fechaFin) params.append('fechaFin', fechaFin);

  const url = `/api/compras?${params.toString()}`;
  const res = await fetch(url, { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al obtener órdenes');
  return data.data;
}

export async function getOrdenDetalles(ordenId) {
  const res = await fetch(`/api/compras/${ordenId}/detalles`, { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al obtener detalles');
  return Array.isArray(data.data) ? data.data : [];
}

export async function restaurarDetallesOrden(ordenId, detalles) {
  const res = await fetch(`/api/compras/${ordenId}/restaurar-detalles`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ detalles: mapDetallesPayload(detalles) }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al restaurar detalles');
  return data.data;
}

export async function fetchOrdenCompleta(id, ordenFromList = null) {
  const res = await fetch(`/api/compras/${id}`, { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al obtener orden');
  let orden = data.data;
  if (!orden) return orden;

  if (!Array.isArray(orden.detalles)) {
    orden.detalles = [];
  }

  if (countDetalles(orden) === 0) {
    try {
      const detalles = await getOrdenDetalles(id);
      if (detalles.length > 0) {
        orden = { ...orden, detalles };
      }
    } catch {
      // ignorar
    }
  }

  if (countDetalles(orden) === 0 && orden?.numero) {
    try {
      const list = await getOrdenes({ search: orden.numero, limit: 30 });
      const alt = (list.items || []).find((o) => o.id === id);
      if (alt && countDetalles(alt) > 0) {
        orden = { ...orden, detalles: alt.detalles };
      }
    } catch {
      // ignorar fallback de listado
    }
  }

  if (ordenFromList?.id === id && countDetalles(ordenFromList) > 0 && countDetalles(orden) === 0) {
    orden = { ...orden, detalles: ordenFromList.detalles };
  }

  return orden;
}

export async function getOrdenById(id) {
  return fetchOrdenCompleta(id);
}

export async function createOrden(body) {
  const res = await fetch('/api/compras', {
    method: 'POST', headers: getHeaders(), body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al crear orden');
  return data.data;
}

export async function updateOrden(id, body) {
  const res = await fetch(`/api/compras/${id}`, {
    method: 'PUT', headers: getHeaders(), body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al actualizar orden');
  return data.data;
}

export async function deleteOrden(id) {
  const res = await fetch(`/api/compras/${id}`, {
    method: 'DELETE', headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al eliminar orden');
  return data.data;
}

// ── Abonos ──────────────────────────────────────────────────────────────────

export async function getAbonos(ordenId) {
  const res = await fetch(`/api/compras/${ordenId}/abonos`, { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al obtener abonos');
  return data.data;
}

export async function registrarAbono(ordenId, body) {
  const res = await fetch(`/api/compras/${ordenId}/abono`, {
    method: 'POST', headers: getHeaders(), body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al registrar abono');
  return data.data;
}

// ── Cuentas por Pagar ───────────────────────────────────────────────────────

export async function getCuentasPorPagar(options = {}) {
  const params = new URLSearchParams();
  const { page, limit, estado } = options;
  if (page) params.append('page', page);
  if (limit) params.append('limit', limit);
  if (estado) params.append('estado', estado);

  const url = `/api/compras/cuentas-por-pagar?${params.toString()}`;
  const res = await fetch(url, { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al obtener cuentas por pagar');
  return data.data;
}

// ── Métodos de Pago ─────────────────────────────────────────────────────────

export async function getMetodosPago(desde, hasta) {
  const params = new URLSearchParams();
  if (desde) params.append('desde', desde);
  if (hasta) params.append('hasta', hasta);
  const url = `/api/compras/metodos-pago${params.toString() ? '?' + params.toString() : ''}`;
  const res = await fetch(url, { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al obtener métodos de pago');
  return data.data;
}

export async function createMetodoPago(body) {
  const res = await fetch('/api/compras/metodos-pago', {
    method: 'POST', headers: getHeaders(), body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al crear método de pago');
  return data.data;
}

export async function updateMetodoPago(id, body) {
  const res = await fetch(`/api/compras/metodos-pago/${id}`, {
    method: 'PUT', headers: getHeaders(), body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al actualizar método de pago');
  return data.data;
}

export async function deleteMetodoPago(id) {
  const res = await fetch(`/api/compras/metodos-pago/${id}`, {
    method: 'DELETE', headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al eliminar método de pago');
  return data.data;
}

// ── Stats ───────────────────────────────────────────────────────────────────

export async function getComprasStats() {
  const res = await fetch('/api/compras/stats', { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al obtener estadísticas');
  return data.data;
}

// ── Recepción de Orden ──────────────────────────────────────────────────────

export async function recepcionarOrden(id, body) {
  const res = await fetch(`/api/compras/${id}/recepcion`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al registrar productos recibidos');
  return data.data;
}
