/** Claves de categoría para personalizar el sidebar (admin). */
export const SIDEBAR_MODULES = [
  { key: 'proformas', label: 'Proformas' },
  { key: 'proyectos', label: 'Gestión de Proyectos' },
  { key: 'ventas', label: 'Ventas' },
  { key: 'relaciones', label: 'Contactos (Clientes/Proveedores)' },
  { key: 'tallerImpresion', label: 'Taller de Impresión' },
  { key: 'inventario', label: 'Inventario' },
  { key: 'controlVehiculos', label: 'Control de Vehículos' },
  { key: 'instalaciones', label: 'Instalaciones' },
  { key: 'tareas', label: 'Tareas' },
  { key: 'compras', label: 'Compras' },
  { key: 'gastos', label: 'Gastos' },
  { key: 'finanzas', label: 'Finanzas (Balances/Caja)' },
  { key: 'nomina', label: 'Nómina y Asistencia' }
];

export const DEFAULT_HIDDEN_MODULES = [];

const CATEGORY_BY_MODULE = {
  proformas: 'comercial',
  clientes: 'comercial',
  proyectos: 'comercial',
  ventas: 'comercial',
  relaciones: 'comercial',
  tallerImpresion: 'operaciones',
  inventario: 'operaciones',
  recepcion: 'operaciones',
  instalaciones: 'operaciones',
  tareas: 'operaciones',
  devolucionesTaller: 'operaciones',
  controlVehiculos: 'operaciones',
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
  return [...new Set(modules || [])];
}

export function isModuleHidden(hiddenModules, moduleKey) {
  if (!hiddenModules) return false;
  if (hiddenModules.includes(moduleKey)) return true;
  const category = CATEGORY_BY_MODULE[moduleKey];
  return category ? hiddenModules.includes(category) : false;
}
