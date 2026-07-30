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
  const isMountedRef = React.useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    setSrc(primary);
    setFetchAttempted(false);
    return () => {
      isMountedRef.current = false;
    };
  }, [primary]);

  const handleError = async () => {
    if (!isMountedRef.current) return;
    if (embeddedPreview && src !== embeddedPreview) {
      if (isMountedRef.current) setSrc(embeddedPreview);
      return;
    }
    if (!fetchAttempted) {
      if (isMountedRef.current) setFetchAttempted(true);
      const blobUrl = await fetchMediaBlobUrl(rawUrl || primary);
      if (blobUrl && isMountedRef.current) {
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
