/**
 * Rutas de medios de proyecto ultra-robustas.
 * Mapea cualquier variante de URL (relativa, absoluta, /uploads, /api/proyectos)
 * al endpoint proxied de la API: /api/proyectos/:id/archivos/:filename (?thumb=1)
 */

function pathBasename(pathStr) {
  if (!pathStr || typeof pathStr !== 'string') return '';
  const parts = pathStr.split(/[/\\]/);
  return parts[parts.length - 1].split('?')[0].split('#')[0];
}

function extractProyectoAndFilename(str, fallbackProyectoId = '') {
  if (!str || typeof str !== 'string') return { proyectoId: fallbackProyectoId, filename: '' };
  let cleaned = str.trim();

  if (cleaned.startsWith('data:') || cleaned.startsWith('blob:')) {
    return { proyectoId: '', filename: '', isDataOrBlob: true, raw: cleaned };
  }

  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    try {
      cleaned = new URL(cleaned).pathname;
    } catch {
      /* ignore */
    }
  }

  cleaned = cleaned.replace(/^\/+/, '');

  if (cleaned.startsWith('uploads/proyectos/')) {
    const parts = cleaned.split('/');
    if (parts.length >= 4) {
      return { proyectoId: parts[2], filename: parts.slice(3).join('/') };
    }
  }

  if (cleaned.startsWith('api/proyectos/') && cleaned.includes('/archivos/')) {
    const match = cleaned.match(/^api\/proyectos\/([^/]+)\/archivos\/([^/?#]+)/);
    if (match) {
      return { proyectoId: match[1], filename: decodeURIComponent(match[2]) };
    }
  }

  const parts = cleaned.split('/');
  if (parts.length === 2 && (parts[0].startsWith('PROY-') || parts[0].length > 3)) {
    return { proyectoId: parts[0], filename: parts[1] };
  }

  const base = pathBasename(cleaned);
  return { proyectoId: fallbackProyectoId, filename: base };
}

export function uploadsProyectoUrl(proyectoId, filename) {
  if (!proyectoId || !filename) return '';
  return `/api/proyectos/${proyectoId}/archivos/${encodeURIComponent(filename)}`;
}

export function apiArchivoToUploadsUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const { proyectoId, filename, isDataOrBlob, raw } = extractProyectoAndFilename(url);
  if (isDataOrBlob) return raw;
  if (proyectoId && filename) {
    return `/api/proyectos/${proyectoId}/archivos/${encodeURIComponent(filename)}`;
  }
  return url;
}

export function resolveMediaUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const { proyectoId, filename, isDataOrBlob, raw } = extractProyectoAndFilename(url);
  if (isDataOrBlob) return raw;
  if (proyectoId && filename) {
    return `/api/proyectos/${proyectoId}/archivos/${encodeURIComponent(filename)}`;
  }
  return url.trim();
}

export function getThumbnailMediaUrl(url, proyectoIdHint = '') {
  if (!url || typeof url !== 'string') return '';
  const { proyectoId, filename, isDataOrBlob, raw } = extractProyectoAndFilename(url, proyectoIdHint);
  if (isDataOrBlob) return raw;

  const targetPid = proyectoId || proyectoIdHint;
  if (targetPid && filename) {
    return `/api/proyectos/${targetPid}/archivos/${encodeURIComponent(filename)}?thumb=1`;
  }

  return `/api/proyectos/media/thumbnail?url=${encodeURIComponent(url)}`;
}

export function getArchivoMediaSrc(archivo, isThumbnail = true) {
  if (!archivo) return '';
  let rawUrl = '';
  let proyectoId = '';

  if (typeof archivo === 'string') {
    rawUrl = archivo;
  } else if (typeof archivo === 'object') {
    rawUrl = archivo.url || archivo.path || archivo.nombre || archivo.name || '';
    proyectoId = archivo.proyectoId || archivo.idProyecto || '';
    if (!rawUrl && archivo.previewDataUrl) return archivo.previewDataUrl;
  }

  if (!rawUrl) return '';

  const { isDataOrBlob, raw } = extractProyectoAndFilename(rawUrl, proyectoId);
  if (isDataOrBlob) return raw;

  if (isThumbnail) {
    return getThumbnailMediaUrl(rawUrl, proyectoId);
  }

  const { proyectoId: pId, filename } = extractProyectoAndFilename(rawUrl, proyectoId);
  const targetPid = pId || proyectoId;
  if (targetPid && filename) {
    return `/api/proyectos/${targetPid}/archivos/${encodeURIComponent(filename)}`;
  }

  return resolveMediaUrl(rawUrl);
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

  if (thumbnail) {
    return getThumbnailMediaUrl(rawUrl, proyectoId);
  }
  return getArchivoMediaSrc(item, false);
}

export function getArchivoPreviewFallback(archivo) {
  if (!archivo) return '';
  if (typeof archivo === 'object' && archivo.previewDataUrl) {
    return archivo.previewDataUrl;
  }
  return '';
}
