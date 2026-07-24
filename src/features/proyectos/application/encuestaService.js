export async function getEncuestaContext(proyectoId) {
  const res = await fetch(`/api/encuesta/${proyectoId}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'No se pudo cargar la encuesta');
  }
  return data.data;
}

export async function submitEncuesta(proyectoId, payload) {
  const res = await fetch(`/api/encuesta/${proyectoId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'No se pudo enviar la encuesta');
  }
  return data.data;
}

export async function submitReclamo(proyectoId, { detalle }) {
  const res = await fetch(`/api/encuesta/${proyectoId}/reclamo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ detalle }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'No se pudo enviar el reporte');
  }
  return data.data;
}

export async function getReclamos({ page = 1, limit = 10, search = '', estado = 'TODOS' } = {}) {
  const token = localStorage.getItem('token');
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    search: search || '',
    estado: estado || 'TODOS',
  });
  const res = await fetch(`/api/proyectos/reclamos/lista?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'No se pudo obtener la lista de reclamos');
  }
  return data.data;
}

export async function updateEstadoReclamo(reclamoId, { estado, notasResolucion }) {
  const token = localStorage.getItem('token');
  const res = await fetch(`/api/proyectos/reclamos/${reclamoId}/estado`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ estado, notasResolucion }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'No se pudo actualizar el estado');
  }
  return data.data;
}

