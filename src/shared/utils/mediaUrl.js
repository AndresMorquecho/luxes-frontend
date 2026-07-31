/**
 * mediaUrl.js — Rutas de medios de proyecto.
 *
 * ESTRATEGIA FINAL SIMPLIFICADA:
 * - Todas las imágenes van por /api/proyectos/:id/archivos/:filename
 * - Esta ruta está garantizada en el backend Express y proxiada por Nginx/Dockploy
 * - SIN intentos de thumbnail por ahora (los archivos están cacheados en el browser)
 * - onError en ProjectMediaImage maneja el fallback sin re-renders de React
 */

function pathBasename(str) {
  if (!str) return '';
  return str.split(/[/\\]/).pop().split('?')[0].split('#')[0];
}

/**
 * Extrae proyectoId y filename desde cualquier variante de URL.
 */
function extractProyectoAndFilename(url) {
  if (!url || typeof url !== 'string') return null;
  let s = url.trim();

  // /uploads/proyectos/:id/:filename
  const uploadsMatch = s.match(/\/uploads\/proyectos\/([^/]+)\/([^/?#]+)/);
  if (uploadsMatch) {
    return { proyectoId: uploadsMatch[1], filename: uploadsMatch[2] };
  }

  // /api/proyectos/:id/archivos/:filename
  const apiMatch = s.match(/\/api\/proyectos\/([^/]+)\/archivos\/([^/?#]+)/);
  if (apiMatch) {
    return { proyectoId: apiMatch[1], filename: decodeURIComponent(apiMatch[2]) };
  }

  // uploads/proyectos/:id/:filename (sin slash inicial)
  const noSlashMatch = s.match(/^uploads\/proyectos\/([^/]+)\/([^/?#]+)/);
  if (noSlashMatch) {
    return { proyectoId: noSlashMatch[1], filename: noSlashMatch[2] };
  }

  return null;
}

/**
 * Convierte cualquier URL de archivo de proyecto a la ruta /api/ canónica.
 * Esta ruta está garantizada por el backend Express.
 */
function toApiUrl(url, proyectoIdHint = '') {
  if (!url || typeof url !== 'string') return '';
  const s = url.trim();

  if (s.startsWith('data:') || s.startsWith('blob:')) return s;

  // URL absoluta — extraer pathname
  let pathname = s;
  if (s.startsWith('http://') || s.startsWith('https://')) {
    try { pathname = new URL(s).pathname; } catch { return s; }
  }

  const extracted = extractProyectoAndFilename(pathname);
  if (extracted) {
    return `/api/proyectos/${extracted.proyectoId}/archivos/${encodeURIComponent(extracted.filename)}`;
  }

  // Solo filename con proyectoIdHint
  const base = pathBasename(pathname);
  if (base && proyectoIdHint) {
    return `/api/proyectos/${proyectoIdHint}/archivos/${encodeURIComponent(base)}`;
  }

  return pathname;
}

export function resolveMediaUrl(url, proyectoIdHint = '') {
  if (!url || typeof url !== 'string') return '';
  const s = url.trim();
  if (s.startsWith('data:') || s.startsWith('blob:')) return s;
  return toApiUrl(s, proyectoIdHint) || s;
}

/**
 * URL de miniatura — por ahora igual a la URL completa.
 * Las imágenes ya están cacheadas en el browser, así que no hay penalización de red.
 * En el futuro se puede añadir ?thumb=1 cuando el backend lo soporte correctamente.
 */
export function getThumbnailMediaUrl(url, proyectoIdHint = '') {
  return resolveMediaUrl(url, proyectoIdHint);
}

export function getArchivoMediaSrc(archivo, isThumbnail = true) {
  if (!archivo) return '';
  let rawUrl = '';
  let proyectoId = '';

  if (typeof archivo === 'string') {
    rawUrl = archivo;
  } else if (typeof archivo === 'object') {
    rawUrl = archivo.url || archivo.path || '';
    proyectoId = archivo.proyectoId || archivo.idProyecto || '';
    if (!rawUrl && archivo.previewDataUrl) return archivo.previewDataUrl;
  }

  if (!rawUrl) return '';
  if (rawUrl.startsWith('data:') || rawUrl.startsWith('blob:')) return rawUrl;

  // thumbnail y full usan la misma URL — el browser ya las tiene cacheadas
  return toApiUrl(rawUrl, proyectoId) || rawUrl;
}

export function resolveEvidenciaSrc(item, opts = {}) {
  if (!item) return '';
  let rawUrl = '';
  let proyectoId = '';

  if (typeof item === 'string') {
    rawUrl = item;
  } else if (typeof item === 'object') {
    rawUrl = item.url || item.path || item.previewDataUrl || '';
    proyectoId = item.proyectoId || item.idProyecto || '';
  }

  if (!rawUrl) return '';
  if (rawUrl.startsWith('data:') || rawUrl.startsWith('blob:')) return rawUrl;

  return toApiUrl(rawUrl, proyectoId) || rawUrl;
}

export function getArchivoPreviewFallback(archivo) {
  if (!archivo || typeof archivo !== 'object') return '';
  return archivo.previewDataUrl || '';
}

export function uploadsProyectoUrl(proyectoId, filename) {
  if (!proyectoId || !filename) return '';
  return `/api/proyectos/${proyectoId}/archivos/${encodeURIComponent(filename)}`;
}

export function apiArchivoToUploadsUrl(url) {
  return resolveMediaUrl(url);
}
