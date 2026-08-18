import React from 'react';
import { Package, Wrench, Eye, Edit2, Trash2 } from 'lucide-react';
import { StatusBadge } from './StatusBadge.jsx';
import { SectionBadge } from './SectionBadge.jsx';

const fmt = (n) => `$${Number(n || 0).toFixed(2)}`;

export function ProductMobileCard({ item, isAdmin, onViewHistory, onEdit, onDelete }) {
  const isTool = item.tipo === 'herramienta' || String(item.categoria || '').toLowerCase() === 'taller';
  const unidad = item.unidadMedida?.abreviacion || item.unidadMedida?.nombre || 'unid';
  
  const estado = isTool ? (item.estadoUso || 'En Stock') : (
    item.stockActual === 0 ? 'Agotado' :
    item.stockActual <= (item.stockMinimo || 1) ? 'Stock Bajo' : 'En Stock'
  );

  return (
    <div className="inv-mobile-card">
      <div className="inv-card-header">
        <div className="inv-card-title-group">
          {item.codigo && <span className="inv-card-code">{item.codigo}</span>}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {isTool ? <Wrench size={14} color="#0284c7" /> : <Package size={14} color="#16a34a" />}
            <span className="inv-card-title">{item.nombre}</span>
          </div>
        </div>
        <StatusBadge status={estado} />
      </div>
      <div className="inv-card-body">
        <div className="inv-card-row">
          <span className="inv-card-label">Tipo</span>
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
      <div className="inv-card-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
        <button type="button" onClick={() => onViewHistory(item)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#64748b', cursor: 'pointer', padding: '0.35rem' }}>
          <Eye size={16}/>
        </button>
        {isAdmin && (
          <button type="button" onClick={() => onEdit(item)} style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px', color: '#0284c7', cursor: 'pointer', padding: '0.35rem' }}>
            <Edit2 size={16}/>
          </button>
        )}
        {isAdmin && (
          <button type="button" onClick={() => onDelete(item)} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#ef4444', cursor: 'pointer', padding: '0.35rem' }}>
            <Trash2 size={16}/>
          </button>
        )}
      </div>
    </div>
  );
}
