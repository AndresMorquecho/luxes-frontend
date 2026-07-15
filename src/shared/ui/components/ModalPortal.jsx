import { useState, useLayoutEffect } from 'react';
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

/**
 * Portal directo a #modal-root / #overlay-root.
 * No crea hosts intermedios: evita la carrera removeChild de React 19
 * entre el unmount del portal y el cleanup de un contenedor dinámico.
 */
export function ModalPortal({ open = true, children }) {
  const root = getModalRoot();
  if (!root || !open || children == null || children === false) return null;
  return createPortal(children, root);
}

export function OverlayPortal({ open = true, children }) {
  const root = getOverlayRoot();
  if (!root || !open || children == null || children === false) return null;
  return createPortal(children, root);
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
