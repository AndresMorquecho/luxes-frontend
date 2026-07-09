import React from 'react';

const COMMON_BADGE_STYLE = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100px',
  height: '24px',
  fontSize: '0.75rem',
  fontWeight: 600,
  borderRadius: '0.375rem',
  whiteSpace: 'nowrap',
  boxSizing: 'border-box'
};

const CONFIG = {
  'agotado': { bg: '#ffebee', color: '#c62828', label: 'Agotado' },
  'solo registro': { bg: '#f5f5f5', color: '#666666', label: 'Solo registro' },
  'en uso': { bg: '#fff3e0', color: '#e65100', label: 'En Uso' },
  'stock bajo': { bg: '#fff3e0', color: '#e65100', label: 'Stock Bajo' },
  'en stock': { bg: '#e8f5e9', color: '#2e7d32', label: 'En Stock' },
  'dañado': { bg: '#ffebee', color: '#c62828', label: 'Dañado' },
  'reparación': { bg: '#e3f2fd', color: '#1565c0', label: 'Reparación' },
  'bodega': { bg: '#e8f5e9', color: '#2e7d32', label: 'Bodega' },
};

export function StatusBadge({ status }) {
  const lowerStatus = String(status || '').toLowerCase();
  
  let key = lowerStatus;
  if (key === 'no sirve') key = 'dañado';
  if (key === 'en reparacion' || key === 'en reparación') key = 'reparación';
  
  const conf = CONFIG[key] || { bg: '#f1f5f9', color: '#475569', label: status };
  
  return (
    <span style={{ ...COMMON_BADGE_STYLE, backgroundColor: conf.bg, color: conf.color }}>
      {conf.label}
    </span>
  );
}
