/**
 * Helpers para gestión de roles en Luxes.
 * Sistema simplificado a 2 roles: Administrador y Trabajador.
 */

export function isAdminUser(user) {
  if (!user) return false;
  const rol = (user.rol || '').toLowerCase().trim();
  const username = (user.username || '').toLowerCase().trim();
  if (username === 'admin') return true;
  return rol === 'admin' || rol === 'administrador';
}

export function isTrabajadorUser(user) {
  if (!user) return false;
  return !isAdminUser(user);
}

export function isAsistenciaUser(user) {
  return isTrabajadorUser(user);
}

export function isTallerUser(user) {
  return isTrabajadorUser(user);
}

export function isImpresionUser() {
  return false;
}

export function normalizeRolKey(rol) {
  return (rol || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function filterEmpleadosParaInstalacion(empleados) {
  return empleados || [];
}

export function getDisplayRole(user) {
  if (!user) return 'Usuario';
  if (isAdminUser(user)) return 'Administrador';
  return 'Trabajador';
}

/** Normaliza el usuario guardado en sesión */
export function normalizeUserForSession(user) {
  if (!user) return user;
  if (isAdminUser(user)) {
    return { ...user, rol: 'Administrador' };
  }
  return { ...user, rol: 'Trabajador' };
}

/** Ruta inicial según el rol efectivo tras login */
export function getPostLoginPath(user) {
  const normalized = normalizeUserForSession(user);
  if (isAdminUser(normalized)) return '/';
  // Trabajador entra directo a Gestión de Proyectos
  return '/proyectos';
}
