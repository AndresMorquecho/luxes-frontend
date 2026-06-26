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
