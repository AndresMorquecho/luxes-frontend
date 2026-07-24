import React from 'react';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import { StatusBadge } from './StatusBadge.jsx';
import { SectionBadge } from './SectionBadge.jsx';

const fmt = (n) => `$${Number(n).toFixed(2)}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export function ProductMobileCard({ item, activeTab, isAdmin, onViewHistory, onEdit, onDelete }) {
  const isTool = item.tipo === 'herramienta';
  const tracksStock = item.descargaStock !== undefined
    ? item.descargaStock
    : !(item.categoria?.toLowerCase() === 'taller' || item.categoria?.toLowerCase() === 'oficina');
  const unidad = item.unidadMedida?.abreviacion || item.unidadMedida?.nombre || 'unid';

  const estado = isTool ? item.estadoUso : (
    !tracksStock ? 'Solo registro' :
    item.stockActual === 0 ? 'Agotado' :
    item.stockActual <= item.stockMinimo ? 'Stock Bajo' : 'En Stock'
  );

  const cpp = item.costoPromedioPonderado !== undefined ? item.costoPromedioPonderado : item.precioCosto;

  return (
    <div className="px-4 py-3.5">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          {item.codigo && <p className="text-[11px] text-slate-400 font-mono">{item.codigo}</p>}
          <p className="text-sm font-semibold text-slate-800 leading-tight truncate">{item.nombre}</p>
        </div>
        <StatusBadge status={estado} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        {activeTab === 'all' && (
          <div className="col-span-2">
            <span className="text-slate-400 block text-[10px]">Sección</span>
            <SectionBadge section={item.categoria} />
          </div>
        )}
        <div>
          <span className="text-slate-400 block text-[10px]">Stock</span>
          <span className={`font-semibold ${!tracksStock ? 'text-slate-500' : 'text-slate-800'}`}>
            {item.stockActual} {unidad}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px]">Costo Unit.</span>
          <span className="font-medium text-slate-700">{fmt(item.precioCosto)}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px]">CPP</span>
          <span className="font-semibold text-blue-700">{fmt(cpp)}</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[10px]">Últ. Compra</span>
          <span className="font-medium text-slate-500">{item.ultimaFechaCompra ? fmtDate(item.ultimaFechaCompra) : '—'}</span>
        </div>
      </div>
      <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={() => onViewHistory(item)}
          className="p-1.5 rounded-lg bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          title="Ver historial"
        >
          <Eye size={16} strokeWidth={1.5} />
        </button>
        {isAdmin && (
          <button
            type="button"
            onClick={() => onEdit(item)}
            className="p-1.5 rounded-lg bg-blue-50 text-blue-500 border border-blue-100 hover:bg-blue-100 hover:text-blue-600 transition-colors"
            title="Editar"
          >
            <Pencil size={16} strokeWidth={1.5} />
          </button>
        )}
        {isAdmin && (
          <button
            type="button"
            onClick={() => onDelete(item)}
            className="p-1.5 rounded-lg bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-100 hover:text-rose-600 transition-colors"
            title="Eliminar"
          >
            <Trash2 size={16} strokeWidth={1.5} />
          </button>
        )}
      </div>
    </div>
  );
}
