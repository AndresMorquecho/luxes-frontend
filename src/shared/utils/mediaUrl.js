/**
 * Rutas de medios de proyecto.
 * Preferir /uploads o thumbnails; previewDataUrl (base64) solo como fallback legado.
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
  return `/api/proyectos/media/thumbnail?url=${encodeURIComponent(resolved)}`;
}

/** URL o miniatura optimizada para un archivo de diseño en tableros. */
export function getArchivoMediaSrc(archivo, isThumbnail = true) {
  if (!archivo) return '';
  let rawUrl = '';
  if (typeof archivo === 'string') rawUrl = archivo;
  else if (archivo.url) rawUrl = archivo.url;
  else if (archivo.previewDataUrl) return archivo.previewDataUrl;

  const resolved = resolveMediaUrl(rawUrl);
  if (!resolved) {
    if (typeof archivo === 'object' && archivo.previewDataUrl) return archivo.previewDataUrl;
    return '';
  }
  if (isThumbnail) return getThumbnailMediaUrl(resolved);
  return resolved;
}

/**
 * URL para evidencia de instalación.
 * Prioriza url/uploads; previewDataUrl solo si no hay url (legado).
 * @param {object|string} item
 * @param {{ thumbnail?: boolean }} [opts]
 */
export function resolveEvidenciaSrc(item, opts = {}) {
  const { thumbnail = false } = opts;
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
    if (item.startsWith('/')) {
      const resolved = resolveMediaUrl(item);
      return thumbnail ? getThumbnailMediaUrl(resolved) : resolved;
    }
    if (item.length > 80) return `data:image/jpeg;base64,${item}`;
    return item;
  }
  if (item.url) {
    const resolved = resolveMediaUrl(item.url);
    return thumbnail ? getThumbnailMediaUrl(resolved) : resolved;
  }
  if (item.previewDataUrl) return item.previewDataUrl;
  return '';
}

export function getArchivoPreviewFallback(archivo) {
  if (!archivo || typeof archivo === 'string') return '';
  return archivo.previewDataUrl || '';
}

/** Caché global en memoria: cacheKey → blobUrl */
const _blobUrlCache = new Map();
/** Deduplicación de fetches concurrentes para la misma URL */
const _blobFetchInFlight = new Map();

/** Descarga con JWT (fallback si /uploads no está disponible).
 *  Usa caché en memoria para evitar múltiples descargas del mismo archivo. */
export async function fetchMediaBlobUrl(url) {
  if (!url) return null;

  // Retornar desde caché si ya fue descargado
  const cacheKey = String(url);
  if (_blobUrlCache.has(cacheKey)) {
    return _blobUrlCache.get(cacheKey);
  }

  // Deduplicar: si ya hay un fetch en vuelo para esta URL, esperar al mismo promise
  if (_blobFetchInFlight.has(cacheKey)) {
    return _blobFetchInFlight.get(cacheKey);
  }

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

  const fetchPromise = (async () => {
    for (const candidate of candidates) {
      try {
        const res = await fetch(candidate, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) continue;
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        _blobUrlCache.set(cacheKey, blobUrl);
        return blobUrl;
      } catch {
        /* siguiente candidato */
      }
    }
    // Guardar null en caché para evitar reintentar descargas de URLs inexistentes (404)
    _blobUrlCache.set(cacheKey, null);
    return null;
  })();

  _blobFetchInFlight.set(cacheKey, fetchPromise);
  try {
    const result = await fetchPromise;
    return result;
  } finally {
    _blobFetchInFlight.delete(cacheKey);
  }
}
