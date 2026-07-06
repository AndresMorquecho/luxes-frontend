/** Usuario del quiosco de marcaciones (rol o cuenta dedicada). */
export function isAsistenciaUser(user) {
  if (!user) return false;
  const rol = (user.rol || '').toLowerCase().trim();
  const username = (user.username || '').toLowerCase().trim();
  return rol === 'asistencia' || username === 'asistencia';
}

export function isTallerUser(user) {
  if (!user) return false;
  const rol = (user.rol || '').toLowerCase().trim();
  const username = (user.username || '').toLowerCase().trim();
  return rol === 'taller' || username === 'taller';
}

/** Normaliza rol para comparaciones (sin tildes, minúsculas). */
export function normalizeRolKey(rol) {
  return (rol || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function isTallerRolValue(rol) {
  return normalizeRolKey(rol) === 'taller';
}

/** En fase instalación, el rol Taller solo ve personal con usuario de rol Taller. */
export function filterEmpleadosParaInstalacion(empleados, currentUser) {
  if (!isTallerUser(currentUser)) return empleados || [];
  return (empleados || []).filter((emp) => isTallerRolValue(emp.rol));
}

export function isAdminUser(user) {
  if (!user) return false;
  const rol = (user.rol || '').toLowerCase().trim();
  const username = (user.username || '').toLowerCase().trim();
  if (username === 'admin') return true;
  return rol === 'admin' || rol === 'administrador';
}

export function isImpresionUser(user) {
  const rol = (user?.rol || '').toUpperCase();
  return rol === 'IMPRESIÓN' || rol === 'IMPRESION';
}

export function getDisplayRole(user) {
  if (!user) return 'Usuario';
  if (isAdminUser(user)) return 'Administrador';
  if (isAsistenciaUser(user)) return 'Asistencia';
  if (isTallerUser(user)) return 'Taller';
  return user.rol || 'Usuario';
}

/** Normaliza el usuario guardado en sesión (corrige roles de cuentas de sistema). */
export function normalizeUserForSession(user) {
  if (!user) return user;
  if (isAsistenciaUser(user)) return { ...user, rol: 'asistencia' };
  if (isTallerUser(user)) return { ...user, rol: user.rol || 'Taller' };
  if ((user.username || '').toLowerCase() === 'admin' || isAdminUser(user)) {
    return { ...user, rol: 'Administrador' };
  }
  return user;
}

/** Ruta inicial según el rol efectivo tras login. */
export function getPostLoginPath(user) {
  const normalized = normalizeUserForSession(user);
  if (isAsistenciaUser(normalized)) return '/nomina/registro-asistencia';
  if (isTallerUser(normalized)) return '/notificaciones';
  if (isImpresionUser(normalized)) return '/colas-impresion';
  if (isAdminUser(normalized)) return '/';
  return '/';
}
