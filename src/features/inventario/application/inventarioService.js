const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };
};

/** Categoría de inventario según rol: Impresión, Taller o libre (admin). */
export function getInventarioCategoriaPorRol(user) {
  const rol = (user?.rol ?? JSON.parse(localStorage.getItem('user') || '{}')?.rol ?? '').toLowerCase();
  if (rol === 'impresión' || rol === 'impresion') return 'Impresión';
  if (rol === 'taller') return 'Taller';
  return undefined;
}

/** Arma opciones de consulta respetando el inventario del rol. */
export function buildMaterialesQuery(options = {}) {
  const categoriaRol = getInventarioCategoriaPorRol();
  const { categoria, ...rest } = options;
  return {
    page: 1,
    limit: 500,
    ...rest,
    ...(categoriaRol ? { categoria: categoriaRol } : categoria ? { categoria } : {}),
  };
}

/** Normaliza la respuesta del API (array plano o { items, total }). */
export function normalizeMaterialesList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

// ── Materiales ─────────────────────────────────────────────────────────────

export async function getMateriales(options = {}) {
  const params = new URLSearchParams();
  if (typeof options === 'string') {
    params.append('tipo', options);
  } else {
    const { tipo, page, limit, search, categoria } = options;
    if (tipo) params.append('tipo', tipo);
    if (page) params.append('page', page);
    if (limit) params.append('limit', limit);
    if (search) params.append('search', search);
    if (categoria) params.append('categoria', categoria);
  }

  const url = `/api/inventario?${params.toString()}`;
  const res = await fetch(url, { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al obtener materiales');
  return data.data;
}

export async function getInventarioStats() {
  const res = await fetch('/api/inventario/stats', { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al obtener estadísticas');
  return data.data;
}

export async function getUnidadesMedida() {
  const res = await fetch('/api/inventario/unidades-medida', { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al obtener unidades de medida');
  return data.data;
}

export async function createMaterial(body) {
  const res = await fetch('/api/inventario', {
    method: 'POST', headers: getHeaders(), body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al crear material');
  return data.data;
}

export async function updateMaterial(id, body) {
  const res = await fetch(`/api/inventario/${id}`, {
    method: 'PUT', headers: getHeaders(), body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al actualizar material');
  return data.data;
}

export async function deleteMaterial(id) {
  const res = await fetch(`/api/inventario/${id}`, {
    method: 'DELETE', headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al eliminar material');
  return data.data;
}

// ── Movimientos ─────────────────────────────────────────────────────────────

export async function getMovimientos(materialId) {
  const url = materialId ? `/api/inventario/movimientos?materialId=${materialId}` : '/api/inventario/movimientos';
  const res = await fetch(url, { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al obtener movimientos');
  return data.data;
}

export async function registrarMovimiento(materialId, body) {
  const res = await fetch(`/api/inventario/${materialId}/movimiento`, {
    method: 'POST', headers: getHeaders(), body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al registrar movimiento');
  return data.data;
}

// ── Préstamos ───────────────────────────────────────────────────────────────

export async function getPrestamos(options) {
  const params = new URLSearchParams();
  if (typeof options === 'string') {
    params.append('estado', options);
  } else if (options && typeof options === 'object') {
    const { estado, page, limit, fechaInicio, fechaFin, searchTool, filterPersona } = options;
    if (estado) params.append('estado', estado);
    if (page) params.append('page', page);
    if (limit) params.append('limit', limit);
    if (fechaInicio) params.append('fechaInicio', fechaInicio);
    if (fechaFin) params.append('fechaFin', fechaFin);
    if (searchTool) params.append('searchTool', searchTool);
    if (filterPersona) params.append('filterPersona', filterPersona);
  }

  const url = `/api/inventario/prestamos?${params.toString()}`;
  const res = await fetch(url, { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al obtener préstamos');
  return data.data;
}

export async function registrarPrestamo(body) {
  const res = await fetch('/api/inventario/prestamos', {
    method: 'POST', headers: getHeaders(), body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al registrar préstamo');
  return data.data;
}

export async function devolverPrestamo(id, body = {}) {
  const res = await fetch(`/api/inventario/prestamos/${id}/retorno`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al registrar devolución');
  return data.data;
}

export async function getMaterialHistorial(id) {
  const res = await fetch(`/api/inventario/${id}/historial`, { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al obtener historial del material');
  return data.data;
}
