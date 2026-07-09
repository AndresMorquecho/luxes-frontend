import React from 'react';
import { Monitor, Printer, Wrench } from 'lucide-react';

const COMMON_BADGE_STYLE = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.3rem',
  width: '100px',
  height: '24px',
  padding: '0 0.5rem',
  borderRadius: '0.375rem',
  fontSize: '0.75rem',
  fontWeight: 600,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box'
};

const SECTIONS = {
  oficina: { icon: Monitor, color: '#9333ea', bg: '#faf5ff' },
  impresión: { icon: Printer, color: '#e65100', bg: '#fff3e0' },
  impresion: { icon: Printer, color: '#e65100', bg: '#fff3e0' },
  taller: { icon: Wrench, color: '#1d4ed8', bg: '#eff6ff' },
};

export function SectionBadge({ section }) {
  const lower = String(section || 'Taller').toLowerCase();
  const conf = SECTIONS[lower] || SECTIONS.taller;
  const Icon = conf.icon;
  
  return (
    <span style={{ ...COMMON_BADGE_STYLE, color: conf.color, backgroundColor: conf.bg, border: `1px solid ${conf.color}30` }}>
      <Icon size={12} />
      {section || 'Taller'}
    </span>
  );
}
