/**
 * Convierte rutas /uploads/proyectos/... a la API (mismo origen, proxy nginx).
 * Las imágenes en <img> no envían JWT; la ruta de archivos es pública con nombre aleatorio.
 */
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
  const match = trimmed.match(/^\/uploads\/proyectos\/([^/]+)\/([^/?#]+)/);
  if (match) {
    return `/api/proyectos/${match[1]}/archivos/${encodeURIComponent(match[2])}`;
  }
  return trimmed;
}

/** URL o data-URI para un archivo de diseño guardado en fase DISEÑO. */
export function getArchivoMediaSrc(archivo) {
  if (!archivo) return '';
  if (typeof archivo === 'string') return resolveMediaUrl(archivo);
  if (archivo.previewDataUrl) return archivo.previewDataUrl;
  if (archivo.url) return resolveMediaUrl(archivo.url);
  return '';
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
