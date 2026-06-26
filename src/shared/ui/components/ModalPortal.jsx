import { useState, useEffect } from 'react';
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
 * Mantiene el portal montado un tick después de open=false
 * para que React termine el commit antes de desmontar.
 */
function useDeferredUnmount(isOpen) {
  const [mounted, setMounted] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      return undefined;
    }
    if (!mounted) return undefined;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setMounted(false));
    });
    return () => cancelAnimationFrame(id);
  }, [isOpen, mounted]);

  return mounted;
}

export function ModalPortal({ open = true, children }) {
  const mounted = useDeferredUnmount(open);
  const root = getModalRoot();

  if (!root || !mounted || children == null || children === false) return null;
  return createPortal(children, root);
}

export function OverlayPortal({ open = true, children }) {
  const mounted = useDeferredUnmount(open);
  const root = getOverlayRoot();

  if (!root || !mounted || children == null || children === false) return null;
  return createPortal(children, root);
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
