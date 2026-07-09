import React from 'react';
import { Package, Wrench, Eye, Edit2, Trash2 } from 'lucide-react';
import { StatusBadge } from './StatusBadge.jsx';
import { SectionBadge } from './SectionBadge.jsx';

const fmt = (n) => `$${Number(n).toFixed(2)}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export function ProductMobileCard({ item, activeTab, isAdmin, onViewHistory, onEdit, onDelete }) {
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
    <div className="inv-mobile-card">
      <div className="inv-card-header">
        <div className="inv-card-title-group">
          {item.codigo && <span className="inv-card-code">{item.codigo}</span>}
          <span className="inv-card-title">{item.nombre}</span>
        </div>
        <StatusBadge status={estado} />
      </div>
      <div className="inv-card-body">
        {activeTab === 'all' && (
          <div className="inv-card-row">
            <span className="inv-card-label">Sección</span>
            <SectionBadge section={item.categoria} />
          </div>
        )}
        <div className="inv-card-row">
          <span className="inv-card-label">Stock</span>
          <span className="inv-card-value highlight" style={!tracksStock ? { color: '#64748b', fontWeight: 500 } : {}}>{item.stockActual} {unidad}</span>
        </div>
        <div className="inv-card-row">
          <span className="inv-card-label">Costo Unit.</span>
          <span className="inv-card-value">{fmt(item.precioCosto)}</span>
        </div>
        <div className="inv-card-row">
          <span className="inv-card-label">CPP</span>
          <span className="inv-card-value cpp" style={{ fontWeight: 700, color: '#1d4ed8' }}>{fmt(cpp)}</span>
        </div>
        <div className="inv-card-row">
          <span className="inv-card-label">Últ. Compra</span>
          <span className="inv-card-value" style={{ color: '#64748b' }}>{item.ultimaFechaCompra ? fmtDate(item.ultimaFechaCompra) : '—'}</span>
        </div>
      </div>
      <div className="inv-card-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
        <button type="button" onClick={() => onViewHistory(item)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}>
          <Eye size={18}/>
        </button>
        {isAdmin && (
          <button type="button" onClick={() => onEdit(item)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0 }}>
            <Edit2 size={18}/>
          </button>
        )}
        {isAdmin && (
          <button type="button" onClick={() => onDelete(item)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}>
            <Trash2 size={18}/>
          </button>
        )}
      </div>
    </div>
  );
}
