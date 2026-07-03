import React, { useEffect, useCallback, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { toastStore, toast } from './toastStore.js';
import './Toast.css';

export { toast };

function getToastRoot() {
  if (typeof document === 'undefined') return null;
  return document.getElementById('toast-root');
}

export const ToastContainer = () => {
  const toasts = useSyncExternalStore(
    toastStore.subscribe,
    toastStore.getSnapshot,
    () => []
  );

  const removeToast = useCallback((id) => {
    toastStore.remove(id);
  }, []);

  const root = getToastRoot();
  if (!root) return null;

  return createPortal(
    <div className="toast-container-root" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
      ))}
    </div>,
    root
  );
};

const ToastItem = ({ toast: item, onClose }) => {
  useEffect(() => {
    const timer = window.setTimeout(onClose, item.duration);
    return () => window.clearTimeout(timer);
  }, [item.duration, onClose]);

  const getIcon = () => {
    switch (item.type) {
      case 'success':
        return (
          <svg className="toast-icon text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'error':
        return (
          <svg className="toast-icon text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="toast-icon text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.008v.008H12v-.008z" />
          </svg>
        );
      default:
        return (
          <svg className="toast-icon text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 111.083 1.083l-1.083 1.083A.75.75 0 0011.25 15.75v.75m0-1.5h.008v.008H12v-.008z" />
          </svg>
        );
    }
  };

  return (
    <div className={`toast-item-root toast-type-${item.type} animate-toast-in`}>
      <span className="toast-icon-wrapper">{getIcon()}</span>
      <div className="toast-message-content">{item.message}</div>
      <button className="toast-close-btn" type="button" onClick={onClose} aria-label="Cerrar">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};
