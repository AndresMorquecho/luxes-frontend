import React from 'react';
import { Tag, Wrench, Package, Layers, Sparkles, Shield, Disc, Boxes, Hammer } from 'lucide-react';

const CATEGORY_COLORS = {
  aluminio: { color: '#0b2d64', bg: '#eff6ff', border: '#bfdbfe', Icon: Layers },
  vidrio: { color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd', Icon: Sparkles },
  acm: { color: '#b45309', bg: '#fef3c7', border: '#fde68a', Icon: Disc },
  herrajes: { color: '#6d28d9', bg: '#f5f3ff', border: '#ddd6fe', Icon: Shield },
  selladores: { color: '#047857', bg: '#ecfdf5', border: '#a7f3d0', Icon: Package },
  herramientas: { color: '#c2410c', bg: '#fff7ed', border: '#fed7aa', Icon: Wrench },
  tornilleria: { color: '#475569', bg: '#f8fafc', border: '#cbd5e1', Icon: Hammer },
  acrilicos: { color: '#be185d', bg: '#fdf2f8', border: '#fbcfe8', Icon: Boxes },
  default: { color: '#0b2d64', bg: '#f1f5f9', border: '#e2e8f0', Icon: Tag },
};

export function SectionBadge({ section, tipo }) {
  const label = section || (tipo === 'herramienta' ? 'Herramientas' : 'Insumos');
  const lower = String(label).toLowerCase();

  let theme = CATEGORY_COLORS.default;
  if (lower.includes('alumin') || lower.includes('perfil')) {
    theme = CATEGORY_COLORS.aluminio;
  } else if (lower.includes('vidri') || lower.includes('cristal') || lower.includes('templad')) {
    theme = CATEGORY_COLORS.vidrio;
  } else if (lower.includes('acm') || lower.includes('alucobond') || lower.includes('panel')) {
    theme = CATEGORY_COLORS.acm;
  } else if (lower.includes('herraj') || lower.includes('accesori') || lower.includes('cerradur')) {
    theme = CATEGORY_COLORS.herrajes;
  } else if (lower.includes('sellad') || lower.includes('silicon') || lower.includes('insumo') || lower.includes('quimic')) {
    theme = CATEGORY_COLORS.selladores;
  } else if (lower.includes('herramient') || lower.includes('equipo') || lower.includes('taller')) {
    theme = CATEGORY_COLORS.herramientas;
  } else if (lower.includes('tornill') || lower.includes('anclaj') || lower.includes('fijacion') || lower.includes('fijación')) {
    theme = CATEGORY_COLORS.tornilleria;
  } else if (lower.includes('acril') || lower.includes('plancha') || lower.includes('policarbonat')) {
    theme = CATEGORY_COLORS.acrilicos;
  }

  const Icon = theme.Icon;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.35rem',
        padding: '0.25rem 0.7rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 700,
        whiteSpace: 'nowrap',
        color: theme.color,
        backgroundColor: theme.bg,
        border: `1px solid ${theme.border}`,
      }}
    >
      <Icon size={12} />
      {label}
    </span>
  );
}


