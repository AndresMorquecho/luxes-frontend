import React, { useEffect, useState } from 'react';
import { getArchivoMediaSrc, getArchivoPreviewFallback, resolveEvidenciaSrc } from '../../utils/mediaUrl.js';

/**
 * Imagen de proyecto con fallback a preview embebido si el archivo en disco no está disponible.
 */
export function ProjectMediaImage({
  archivo,
  evidencia,
  alt = '',
  className = '',
  ...props
}) {
  const primary = evidencia != null ? resolveEvidenciaSrc(evidencia) : getArchivoMediaSrc(archivo);
  const fallback = evidencia != null
    ? (typeof evidencia === 'object' ? evidencia.previewDataUrl : '')
    : getArchivoPreviewFallback(archivo);

  const [src, setSrc] = useState(primary);

  useEffect(() => {
    setSrc(primary);
  }, [primary]);

  const handleError = () => {
    if (fallback && src !== fallback) {
      setSrc(fallback);
    }
  };

  if (!src) return null;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={handleError}
      {...props}
    />
  );
}
