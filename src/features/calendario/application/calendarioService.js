const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };
};

export async function getEventosCalendario(mes) {
  const res = await fetch(`/api/calendario/eventos?mes=${mes}`, { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al obtener eventos del calendario');
  return data.data;
}

export async function getRutinas() {
  const res = await fetch('/api/rutinas', { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al obtener rutinas');
  return data.data;
}

export async function createRutina(payload) {
  const res = await fetch('/api/rutinas', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al crear rutina');
  return data.data;
}

export async function updateRutina(id, payload) {
  const res = await fetch(`/api/rutinas/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al actualizar rutina');
  return data.data;
}

export async function deleteRutina(id) {
  const res = await fetch(`/api/rutinas/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al eliminar rutina');
  return data.data;
}

export async function toggleRutinaCompletada(rutinaId, fecha, empleadoId, notas) {
  const res = await fetch(`/api/rutinas/${rutinaId}/toggle`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ fecha, empleadoId, notas }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al actualizar estado de la rutina');
  return data.data;
}
