const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };
};

export async function getConfiguracion() {
  const res = await fetch('/api/configuracion', { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al obtener la configuración');
  }
  return data.data;
}

export async function updateConfiguracion(config) {
  const res = await fetch('/api/configuracion', {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(config),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al actualizar la configuración');
  }
  return data.data;
}
