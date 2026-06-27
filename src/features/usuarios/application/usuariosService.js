const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

export async function getUsuarios() {
  const response = await fetch('/api/auth/users', {
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al obtener usuarios');
  }
  return data.data;
}

export async function createUsuario(userData) {
  const response = await fetch('/api/auth/users', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(userData),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al crear usuario');
  }
  return data.data;
}

export async function updateUsuario(id, userData) {
  const response = await fetch(`/api/auth/users/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(userData),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al actualizar usuario');
  }
  return data.data;
}

export async function deleteUsuario(id) {
  const response = await fetch(`/api/auth/users/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al eliminar usuario');
  }
  return data;
}

export async function toggleUsuarioStatus(id) {
  const response = await fetch(`/api/auth/users/${id}/toggle-status`, {
    method: 'PUT',
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al cambiar estado del usuario');
  }
  return data.data;
}

export async function cambiarUsuarioPassword(id, password) {
  const response = await fetch(`/api/auth/users/${id}/password`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ password }),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al cambiar contraseña del usuario');
  }
  return data.data;
}

export async function getRoles() {
  const response = await fetch('/api/auth/roles', {
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al obtener roles');
  }
  return data.data;
}

export async function createRol(roleData) {
  const response = await fetch('/api/auth/roles', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(roleData),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al crear rol');
  }
  return data.data;
}

export async function updateRol(id, roleData) {
  const response = await fetch(`/api/auth/roles/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(roleData),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al actualizar rol');
  }
  return data.data;
}

export async function deleteRol(id) {
  const response = await fetch(`/api/auth/roles/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al eliminar rol');
  }
  return data;
}

export async function getPermissions() {
  const response = await fetch('/api/auth/permissions', {
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al obtener permisos');
  }
  return data.data;
}

export async function getAuditLogs(filters = {}) {
  const queryParams = new URLSearchParams();
  if (filters.search) queryParams.append('search', filters.search);
  if (filters.userId) queryParams.append('userId', filters.userId);
  if (filters.modulo) queryParams.append('modulo', filters.modulo);
  if (filters.severidad) queryParams.append('severidad', filters.severidad);

  const response = await fetch(`/api/auth/audit-logs?${queryParams.toString()}`, {
    headers: getHeaders(),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al obtener registros de auditoría');
  }
  return data.data;
}
