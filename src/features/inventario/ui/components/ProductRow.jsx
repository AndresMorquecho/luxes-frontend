import React from 'react';
import { Package, Wrench, Eye, Edit2, Trash2 } from 'lucide-react';
import { StatusBadge } from './StatusBadge.jsx';
import { SectionBadge } from './SectionBadge.jsx';

const fmt = (n) => `$${Number(n || 0).toFixed(2)}`;

export function ProductRow({ item, isAdmin, onViewHistory, onEdit, onDelete }) {
  const isTool = item.tipo === 'herramienta' || String(item.categoria || '').toLowerCase() === 'taller';
  const unidad = item.unidadMedida?.abreviacion || item.unidadMedida?.nombre || 'unid';
  
  const estado = isTool ? (item.estadoUso || 'En Stock') : (
    item.stockActual === 0 ? 'Agotado' :
    item.stockActual <= (item.stockMinimo || 1) ? 'Stock Bajo' : 'En Stock'
  );

  return (
    <tr>
      <td className="inv-td-name" style={{ fontSize: '0.875rem', padding: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isTool ? (
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7', flexShrink: 0 }}>
                <Wrench size={14} />
              </div>
            ) : (
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', flexShrink: 0 }}>
                <Package size={14} />
              </div>
            )}
            <strong style={{ color: '#0f172a', fontWeight: 600 }}>{item.nombre}</strong>
          </div>
          {item.codigo && (
            <span style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '0.2rem', marginLeft: '2.25rem' }}>
              Ref: {item.codigo}
            </span>
          )}
        </div>
      </td>
      <td style={{ textAlign: 'center', padding: '1rem' }}>
        <SectionBadge section={item.categoria} tipo={item.tipo} />
      </td>
      <td className="inv-td-stock" style={{ fontSize: '0.875rem', padding: '1rem' }}>
        <strong style={{ color: item.stockActual === 0 ? '#ef4444' : '#1e293b' }}>
          {item.stockActual} {unidad}
        </strong>
      </td>
      <td style={{ fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>
        <StatusBadge status={estado} />
      </td>
      <td style={{ fontSize: '0.875rem', padding: '1rem', fontWeight: 600, color: '#334155' }}>
        {fmt(item.precioCosto)}
      </td>
      <td className="inv-td-actions" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', padding: '1.25rem 1rem' }}>
        <button className="inv-icon-btn" title="Ver Historial" onClick={() => onViewHistory(item)} style={{ color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer', padding: '0.35rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Eye size={15}/>
        </button>
        {isAdmin && (
          <button className="inv-icon-btn" title="Editar" onClick={() => onEdit(item)} style={{ color: '#0284c7', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px', cursor: 'pointer', padding: '0.35rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Edit2 size={15}/>
          </button>
        )}
        {isAdmin && (
          <button className="inv-icon-btn" title="Eliminar" onClick={() => onDelete(item)} style={{ color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', cursor: 'pointer', padding: '0.35rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Trash2 size={15}/>
          </button>
        )}
      </td>
    </tr>
  );
}
