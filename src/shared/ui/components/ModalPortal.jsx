import { useState, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

function getRoot(id) {
  if (typeof document === 'undefined') return null;
  return document.getElementById(id);
}

export function getModalRoot() {
  return getRoot('modal-root');
}

export function getOverlayRoot() {
  return getRoot('overlay-root');
}

/**
 * Contenedor DOM aislado por instancia. El cleanup es síncrono en useLayoutEffect
 * (sin requestAnimationFrame) para no competir con el unmount del portal de React.
 */
function usePortalContainer(rootId) {
  const containerRef = useRef(null);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    const root = getRoot(rootId);
    if (!root) return undefined;

    const el = document.createElement('div');
    el.dataset.portalHost = 'true';
    root.appendChild(el);
    containerRef.current = el;
    setReady(true);

    return () => {
      if (el.parentNode === root) {
        root.removeChild(el);
      }
      containerRef.current = null;
    };
  }, [rootId]);

  return ready ? containerRef.current : null;
}

/**
 * Retraso opcional para animaciones de salida (usar fuera de ModalPortal, no dentro).
 */
export function useModalVisibility(isOpen) {
  const [visible, setVisible] = useState(isOpen);

  useLayoutEffect(() => {
    if (isOpen) {
      setVisible(true);
      return undefined;
    }
    const id = window.setTimeout(() => setVisible(false), 0);
    return () => window.clearTimeout(id);
  }, [isOpen]);

  return visible;
}

export function ModalPortal({ open = true, children }) {
  const container = usePortalContainer('modal-root');

  if (!container || !open || children == null || children === false) return null;
  return createPortal(children, container);
}

export function OverlayPortal({ open = true, children }) {
  const container = usePortalContainer('overlay-root');

  if (!container || !open || children == null || children === false) return null;
  return createPortal(children, container);
}

/**
 * Diferir cierre/navegación hasta después del commit de React.
 */
export function deferClose(callback) {
  if (typeof callback !== 'function') return;
  window.setTimeout(() => {
    callback();
  }, 0);
}
