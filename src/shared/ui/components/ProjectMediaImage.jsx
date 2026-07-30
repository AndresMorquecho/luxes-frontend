import React, { useEffect, useState, useRef } from 'react';
import {
  getArchivoMediaSrc,
  getArchivoPreviewFallback,
  resolveEvidenciaSrc,
  fetchMediaBlobUrl,
} from '../../utils/mediaUrl.js';

/**
 * Imagen de proyecto: thumbnail/url primero; base64 solo como último fallback.
 * 
 * Optimizaciones de rendimiento:
 * - Anti-loop: si el src que fallió es el mismo que intentamos, no re-intentar
 * - Dimensiones explícitas para evitar reflow/CLS
 * - React.memo para evitar re-renders innecesarios
 */
export const ProjectMediaImage = React.memo(function ProjectMediaImage({
  archivo,
  evidencia,
  alt = '',
  className = '',
  width,
  height,
  ...props
}) {
  const primary = evidencia != null
    ? resolveEvidenciaSrc(evidencia, { thumbnail: true })
    : getArchivoMediaSrc(archivo);
  const embeddedPreview = evidencia != null
    ? (typeof evidencia === 'object' ? evidencia.previewDataUrl : '')
    : getArchivoPreviewFallback(archivo);
  const rawUrl = typeof archivo === 'object'
    ? archivo?.url
    : (typeof evidencia === 'object' ? evidencia?.url : (typeof archivo === 'string' ? archivo : ''));

  const [src, setSrc] = useState(primary);
  const [fetchAttempted, setFetchAttempted] = useState(false);
  const isMountedRef = useRef(true);
  // Rastrear qué srcs ya fallaron para evitar loops infinitos
  const failedSrcsRef = useRef(new Set());

  useEffect(() => {
    isMountedRef.current = true;
    // Al cambiar de archivo, resetear el estado
    failedSrcsRef.current = new Set();
    setSrc(primary);
    setFetchAttempted(false);
    return () => {
      isMountedRef.current = false;
    };
  }, [primary]);

  const handleError = async () => {
    if (!isMountedRef.current) return;

    // Si ya fallamos con este src, no re-intentar (anti-loop)
    if (failedSrcsRef.current.has(src)) return;
    failedSrcsRef.current.add(src);

    // Fallback 1: original (no thumb)
    if (rawUrl) {
      const full = typeof evidencia === 'object'
        ? resolveEvidenciaSrc(evidencia, { thumbnail: false })
        : getArchivoMediaSrc(archivo, false);
      if (full && !failedSrcsRef.current.has(full)) {
        if (isMountedRef.current) setSrc(full);
        return;
      }
    }

    // Fallback 2: base64 embebido (legado)
    if (embeddedPreview && !failedSrcsRef.current.has(embeddedPreview)) {
      if (isMountedRef.current) setSrc(embeddedPreview);
      return;
    }

    // Fallback 3: fetch blob con JWT (solo una vez)
    if (!fetchAttempted) {
      if (isMountedRef.current) setFetchAttempted(true);
      const blobUrl = await fetchMediaBlobUrl(rawUrl || primary);
      if (blobUrl && isMountedRef.current && !failedSrcsRef.current.has(blobUrl)) {
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
      width={width}
      height={height}
      {...props}
    />
  );
});
