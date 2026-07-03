const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };
};

export const getProyectos = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.search) params.append('search', filters.search);
  if (filters.estado) params.append('estado', filters.estado);
  if (filters.faseActual) params.append('faseActual', filters.faseActual);
  if (filters.prioridad) params.append('prioridad', filters.prioridad);

  const queryString = params.toString();
  const url = `/api/proyectos${queryString ? `?${queryString}` : ''}`;
  
  const res = await fetch(url, { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al obtener proyectos');
  }
  return data;
};

export const getProyectoById = async (id) => {
  const res = await fetch(`/api/proyectos/${id}`, { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al obtener proyecto');
  }
  return data.data;
};

export const createProyecto = async (proyecto) => {
  const res = await fetch('/api/proyectos', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(proyecto),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al crear proyecto');
  }
  return data.data;
};

export const updateProyecto = async (id, updates) => {
  const res = await fetch(`/api/proyectos/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al actualizar proyecto');
  }
  return data.data;
};

export const deleteProyecto = async (id) => {
  const res = await fetch(`/api/proyectos/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al eliminar proyecto');
  }
  return id;
};

export const avanzarFase = async (id, fase, datos = {}) => {
  const res = await fetch(`/api/proyectos/${id}/avanzar-fase`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ fase, datos }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al avanzar fase');
  }
  return data.data;
};

export const updateInstalacion = async (proyectoId, instalacionData) => {
  const res = await fetch(`/api/proyectos/${proyectoId}/instalacion`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(instalacionData),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al actualizar instalación');
  }
  return data.data;
};

export const uploadArchivoDiseno = async (proyectoId, file) => {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  formData.append('archivo', file);

  const res = await fetch(`/api/proyectos/${proyectoId}/upload-diseno`, {
    method: 'POST',
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
    },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al subir archivo');
  }
  return data.data;
};

export const uploadEvidenciaInstalacion = async (proyectoId, file) => {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  formData.append('archivo', file);

  const res = await fetch(`/api/proyectos/${proyectoId}/upload-evidencia`, {
    method: 'POST',
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
    },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al subir evidencia');
  }
  return data.data;
};
