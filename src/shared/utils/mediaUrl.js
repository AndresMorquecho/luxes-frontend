/**
 * mediaUrl.js — Rutas de medios de proyecto.
 *
 * ESTRATEGIA FINAL:
 * Las imágenes de proyecto viven en /uploads/proyectos/:id/:filename en el backend.
 * Nginx ya proxia /uploads/ al backend Express.
 * Para miniaturas, añadimos ?thumb=1 a esa misma URL /uploads/...
 * El backend intercepta ?thumb=1 antes de express.static y sirve WebP de 15 KB.
 *
 * Esto NO depende de ninguna ruta /api/... especial, usa el canal /uploads/ que
 * ya funciona 100% en producción.
 */

function pathBasename(str) {
  if (!str) return '';
  return str.split(/[/\\]/).pop().split('?')[0].split('#')[0];
}

/**
 * Extrae la ruta /uploads/... de cualquier variante de URL:
 * - /uploads/proyectos/PROY-003/file.jpg
 * - https://luxespublicidad.tech/uploads/proyectos/PROY-003/file.jpg
 * - /api/proyectos/PROY-003/archivos/file.jpg
 * - file.jpg  (solo nombre, necesita proyectoId hint)
 */
function toUploadsPath(url, proyectoIdHint = '') {
  if (!url || typeof url !== 'string') return '';
  let s = url.trim();

  if (s.startsWith('data:') || s.startsWith('blob:')) return s;

  // URL absoluta — extraer pathname
  if (s.startsWith('http://') || s.startsWith('https://')) {
    try { s = new URL(s).pathname; } catch { return s; }
  }

  // Ya es /uploads/...
  if (s.startsWith('/uploads/')) return s;

  // /api/proyectos/:id/archivos/:filename → /uploads/proyectos/:id/:filename
  const apiMatch = s.match(/^\/api\/proyectos\/([^/]+)\/archivos\/([^/?#]+)/);
  if (apiMatch) {
    return `/uploads/proyectos/${apiMatch[1]}/${decodeURIComponent(apiMatch[2])}`;
  }

  // uploads/proyectos/... (sin slash inicial)
  if (s.startsWith('uploads/proyectos/')) return '/' + s;

  // :id/:filename
  const parts = s.replace(/^\//, '').split('/');
  if (parts.length === 2 && parts[0].length > 3) {
    return `/uploads/proyectos/${parts[0]}/${parts[1]}`;
  }

  // Solo filename — necesita proyectoIdHint
  const base = pathBasename(s);
  if (base && proyectoIdHint) {
    return `/uploads/proyectos/${proyectoIdHint}/${base}`;
  }

  return s;
}

export function uploadsProyectoUrl(proyectoId, filename) {
  if (!proyectoId || !filename) return '';
  return `/uploads/proyectos/${proyectoId}/${filename}`;
}

export function apiArchivoToUploadsUrl(url) {
  return toUploadsPath(url);
}

export function resolveMediaUrl(url, proyectoIdHint = '') {
  if (!url || typeof url !== 'string') return '';
  const s = url.trim();
  if (s.startsWith('data:') || s.startsWith('blob:')) return s;
  return toUploadsPath(s, proyectoIdHint) || s;
}

export function getThumbnailMediaUrl(url, proyectoIdHint = '') {
  if (!url || typeof url !== 'string') return '';
  const s = url.trim();
  if (s.startsWith('data:') || s.startsWith('blob:')) return s;

  const uploadsPath = toUploadsPath(s, proyectoIdHint);
  if (!uploadsPath || uploadsPath.startsWith('data:') || uploadsPath.startsWith('blob:')) {
    return uploadsPath || s;
  }

  // Añadir ?thumb=1 a la URL /uploads/... que YA está proxied por Nginx
  return `${uploadsPath}?thumb=1`;
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

  if (isThumbnail) return getThumbnailMediaUrl(rawUrl, proyectoId);

  return resolveMediaUrl(rawUrl, proyectoId);
}

export function resolveEvidenciaSrc(item, opts = {}) {
  const { thumbnail = false } = opts;
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

  if (thumbnail) return getThumbnailMediaUrl(rawUrl, proyectoId);
  return resolveMediaUrl(rawUrl, proyectoId);
}

export function getArchivoPreviewFallback(archivo) {
  if (!archivo || typeof archivo !== 'object') return '';
  return archivo.previewDataUrl || '';
}
