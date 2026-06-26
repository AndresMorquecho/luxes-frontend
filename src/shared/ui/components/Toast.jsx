import React, { useState, useEffect, useCallback } from 'react';
import { OverlayPortal, deferClose } from './ModalPortal';
import './Toast.css';

const toastListeners = new Set();

export const toast = {
  show(message, type = 'info', duration = 4000) {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast = { id, message, type, duration };
    toastListeners.forEach((listener) => listener((prev) => [...prev, newToast]));
  },
  success(message, duration) {
    this.show(message, 'success', duration);
  },
  error(message, duration) {
    this.show(message, 'error', duration);
  },
  info(message, duration) {
    this.show(message, 'info', duration);
  },
  warning(message, duration) {
    this.show(message, 'warning', duration);
  },
};

export const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const listener = (updateFn) => setToasts(updateFn);
    toastListeners.add(listener);
    return () => {
      toastListeners.delete(listener);
    };
  }, []);

  const removeToast = useCallback((id) => {
    deferClose(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    });
  }, []);

  return (
    <OverlayPortal>
      <div className="toast-container-root">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </div>
    </OverlayPortal>
  );
};

const ToastItem = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = window.setTimeout(onClose, toast.duration);
    return () => window.clearTimeout(timer);
  }, [toast.duration, onClose]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return (
          <svg className="toast-icon text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'error':
        return (
          <svg className="toast-icon text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
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
    <div className={`toast-item-root toast-type-${toast.type} animate-toast-in`}>
      <span className="toast-icon-wrapper">{getIcon()}</span>
      <div className="toast-message-content">{toast.message}</div>
      <button className="toast-close-btn" type="button" onClick={onClose}>
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};
