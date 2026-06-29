const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };
};

export async function getClientes() {
  const res = await fetch('/api/clientes', { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al obtener clientes');
  }
  return data.data;
}

export async function saveCliente(cliente) {
  const isEdit = !!cliente.id;
  const url = isEdit ? `/api/clientes/${cliente.id}` : '/api/clientes';
  const method = isEdit ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    headers: getHeaders(),
    body: JSON.stringify(cliente),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al guardar cliente');
  }
  return data.data;
}

export async function deleteCliente(id) {
  const res = await fetch(`/api/clientes/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al eliminar cliente');
  }
  return id;
}
