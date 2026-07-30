import React, { useEffect, useRef } from 'react';
import {
  getArchivoMediaSrc,
  getArchivoPreviewFallback,
  resolveEvidenciaSrc,
  fetchMediaBlobUrl,
} from '../../utils/mediaUrl.js';

/**
 * Imagen de proyecto optimizada para máximo rendimiento.
 *
 * OPTIMIZACIONES CLAVE:
 * - Usa useRef + DOM directo en vez de useState para cambios de src.
 *   Esto ELIMINA los React Commits por carga de imagen (antes: 1 Commit/imagen).
 * - Anti-loop: Set de srcs fallidos por instancia.
 * - loading="lazy" + decoding="async" para no bloquear el main thread.
 * - width/height obligatorios para evitar reflow/CLS.
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

  const imgRef = useRef(null);
  const isMountedRef = useRef(true);
  const failedSrcsRef = useRef(new Set());
  const fetchAttemptedRef = useRef(false);
  // Guardar primary para detectar cambios de archivo
  const primaryRef = useRef(primary);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!imgRef.current) return;
    // Si cambió el archivo, resetear estado y actualizar src
    if (primary !== primaryRef.current) {
      primaryRef.current = primary;
      failedSrcsRef.current = new Set();
      fetchAttemptedRef.current = false;
    }
    // Actualizar src directamente en el DOM — sin setState, sin React Commit
    if (primary) {
      imgRef.current.src = primary;
    }
  }, [primary]);

  const handleError = async () => {
    const img = imgRef.current;
    if (!img || !isMountedRef.current) return;

    const currentSrc = img.src;

    // Anti-loop: no reintentar src que ya falló
    if (failedSrcsRef.current.has(currentSrc)) return;
    failedSrcsRef.current.add(currentSrc);

    // Fallback 1: URL original (sin thumbnail)
    if (rawUrl) {
      const full = typeof evidencia === 'object'
        ? resolveEvidenciaSrc(evidencia, { thumbnail: false })
        : getArchivoMediaSrc(archivo, false);
      if (full && !failedSrcsRef.current.has(full)) {
        img.src = full; // DOM directo
        return;
      }
    }

    // Fallback 2: base64 embebido (legado)
    if (embeddedPreview && !failedSrcsRef.current.has(embeddedPreview)) {
      img.src = embeddedPreview; // DOM directo
      return;
    }

    // Fallback 3: blob fetch con JWT (solo una vez, usa caché)
    if (!fetchAttemptedRef.current) {
      fetchAttemptedRef.current = true;
      const blobUrl = await fetchMediaBlobUrl(rawUrl || primary);
      if (blobUrl && isMountedRef.current && imgRef.current && !failedSrcsRef.current.has(blobUrl)) {
        imgRef.current.src = blobUrl; // DOM directo
      }
    }
  };

  if (!primary) return null;

  return (
    <img
      ref={imgRef}
      src={primary}
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
