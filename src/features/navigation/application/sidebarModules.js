/** Claves de categoría para personalizar el sidebar (admin). */
export const SIDEBAR_MODULES = [
  { key: 'comercial', label: 'Comercial' },
  { key: 'operaciones', label: 'Operaciones' },
  { key: 'compras', label: 'Compras' },
  { key: 'finanzas', label: 'Finanzas' },
  { key: 'personas', label: 'Personas' },
];

export const DEFAULT_HIDDEN_MODULES = [];

const CATEGORY_BY_MODULE = {
  proformas: 'comercial',
  clientes: 'comercial',
  proyectos: 'comercial',
  ventas: 'comercial',
  tallerImpresion: 'operaciones',
  inventario: 'operaciones',
  recepcion: 'operaciones',
  instalaciones: 'operaciones',
  tareas: 'operaciones',
  compras: 'compras',
  proveedores: 'compras',
  gastos: 'finanzas',
  movimientos: 'finanzas',
  cierreCaja: 'finanzas',
  flota: 'finanzas',
  metodosPago: 'finanzas',
  nomina: 'personas',
  empleados: 'personas',
  asistencia: 'personas',
  credenciales: 'personas',
};

/** Migra claves obsoletas del sidebar guardadas en BD. */
export function normalizeHiddenModules(modules) {
  let hidden = [...(modules || [])];

  hidden = hidden.filter((key) => key !== 'reportesFinancieros' && key !== 'relaciones');

  if (hidden.includes('cierreCaja')) {
    hidden = hidden.filter((key) => key !== 'cierreCaja');
    if (!hidden.includes('finanzas')) hidden.push('finanzas');
  }

  if (hidden.includes('nomina') && !hidden.includes('personas')) {
    hidden.push('personas');
  }
  hidden = hidden.filter((key) => key !== 'nomina');

  if (hidden.includes('gastos') && !hidden.includes('finanzas')) {
    hidden.push('finanzas');
  }
  hidden = hidden.filter((key) => key !== 'gastos');

  if (hidden.includes('finanzas')) {
    hidden = hidden.filter((key) => key !== 'gastos' && key !== 'cierreCaja');
  }

  return [...new Set(hidden)];
}

export function isModuleHidden(hiddenModules, moduleKey) {
  if (hiddenModules.includes(moduleKey)) return true;
  const category = CATEGORY_BY_MODULE[moduleKey];
  return category ? hiddenModules.includes(category) : false;
}
