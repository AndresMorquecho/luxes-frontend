import React, { useState, useCallback, useTransition, useRef, useEffect } from 'react';
import {
  getArchivoMediaSrc,
  getArchivoPreviewFallback,
  resolveEvidenciaSrc,
  fetchMediaBlobUrl,
} from '../../utils/mediaUrl.js';

/**
 * Imagen de proyecto — muestra thumbnail optimizado con cadena de fallbacks.
 *
 * OPTIMIZACIONES:
 * - useState para src (confiable, funciona con loading="lazy")
 * - startTransition para updates de fallback (no bloquea scroll ni interacciones)
 * - React.memo para no re-renderizar si las props no cambian
 * - Anti-loop: Set de srcs ya intentados
 * - loading="lazy" + decoding="async" para no bloquear el main thread
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
  const [, startTransition] = useTransition();
  const isMountedRef = useRef(true);
  const failedSrcsRef = useRef(new Set());
  const fetchAttemptedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Si cambia el archivo (navegación entre proyectos), resetear estado
  useEffect(() => {
    if (primary !== src && !failedSrcsRef.current.has(primary)) {
      failedSrcsRef.current = new Set();
      fetchAttemptedRef.current = false;
      setSrc(primary);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primary]);

  const handleError = useCallback(async () => {
    if (!isMountedRef.current) return;

    // Anti-loop: no reintentar el mismo src
    failedSrcsRef.current.add(src);

    // Fallback 1: URL sin thumbnail (archivo original)
    const fullUrl = typeof evidencia === 'object'
      ? resolveEvidenciaSrc(evidencia, { thumbnail: false })
      : getArchivoMediaSrc(archivo, false);

    if (fullUrl && !failedSrcsRef.current.has(fullUrl)) {
      startTransition(() => setSrc(fullUrl));
      return;
    }

    // Fallback 2: base64 embebido (datos legacy)
    if (embeddedPreview && !failedSrcsRef.current.has(embeddedPreview)) {
      startTransition(() => setSrc(embeddedPreview));
      return;
    }

    // Fallback 3: fetch con JWT (una sola vez, usa caché global)
    if (!fetchAttemptedRef.current) {
      fetchAttemptedRef.current = true;
      const blobUrl = await fetchMediaBlobUrl(rawUrl || primary);
      if (blobUrl && isMountedRef.current && !failedSrcsRef.current.has(blobUrl)) {
        startTransition(() => setSrc(blobUrl));
      }
    }
  }, [src, archivo, evidencia, embeddedPreview, rawUrl, primary]);

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
