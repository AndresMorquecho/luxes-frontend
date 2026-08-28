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

export const registrarAsistencia = async ({ empleadoId, ubicacion, omitirAlmuerzo = false, tipo }) => {
  return parseResponse(
    await fetch('/api/asistencias/registrar', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ empleadoId, ubicacion, omitirAlmuerzo, tipo }),
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

export const eliminarPermiso = async ({ empleadoId, fecha }) => {
  return parseResponse(
    await fetch('/api/asistencias/permiso', {
      method: 'DELETE',
      headers: getHeaders(),
      body: JSON.stringify({ empleadoId, fecha }),
    })
  );
};

export const getHorarioDelDia = async (fecha) => {
  const q = fecha ? `?fecha=${fecha}` : '';
  return parseResponse(
    await fetch(`/api/asistencias/horario${q}`, { headers: getHeaders() })
  );
};

export const getHorarioConfig = async () => {
  return parseResponse(
    await fetch('/api/asistencias/horario-config', { headers: getHeaders() })
  );
};

export const saveHorarioConfig = async (config) => {
  return parseResponse(
    await fetch('/api/asistencias/horario-config', {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(config),
    })
  );
};

export const getAutoAsistenciaStatus = async (empleadoId) => {
  return parseResponse(
    await fetch(`/api/asistencias/empleado/${empleadoId}/auto-asistencia`, {
      headers: getHeaders(),
    })
  );
};

export const toggleAutoAsistenciaStatus = async (empleadoId, autoAsistencia) => {
  return parseResponse(
    await fetch(`/api/asistencias/empleado/${empleadoId}/auto-asistencia`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ autoAsistencia }),
    })
  );
};

export const adminEditarONuevaMarcacion = async ({ asistenciaId, empleadoId, tipo, fechaHora, eliminarMultaAsociada }) => {
  return parseResponse(
    await fetch('/api/asistencias/manual-edit', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ asistenciaId, empleadoId, tipo, fechaHora, eliminarMultaAsociada }),
    })
  );
};

export const eliminarMarcacion = async (asistenciaId) => {
  return parseResponse(
    await fetch(`/api/asistencias/${asistenciaId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
  );
};


