import React from 'react';

const CONFIG = {
  agotado: { cls: 'bg-rose-50 text-rose-700', label: 'Agotado' },
  'solo registro': { cls: 'bg-slate-100 text-slate-600', label: 'Solo registro' },
  'en uso': { cls: 'bg-amber-50 text-amber-700', label: 'En Uso' },
  'stock bajo': { cls: 'bg-amber-50 text-amber-700', label: 'Stock Bajo' },
  'en stock': { cls: 'bg-emerald-50 text-emerald-700', label: 'En Stock' },
  dañado: { cls: 'bg-rose-50 text-rose-700', label: 'Dañado' },
  reparación: { cls: 'bg-blue-50 text-blue-700', label: 'Reparación' },
  bodega: { cls: 'bg-emerald-50 text-emerald-700', label: 'Bodega' },
};

export function StatusBadge({ status }) {
  let key = String(status || '').toLowerCase();
  if (key === 'no sirve') key = 'dañado';
  if (key === 'en reparacion' || key === 'en reparación') key = 'reparación';

  const conf = CONFIG[key] || { cls: 'bg-slate-100 text-slate-600', label: status || '—' };

  return (
    <span className={`inline-flex items-center rounded-full text-xs font-medium px-2.5 py-1 whitespace-nowrap ${conf.cls}`}>
      {conf.label}
    </span>
  );
}
