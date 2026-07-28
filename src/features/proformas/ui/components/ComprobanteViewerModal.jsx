import React from 'react';
import { ModalPortal } from '../../../../shared/ui/components/ModalPortal.jsx';
import { X, ExternalLink, Download } from 'lucide-react';

export const ComprobanteViewerModal = ({ open, url, onClose, title = 'Comprobante de Pago' }) => {
  if (!open || !url) return null;

  const isPdf = url.toLowerCase().endsWith('.pdf');

  return (
    <ModalPortal open={open}>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 animate-fade-in">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-md" onClick={onClose} />

        {/* Container */}
        <div
          className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden relative z-[301] animate-slide-up"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-800 text-base">{title}</h3>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1.5"
              >
                <ExternalLink size={14} />
                Abrir Original
              </a>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-4 flex-1 overflow-auto flex items-center justify-center bg-slate-900/5 min-h-[300px]">
            {isPdf ? (
              <iframe src={url} className="w-full h-[70vh] rounded-xl border border-slate-200" title="PDF Comprobante" />
            ) : (
              <img
                src={url}
                alt="Comprobante de pago"
                className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-md border border-slate-200/60 bg-white"
              />
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
