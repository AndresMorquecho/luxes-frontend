import React, { useState, useMemo } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { ProductRow } from './ProductRow.jsx';
import { ProductMobileCard } from './ProductMobileCard.jsx';

const thClass = 'text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider';

export function InventoryTable({ items, activeTab, isAdmin, onViewHistory, onEdit, onDelete }) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const getEstado = (item) => {
    const isTool = item.tipo === 'herramienta';
    const tracksStock = item.descargaStock !== undefined
      ? item.descargaStock
      : !(item.categoria?.toLowerCase() === 'taller' || item.categoria?.toLowerCase() === 'oficina');
    if (isTool) return String(item.estadoUso || '').toUpperCase();
    if (!tracksStock) return 'SOLO REGISTRO';
    if (item.stockActual === 0) return 'AGOTADO';
    if (item.stockActual <= item.stockMinimo) return 'STOCK BAJO';
    return 'EN STOCK';
  };

  const sortedItems = useMemo(() => {
    const sortableItems = [...items];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue;
        let bValue;

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

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
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
    <th
      className={`${thClass} ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'} cursor-pointer select-none`}
      onClick={() => requestSort(sortKey)}
    >
      <div className={`inline-flex items-center gap-1.5 ${align === 'right' ? 'justify-end w-full' : align === 'center' ? 'justify-center w-full' : ''}`}>
        {label}
        <ArrowUpDown size={12} className={sortConfig.key === sortKey ? 'text-blue-600' : 'text-slate-400'} />
      </div>
    </th>
  );

  const colSpan = activeTab === 'all' ? 8 : 7;

  return (
    <>
      <div className="hidden md:block overflow-x-auto relative">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className={thClass}>Producto / Equipo</th>
              {activeTab === 'all' && <th className={`${thClass} text-center`}>Sección</th>}
              <th className={thClass}>Stock / Disp.</th>
              <SortableHeader label="Estado" sortKey="estado" align="left" />
              <SortableHeader label="Costo Unit." sortKey="costo" />
              <SortableHeader label="CPP" sortKey="cpp" />
              <th className={thClass}>Última Compra</th>
              <th className={`${thClass} text-right`}>Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedItems.length === 0 && (
              <tr>
                <td colSpan={colSpan} className="text-center py-12 text-sm text-slate-400">
                  Sin productos registrados.
                </td>
              </tr>
            )}
            {sortedItems.map((item) => (
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

      <div className="md:hidden">
        <div className="divide-y divide-slate-100">
          {sortedItems.length === 0 && (
            <div className="text-center py-12 text-sm text-slate-400 px-4">Sin productos registrados.</div>
          )}
          {sortedItems.map((item) => (
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
