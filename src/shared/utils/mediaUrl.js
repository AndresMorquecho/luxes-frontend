/**
 * Rutas de medios de proyecto.
 * Las etiquetas <img> no envían JWT: usar /uploads (público) o previewDataUrl embebido.
 */

export function uploadsProyectoUrl(proyectoId, filename) {
  if (!proyectoId || !filename) return '';
  return `/uploads/proyectos/${proyectoId}/${filename}`;
}

/** Convierte /api/proyectos/.../archivos/... → /uploads/proyectos/... */
export function apiArchivoToUploadsUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const match = url.trim().match(/^\/api\/proyectos\/([^/]+)\/archivos\/([^/?#]+)/);
  if (!match) return '';
  return uploadsProyectoUrl(match[1], decodeURIComponent(match[2]));
}

export function resolveMediaUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();
  if (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://')
  ) {
    return trimmed;
  }
  const fromApi = apiArchivoToUploadsUrl(trimmed);
  if (fromApi) return fromApi;
  return trimmed;
}

export function getThumbnailMediaUrl(url) {
  const resolved = resolveMediaUrl(url);
  if (!resolved || resolved.startsWith('data:') || resolved.startsWith('blob:')) return resolved;
  if (resolved.startsWith('http://') || resolved.startsWith('https://')) return resolved;
  return `/api/media/thumbnail?url=${encodeURIComponent(resolved)}`;
}

/** URL o miniatura optimizada para un archivo de diseño en tableros. */
export function getArchivoMediaSrc(archivo, isThumbnail = true) {
  if (!archivo) return '';
  let rawUrl = '';
  if (typeof archivo === 'string') rawUrl = archivo;
  else if (archivo.url) rawUrl = archivo.url;
  else if (archivo.previewDataUrl) return archivo.previewDataUrl;

  const resolved = resolveMediaUrl(rawUrl);
  if (!resolved) return '';
  if (isThumbnail) return getThumbnailMediaUrl(resolved);
  return resolved;
}

/** URL o data-URI para evidencia de instalación (base64 legado, objeto o ruta). */
export function resolveEvidenciaSrc(item) {
  if (!item) return '';
  if (typeof item === 'string') {
    if (
      item.startsWith('data:') ||
      item.startsWith('blob:') ||
      item.startsWith('http://') ||
      item.startsWith('https://')
    ) {
      return item;
    }
    if (item.startsWith('/')) return resolveMediaUrl(item);
    if (item.length > 80) return `data:image/jpeg;base64,${item}`;
    return item;
  }
  if (item.previewDataUrl) return item.previewDataUrl;
  if (item.url) return resolveMediaUrl(item.url);
  return '';
}

export function getArchivoPreviewFallback(archivo) {
  if (!archivo || typeof archivo === 'string') return '';
  return archivo.previewDataUrl || '';
}

/** Descarga con JWT (fallback si /uploads no está disponible). */
export async function fetchMediaBlobUrl(url) {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  const uploadsUrl = resolveMediaUrl(url);
  const candidates = [];
  if (uploadsUrl) candidates.push(uploadsUrl);
  const apiFromUploads = uploadsUrl?.match(/^\/uploads\/proyectos\/([^/]+)\/([^/?#]+)/);
  if (apiFromUploads) {
    candidates.push(
      `/api/proyectos/${apiFromUploads[1]}/archivos/${encodeURIComponent(apiFromUploads[2])}`,
    );
  }
  if (url?.startsWith('/api/')) candidates.push(url);

  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) continue;
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    } catch {
      /* siguiente candidato */
    }
  }
  return null;
}
