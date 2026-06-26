import { useState, useEffect, useRef } from 'react';
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
 * Contenedor DOM propio por instancia de portal.
 * Evita insertBefore cuando varios portales comparten modal-root/overlay-root.
 */
function usePortalContainer(rootId) {
  const containerRef = useRef(null);

  if (!containerRef.current && typeof document !== 'undefined') {
    containerRef.current = document.createElement('div');
    containerRef.current.dataset.portalHost = 'true';
  }

  useEffect(() => {
    const root = getRoot(rootId);
    const container = containerRef.current;
    if (!root || !container) return undefined;

    root.appendChild(container);
    return () => {
      if (container.parentNode === root) {
        root.removeChild(container);
      }
    };
  }, [rootId]);

  return containerRef.current;
}

function useDeferredUnmount(isOpen) {
  const [mounted, setMounted] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      return undefined;
    }
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setMounted(false));
    });
    return () => cancelAnimationFrame(id);
  }, [isOpen]);

  return mounted;
}

export function ModalPortal({ open = true, children }) {
  const mounted = useDeferredUnmount(open);
  const container = usePortalContainer('modal-root');

  if (!container || !mounted || children == null || children === false) return null;
  return createPortal(children, container);
}

export function OverlayPortal({ open = true, children }) {
  const mounted = useDeferredUnmount(open);
  const container = usePortalContainer('overlay-root');

  if (!container || !mounted || children == null || children === false) return null;
  return createPortal(children, container);
}

export function useModalVisibility(isOpen) {
  return useDeferredUnmount(isOpen);
}

/**
 * Diferir cierre/navegación/toasts hasta después del commit de React.
 */
export function deferClose(callback) {
  if (typeof callback !== 'function') return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      callback();
    });
  });
}
