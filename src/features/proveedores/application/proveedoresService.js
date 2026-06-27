const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };
};

export async function getProveedores() {
  const res = await fetch('/api/compras/proveedores', { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al obtener proveedores');
  return data.data.map(p => ({
    ...p,
    cedulaRuc: p.ruc || '',
  }));
}

export async function saveProveedor(proveedor) {
  const isEdit = !!proveedor.id;
  const url = isEdit ? `/api/compras/proveedores/${proveedor.id}` : '/api/compras/proveedores';
  const method = isEdit ? 'PUT' : 'POST';

  const { cedulaRuc, ...rest } = proveedor;
  const payload = {
    ...rest,
    ruc: cedulaRuc,
  };

  const res = await fetch(url, {
    method,
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al guardar proveedor');

  const saved = data.data;
  return {
    ...saved,
    cedulaRuc: saved.ruc || '',
  };
}

export async function deleteProveedor(id) {
  const res = await fetch(`/api/compras/proveedores/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.error?.message || 'Error al eliminar proveedor');
  return data.data;
}
