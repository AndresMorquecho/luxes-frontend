import React, { useEffect, useState } from 'react';
import { Users, Plus, Search, X, Eye, EyeOff, UserPlus, KeyRound, Shield } from 'lucide-react';
import { ModalPortal, deferClose } from '../../../../shared/ui/components/ModalPortal.jsx';
import {
  getUsuarios,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  toggleUsuarioStatus,
  cambiarUsuarioPassword,
  getRoles,
  createRol,
  updateRol,
  deleteRol,
  getPermissions,
  getAuditLogs
} from '../../application/usuariosService';
import { toast } from '../../../../shared/ui/components/Toast';
import { confirmDialog } from '../../../../shared/ui/components/ConfirmModal';
import {
  ComprasPageHeader,
  ComprasHeaderButton,
} from '../../../compras/ui/components/ComprasPageHeader';

const EMPTY_USER_FORM = { nombre: '', email: '', username: '', password: '', roleId: '', rol: '', estado: 'activo' };
const EMPTY_ROLE_FORM = { name: '', description: '', permissions: [] };

const inputClass =
  'w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-gray-50 text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:bg-white transition-colors';

const initial = (name) => name?.charAt(0)?.toUpperCase() ?? '?';

const ROL_COLORS = {
  administrador: { bg: 'bg-slate-100', color: 'text-slate-700', border: 'border-slate-200' },
  taller: { bg: 'bg-blue-50', color: 'text-blue-700', border: 'border-blue-100' },
  'ventas / diseñador': { bg: 'bg-amber-50', color: 'text-amber-700', border: 'border-amber-200' },
  'ventas / disenador': { bg: 'bg-amber-50', color: 'text-amber-700', border: 'border-amber-200' },
  'impresión': { bg: 'bg-blue-50', color: 'text-blue-700', border: 'border-blue-100' },
  impresion: { bg: 'bg-blue-50', color: 'text-blue-700', border: 'border-blue-100' },
  default: { bg: 'bg-slate-50', color: 'text-slate-600', border: 'border-slate-200' },
};

const getRoleStyle = (roleName) => {
  const norm = roleName?.toLowerCase() || '';
  return ROL_COLORS[norm] || ROL_COLORS.default;
};

export const UsuariosPage = () => {
  // Tabs state: 'usuarios' | 'roles' | 'auditoria'
  const [activeTab, setActiveTab] = useState('usuarios');

  // Core Data States
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals States
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState(EMPTY_USER_FORM);

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordUser, setPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  const [showUserPassword, setShowUserPassword] = useState(false);

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleForm, setRoleForm] = useState(EMPTY_ROLE_FORM);

  // Search & Filter States
  const [userSearch, setUserSearch] = useState('');
  const [logSearch, setLogSearch] = useState('');
  const [logFilterUser, setLogFilterUser] = useState('');
  const [logFilterModulo, setLogFilterModulo] = useState('');
  const [logFilterSeverity, setLogFilterSeverity] = useState('');

  const [saving, setSaving] = useState(false);

  // Fetch all database dependencies
  const loadData = async () => {
    setLoading(true);
    try {
      const [allUsers, allRoles, allPermissions, allLogs] = await Promise.all([
        getUsuarios(),
        getRoles(),
        getPermissions(),
        getAuditLogs()
      ]);
      setUsers(allUsers);
      setRoles(allRoles);
      setPermissions(allPermissions);
      setAuditLogs(allLogs);
    } catch (err) {
      console.error('Error loading admin settings data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync audit logs when filter values change
  useEffect(() => {
    if (activeTab === 'auditoria') {
      const fetchFilteredLogs = async () => {
        try {
          const logs = await getAuditLogs({
            search: logSearch,
            userId: logFilterUser,
            modulo: logFilterModulo,
            severidad: logFilterSeverity
          });
          setAuditLogs(logs);
        } catch (err) {
          console.error(err);
        }
      };
      const delayDebounce = setTimeout(() => {
        fetchFilteredLogs();
      }, 300);
      return () => clearTimeout(delayDebounce);
    }
  }, [logSearch, logFilterUser, logFilterModulo, logFilterSeverity, activeTab]);

  // --- USER HANDLERS ---
  const handleOpenNewUser = () => {
    setEditingUser(null);
    setUserForm({ ...EMPTY_USER_FORM, roleId: roles[0]?.id || '', rol: roles[0]?.name || '' });
    setShowUserPassword(false);
    setUserModalOpen(true);
  };

  const handleOpenEditUser = (u) => {
    setEditingUser(u);
    setUserForm({
      nombre: u.nombre,
      email: u.email,
      username: u.username,
      password: '',
      roleId: u.roleId || '',
      rol: u.rol || '',
      estado: u.estado
    });
    setShowUserPassword(false);
    setUserModalOpen(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const selectedRoleObj = roles.find(r => r.id === userForm.roleId);
      const payload = {
        ...userForm,
        rol: selectedRoleObj?.name || userForm.rol
      };

      const successMessage = editingUser
        ? 'Usuario actualizado correctamente'
        : 'Usuario creado correctamente';

      if (editingUser) {
        const updated = await updateUsuario(editingUser.id, payload);
        setUsers(prev => prev.map(u => (u.id === editingUser.id ? updated : u)));
      } else {
        const created = await createUsuario(payload);
        setUsers(prev => [created, ...prev]);
      }

      deferClose(() => {
        setUserModalOpen(false);
        setSaving(false);
        toast.success(successMessage);
      });
      deferClose(async () => {
        const updatedLogs = await getAuditLogs();
        setAuditLogs(updatedLogs);
      });
    } catch (err) {
      deferClose(() => setSaving(false));
      toast.error(err instanceof Error ? err.message : 'Error al guardar el usuario');
    }
  };

  const handleToggleUserStatus = async (u) => {
    try {
      const updated = await toggleUsuarioStatus(u.id);
      setUsers(prev => prev.map(item => (item.id === u.id ? updated : item)));
      const updatedLogs = await getAuditLogs();
      setAuditLogs(updatedLogs);
      toast.success(`Usuario ${updated.estado === 'activo' ? 'activado' : 'desactivado'} correctamente`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cambiar estado');
    }
  };

  const handleOpenPasswordModal = (u) => {
    setPasswordUser(u);
    setNewPassword('');
    setShowUserPassword(false);
    setPasswordModalOpen(true);
  };

  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.warning('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setSaving(true);
    try {
      await cambiarUsuarioPassword(passwordUser.id, newPassword);
      deferClose(() => setPasswordModalOpen(false));
      toast.success('Contraseña actualizada correctamente');
      deferClose(async () => {
        const updatedLogs = await getAuditLogs();
        setAuditLogs(updatedLogs);
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar contraseña');
    } finally {
      deferClose(() => setSaving(false));
    }
  };

  const handleDeleteUser = async (id) => {
    const confirmed = await confirmDialog(
      '¿Eliminar usuario?',
      '¿Eliminar permanentemente este usuario? Esta acción es irreversible.',
      { confirmLabel: 'Eliminar', cancelLabel: 'Cancelar', type: 'danger' }
    );
    if (!confirmed) return;
    try {
      await deleteUsuario(id);
      setUsers(prev => prev.filter(u => u.id !== id));
      const updatedLogs = await getAuditLogs();
      setAuditLogs(updatedLogs);
      deferClose(() => toast.success('Usuario eliminado correctamente'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar usuario');
    }
  };

  // --- ROLE HANDLERS ---
  const handleOpenNewRole = () => {
    setEditingRole(null);
    setRoleForm(EMPTY_ROLE_FORM);
    setRoleModalOpen(true);
  };

  const handleOpenEditRole = (r) => {
    setEditingRole(r);
    setRoleForm({
      name: r.name,
      description: r.description || '',
      permissions: r.permissions || []
    });
    setRoleModalOpen(true);
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    if (!roleForm.name) {
      toast.warning('El nombre del rol es requerido');
      return;
    }
    setSaving(true);
    try {
      if (editingRole) {
        const updated = await updateRol(editingRole.id, roleForm);
        setRoles(prev => prev.map(r => (r.id === editingRole.id ? updated : r)));
        toast.success('Rol actualizado correctamente');
      } else {
        const created = await createRol(roleForm);
        setRoles(prev => [...prev, created]);
        toast.success('Rol creado correctamente');
      }
      deferClose(() => setRoleModalOpen(false));
      deferClose(async () => {
        const updatedLogs = await getAuditLogs();
        setAuditLogs(updatedLogs);
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar el rol');
    } finally {
      deferClose(() => setSaving(false));
    }
  };

  const handleDeleteRole = async (id) => {
    const confirmed = await confirmDialog(
      '¿Eliminar rol?',
      '¿Eliminar este rol de acceso? Todos los usuarios vinculados a este rol perderán sus permisos.',
      { confirmLabel: 'Eliminar', cancelLabel: 'Cancelar', type: 'danger' }
    );
    if (!confirmed) return;
    try {
      await deleteRol(id);
      setRoles(prev => prev.filter(r => r.id !== id));
      const updatedLogs = await getAuditLogs();
      setAuditLogs(updatedLogs);
      toast.success('Rol eliminado correctamente');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar rol');
    }
  };

  const handlePermissionToggle = (key) => {
    setRoleForm(prev => {
      const alreadyHas = prev.permissions.includes(key);
      const updated = alreadyHas
        ? prev.permissions.filter(k => k !== key)
        : [...prev.permissions, key];
      return { ...prev, permissions: updated };
    });
  };

  const cleanFilters = () => {
    setLogSearch('');
    setLogFilterUser('');
    setLogFilterModulo('');
    setLogFilterSeverity('');
  };

  const exportCSV = () => {
    // Generate a simple CSV file simulation
    const headers = 'Fecha,Usuario,Acción,Módulo,Detalle,Severidad\n';
    const rows = auditLogs
      .map(
        l =>
          `"${new Date(l.fecha).toLocaleString()}",` +
          `"${l.user?.nombre || l.usuarioNom || 'Sistema'}",` +
          `"${l.accion}",` +
          `"${l.modulo}",` +
          `"${l.detalle}",` +
          `"${l.severidad}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `luxes_auditoria_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter local users list
  const filteredUsers = users.filter(
    u =>
      !userSearch ||
      u.nombre.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.rol || '').toLowerCase().includes(userSearch.toLowerCase())
  );

  const stats = {
    total: users.length,
    activos: users.filter(u => u.estado === 'activo').length,
    inactivos: users.filter(u => u.estado === 'inactivo').length
  };

  return (
    <div
      className="space-y-3 sm:space-y-5 animate-slide-up pb-10"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <style>{`
        .shadow-card { box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02); }
      `}</style>

      <ComprasPageHeader
        icon={Users}
        badge="Accesos"
        title="Usuarios"
        subtitle="Administra el acceso y los permisos del sistema"
        action={
          activeTab === 'usuarios' ? (
            <ComprasHeaderButton onClick={handleOpenNewUser}>
              <Plus size={15} />
              Nuevo usuario
            </ComprasHeaderButton>
          ) : undefined
        }
        tabs={(
          <>
            <button
              type="button"
              onClick={() => setActiveTab('usuarios')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === 'usuarios'
                  ? 'bg-white text-blue-700 shadow-sm border border-blue-100'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
              }`}
            >
              Usuarios
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('auditoria')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                activeTab === 'auditoria'
                  ? 'bg-white text-blue-700 shadow-sm border border-blue-100'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
              }`}
            >
              Auditoría
            </button>
          </>
        )}
      />

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2 text-slate-400 text-sm">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-blue-600" />
          <span>Cargando...</span>
        </div>
      ) : (
        <>
          {activeTab === 'usuarios' && (
            <div className="space-y-3 sm:space-y-5">
              <div className="grid grid-cols-3 max-sm:grid-cols-2 gap-2 sm:gap-3">
                <div className="bg-white shadow-card rounded-xl border border-gray-100 border-t-2 border-t-blue-600 px-2.5 sm:px-4 py-3 sm:py-4 min-w-0 max-sm:col-span-2">
                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total usuarios</p>
                  <p className="text-base sm:text-lg font-bold text-blue-600 mt-1 tabular-nums">{stats.total}</p>
                </div>
                <div className="bg-white shadow-card rounded-xl border border-gray-100 border-t-2 border-t-emerald-500 px-2.5 sm:px-4 py-3 sm:py-4 min-w-0">
                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Activos</p>
                  <p className="text-base sm:text-lg font-bold text-emerald-600 mt-1 tabular-nums">{stats.activos}</p>
                </div>
                <div className="bg-white shadow-card rounded-xl border border-gray-100 border-t-2 border-t-red-500 px-2.5 sm:px-4 py-3 sm:py-4 min-w-0">
                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">Inactivos</p>
                  <p className="text-base sm:text-lg font-bold text-red-500 mt-1 tabular-nums">{stats.inactivos}</p>
                </div>
              </div>

              <div className="bg-white shadow-card rounded-xl border border-gray-100 overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <h2 className="text-sm font-semibold text-gray-800">Lista de usuarios</h2>
                    <span className="text-xs font-medium text-gray-400">{filteredUsers.length} registros</span>
                  </div>
                  <div className="relative w-full sm:w-auto">
                    <Search
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      className="pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 bg-gray-50 focus:bg-white w-full sm:w-80 sm:min-w-[280px] transition-colors"
                      placeholder="Buscar usuario..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="hidden md:block overflow-x-auto relative">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Usuario</th>
                        <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Contacto</th>
                        <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Rol</th>
                        <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                        <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Último acceso</th>
                        <th className="text-right px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.map((u) => {
                        const rStyle = getRoleStyle(u.rol);
                        return (
                          <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 bg-blue-50 text-blue-600 border border-blue-100">
                                  {initial(u.nombre)}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-900 leading-tight truncate">{u.nombre}</p>
                                  <p className="text-xs text-slate-400 font-mono mt-0.5">{u.id}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-700">{u.email}</td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${rStyle.bg} ${rStyle.color}`}>
                                {u.rol || 'Visor'}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex items-center rounded-full text-xs font-medium px-2.5 py-1 ${
                                  u.estado === 'activo'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-rose-50 text-rose-700'
                                }`}
                              >
                                {u.estado === 'activo' ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-700 whitespace-nowrap">
                              {u.ultimoAcceso ? new Date(u.ultimoAcceso).toLocaleString() : 'Nunca'}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {u.username !== 'asistencia' && (
                                  <button
                                    type="button"
                                    onClick={() => handleToggleUserStatus(u)}
                                    className={`p-1.5 rounded-lg border transition-colors ${
                                      u.estado === 'activo'
                                        ? 'bg-rose-50 text-rose-500 border-rose-100 hover:bg-rose-100 hover:text-rose-600'
                                        : 'bg-emerald-50 text-emerald-500 border-emerald-100 hover:bg-emerald-100 hover:text-emerald-600'
                                    }`}
                                    title={u.estado === 'activo' ? 'Desactivar' : 'Activar'}
                                    aria-label={u.estado === 'activo' ? 'Desactivar' : 'Activar'}
                                  >
                                    {u.estado === 'activo' ? (
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
                                      </svg>
                                    ) : (
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                      </svg>
                                    )}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleOpenPasswordModal(u)}
                                  className="p-1.5 rounded-lg bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                  title="Cambiar contraseña"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                                  </svg>
                                </button>
                                {u.username !== 'asistencia' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditUser(u)}
                                      className="p-1.5 rounded-lg bg-blue-50 text-blue-500 border border-blue-100 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                                      title="Editar"
                                    >
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                                      </svg>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteUser(u.id)}
                                      className="p-1.5 rounded-lg bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-100 hover:text-rose-600 transition-colors"
                                      title="Eliminar"
                                    >
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                      </svg>
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-sm text-slate-400">
                            No se encontraron usuarios
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-12 text-sm text-slate-400">No se encontraron usuarios</div>
                  ) : (
                    filteredUsers.map((u) => {
                      const rStyle = getRoleStyle(u.rol);
                      return (
                        <div key={u.id} className="px-4 py-3.5">
                          <div className="flex items-start gap-3 mb-2">
                            <span className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 bg-blue-50 text-blue-600 border border-blue-100">
                              {initial(u.nombre)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-900 leading-tight">{u.nombre}</p>
                              <p className="text-xs text-slate-400 font-mono mt-0.5">{u.id}</p>
                              <p className="text-xs text-slate-500 mt-1 truncate">{u.email}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mb-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${rStyle.bg} ${rStyle.color}`}>
                              {u.rol || 'Visor'}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full text-[11px] font-medium px-2 py-0.5 ${
                                u.estado === 'activo'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {u.estado === 'activo' ? 'Activo' : 'Inactivo'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mb-2">
                            Último acceso: {u.ultimoAcceso ? new Date(u.ultimoAcceso).toLocaleString() : 'Nunca'}
                          </p>
                          <div className="flex items-center justify-end gap-1.5">
                            {u.username !== 'asistencia' && (
                              <button
                                type="button"
                                onClick={() => handleToggleUserStatus(u)}
                                className={`p-1.5 rounded-lg border transition-colors ${
                                  u.estado === 'activo'
                                    ? 'bg-rose-50 text-rose-500 border-rose-100'
                                    : 'bg-emerald-50 text-emerald-500 border-emerald-100'
                                }`}
                                title={u.estado === 'activo' ? 'Desactivar' : 'Activar'}
                              >
                                {u.estado === 'activo' ? (
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                  </svg>
                                )}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenPasswordModal(u)}
                              className="p-1.5 rounded-lg bg-slate-50 text-slate-500 border border-slate-200"
                              title="Cambiar contraseña"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                              </svg>
                            </button>
                            {u.username !== 'asistencia' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditUser(u)}
                                  className="p-1.5 rounded-lg bg-blue-50 text-blue-500 border border-blue-100"
                                  title="Editar"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="p-1.5 rounded-lg bg-rose-50 text-rose-500 border border-rose-100"
                                  title="Eliminar"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'auditoria' && (
            <div className="space-y-3 sm:space-y-5">
              <div className="bg-white shadow-card rounded-xl border border-gray-100 p-3 sm:p-4">
                <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="relative min-w-0">
                    <Search
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type="text"
                      className="w-full h-10 pl-10 pr-3 border border-slate-200 rounded-xl bg-gray-50 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:bg-white"
                      placeholder="Buscar por detalle..."
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                    />
                  </div>

                  <select
                    value={logFilterUser}
                    onChange={(e) => setLogFilterUser(e.target.value)}
                    className="h-10 px-3 border border-slate-200 rounded-xl bg-gray-50 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:bg-white min-w-0"
                  >
                    <option value="">Todos los usuarios</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.nombre}</option>
                    ))}
                  </select>

                  <select
                    value={logFilterModulo}
                    onChange={(e) => setLogFilterModulo(e.target.value)}
                    className="h-10 px-3 border border-slate-200 rounded-xl bg-gray-50 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:bg-white min-w-0"
                  >
                    <option value="">Todos los módulos</option>
                    <option value="Pedidos">Pedidos</option>
                    <option value="Usuarios y Roles">Usuarios y Roles</option>
                    <option value="Control de Caja">Control de Caja</option>
                  </select>

                  <select
                    value={logFilterSeverity}
                    onChange={(e) => setLogFilterSeverity(e.target.value)}
                    className="h-10 px-3 border border-slate-200 rounded-xl bg-gray-50 text-sm text-slate-700 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 focus:bg-white min-w-0"
                  >
                    <option value="">Todas las severidades</option>
                    <option value="Critico">Crítico</option>
                    <option value="Advertencia">Advertencia</option>
                    <option value="Info">Info</option>
                  </select>
                </div>
                <div className="flex items-center gap-2 mt-3 justify-end">
                  <button
                    type="button"
                    onClick={cleanFilters}
                    className="inline-flex items-center justify-center px-3 py-2 rounded-xl font-semibold text-xs text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                  >
                    Limpiar
                  </button>
                  <button
                    type="button"
                    onClick={exportCSV}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-white rounded-xl font-semibold text-xs bg-blue-600 hover:bg-blue-700 transition-opacity shadow-sm"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Exportar CSV
                  </button>
                </div>
              </div>

              <div className="bg-white shadow-card rounded-xl border border-gray-100 overflow-hidden">
                <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-800">Registros de auditoría</h2>
                  <span className="text-xs font-medium text-gray-400">{auditLogs.length} registros</span>
                </div>
                <div className="overflow-x-auto relative">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Fecha y hora</th>
                        <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Usuario</th>
                        <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Acción</th>
                        <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Módulo</th>
                        <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Detalle</th>
                        <th className="text-left px-5 py-3.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Severidad</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {auditLogs.map((l) => {
                        let severityClass = 'bg-blue-50 text-blue-700';
                        const sev = l.severidad?.toLowerCase() || '';
                        if (sev === 'critico') severityClass = 'bg-rose-50 text-rose-700';
                        if (sev === 'advertencia') severityClass = 'bg-amber-50 text-amber-700';

                        return (
                          <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-5 py-4 text-sm text-slate-700 whitespace-nowrap">
                              {new Date(l.fecha).toLocaleString()}
                            </td>
                            <td className="px-5 py-4">
                              <p className="text-sm font-semibold text-slate-900">{l.user?.nombre || l.usuarioNom || 'Sistema'}</p>
                              <p className="text-xs text-slate-400 font-mono mt-0.5">{l.userId || 'N/A'}</p>
                            </td>
                            <td className="px-5 py-4">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                                {l.accion}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-sm text-slate-700">{l.modulo}</td>
                            <td className="px-5 py-4 text-sm text-slate-700 max-w-sm truncate" title={l.detalle}>
                              {l.detalle}
                            </td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${severityClass}`}>
                                {l.severidad}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {auditLogs.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-sm text-slate-400">
                            No se encontraron registros de auditoría
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <ModalPortal open={userModalOpen}>
        <>
          <div
            className="fixed inset-0 z-[200] bg-slate-200/60 backdrop-blur-md"
            onClick={() => deferClose(() => setUserModalOpen(false))}
          />
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
            <div className="w-full max-w-lg bg-white rounded-xl shadow-xl max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden pointer-events-auto">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 border border-blue-100 text-blue-600">
                    {editingUser ? <Users size={18} strokeWidth={2.5} /> : <UserPlus size={18} strokeWidth={2.5} />}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-slate-800">
                      {editingUser ? 'Editar usuario' : 'Nuevo usuario'}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {editingUser ? 'Actualiza los datos del usuario' : 'Completa los datos para crear el usuario'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => deferClose(() => setUserModalOpen(false))}
                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors shrink-0"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="overflow-y-auto px-5 py-4">
                <form onSubmit={handleSaveUser} className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Nombre completo</label>
                    <input
                      name="nombre"
                      value={userForm.nombre}
                      onChange={(e) => setUserForm((prev) => ({ ...prev, nombre: e.target.value }))}
                      required
                      placeholder="Ej. Ivette Morquecho"
                      className={inputClass}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Usuario (login)</label>
                      <input
                        name="username"
                        value={userForm.username}
                        onChange={(e) => setUserForm((prev) => ({ ...prev, username: e.target.value }))}
                        required
                        disabled={!!editingUser}
                        placeholder="ej. MorquechoI"
                        className={`${inputClass} disabled:opacity-60 disabled:cursor-not-allowed`}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Rol</label>
                      <select
                        name="roleId"
                        value={userForm.roleId}
                        onChange={(e) => setUserForm((prev) => ({ ...prev, roleId: e.target.value }))}
                        className={inputClass}
                      >
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Correo electrónico</label>
                    <input
                      name="email"
                      type="email"
                      value={userForm.email}
                      onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))}
                      required
                      placeholder="usuario@luxes.com"
                      className={inputClass}
                    />
                  </div>
                  {!editingUser && (
                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Contraseña</label>
                      <div className="relative">
                        <input
                          name="password"
                          type={showUserPassword ? 'text' : 'password'}
                          value={userForm.password}
                          onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))}
                          required
                          placeholder="Mínimo 6 caracteres"
                          className={`${inputClass} pr-10`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowUserPassword(!showUserPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          tabIndex={-1}
                        >
                          {showUserPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="user-active-checkbox"
                      checked={userForm.estado === 'activo'}
                      onChange={(e) => setUserForm((prev) => ({ ...prev, estado: e.target.checked ? 'activo' : 'inactivo' }))}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="user-active-checkbox" className="text-xs font-semibold text-slate-600 select-none cursor-pointer">
                      Usuario activo
                    </label>
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => deferClose(() => setUserModalOpen(false))}
                      className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-semibold text-sm text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-white rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-700 transition-opacity shadow-sm disabled:opacity-50"
                    >
                      {saving ? 'Guardando...' : editingUser ? 'Guardar cambios' : 'Crear usuario'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      </ModalPortal>

      <ModalPortal open={passwordModalOpen}>
        <>
          <div
            className="fixed inset-0 z-[200] bg-slate-200/60 backdrop-blur-md"
            onClick={() => deferClose(() => setPasswordModalOpen(false))}
          />
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
            <div className="w-full max-w-sm bg-white rounded-xl shadow-xl flex flex-col border border-slate-200 overflow-hidden pointer-events-auto">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 border border-blue-100 text-blue-600">
                    <KeyRound size={18} strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-slate-800">Cambiar contraseña</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Nueva clave para {passwordUser?.nombre}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => deferClose(() => setPasswordModalOpen(false))}
                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors shrink-0"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="overflow-y-auto px-5 py-4">
                <form onSubmit={handleSavePassword} className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Nueva contraseña</label>
                    <div className="relative">
                      <input
                        type={showUserPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        placeholder="Mínimo 6 caracteres"
                        className={`${inputClass} pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowUserPassword(!showUserPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        tabIndex={-1}
                      >
                        {showUserPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => deferClose(() => setPasswordModalOpen(false))}
                      className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-semibold text-sm text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-white rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-700 transition-opacity shadow-sm disabled:opacity-50"
                    >
                      {saving ? 'Guardando...' : 'Actualizar'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      </ModalPortal>

      <ModalPortal open={roleModalOpen}>
        <>
          <div
            className="fixed inset-0 z-[200] bg-slate-200/60 backdrop-blur-md"
            onClick={() => deferClose(() => setRoleModalOpen(false))}
          />
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
            <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden pointer-events-auto">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 border border-blue-100 text-blue-600">
                    <Shield size={18} strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-slate-800">{editingRole ? 'Editar rol' : 'Nuevo rol'}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Configura nombre y permisos del rol</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => deferClose(() => setRoleModalOpen(false))}
                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors shrink-0"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="overflow-y-auto px-5 py-4">
                <form onSubmit={handleSaveRole} className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Nombre del rol</label>
                    <input
                      value={roleForm.name}
                      onChange={(e) => setRoleForm((prev) => ({ ...prev, name: e.target.value }))}
                      required
                      placeholder="Ej. Servicio al Cliente"
                      disabled={editingRole?.name === 'Administrador'}
                      className={`${inputClass} disabled:opacity-60 disabled:cursor-not-allowed`}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1.5 block">Descripción</label>
                    <input
                      value={roleForm.description}
                      onChange={(e) => setRoleForm((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="Ej. Gestión operativa de cobros y pedidos"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-2 block">Asignar permisos</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border border-slate-200 rounded-xl p-4 bg-slate-50/40 max-h-60 overflow-y-auto">
                      {permissions.map((p) => {
                        const isChecked = roleForm.permissions.includes(p.key);
                        return (
                          <div key={p.id} className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              id={`perm-${p.id}`}
                              checked={isChecked}
                              disabled={editingRole?.name === 'Administrador'}
                              onChange={() => handlePermissionToggle(p.key)}
                              className="w-4 h-4 mt-0.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                            />
                            <label htmlFor={`perm-${p.id}`} className="text-xs font-semibold text-slate-600 select-none cursor-pointer leading-tight">
                              {p.name}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => deferClose(() => setRoleModalOpen(false))}
                      className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-semibold text-sm text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-white rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-700 transition-opacity shadow-sm disabled:opacity-50"
                    >
                      {saving ? 'Guardando...' : editingRole ? 'Guardar cambios' : 'Crear rol'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      </ModalPortal>
    </div>
  );
};
