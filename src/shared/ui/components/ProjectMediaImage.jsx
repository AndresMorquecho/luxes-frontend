import React, { useEffect, useState } from 'react';
import {
  getArchivoMediaSrc,
  getArchivoPreviewFallback,
  resolveEvidenciaSrc,
  fetchMediaBlobUrl,
} from '../../utils/mediaUrl.js';

/**
 * Imagen de proyecto con fallback: preview embebido → /uploads → fetch autenticado.
 */
export function ProjectMediaImage({
  archivo,
  evidencia,
  alt = '',
  className = '',
  ...props
}) {
  const primary = evidencia != null ? resolveEvidenciaSrc(evidencia) : getArchivoMediaSrc(archivo);
  const embeddedPreview = evidencia != null
    ? (typeof evidencia === 'object' ? evidencia.previewDataUrl : '')
    : getArchivoPreviewFallback(archivo);
  const rawUrl = typeof archivo === 'object' ? archivo?.url : (typeof archivo === 'string' ? archivo : '');

  const [src, setSrc] = useState(primary);
  const [fetchAttempted, setFetchAttempted] = useState(false);

  useEffect(() => {
    setSrc(primary);
    setFetchAttempted(false);
  }, [primary]);

  const handleError = async () => {
    if (embeddedPreview && src !== embeddedPreview) {
      setSrc(embeddedPreview);
      return;
    }
    if (!fetchAttempted) {
      setFetchAttempted(true);
      const blobUrl = await fetchMediaBlobUrl(rawUrl || primary);
      if (blobUrl) {
        setSrc(blobUrl);
      }
    }
  };

  if (!src) return null;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={handleError}
      loading="lazy"
      decoding="async"
      {...props}
    />
  );
}
