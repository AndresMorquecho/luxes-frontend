import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

function getOrCreateRoot(id) {
  if (typeof document === 'undefined') return null;

  let root = document.getElementById(id);
  if (!root) {
    root = document.createElement('div');
    root.id = id;
    document.body.appendChild(root);
  }
  return root;
}

export function getModalRoot() {
  return getOrCreateRoot('modal-root');
}

export function getOverlayRoot() {
  return getOrCreateRoot('overlay-root');
}

function usePortalRoot(getRoot) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return getRoot();
}

export function ModalPortal({ children }) {
  const root = usePortalRoot(getModalRoot);
  if (!root || children == null || children === false) return null;
  return createPortal(children, root);
}

export function OverlayPortal({ children }) {
  const root = usePortalRoot(getOverlayRoot);
  if (!root || children == null || children === false) return null;
  return createPortal(children, root);
}

/** Cierra en el siguiente frame de pintura para no pelear con React 19 al desmontar portales */
export function deferClose(callback) {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      callback();
    });
  });
}
