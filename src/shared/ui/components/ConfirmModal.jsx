import React, { useState, useEffect, useRef, useCallback } from 'react';
import { OverlayPortal, deferClose } from './ModalPortal';
import './ConfirmModal.css';

let confirmListener = null;

export const confirmDialog = (title, message, options = {}) => {
  return new Promise((resolve) => {
    if (confirmListener) {
      confirmListener({
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
    confirmListener = (next) => {
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
    return () => {
      confirmListener = null;
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
          iconBg: 'rgba(239, 68, 68, 0.1)',
          iconColor: '#ef4444',
          btnBg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          btnShadow: '0 4px 14px rgba(239, 68, 68, 0.3)',
        };
      case 'warning':
        return {
          iconBg: 'rgba(245, 158, 11, 0.1)',
          iconColor: '#f59e0b',
          btnBg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          btnShadow: '0 4px 14px rgba(245, 158, 11, 0.3)',
        };
      default:
        return {
          iconBg: 'rgba(124, 58, 237, 0.1)',
          iconColor: '#7c3aed',
          btnBg: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
          btnShadow: '0 4px 14px rgba(124, 58, 237, 0.3)',
        };
    }
  };

  const colors = getTypeStyle();

  return (
    <OverlayPortal>
      {state.isOpen ? (
        <div className="confirm-portal-root" role="dialog" aria-modal="true">
          <div
            className="confirm-overlay"
            onMouseDown={(e) => { if (e.target === e.currentTarget) handleCancel(); }}
          />
          <div className="confirm-wrapper">
            <div className="confirm-card">
              <div className="confirm-header">
                <div className="confirm-icon-box" style={{ backgroundColor: colors.iconBg, color: colors.iconColor }}>
                  {state.type === 'danger' && (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                  {state.type === 'warning' && (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  )}
                  {state.type !== 'danger' && state.type !== 'warning' && (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <h3 className="confirm-title">{state.title}</h3>
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
      ) : null}
    </OverlayPortal>
  );
};
