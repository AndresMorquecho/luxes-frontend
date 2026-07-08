import React, { useState, useMemo } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { ProductRow } from './ProductRow.jsx';
import { ProductMobileCard } from './ProductMobileCard.jsx';

export function InventoryTable({ items, activeTab, isAdmin, onViewHistory, onEdit, onDelete }) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const getEstado = (item) => {
    const isTool = item.tipo === 'herramienta';
    const tracksStock = item.descargaStock !== undefined ? item.descargaStock : !(item.categoria?.toLowerCase() === 'taller' || item.categoria?.toLowerCase() === 'oficina');
    if (isTool) return String(item.estadoUso || '').toUpperCase();
    if (!tracksStock) return 'SOLO REGISTRO';
    if (item.stockActual === 0) return 'AGOTADO';
    if (item.stockActual <= item.stockMinimo) return 'STOCK BAJO';
    return 'EN STOCK';
  };

  const sortedItems = useMemo(() => {
    let sortableItems = [...items];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue, bValue;

        if (sortConfig.key === 'estado') {
          aValue = getEstado(a);
          bValue = getEstado(b);
        } else if (sortConfig.key === 'costo') {
          aValue = a.precioCosto || 0;
          bValue = b.precioCosto || 0;
        } else if (sortConfig.key === 'cpp') {
          aValue = a.costoPromedioPonderado !== undefined ? a.costoPromedioPonderado : (a.precioCosto || 0);
          bValue = b.costoPromedioPonderado !== undefined ? b.costoPromedioPonderado : (b.precioCosto || 0);
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
              <th style={{ padding: '1rem' }}>Producto / Equipo</th>
              {activeTab === 'all' && <th style={{ textAlign: 'center', padding: '1rem' }}>Sección</th>}
              <th style={{ padding: '1rem' }}>Stock / Disp.</th>
              <SortableHeader label="Estado" sortKey="estado" align="center" />
              <SortableHeader label="Costo Unit." sortKey="costo" />
              <SortableHeader label="CPP" sortKey="cpp" />
              <th style={{ padding: '1rem' }}>Última Compra</th>
              <th style={{ textAlign: 'center', padding: '1rem' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.length === 0 && (
              <tr>
                <td colSpan={activeTab === 'all' ? 8 : 7} className="inv-empty" style={{ padding: '2rem', textAlign: 'center' }}>
                  Sin productos registrados.
                </td>
              </tr>
            )}
            {sortedItems.map(item => (
              <ProductRow 
                key={item.id} 
                item={item} 
                activeTab={activeTab} 
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
            <div className="inv-empty-mobile" style={{ padding: '2rem', textAlign: 'center' }}>Sin productos registrados.</div>
          )}
          {sortedItems.map(item => (
            <ProductMobileCard 
              key={item.id} 
              item={item} 
              activeTab={activeTab} 
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
