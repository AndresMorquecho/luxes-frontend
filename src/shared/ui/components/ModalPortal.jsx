import { useState, useEffect, useLayoutEffect, useRef } from 'react';
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
 * Contenedor DOM propio por instancia de portal, montado antes del primer paint.
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
      const remove = () => {
        if (el.parentNode === root) {
          root.removeChild(el);
        }
        containerRef.current = null;
        setReady(false);
      };
      requestAnimationFrame(() => requestAnimationFrame(remove));
    };
  }, [rootId]);

  return ready ? containerRef.current : null;
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
 * Diferir cierre/navegación hasta después del commit de React.
 */
export function deferClose(callback) {
  if (typeof callback !== 'function') return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      callback();
    });
  });
}
