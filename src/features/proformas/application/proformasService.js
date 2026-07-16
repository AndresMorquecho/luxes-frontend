const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };
};

export const getProformas = async (filters = {}) => {
  const params = new URLSearchParams();
  
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.search) params.append('search', filters.search);
  if (filters.estado) params.append('estado', filters.estado);
  if (filters.fechaDesde) params.append('fechaDesde', filters.fechaDesde);
  if (filters.fechaHasta) params.append('fechaHasta', filters.fechaHasta);
  if (filters.clienteId) params.append('clienteId', filters.clienteId);
  if (filters.usuario) params.append('usuario', filters.usuario);
  if (filters.conAbonos) params.append('conAbonos', filters.conAbonos);

  const queryString = params.toString();
  const url = `/api/proformas${queryString ? `?${queryString}` : ''}`;
  
  const res = await fetch(url, { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al obtener proformas');
  }
  return data;
};

export const saveProforma = async (proforma) => {
  const isEdit = !!proforma.id;
  const url = isEdit ? `/api/proformas/${proforma.id}` : '/api/proformas';
  const method = isEdit ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    headers: getHeaders(),
    body: JSON.stringify(proforma),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al guardar proforma');
  }
  return data.data;
};

export const deleteProforma = async (id) => {
  const res = await fetch(`/api/proformas/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al eliminar proforma');
  }
  return id;
};

export const updateProformaEstado = async (id, estado, metodoPagoId = null) => {
  const res = await fetch(`/api/proformas/${id}/estado`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ estado, metodoPagoId }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al actualizar estado');
  }
  return data.data;
};

export const getProformaById = async (id) => {
  const res = await fetch(`/api/proformas/${id}`, { headers: getHeaders() });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al obtener proforma');
  }
  return data.data;
};

export const aprobarProforma = async (id, { monto, metodoPagoId, referencia, aplicarIva }) => {
  const res = await fetch(`/api/proformas/${id}/aprobar`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ monto, metodoPagoId, referencia, aplicarIva }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al aprobar proforma');
  }
  return data.data;
};

export const rechazarProforma = async (id) => {
  const res = await fetch(`/api/proformas/${id}/rechazar`, {
    method: 'POST',
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al rechazar proforma');
  }
  return data.data;
};

export const enviarProforma = async (id) => {
  const res = await fetch(`/api/proformas/${id}/enviar`, {
    method: 'POST',
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al enviar proforma');
  }
  return data.data;
};

export const registrarAbonoProforma = async (id, { monto, metodoPagoId, referencia }) => {
  const res = await fetch(`/api/proformas/${id}/abonos`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ monto, metodoPagoId, referencia }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al registrar abono');
  }
  return data.data;
};

export const editarAbonoProforma = async (id, abonoId, { monto, metodoPagoId, referencia }) => {
  const res = await fetch(`/api/proformas/${id}/abonos/${abonoId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ monto, metodoPagoId, referencia }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al editar abono');
  }
  return data.data;
};

export const eliminarAbonoProforma = async (id, abonoId) => {
  const res = await fetch(`/api/proformas/${id}/abonos/${abonoId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al eliminar abono');
  }
  return data.data;
};
