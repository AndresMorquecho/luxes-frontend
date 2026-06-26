import { useState, useEffect } from 'react';
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
 * Cada instancia de portal usa su propio nodo DOM dentro de modal-root/overlay-root.
 * Evita NotFoundError insertBefore cuando varios modales comparten el mismo padre (React 19).
 */
function useIsolatedPortalContainer(parentGetter) {
  const [container] = useState(() => {
    if (typeof document === 'undefined') return null;
    const parent = parentGetter();
    if (!parent) return null;
    const el = document.createElement('div');
    el.setAttribute('data-portal-layer', '');
    parent.appendChild(el);
    return el;
  });

  useEffect(() => () => {
    if (container?.parentNode) {
      container.parentNode.removeChild(container);
    }
  }, [container]);

  return container;
}

export function ModalPortal({ children }) {
  const container = useIsolatedPortalContainer(getModalRoot);
  if (!container || children == null || children === false) return null;
  return createPortal(children, container);
}

export function OverlayPortal({ children }) {
  const container = useIsolatedPortalContainer(getOverlayRoot);
  if (!container || children == null || children === false) return null;
  return createPortal(children, container);
}

/** Retraso de desmontaje para animar cierre sin romper el árbol de portales */
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
 * Diferir cierre/navegación hasta después del commit de React.
 * Evita pantalla en blanco por insertBefore al desmontar portales.
 */
export function deferClose(callback) {
  if (typeof callback !== 'function') return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      callback();
    });
  });
}
