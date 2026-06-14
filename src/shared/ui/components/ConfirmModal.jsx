import React, { useState, useLayoutEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import headerBg from '../../../assets/header-bg.png';
import { emitDialog, registerDialogHandler, unregisterDialogHandler } from './dialogBridge';
import './ConfirmModal.css';

const MODAL_HEADER_STYLE = {
  backgroundColor: '#02188E',
  backgroundImage: `linear-gradient(90deg, rgba(1, 12, 72, 0.55) 0%, rgba(4, 51, 255, 0.25) 50%, rgba(1, 12, 72, 0.55) 100%), url(${headerBg})`,
  backgroundPosition: 'center',
  backgroundSize: 'cover',
  backgroundRepeat: 'no-repeat',
};

const INITIAL_STATE = {
  isOpen: false,
  mode: 'confirm',
  title: '',
  message: '',
  confirmLabel: 'Aceptar',
  cancelLabel: 'Cancelar',
  type: 'danger',
};

export const confirmDialog = (title, message, options = {}) => {
  return new Promise((resolve) => {
    const delivered = emitDialog({
      isOpen: true,
      mode: 'confirm',
      title,
      message,
      confirmLabel: options.confirmLabel || 'Aceptar',
      cancelLabel: options.cancelLabel || 'Cancelar',
      type: options.type || 'danger',
      resolve,
    });

    if (!delivered) {
      resolve(window.confirm(message));
    }
  });
};

export const alertDialog = (title, message, options = {}) => {
  return new Promise((resolve) => {
    const delivered = emitDialog({
      isOpen: true,
      mode: 'alert',
      title,
      message,
      confirmLabel: options.confirmLabel || 'Aceptar',
      cancelLabel: 'Cancelar',
      type: options.type || 'info',
      resolve,
    });

    if (!delivered) {
      window.alert(message);
      resolve(true);
    }
  });
};

export const ConfirmDialogContainer = () => {
  const [state, setState] = useState(INITIAL_STATE);
  const resolveRef = useRef(null);

  const openDialog = useCallback((payload) => {
    resolveRef.current = payload.resolve ?? null;
    setState({
      isOpen: true,
      mode: payload.mode || 'confirm',
      title: payload.title || '',
      message: payload.message || '',
      confirmLabel: payload.confirmLabel || 'Aceptar',
      cancelLabel: payload.cancelLabel || 'Cancelar',
      type: payload.type || 'danger',
    });
  }, []);

  useLayoutEffect(() => {
    registerDialogHandler(openDialog);
    return () => unregisterDialogHandler(openDialog);
  }, [openDialog]);

  const closeDialog = useCallback((result) => {
    setState(INITIAL_STATE);
    if (resolveRef.current) {
      resolveRef.current(result);
      resolveRef.current = null;
    }
  }, []);

  const handleCancel = () => {
    closeDialog(state.mode === 'alert');
  };

  const handleConfirm = () => {
    closeDialog(true);
  };

  if (!state.isOpen) return null;

  const getTypeStyle = () => {
    switch (state.type) {
      case 'success':
        return {
          iconBg: 'rgba(255, 255, 255, 0.2)',
          iconColor: '#ffffff',
          btnBg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          btnShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
        };
      case 'danger':
      case 'error':
        return {
          iconBg: 'rgba(255, 255, 255, 0.2)',
          iconColor: '#ffffff',
          btnBg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          btnShadow: '0 4px 14px rgba(239, 68, 68, 0.3)',
        };
      case 'warning':
        return {
          iconBg: 'rgba(255, 255, 255, 0.2)',
          iconColor: '#ffffff',
          btnBg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          btnShadow: '0 4px 14px rgba(245, 158, 11, 0.3)',
        };
      default:
        return {
          iconBg: 'rgba(255, 255, 255, 0.2)',
          iconColor: '#ffffff',
          btnBg: 'linear-gradient(135deg, #0433ff 0%, #02188e 100%)',
          btnShadow: '0 4px 14px rgba(2, 24, 142, 0.3)',
        };
    }
  };

  const colors = getTypeStyle();
  const isAlert = state.mode === 'alert';

  const renderIcon = () => {
    if (state.type === 'success') {
      return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      );
    }
    if (state.type === 'danger' || state.type === 'error') {
      return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
      );
    }
    if (state.type === 'warning') {
      return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
    }
    return (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    );
  };

  return createPortal(
    <>
      <div className="confirm-overlay" onClick={isAlert ? handleConfirm : handleCancel} />
      <div className="confirm-wrapper">
        <div className="confirm-card">
          <div className="confirm-header" style={MODAL_HEADER_STYLE}>
            <div
              className="confirm-icon-box"
              style={{
                backgroundColor: colors.iconBg,
                color: colors.iconColor,
                border: '1px solid rgba(255,255,255,0.25)',
              }}
            >
              {renderIcon()}
            </div>
            <h3 className="confirm-title">{state.title}</h3>
          </div>
          <div className="confirm-body">
            <p className="confirm-message">{state.message}</p>
          </div>
          <div className={`confirm-footer${isAlert ? ' confirm-footer--alert' : ''}`}>
            {!isAlert && (
              <button type="button" className="confirm-btn-cancel" onClick={handleCancel}>
                {state.cancelLabel}
              </button>
            )}
            <button
              type="button"
              className={`confirm-btn-action${isAlert ? ' confirm-btn-action--full' : ''}`}
              style={{ background: colors.btnBg, boxShadow: colors.btnShadow }}
              onClick={handleConfirm}
            >
              {state.confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};
