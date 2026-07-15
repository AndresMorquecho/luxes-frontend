import React, { useState, useEffect, useRef, useCallback } from 'react';
import { OverlayPortal, deferClose } from './ModalPortal';
import './ConfirmModal.css';

export const confirmDialog = (title, message, options = {}) => {
  return new Promise((resolve) => {
    if (window.__confirmListener) {
      window.__confirmListener({
        isOpen: true,
        title,
        message,
        confirmLabel: options.confirmLabel || 'Aceptar',
        cancelLabel: options.cancelLabel || 'Cancelar',
        showCancel: options.showCancel !== false,
        type: options.type || 'danger',
        resolve,
      });
    } else {
      resolve(window.confirm(message));
    }
  });
};

export const ConfirmDialogContainer = () => {
  const [state, setState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Aceptar',
    cancelLabel: 'Cancelar',
    showCancel: true,
    type: 'danger',
  });
  const resolveRef = useRef(null);

  useEffect(() => {
    const listener = (next) => {
      resolveRef.current = next.resolve;
      setState({
        isOpen: true,
        title: next.title,
        message: next.message,
        confirmLabel: next.confirmLabel,
        cancelLabel: next.cancelLabel,
        showCancel: next.showCancel,
        type: next.type,
      });
    };
    window.__confirmListener = listener;

    return () => {
      if (window.__confirmListener === listener) {
        window.__confirmListener = null;
      }
    };
  }, []);

  const finish = useCallback((result) => {
    const resolve = resolveRef.current;
    resolveRef.current = null;
    setState((prev) => ({ ...prev, isOpen: false }));
    deferClose(() => resolve?.(result));
  }, []);

  const handleCancel = () => finish(false);
  const handleConfirm = () => finish(true);

  const getTypeStyle = () => {
    switch (state.type) {
      case 'danger':
        return {
          iconBg: '#eff6ff',
          iconColor: '#2563eb',
          btnBg: '#2563eb',
          btnShadow: '0 4px 12px rgba(37,99,235,0.3)',
        };
      case 'warning':
        return {
          iconBg: 'rgba(245, 158, 11, 0.1)',
          iconColor: '#f59e0b',
          btnBg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          btnShadow: '0 4px 14px rgba(245, 158, 11, 0.3)',
        };
      case 'primary':
      default:
        return {
          iconBg: '#eff6ff',
          iconColor: '#2563eb',
          btnBg: '#2563eb',
          btnShadow: '0 4px 12px rgba(37,99,235,0.3)',
        };
    }
  };

  const colors = getTypeStyle();

  return (
    <OverlayPortal open={state.isOpen}>
      <div className="confirm-portal-root" role="dialog" aria-modal="true" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
          <div
            className="confirm-overlay"
            onMouseDown={(e) => { if (e.target === e.currentTarget) handleCancel(); }}
          />
          <div className="confirm-wrapper">
            <div className="confirm-card">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border border-slate-100"
                    style={{ backgroundColor: colors.iconBg, color: colors.iconColor }}
                  >
                    {state.type === 'danger' && (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                    {state.type === 'warning' && (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    )}
                    {state.type !== 'danger' && state.type !== 'warning' && (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-800 text-lg m-0">{state.title}</h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none bg-transparent border-none cursor-pointer"
                  title="Cerrar"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="confirm-body">
                <p className="confirm-message">{state.message}</p>
              </div>
              <div className="confirm-footer">
                {state.showCancel && (
                  <button type="button" className="confirm-btn-cancel" onClick={handleCancel}>
                    {state.cancelLabel}
                  </button>
                )}
                <button
                  type="button"
                  className="confirm-btn-action"
                  style={{
                    background: colors.btnBg,
                    boxShadow: colors.btnShadow,
                    width: state.showCancel ? 'auto' : '100%',
                    margin: state.showCancel ? '' : '0',
                  }}
                  onClick={handleConfirm}
                >
                  {state.confirmLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
    </OverlayPortal>
  );
};
