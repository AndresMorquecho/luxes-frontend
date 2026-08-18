import React, { useState, useMemo } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { ProductRow } from './ProductRow.jsx';
import { ProductMobileCard } from './ProductMobileCard.jsx';

export function InventoryTable({ items, isAdmin, onViewHistory, onEdit, onDelete }) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const sortedItems = useMemo(() => {
    let sortableItems = [...items];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue, bValue;

        if (sortConfig.key === 'nombre') {
          aValue = (a.nombre || '').toLowerCase();
          bValue = (b.nombre || '').toLowerCase();
        } else if (sortConfig.key === 'stock') {
          aValue = a.stockActual || 0;
          bValue = b.stockActual || 0;
        } else if (sortConfig.key === 'costo') {
          aValue = a.precioCosto || 0;
          bValue = b.precioCosto || 0;
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [items, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortableHeader = ({ label, sortKey, align = 'left' }) => (
    <th style={{ textAlign: align, cursor: 'pointer', userSelect: 'none', padding: '1rem' }} onClick={() => requestSort(sortKey)}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: align === 'center' ? 'center' : 'flex-start', gap: '0.4rem' }}>
        {label}
        <ArrowUpDown size={14} style={{ color: sortConfig.key === sortKey ? '#1d4ed8' : '#94a3b8' }} />
      </div>
    </th>
  );

  return (
    <>
      <div className="inv-desktop-only">
        <table className="inv-table">
          <thead>
            <tr>
              <SortableHeader label="Producto / Herramienta" sortKey="nombre" />
              <th style={{ textAlign: 'center', padding: '1rem' }}>Tipo</th>
              <SortableHeader label="Stock Actual" sortKey="stock" />
              <th style={{ textAlign: 'center', padding: '1rem' }}>Estado</th>
              <SortableHeader label="Costo Unitario" sortKey="costo" />
              <th style={{ textAlign: 'center', padding: '1rem' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.length === 0 && (
              <tr>
                <td colSpan={6} className="inv-empty" style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                  No se encontraron productos ni herramientas registradas.
                </td>
              </tr>
            )}
            {sortedItems.map(item => (
              <ProductRow 
                key={item.id} 
                item={item} 
                isAdmin={isAdmin} 
                onViewHistory={onViewHistory} 
                onEdit={onEdit} 
                onDelete={onDelete} 
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile View */}
      <div className="inv-mobile-only">
        <div className="inv-mobile-cards-grid">
          {sortedItems.length === 0 && (
            <div className="inv-empty-mobile" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
              No se encontraron registros.
            </div>
          )}
          {sortedItems.map(item => (
            <ProductMobileCard 
              key={item.id} 
              item={item} 
              isAdmin={isAdmin} 
              onViewHistory={onViewHistory} 
              onEdit={onEdit} 
              onDelete={onDelete} 
            />
          ))}
        </div>
      </div>
    </>
  );
}
