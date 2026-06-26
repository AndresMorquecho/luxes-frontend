import { useState, useEffect, useRef } from 'react';
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

/**
 * Contenedor de portal estable por instancia, adjunto a document.body.
 * Sin removeChild sincrónico — evita NotFoundError insertBefore en React 19.
 */
function usePortalContainer() {
  const ref = useRef(null);

  if (typeof document !== 'undefined' && !ref.current) {
    const el = document.createElement('div');
    el.setAttribute('data-portal-layer', '');
    document.body.appendChild(el);
    ref.current = el;
  }

  return ref.current;
}

export function ModalPortal({ children }) {
  const container = usePortalContainer();
  if (!container || children == null || children === false) return null;
  return createPortal(children, container);
}

export function OverlayPortal({ children }) {
  const container = usePortalContainer();
  if (!container || children == null || children === false) return null;
  return createPortal(children, container);
}

export function useModalVisibility(isOpen) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) setVisible(true);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen && visible) {
      const frame = requestAnimationFrame(() => setVisible(false));
      return () => cancelAnimationFrame(frame);
    }
  }, [isOpen, visible]);

  return visible;
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
