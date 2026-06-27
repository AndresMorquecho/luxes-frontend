const API_BASE = '/api/tareas';

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: authHeaders(),
    ...options,
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'Error en la solicitud');
  }
  return json.data;
}

export async function getTareas(filters = {}) {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', filters.page);
  if (filters.limit) params.set('limit', filters.limit);
  if (filters.estado) params.set('estado', filters.estado);
  if (filters.prioridad) params.set('prioridad', filters.prioridad);
  if (filters.search) params.set('search', filters.search);
  return request(`${API_BASE}?${params}`);
}

export async function getMisTareas(filters = {}) {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', filters.page);
  if (filters.limit) params.set('limit', filters.limit);
  if (filters.estado) params.set('estado', filters.estado);
  if (filters.prioridad) params.set('prioridad', filters.prioridad);
  return request(`${API_BASE}/mis-tareas?${params}`);
}

export async function getTareaById(id) {
  return request(`${API_BASE}/${id}`);
}

export async function createTarea(data) {
  return request(API_BASE, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTarea(id, data) {
  return request(`${API_BASE}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteTarea(id) {
  return request(`${API_BASE}/${id}`, {
    method: 'DELETE',
  });
}

export async function getTareasStats(userId) {
  const params = new URLSearchParams();
  if (userId) params.set('userId', userId);
  return request(`${API_BASE}/stats?${params}`);
}

export async function getUsers() {
  const res = await fetch('/api/auth/users', { headers: authHeaders() });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error('Error al cargar usuarios');
  return json.data;
}
