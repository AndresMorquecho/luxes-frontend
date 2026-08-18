import React from 'react';
import { Package, Wrench } from 'lucide-react';

const COMMON_BADGE_STYLE = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.35rem',
  padding: '0.2rem 0.6rem',
  borderRadius: '9999px',
  fontSize: '0.75rem',
  fontWeight: 600,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box'
};

export function SectionBadge({ section, tipo }) {
  const isHerramienta = tipo === 'herramienta' || String(section || '').toLowerCase() === 'herramienta' || String(section || '').toLowerCase() === 'taller';

  if (isHerramienta) {
    return (
      <span style={{ 
        ...COMMON_BADGE_STYLE, 
        color: '#0369a1', 
        backgroundColor: '#e0f2fe', 
        border: '1px solid #bae6fd' 
      }}>
        <Wrench size={12} />
        Herramienta
      </span>
    );
  }

  return (
    <span style={{ 
      ...COMMON_BADGE_STYLE, 
      color: '#15803d', 
      backgroundColor: '#dcfce7', 
      border: '1px solid #bbf7d0' 
    }}>
      <Package size={12} />
      Producto
    </span>
  );
}

