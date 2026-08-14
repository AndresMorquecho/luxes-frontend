import React from 'react';

const CO_PRIMARY = '#0b2d64';

/**
 * Header unificado estilo Proyectos: tarjeta blanca, título + subtítulo, acción opcional.
 */
export function ComprasPageHeader({ title, subtitle, action, aside, className = '' }) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl px-4 py-3.5 sm:px-5 sm:py-4 flex items-center justify-between gap-3 sm:gap-4 flex-wrap shadow-sm mb-4 md:mb-6 ${className}`}
    >
      <div className="min-w-0 flex-1">
        <h1 className="text-lg sm:text-xl font-bold text-slate-800 leading-tight">{title}</h1>
        {subtitle && (
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1 leading-snug">{subtitle}</p>
        )}
      </div>
      {(action || aside) && (
        <div className="shrink-0 flex items-center gap-2">
          {aside}
          {action}
        </div>
      )}
    </div>
  );
}

export function ComprasHeaderButton({ children, onClick, className = '', style = {}, ...props }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 text-white rounded-xl font-semibold text-[11px] sm:text-sm transition-all duration-200 hover:brightness-110 shadow-sm whitespace-nowrap shrink-0 border border-[rgba(200,150,62,0.4)] ${className}`}
      style={{
        background: 'linear-gradient(135deg, #0b2d64 0%, #164e96 100%)',
        boxShadow: '0 2px 8px rgba(11, 45, 100, 0.2)',
        ...style
      }}
      {...props}
    >
      {children}
    </button>
  );
}

export function ComprasHeaderGhostButton({ children, onClick, className = '', ...props }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl font-semibold text-xs sm:text-sm text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-colors shrink-0 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
