const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };
};

const parseResponse = async (response) => {
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Respuesta inválida del servidor (${response.status})`);
  }
  if (!response.ok || !data?.success) {
    throw new Error(data?.error?.message || `Error en la operación (${response.status})`);
  }
  return data.data;
};

export const getAsistencias = async (desde, hasta) => {
  if (!desde) {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    desde = d.toISOString().split('T')[0];
  }
  if (!hasta) {
    hasta = new Date().toISOString().split('T')[0];
  }
  return parseResponse(
    await fetch(`/api/asistencias?desde=${desde}&hasta=${hasta}`, {
      headers: getHeaders(),
    })
  );
};

export const getProximaMarcacion = async (empleadoId) => {
  return parseResponse(
    await fetch(`/api/asistencias/empleado/${empleadoId}/proxima`, {
      headers: getHeaders(),
    })
  );
};

export const registrarAsistencia = async ({ empleadoId, ubicacion }) => {
  return parseResponse(
    await fetch('/api/asistencias/registrar', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ empleadoId, ubicacion }),
    })
  );
};

export const getTodayMarcaciones = async (empleadoId) => {
  return parseResponse(
    await fetch(`/api/asistencias/empleado/${empleadoId}/hoy`, {
      headers: getHeaders(),
    })
  );
};

export const registrarPermiso = async ({ empleadoId, fecha }) => {
  return parseResponse(
    await fetch('/api/asistencias/permiso', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ empleadoId, fecha }),
    })
  );
};

