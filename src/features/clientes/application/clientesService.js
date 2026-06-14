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
      throw new Error(
        'No se pudo conectar con el servidor. Asegúrate de que el backend esté corriendo (npm run dev en luxes-backend).'
      );
    }
    throw new Error(`Respuesta inválida del servidor (${response.status})`);
  }

  if (!response.ok || !data?.success) {
    throw new Error(data?.error?.message || `Error en la operación (${response.status})`);
  }

  return data.data;
};

export async function getClientes() {
  return parseResponse(await fetch('/api/clientes', { headers: getHeaders() }));
}

export async function saveCliente(cliente) {
  const isEdit = Boolean(cliente.id);
  const url = isEdit ? `/api/clientes/${cliente.id}` : '/api/clientes';
  const method = isEdit ? 'PUT' : 'POST';

  return parseResponse(
    await fetch(url, {
      method,
      headers: getHeaders(),
      body: JSON.stringify(cliente),
    })
  );
}

export async function deleteCliente(id) {
  return parseResponse(
    await fetch(`/api/clientes/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    })
  );
}
