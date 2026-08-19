import React from 'react';
import { Package, Wrench, Eye, Edit2, Trash2, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { StatusBadge } from './StatusBadge.jsx';
import { SectionBadge } from './SectionBadge.jsx';

const fmt = (n) => `$${Number(n || 0).toFixed(2)}`;

export function ProductMobileCard({
  item,
  isAdmin,
  onViewHistory,
  onEntrada,
  onSalida,
  onEdit,
  onDelete
}) {
  const isTool = item.tipo === 'herramienta' || String(item.categoria || '').toLowerCase().includes('herramient');
  const unidad = item.unidadMedida?.abreviacion || item.unidadMedida?.nombre || 'unid';
  
  const estado = isTool ? (item.estadoUso || 'En Stock') : (
    item.stockActual === 0 ? 'Agotado' :
    item.stockActual <= (item.stockMinimo || 1) ? 'Stock Bajo' : 'En Stock'
  );

  return (
    <div className="inv-mobile-card">
      <div className="inv-card-header">
        <div className="inv-card-title-group">
          {item.codigo && <span className="inv-card-code font-bold text-blue-700">{item.codigo}</span>}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {isTool ? <Wrench size={14} color="#0284c7" /> : <Package size={14} color="#2563eb" />}
            <span className="inv-card-title">{item.nombre}</span>
          </div>
        </div>
        <StatusBadge status={estado} />
      </div>
      <div className="inv-card-body">
        <div className="inv-card-row">
          <span className="inv-card-label">Categoría</span>
          <SectionBadge section={item.categoria} tipo={item.tipo} />
        </div>
        <div className="inv-card-row">
          <span className="inv-card-label">Stock Actual</span>
          <span className="inv-card-value highlight" style={{ color: item.stockActual === 0 ? '#ef4444' : '#1e293b' }}>
            {item.stockActual} {unidad}
          </span>
        </div>
        <div className="inv-card-row">
          <span className="inv-card-label">Costo Unit.</span>
          <span className="inv-card-value">{fmt(item.precioCosto)}</span>
        </div>
      </div>
      <div className="inv-card-actions" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
        <button
          type="button"
          onClick={() => onEntrada?.(item)}
          title="Entrada de Stock (+)"
          style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', color: '#16a34a', cursor: 'pointer', padding: '0.4rem', display: 'flex', alignItems: 'center' }}
        >
          <ArrowDownLeft size={16} />
        </button>
        <button
          type="button"
          onClick={() => onSalida?.(item)}
          title="Salida de Stock (-)"
          style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '6px', color: '#ea580c', cursor: 'pointer', padding: '0.4rem', display: 'flex', alignItems: 'center' }}
        >
          <ArrowUpRight size={16} />
        </button>
        <button
          type="button"
          onClick={() => onViewHistory(item)}
          title="Ver Historial"
          style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#64748b', cursor: 'pointer', padding: '0.4rem', display: 'flex', alignItems: 'center' }}
        >
          <Eye size={16} />
        </button>
        {isAdmin && (
          <button
            type="button"
            onClick={() => onEdit(item)}
            title="Editar"
            style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px', color: '#0284c7', cursor: 'pointer', padding: '0.4rem', display: 'flex', alignItems: 'center' }}
          >
            <Edit2 size={16} />
          </button>
        )}
        {isAdmin && (
          <button
            type="button"
            onClick={() => onDelete(item)}
            title="Eliminar"
            style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#ef4444', cursor: 'pointer', padding: '0.4rem', display: 'flex', alignItems: 'center' }}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

