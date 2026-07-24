import React from 'react';

/**
 * Header unificado: icono opcional, título, badge, subtítulo, acciones y tabs opcionales.
 */
export function ComprasPageHeader({
  title,
  subtitle,
  action,
  aside,
  icon: Icon,
  badge,
  tabs,
  className = '',
}) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl overflow-hidden ${className}`}
    >
      <div className="px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {Icon && (
            <div className="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 bg-blue-50 border-blue-100">
              <Icon className="w-5 h-5 text-blue-600" strokeWidth={2} />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-800 leading-tight">{title}</h1>
              {badge && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-blue-100 text-blue-700">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-snug">{subtitle}</p>
            )}
          </div>
        </div>
        {(action || aside) && (
          <div className="shrink-0 flex flex-wrap items-center gap-2">
            {aside}
            {action}
          </div>
        )}
      </div>

      {tabs && (
        <div className="px-4 sm:px-5 pb-4 flex gap-1 border-t border-slate-100 pt-3 bg-slate-50/50 overflow-x-auto">
          {tabs}
        </div>
      )}
    </div>
  );
}

export function ComprasHeaderButton({ children, onClick, className = '', ...props }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 text-white rounded-xl font-semibold text-[11px] sm:text-sm bg-blue-600 hover:bg-blue-700 transition-opacity shadow-sm whitespace-nowrap shrink-0 ${className}`}
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
      className={`inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-colors shrink-0 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
