const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };
};

/** Categoría de inventario unificada para ALUX. */
export function getInventarioCategoriaPorRol(_user) {
  return undefined;
}

/** Arma opciones de consulta respetando el inventario del rol. */
export function buildMaterialesQuery(options = {}) {
  const categoriaRol = getInventarioCategoriaPorRol();
  const { categoria, incluirDerivados, ...rest } = options;
  const categoriaFinal = categoriaRol || categoria || undefined;
  return {
    page: 1,
    limit: 500,
    ...rest,
    ...(categoriaFinal ? { categoria: categoriaFinal } : {}),
    // Solo incluir derivados [R001],[R002] si se pide explícitamente
    // El dropdown de OC NUNCA debe pasarlo; solo InventarioPage de impresión lo pide
    ...(incluirDerivados !== undefined ? { incluirDerivados } : {}),
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
    const { tipo, page, limit, search, categoria, incluirDerivados } = options;
    if (tipo) params.append('tipo', tipo);
    if (page) params.append('page', page);
    if (limit) params.append('limit', limit);
    if (search) params.append('search', search);
    if (categoria) params.append('categoria', categoria);
    if (incluirDerivados) params.append('incluirDerivados', 'true');
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

/** Descarga plantilla Excel desde el backend según la sección */
export async function downloadImportTemplate(categoria) {
  const params = new URLSearchParams({ categoria });
  const res = await fetch(`/api/inventario/importar/plantilla?${params}`, {
    headers: { Authorization: getHeaders().Authorization },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error?.message || 'Error al descargar plantilla');
  }
  const blob = await res.blob();
  const slug = categoria.toLowerCase().replace(/[^a-z0-9]+/gi, '_');
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `plantilla_inventario_${slug}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

/** Importa materiales validados vía endpoint bulk del backend */
export async function importMaterialesBulk(categoria, materiales) {
  const res = await fetch('/api/inventario/importar', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      categoria,
      items: materiales.map(({ line, nombre, payload }) => ({
        line,
        nombre,
        payload,
      })),
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al importar materiales');
  }
  return data.data;
}

/** Sube archivo Excel directamente al backend (parseo + importación en servidor) */
export async function importMaterialesFromFile(categoria, file) {
  const formData = new FormData();
  formData.append('archivo', file);
  formData.append('categoria', categoria);

  const token = localStorage.getItem('token');
  const res = await fetch('/api/inventario/importar/archivo', {
    method: 'POST',
    headers: { Authorization: token ? `Bearer ${token}` : '' },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al importar archivo');
  }
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

export async function sincronizarDevolucionesInstalacion() {
  const res = await fetch('/api/proyectos/sincronizar-devoluciones', {
    method: 'POST',
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al sincronizar devoluciones');
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

export async function getMaterialHistorial(id, options = {}) {
  const params = new URLSearchParams();
  if (options.page) params.append('page', options.page);
  if (options.limit) params.append('limit', options.limit);
  if (options.fechaInicio) params.append('fechaInicio', options.fechaInicio);
  if (options.fechaFin) params.append('fechaFin', options.fechaFin);
  if (options.tipo && options.tipo !== 'todos' && options.tipo !== 'all') params.append('tipo', options.tipo);
  if (options.usuario) params.append('usuario', options.usuario);

  const queryStr = params.toString();
  const url = `/api/inventario/${id}/historial${queryStr ? `?${queryStr}` : ''}`;
  const res = await fetch(url, { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al obtener historial del material');
  return data.data;
}
