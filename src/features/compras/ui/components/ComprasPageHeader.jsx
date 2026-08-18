import React from 'react';
import { ShoppingBag } from 'lucide-react';

/**
 * Header unificado institucional para el módulo de Compras y páginas relacionadas.
 */
export function ComprasPageHeader({
  title,
  subtitle,
  action,
  aside,
  badge = 'LISTA',
  icon: Icon = ShoppingBag,
  tabs,
  className = ''
}) {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-100 shadow-xs mb-4 sm:mb-6 overflow-hidden ${className}`}
    >
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-blue-600">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800 leading-snug truncate">
                {title}
              </h1>
              {badge && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-blue-100 text-blue-700">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5 leading-snug">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {(action || aside) && (
          <div className="shrink-0 flex items-center gap-2 self-end sm:self-auto">
            {aside}
            {action}
          </div>
        )}
      </div>

      {tabs && (
        <div className="px-4 sm:px-5 pb-3.5 flex gap-1.5 border-t border-slate-100 pt-3 bg-slate-50/50 overflow-x-auto">
          {tabs}
        </div>
      )}
    </div>
  );
}

export function ComprasHeaderButton({ children, onClick, className = '', id, ...props }) {
  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 text-white rounded-xl font-semibold text-xs sm:text-sm whitespace-nowrap transition-all shadow-sm bg-[#0b2d64] hover:bg-[#071f45] shrink-0 cursor-pointer shadow-blue-950/20 active:scale-[0.99] ${className}`}
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
      className={`inline-flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-slate-600 border border-slate-200/80 bg-white hover:bg-slate-50 transition-all shrink-0 cursor-pointer ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
