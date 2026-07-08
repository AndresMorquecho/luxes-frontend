import React from 'react';
import { Package, Wrench, Eye, Edit2, Trash2 } from 'lucide-react';
import { StatusBadge } from './StatusBadge.jsx';
import { SectionBadge } from './SectionBadge.jsx';

const fmt = (n) => `$${Number(n).toFixed(2)}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export function ProductRow({ item, activeTab, isAdmin, onViewHistory, onEdit, onDelete }) {
  const isTool = item.tipo === 'herramienta';
  const tracksStock = item.descargaStock !== undefined ? item.descargaStock : !(item.categoria?.toLowerCase() === 'taller' || item.categoria?.toLowerCase() === 'oficina');
  const unidad = item.unidadMedida?.abreviacion || item.unidadMedida?.nombre || 'unid';
  
  const estado = isTool ? item.estadoUso : (
    !tracksStock ? 'Solo registro' :
    item.stockActual === 0 ? 'Agotado' :
    item.stockActual <= item.stockMinimo ? 'Stock Bajo' : 'En Stock'
  );

  const cpp = item.costoPromedioPonderado !== undefined ? item.costoPromedioPonderado : item.precioCosto;

  return (
    <tr>
      <td className="inv-td-name" style={{ fontSize: '0.875rem', padding: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {isTool ? <Wrench size={14} style={{ color: '#64748b' }} /> : <Package size={14} style={{ color: '#64748b' }} />}
            <strong style={{ color: '#0f172a' }}>{item.nombre}</strong>
          </div>
          {item.codigo && (
            <span style={{ color: '#64748b', marginTop: '0.15rem' }}>
              Cod: {item.codigo}
            </span>
          )}
        </div>
      </td>
      {activeTab === 'all' && (
        <td style={{ textAlign: 'center', padding: '1rem' }}>
          <SectionBadge section={item.categoria} />
        </td>
      )}
      <td className="inv-td-stock" style={{ fontSize: '0.875rem', padding: '1rem' }}>
        <strong style={!tracksStock ? { color: '#64748b', fontWeight: 500 } : {}}>
          {item.stockActual} {unidad}
        </strong>
      </td>
      <td style={{ fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>
        <StatusBadge status={estado} />
      </td>
      <td style={{ fontSize: '0.875rem', padding: '1rem' }}>{fmt(item.precioCosto)}</td>
      <td style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1d4ed8', padding: '1rem' }}>
        {fmt(cpp)}
      </td>
      <td style={{ fontSize: '0.875rem', color: '#64748b', padding: '1rem' }}>
        {item.ultimaFechaCompra ? fmtDate(item.ultimaFechaCompra) : '—'}
      </td>
      <td className="inv-td-actions" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', padding: '1.25rem 1rem' }}>
        <button className="inv-icon-btn" title="Ver Historial" onClick={() => onViewHistory(item)} style={{ color: '#64748b', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
          <Eye size={18}/>
        </button>
        {isAdmin && (
          <button className="inv-icon-btn" title="Editar" onClick={() => onEdit(item)} style={{ color: '#64748b', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
            <Edit2 size={18}/>
          </button>
        )}
        {isAdmin && (
          <button className="inv-icon-btn" title="Eliminar" onClick={() => onDelete(item)} style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}>
            <Trash2 size={18}/>
          </button>
        )}
      </td>
    </tr>
  );
}
