import React from 'react';
import { Package, Wrench, Eye, Pencil, Trash2 } from 'lucide-react';
import { StatusBadge } from './StatusBadge.jsx';
import { SectionBadge } from './SectionBadge.jsx';

const fmt = (n) => `$${Number(n).toFixed(2)}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export function ProductRow({ item, activeTab, isAdmin, onViewHistory, onEdit, onDelete }) {
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
    <tr className="hover:bg-slate-50/70 transition-colors">
      <td className="px-5 py-4">
        <div className="flex items-center gap-2 min-w-0">
          {isTool
            ? <Wrench size={14} className="text-slate-400 shrink-0" />
            : <Package size={14} className="text-slate-400 shrink-0" />}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 leading-tight truncate">{item.nombre}</p>
            {item.codigo && (
              <p className="text-xs text-slate-400 font-mono mt-0.5">Cod: {item.codigo}</p>
            )}
          </div>
        </div>
      </td>
      {activeTab === 'all' && (
        <td className="px-5 py-4">
          <SectionBadge section={item.categoria} />
        </td>
      )}
      <td className="px-5 py-4 text-sm font-semibold text-slate-800 tabular-nums">
        <span className={!tracksStock ? 'text-slate-500 font-medium' : ''}>
          {item.stockActual} {unidad}
        </span>
      </td>
      <td className="px-5 py-4">
        <StatusBadge status={estado} />
      </td>
      <td className="px-5 py-4 text-sm text-slate-700 tabular-nums">{fmt(item.precioCosto)}</td>
      <td className="px-5 py-4 text-sm font-semibold text-blue-700 tabular-nums">{fmt(cpp)}</td>
      <td className="px-5 py-4 text-sm text-slate-500 whitespace-nowrap">
        {item.ultimaFechaCompra ? fmtDate(item.ultimaFechaCompra) : '—'}
      </td>
      <td className="px-5 py-4 text-right">
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            title="Ver historial"
            aria-label="Ver historial"
            onClick={() => onViewHistory(item)}
            className="p-1.5 rounded-lg bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <Eye size={16} strokeWidth={1.5} />
          </button>
          {isAdmin && (
            <button
              type="button"
              title="Editar"
              aria-label="Editar"
              onClick={() => onEdit(item)}
              className="p-1.5 rounded-lg bg-blue-50 text-blue-500 border border-blue-100 hover:bg-blue-100 hover:text-blue-600 transition-colors"
            >
              <Pencil size={16} strokeWidth={1.5} />
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              title="Eliminar"
              aria-label="Eliminar"
              onClick={() => onDelete(item)}
              className="p-1.5 rounded-lg bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-100 hover:text-rose-600 transition-colors"
            >
              <Trash2 size={16} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
