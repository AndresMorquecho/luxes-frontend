const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    Authorization: token ? `Bearer ${token}` : '',
  };
};

// ─── Config consolidada (pública) ─────────────────────────────────────────────

export async function getLandingConfig() {
  const response = await fetch('/api/landing');
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al obtener configuración del landing');
  }
  return data.data ?? {};
}

// ─── Imágenes hero (secciones fijas) ──────────────────────────────────────────

export async function getLandingImageOverrides() {
  const config = await getLandingConfig();
  return config.imageOverrides ?? {};
}

export async function uploadLandingImage(section, itemId, file) {
  const formData = new FormData();
  formData.append('section', section);
  formData.append('itemId', itemId);
  formData.append('image', file);

  const response = await fetch('/api/landing/images', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al subir la imagen');
  }

  return data.data;
}

export async function resetLandingImage(section, itemId) {
  const response = await fetch(`/api/landing/images/${section}/${itemId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al restaurar la imagen');
  }

  return data.data;
}

// ─── WhatsApp Config ──────────────────────────────────────────────────────────

export async function getWhatsappConfig() {
  const response = await fetch('/api/landing/whatsapp');
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al obtener config de WhatsApp');
  }
  return data.data;
}

export async function updateWhatsappConfig(phone, message) {
  const response = await fetch('/api/landing/whatsapp', {
    method: 'PUT',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, message }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al guardar config de WhatsApp');
  }
  return data.data;
}

// ─── Redes Sociales ───────────────────────────────────────────────────────────

export async function getSocialConfig() {
  const response = await fetch('/api/landing/social');
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al obtener redes sociales');
  }
  return data.data;
}

export async function updateSocialConfig(facebook, instagram, tiktok) {
  const response = await fetch('/api/landing/social', {
    method: 'PUT',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ facebook, instagram, tiktok }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al guardar redes sociales');
  }
  return data.data;
}

// ─── CRUD Categorías ──────────────────────────────────────────────────────────

export async function getCategories() {
  const response = await fetch('/api/landing/categories');
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al obtener categorías');
  }
  return data.data ?? [];
}

export async function createCategory({ name, slug, order, active }) {
  const response = await fetch('/api/landing/categories', {
    method: 'POST',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, slug, order, active }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al crear categoría');
  }
  return data.data;
}

export async function updateCategory(id, { name, slug, order, active }) {
  const response = await fetch(`/api/landing/categories/${id}`, {
    method: 'PUT',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, slug, order, active }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al actualizar categoría');
  }
  return data.data;
}

export async function deleteCategory(id) {
  const response = await fetch(`/api/landing/categories/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al eliminar categoría');
  }
  return data.data;
}

// ─── Imágenes de Categoría ────────────────────────────────────────────────────

export async function addCategoryImage(categoryId, file, { title = '', description = '', tags = [] } = {}) {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('title', title);
  formData.append('description', description);
  formData.append('tags', JSON.stringify(tags));

  const response = await fetch(`/api/landing/categories/${categoryId}/images`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al subir imagen');
  }
  return data.data;
}

export async function updateCategoryImage(imageId, { title, description, tags }) {
  const response = await fetch(`/api/landing/categories/images/${imageId}`, {
    method: 'PATCH',
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description, tags }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al actualizar imagen');
  }
  return data.data;
}

export async function deleteCategoryImage(imageId) {
  const response = await fetch(`/api/landing/categories/images/${imageId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'Error al eliminar imagen');
  }
  return data.data;
}
