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
    if (response.status === 502 || response.status === 503) {
      throw new Error('No se pudo conectar con el servidor. Asegúrate de que el backend esté corriendo.');
    }
    throw new Error(`Respuesta inválida del servidor (${response.status})`);
  }
  if (!response.ok || !data?.success) {
    throw new Error(data?.error?.message || `Error en la operación (${response.status})`);
  }
  return data.data;
};

export const CATEGORIAS = ['oficina', 'mantenimiento', 'servicios', 'logistica', 'varios'];

export const TIPOS_MANTENIMIENTO = [
  { id: 'cambio_aceite', label: 'Cambio de aceite' },
  { id: 'filtro_aceite', label: 'Filtro de aceite' },
  { id: 'filtro_aire', label: 'Filtro de aire' },
  { id: 'llantas', label: 'Llantas / rotación' },
  { id: 'frenos', label: 'Frenos' },
  { id: 'bateria', label: 'Batería' },
  { id: 'alineacion', label: 'Alineación y balanceo' },
  { id: 'soat', label: 'SOAT' },
  { id: 'matricula', label: 'Matrícula' },
  { id: 'revision_tecnica', label: 'Revisión técnica' },
  { id: 'lavado', label: 'Lavado' },
  { id: 'combustible', label: 'Combustible' },
  { id: 'otro', label: 'Otro' },
];

export const getGastos = async () =>
  parseResponse(await fetch('/api/gastos', { headers: getHeaders() }));

export const saveGasto = async (gasto) => {
  const isEdit = Boolean(gasto.id);
  const url = isEdit ? `/api/gastos/${gasto.id}` : '/api/gastos';
  return parseResponse(
    await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: getHeaders(), body: JSON.stringify(gasto) })
  );
};

export const deleteGasto = async (id) =>
  parseResponse(await fetch(`/api/gastos/${id}`, { method: 'DELETE', headers: getHeaders() }));

export const getVehiculos = async () =>
  parseResponse(await fetch('/api/gastos/vehiculos', { headers: getHeaders() }));

export const saveVehiculo = async (vehiculo) => {
  const isEdit = Boolean(vehiculo.id);
  const url = isEdit ? `/api/gastos/vehiculos/${vehiculo.id}` : '/api/gastos/vehiculos';
  return parseResponse(
    await fetch(url, { method: isEdit ? 'PUT' : 'POST', headers: getHeaders(), body: JSON.stringify(vehiculo) })
  );
};

export const deleteVehiculo = async (id) =>
  parseResponse(await fetch(`/api/gastos/vehiculos/${id}`, { method: 'DELETE', headers: getHeaders() }));

export const saveMantenimiento = async (vehiculoId, mantenimiento) => {
  const isEdit = Boolean(mantenimiento.id);
  const url = isEdit
    ? `/api/gastos/vehiculos/${vehiculoId}/mantenimientos/${mantenimiento.id}`
    : `/api/gastos/vehiculos/${vehiculoId}/mantenimientos`;
  return parseResponse(
    await fetch(url, {
      method: isEdit ? 'PUT' : 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ ...mantenimiento, vehiculoId }),
    })
  );
};

export const deleteMantenimiento = async (id) =>
  parseResponse(await fetch(`/api/gastos/mantenimientos/${id}`, { method: 'DELETE', headers: getHeaders() }));

export const labelTipoMantenimiento = (tipo) =>
  TIPOS_MANTENIMIENTO.find((t) => t.id === tipo)?.label ?? tipo;

export const estadoMantenimiento = (mant, kmActual = 0) => {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  if (mant.fechaProxima) {
    const prox = new Date(`${mant.fechaProxima}T12:00:00`);
    if (prox < hoy) return 'vencido';
    const dias = Math.ceil((prox - hoy) / (1000 * 60 * 60 * 24));
    if (dias <= 30) return 'proximo';
  }
  if (mant.kmProximo != null && kmActual >= mant.kmProximo) return 'vencido';
  if (mant.kmProximo != null && kmActual >= mant.kmProximo - 2000) return 'proximo';
  return 'ok';
};
