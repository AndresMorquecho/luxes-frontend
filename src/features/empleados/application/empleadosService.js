const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
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
      throw new Error(
        'No se pudo conectar con el servidor. Asegúrate de que el backend esté corriendo (npm run dev en luxes-backend).'
      );
    }
    throw new Error(`Respuesta inválida del servidor (${response.status})`);
  }

  if (!response.ok || !data?.success) {
    throw new Error(data?.error?.message || `Error en la operación (${response.status})`);
  }

  if (data.data && data.message) {
    data.data.message = data.message;
  }

  return data.data;
};

export const DOCUMENTO_TIPOS = [
  { id: 'cedula_frontal', label: 'Cédula (frontal)', required: false },
  { id: 'cedula_posterior', label: 'Cédula (posterior)', required: false },
  { id: 'contrato', label: 'Contrato laboral', required: false },
  { id: 'titulo', label: 'Título profesional', required: false },
  { id: 'certificado', label: 'Certificado / capacitación', required: false },
  { id: 'antecedentes', label: 'Record policial / antecedentes', required: false },
  { id: 'curriculum', label: 'Curriculum vitae', required: false },
  { id: 'planilla_luz', label: 'Planilla de luz', required: false },
  { id: 'otro', label: 'Otro documento', required: false },
];

export const getEmpleados = async () => {
  return parseResponse(await fetch('/api/empleados', { headers: getHeaders() }));
};

export const getEmpleadoById = async (id) => {
  return parseResponse(await fetch(`/api/empleados/${id}`, { headers: getHeaders() }));
};

export const getEmpleadoDocumentos = async (empleadoId) => {
  return parseResponse(await fetch(`/api/empleados/${empleadoId}/documentos`, { headers: getHeaders() }));
};

export const uploadEmpleadoDocumento = async (empleadoId, { tipo, nombre, file }) => {
  const formData = new FormData();
  formData.append('tipo', tipo);
  formData.append('nombre', nombre || file.name);
  formData.append('archivo', file);

  const data = await parseResponse(
    await fetch(`/api/empleados/${empleadoId}/documentos`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    })
  );
  return data;
};

export const deleteEmpleadoDocumento = async (empleadoId, documentoId) => {
  await parseResponse(
    await fetch(`/api/empleados/${empleadoId}/documentos/${documentoId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
  );
  return documentoId;
};

export const uploadEmpleadoDocumentos = async (empleadoId, pendingDocs) => {
  const uploaded = [];
  for (const item of pendingDocs) {
    const doc = await uploadEmpleadoDocumento(empleadoId, item);
    uploaded.push(doc);
  }
  return uploaded;
};

export const saveEmpleado = async (empleado) => {
  const payload = {
    nombre: empleado.nombre,
    cedula: empleado.cedula,
    fechaNacimiento: empleado.fechaNacimiento || null,
    cargo: empleado.cargo ?? '',
    departamento: empleado.departamento ?? '',
    telefono: empleado.telefono ?? '',
    correo: empleado.correo ?? '',
    username: empleado.username ?? '',
    contraseña: empleado.contraseña ?? '123456',
    rol: empleado.rol ?? '',
    roleId: empleado.roleId ?? '',
    cuentaBanco: empleado.cuentaBanco ?? '',
    banco: empleado.banco ?? '',
    tipoContrato: empleado.tipoContrato ?? 'Fijo',
    tieneContrato: empleado.tieneContrato ?? true,
    sueldoDiario: Number(empleado.sueldoDiario) || 0,
    decimoTerceroValor: empleado.decimoTerceroValor !== undefined && empleado.decimoTerceroValor !== null && empleado.decimoTerceroValor !== '' ? Number(empleado.decimoTerceroValor) : null,
    decimoCuartoValor: empleado.decimoCuartoValor !== undefined && empleado.decimoCuartoValor !== null && empleado.decimoCuartoValor !== '' ? Number(empleado.decimoCuartoValor) : null,
    iessValor: empleado.iessValor !== undefined && empleado.iessValor !== null && empleado.iessValor !== '' ? Number(empleado.iessValor) : null,
    direccion: empleado.direccion ?? '',
    foto: empleado.foto ?? '',
    horaEntrada: empleado.horaEntrada || '08:00',
  };

  if (empleado.id) {
    return parseResponse(
      await fetch(`/api/empleados/${empleado.id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      })
    );
  }

  return parseResponse(
    await fetch('/api/empleados', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    })
  );
};

export const deleteEmpleado = async (id) => {
  await parseResponse(
    await fetch(`/api/empleados/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
  );
  return id;
};
