/** Claves de categoría para personalizar el sidebar (admin). */
export const SIDEBAR_MODULES = [
  { key: 'finanzas', label: 'Finanzas' },
  { key: 'nomina', label: 'Nómina' },
  { key: 'proformas', label: 'Proformas' },
  { key: 'inventario', label: 'Inventario' },
  { key: 'gastos', label: 'Gastos' },
  { key: 'tareas', label: 'Tareas' },
  { key: 'compras', label: 'Compras' },
  { key: 'proyectos', label: 'Proyectos' },
  { key: 'ventas', label: 'Ventas' },
  { key: 'relaciones', label: 'Contactos (Clientes/Proveedores)' }
];

export const DEFAULT_HIDDEN_MODULES = [];

const CATEGORY_BY_MODULE = {
  proformas: 'comercial',
  clientes: 'comercial',
  proyectos: 'comercial',
  ventas: 'comercial',
  relaciones: 'comercial',
  inventario: 'operaciones',
  tareas: 'operaciones',
  compras: 'compras',
  proveedores: 'compras',
  gastos: 'finanzas',
  movimientos: 'finanzas',
  cierreCaja: 'finanzas',
  metodosPago: 'finanzas',
  nomina: 'personas',
  empleados: 'personas',
  asistencia: 'personas',
};

/** Migra claves obsoletas del sidebar guardadas en BD. */
export function normalizeHiddenModules(modules) {
  if (!modules) return [];
  let hidden = [...modules];

  // Si tiene las claves de categorías viejas en BD, las expandimos a los módulos individuales correspondientes
  if (hidden.includes('comercial')) {
    hidden.push('proformas', 'proyectos', 'ventas', 'relaciones');
  }
  if (hidden.includes('operaciones')) {
    hidden.push('tallerImpresion', 'inventario', 'instalaciones', 'tareas', 'controlVehiculos');
  }
  if (hidden.includes('personas')) {
    hidden.push('nomina');
  }
  if (hidden.includes('finanzas')) {
    hidden.push('gastos');
  }

  // Removemos las claves obsoletas para que no sigan persistidas
  const oldCategories = ['comercial', 'operaciones', 'personas'];
  hidden = hidden.filter(h => !oldCategories.includes(h));

  return [...new Set(hidden)];
}

export function isModuleHidden(hiddenModules, moduleKey) {
  if (!hiddenModules) return false;
  return hiddenModules.includes(moduleKey);
}
