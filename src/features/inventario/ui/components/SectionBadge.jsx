import React from 'react';
import { Monitor, Printer, Wrench } from 'lucide-react';

const SECTIONS = {
  oficina: { icon: Monitor, cls: 'bg-violet-50 text-violet-700' },
  impresión: { icon: Printer, cls: 'bg-amber-50 text-amber-700' },
  impresion: { icon: Printer, cls: 'bg-amber-50 text-amber-700' },
  taller: { icon: Wrench, cls: 'bg-blue-50 text-blue-700' },
};

export function SectionBadge({ section }) {
  const lower = String(section || 'Taller').toLowerCase();
  const conf = SECTIONS[lower] || SECTIONS.taller;
  const Icon = conf.icon;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full text-xs font-medium px-2.5 py-1 whitespace-nowrap ${conf.cls}`}>
      <Icon size={12} />
      {section || 'Taller'}
    </span>
  );
}
