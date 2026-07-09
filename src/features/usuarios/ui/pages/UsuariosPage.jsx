import React, { useEffect, useState } from 'react';
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

const EMPTY_USER_FORM = { nombre: '', email: '', username: '', password: '', roleId: '', rol: '', estado: 'activo' };
const EMPTY_ROLE_FORM = { name: '', description: '', permissions: [] };

const initial = (name) => name?.charAt(0)?.toUpperCase() ?? '?';

const ROL_COLORS = {
  administrador: { bg: 'rgba(99,102,241,0.1)', color: '#6366f1' },
  taller: { bg: 'rgba(16,185,129,0.1)', color: '#10b981' },
  'ventas / diseñador': { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
  'ventas / disenador': { bg: 'rgba(245,158,11,0.1)', color: '#f59e0b' },
  'impresión': { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' },
  impresion: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' },
  default: { bg: 'rgba(148,163,184,0.1)', color: '#64748b' }
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
    <div className="us-root p-6 xl:p-8 w-full animate-slide-up" style={{ fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        .us-tabs-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 2px;
          margin-bottom: 24px;
        }
        .us-tab-button {
          background: transparent;
          border: none;
          color: #64748b;
          font-weight: 600;
          font-size: 14px;
          padding: 10px 18px;
          cursor: pointer;
          border-radius: 12px 12px 0 0;
          transition: all 0.25s ease;
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 2px solid transparent;
          margin-bottom: -4px;
        }
        .us-tab-button:hover {
          color: #1e293b;
          background: rgba(226,232,240,0.4);
        }
        .us-tab-button.active {
          color: #7c3aed; /* Purple brand color */
          border-bottom-2px: 2px solid #7c3aed;
          background: rgba(124,58,237,0.06);
        }
        
        .us-btn-primary-purple {
          background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
          color: white;
          border: none;
          border-radius: 12px;
          padding: 10px 20px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
          box-shadow: 0 4px 14px rgba(124,58,237,0.3);
          letter-spacing: 0.01em;
        }
        .us-btn-primary-purple:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(124,58,237,0.42);
        }

        .action-button-desactivar {
          color: #ef4444;
          background: rgba(239,68,68,0.08);
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 8px;
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .action-button-desactivar:hover {
          background: #ef4444;
          color: white;
        }

        .action-button-activar {
          color: #10b981;
          background: rgba(16,185,129,0.08);
          border: 1px solid rgba(16,185,129,0.2);
          border-radius: 8px;
          padding: 4px 10px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .action-button-activar:hover {
          background: #10b981;
          color: white;
        }

        .roles-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 20px;
        }

        .role-card {
          border-radius: 16px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          padding: 20px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.02);
          display: flex;
          flex-direction: column;
          position: relative;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .role-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.05);
        }

        .permission-badge {
          display: inline-block;
          font-size: 11px;
          font-weight: 600;
          color: #3b82f6;
          background: rgba(59,130,246,0.08);
          padding: 3px 8px;
          border-radius: 6px;
          margin-right: 5px;
          margin-bottom: 6px;
        }

        .filter-panel {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 16px;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: center;
          margin-bottom: 20px;
        }

        .filter-select {
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          padding: 8px 12px;
          font-size: 13px;
          color: #334155;
          outline: none;
          background: #ffffff;
          min-width: 140px;
        }

        .severity-critico {
          background: rgba(239,68,68,0.1);
          color: #ef4444;
        }
        .severity-advertencia {
          background: rgba(245,158,11,0.1);
          color: #d97706;
        }
        .severity-info {
          background: rgba(59,130,246,0.1);
          color: #3b82f6;
        }

        .us-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 200;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          animation: us-fade-in 0.25s ease-out forwards;
        }
        @keyframes us-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes us-modal-in {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(12px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-us-modal-in {
          animation: us-modal-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .us-input {
          width: 100%;
          border: 1.5px solid #cbd5e1;
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 500;
          color: #1e293b;
          outline: none;
          background: #ffffff;
          transition: all 0.2s ease;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }
        .us-input:hover {
          border-color: #94a3b8;
        }
        .us-input:focus {
          border-color: #7c3aed;
          box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.12);
          background: #ffffff;
        }
        .us-input:disabled {
          background: #f8fafc;
          border-color: #e2e8f0;
          color: #94a3b8;
          cursor: not-allowed;
        }
        .us-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }
        .us-input-icon {
          position: absolute;
          left: 14px;
          color: #94a3b8;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          transition: color 0.2s ease;
        }
        .us-input-with-icon {
          padding-left: 42px !important;
        }
        .us-input-wrapper:focus-within .us-input-icon {
          color: #7c3aed;
        }
        .us-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
          overflow: hidden;
        }
        .us-btn-ghost {
          background: transparent;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 10px 20px;
          font-size: 13px;
          font-weight: 700;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .us-btn-ghost:hover {
          background: #f1f5f9;
          color: #334155;
          border-color: #cbd5e1;
        }
        .us-password-toggle-btn {
          position: absolute;
          right: 14px;
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          transition: color 0.2s ease;
        }
        .us-password-toggle-btn:hover {
          color: #475569;
        }
        .us-input-with-toggle {
          padding-right: 42px !important;
        }
      `}</style>

      {/* Unified Banner */}
      <div className="us-card px-6 py-5 flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Usuarios y Roles</h1>
          <p className="text-sm text-slate-400 mt-0.5 font-medium">Administra el acceso y los permisos del sistema</p>
        </div>
        <div>
          {activeTab === 'usuarios' && (
            <button onClick={handleOpenNewUser} className="us-btn-primary-purple">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Nuevo Usuario
            </button>
          )}
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="us-tabs-bar">
        <button
          onClick={() => setActiveTab('usuarios')}
          className={`us-tab-button ${activeTab === 'usuarios' ? 'active' : ''}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0Zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0Z" />
          </svg>
          Usuarios
        </button>
        <button
          onClick={() => setActiveTab('auditoria')}
          className={`us-tab-button ${activeTab === 'auditoria' ? 'active' : ''}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1" />
          </svg>
          Auditoría
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-purple-600" />
        </div>
      ) : (
        <>
          {/* TAB 1: USUARIOS */}
          {activeTab === 'usuarios' && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="us-card px-5 py-4 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(124,58,237,0.1)' }}>
                    <svg className="w-5 h-5" style={{ color: '#7c3aed' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0Zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0Zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0Z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Usuarios</div>
                    <div className="text-xl font-extrabold text-slate-800 mt-0.5">{stats.total}</div>
                  </div>
                </div>
                <div className="us-card px-5 py-4 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(16,185,129,0.1)' }}>
                    <svg className="w-5 h-5" style={{ color: '#10b981' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Activos</div>
                    <div className="text-xl font-extrabold text-slate-800 mt-0.5">{stats.activos}</div>
                  </div>
                </div>
                <div className="us-card px-5 py-4 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(239,68,68,0.1)' }}>
                    <svg className="w-5 h-5" style={{ color: '#ef4444' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Inactivos</div>
                    <div className="text-xl font-extrabold text-slate-800 mt-0.5">{stats.inactivos}</div>
                  </div>
                </div>
              </div>

              {/* Table Card */}
              <div className="us-card">
                <div className="px-5 py-4 border-b border-slate-100/60 flex items-center gap-3">
                  <svg className="w-4 h-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <input
                    className="us-input max-w-xs !border-0 !bg-transparent !p-0 !shadow-none !text-sm !font-medium placeholder:!text-slate-400 focus:!ring-0"
                    placeholder="Buscar usuario..."
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-slate-100/60">
                        <th className="text-left px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Usuario</th>
                        <th className="text-left px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contacto</th>
                        <th className="text-center px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rol</th>
                        <th className="text-center px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estado</th>
                        <th className="text-center px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Último acceso</th>
                        <th className="text-center px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-40">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/40">
                      {filteredUsers.map((u) => {
                        const rStyle = getRoleStyle(u.rol);
                        return (
                          <tr key={u.id} className="us-tr">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <span
                                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                  style={{ background: 'rgba(124,58,237,0.1)', color: '#7c3aed' }}
                                >
                                  {initial(u.nombre)}
                                </span>
                                <div>
                                  <div className="font-semibold text-slate-800">{u.nombre}</div>
                                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{u.id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-slate-500 font-medium">{u.email}</td>
                            <td className="px-5 py-4 text-center">
                              <span
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                                style={{ background: rStyle.bg, color: rStyle.color }}
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                                </svg>
                                {u.rol || 'Visor'}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${u.estado === 'activo' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${u.estado === 'activo' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                {u.estado === 'activo' ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-center text-slate-500 font-medium text-[12px]">
                              {u.ultimoAcceso ? new Date(u.ultimoAcceso).toLocaleString() : 'Nunca'}
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex items-center justify-center gap-2">
                                {u.username !== 'asistencia' && (
                                  <button
                                    onClick={() => handleToggleUserStatus(u)}
                                    className={u.estado === 'activo' ? 'action-button-desactivar' : 'action-button-activar'}
                                  >
                                    {u.estado === 'activo' ? 'Desactivar' : 'Activar'}
                                  </button>
                                )}
                                <button
                                  onClick={() => handleOpenPasswordModal(u)}
                                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                                  title="Cambiar contraseña"
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                                  </svg>
                                </button>
                                {u.username !== 'asistencia' && (
                                  <>
                                    <button
                                      onClick={() => handleOpenEditUser(u)}
                                      className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors"
                                      title="Editar"
                                    >
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => handleDeleteUser(u.id)}
                                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                                      title="Eliminar"
                                    >
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
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
                          <td colSpan={6} className="text-center py-16 text-slate-400 text-sm font-medium">
                            No se encontraron usuarios
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}



          {/* TAB 3: AUDITORÍA */}
          {activeTab === 'auditoria' && (
            <div className="space-y-6">
              {/* Filter Panel */}
              <div className="filter-panel">
                {/* Search Text */}
                <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-1.5 max-w-xs w-full">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <input
                    type="text"
                    className="border-0 bg-transparent p-0 text-xs font-semibold focus:ring-0 outline-none w-full"
                    placeholder="Buscar por detalle..."
                    value={logSearch}
                    onChange={e => setLogSearch(e.target.value)}
                  />
                </div>

                {/* Users Dropdown */}
                <select
                  value={logFilterUser}
                  onChange={e => setLogFilterUser(e.target.value)}
                  className="filter-select"
                >
                  <option value="">Todos los usuarios</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.nombre}</option>
                  ))}
                </select>

                {/* Modulos Dropdown */}
                <select
                  value={logFilterModulo}
                  onChange={e => setLogFilterModulo(e.target.value)}
                  className="filter-select"
                >
                  <option value="">Todos los módulos</option>
                  <option value="Pedidos">Pedidos</option>
                  <option value="Usuarios y Roles">Usuarios y Roles</option>
                  <option value="Control de Caja">Control de Caja</option>
                </select>

                {/* Severity Dropdown */}
                <select
                  value={logFilterSeverity}
                  onChange={e => setLogFilterSeverity(e.target.value)}
                  className="filter-select"
                >
                  <option value="">Todas las severidades</option>
                  <option value="Critico">Crítico</option>
                  <option value="Advertencia">Advertencia</option>
                  <option value="Info">Info</option>
                </select>

                {/* Actions */}
                <button
                  onClick={cleanFilters}
                  className="us-btn-ghost text-xs !py-2 !px-3 font-bold text-slate-500 hover:bg-slate-100 rounded-lg ml-auto border border-slate-200"
                >
                  Limpiar
                </button>
                <button
                  onClick={exportCSV}
                  className="bg-indigo-900 hover:bg-indigo-950 text-white rounded-lg px-4 py-2 text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Exportar CSV
                </button>
              </div>

              {/* Logs Table Card */}
              <div className="us-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-slate-100/60 bg-slate-50/20">
                        <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fecha y Hora</th>
                        <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Usuario</th>
                        <th className="text-center px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Acción</th>
                        <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Módulo</th>
                        <th className="text-left px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Detalle</th>
                        <th className="text-center px-5 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Severidad</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/40">
                      {auditLogs.map((l) => {
                        let severityClass = 'severity-info';
                        const sev = l.severidad?.toLowerCase() || '';
                        if (sev === 'critico') severityClass = 'severity-critico';
                        if (sev === 'advertencia') severityClass = 'severity-advertencia';

                        return (
                          <tr key={l.id} className="us-tr">
                            <td className="px-5 py-4 text-slate-500 font-medium">
                              {new Date(l.fecha).toLocaleString()}
                            </td>
                            <td className="px-5 py-4">
                              <div className="font-semibold text-slate-800">{l.user?.nombre || l.usuarioNom || 'Sistema'}</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{l.userId || 'N/A'}</div>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                                {l.accion}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-slate-600 font-semibold">{l.modulo}</td>
                            <td className="px-5 py-4 text-slate-500 font-medium max-w-sm overflow-hidden text-ellipsis whitespace-nowrap" title={l.detalle}>
                              {l.detalle}
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${severityClass}`}>
                                {l.severidad}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {auditLogs.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-16 text-slate-400 text-sm font-medium">
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

      {/* --- MODAL CREAR/EDITAR USUARIO --- */}
      <ModalPortal open={userModalOpen}>
        <div className="us-modal-portal-root">
          <div className="us-modal-overlay" onClick={() => deferClose(() => setUserModalOpen(false))} />
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl animate-us-modal-in max-h-[95vh] flex flex-col border border-slate-100">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                <h2 className="text-lg font-bold text-slate-800">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
                <button type="button" onClick={() => deferClose(() => setUserModalOpen(false))}
                  className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="overflow-y-auto p-6">
                <form onSubmit={handleSaveUser} className="space-y-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Nombre Completo</label>
                    <div className="us-input-wrapper">
                      <span className="us-input-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      </span>
                      <input
                        name="nombre"
                        value={userForm.nombre}
                        onChange={e => setUserForm(prev => ({ ...prev, nombre: e.target.value }))}
                        required
                        placeholder="Ej. Ivette Morquecho"
                        className="us-input us-input-with-icon"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Nombre de Usuario (Login)</label>
                    <div className="us-input-wrapper">
                      <span className="us-input-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                          <circle cx="12" cy="12" r="4" />
                          <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
                        </svg>
                      </span>
                      <input
                        name="username"
                        value={userForm.username}
                        onChange={e => setUserForm(prev => ({ ...prev, username: e.target.value }))}
                        required
                        disabled={!!editingUser}
                        placeholder="ej. MorquechoI"
                        className="us-input us-input-with-icon"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Correo Electrónico</label>
                    <div className="us-input-wrapper">
                      <span className="us-input-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                          <polyline points="22,6 12,13 2,6" />
                        </svg>
                      </span>
                      <input
                        name="email"
                        type="email"
                        value={userForm.email}
                        onChange={e => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                        required
                        placeholder="usuario@luxes.com"
                        className="us-input us-input-with-icon"
                      />
                    </div>
                  </div>
                  {!editingUser && (
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Contraseña</label>
                      <div className="us-input-wrapper">
                        <span className="us-input-icon">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                        </span>
                        <input
                          name="password"
                          type={showUserPassword ? 'text' : 'password'}
                          value={userForm.password}
                          onChange={e => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                          required
                          placeholder="••••••••"
                          className="us-input us-input-with-icon us-input-with-toggle"
                        />
                        <button
                          type="button"
                          onClick={() => setShowUserPassword(!showUserPassword)}
                          className="us-password-toggle-btn"
                          tabIndex="-1"
                        >
                          {showUserPassword ? (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-4 h-4">
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                              <line x1="1" y1="1" x2="23" y2="23" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-4 h-4">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Rol</label>
                      <div className="us-input-wrapper">
                        <span className="us-input-icon">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          </svg>
                        </span>
                        <select
                          name="roleId"
                          value={userForm.roleId}
                          onChange={e => setUserForm(prev => ({ ...prev, roleId: e.target.value }))}
                          className="us-input us-input-with-icon"
                          style={{ appearance: 'none' }}
                        >
                          {roles.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                        <span className="absolute right-3.5 pointer-events-none text-slate-400">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                          </svg>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-6 pl-2">
                      <input
                        type="checkbox"
                        id="user-active-checkbox"
                        checked={userForm.estado === 'activo'}
                        onChange={e => setUserForm(prev => ({ ...prev, estado: e.target.checked ? 'activo' : 'inactivo' }))}
                        className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500 cursor-pointer"
                      />
                      <label htmlFor="user-active-checkbox" className="text-xs font-semibold text-slate-600 select-none cursor-pointer">
                        Usuario activo
                      </label>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                    <button type="button" onClick={() => deferClose(() => setUserModalOpen(false))} className="us-btn-ghost">Cancelar</button>
                    <button type="submit" disabled={saving} className="us-btn-primary-purple">
                      <span
                        className={`inline-block h-4 w-4 border-2 border-white/30 border-t-white rounded-full mr-1.5 ${saving ? 'animate-spin' : 'hidden'}`}
                        aria-hidden={!saving}
                      />
                      {editingUser ? 'Guardar cambios' : 'Crear Usuario'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </ModalPortal>

      {/* --- MODAL CAMBIAR CONTRASEÑA --- */}
      <ModalPortal open={passwordModalOpen}>
        <div className="us-modal-portal-root">
          <div className="fixed inset-0 z-[200]" style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(14px) saturate(130%)', WebkitBackdropFilter: 'blur(14px) saturate(130%)' }}
            onClick={() => deferClose(() => setPasswordModalOpen(false))} />
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl animate-us-modal-in flex flex-col border border-slate-100">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-800">Cambiar Contraseña</h2>
                <button type="button" onClick={() => deferClose(() => setPasswordModalOpen(false))}
                  className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6">
                <form onSubmit={handleSavePassword} className="space-y-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                      Nueva contraseña para {passwordUser?.nombre}
                    </label>
                    <div className="us-input-wrapper">
                      <span className="us-input-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      </span>
                      <input
                        type={showUserPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        required
                        placeholder="Mínimo 6 caracteres"
                        className="us-input us-input-with-icon us-input-with-toggle"
                      />
                      <button
                        type="button"
                        onClick={() => setShowUserPassword(!showUserPassword)}
                        className="us-password-toggle-btn"
                        tabIndex="-1"
                      >
                        {showUserPassword ? (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-4 h-4">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-4 h-4">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button type="button" onClick={() => deferClose(() => setPasswordModalOpen(false))} className="us-btn-ghost">Cancelar</button>
                    <button type="submit" disabled={saving} className="us-btn-primary-purple">
                      Actualizar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </ModalPortal>

      {/* --- MODAL CREAR/EDITAR ROL --- */}
      <ModalPortal open={roleModalOpen}>
        <div className="us-modal-portal-root">
          <div className="fixed inset-0 z-[200]" style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(14px) saturate(130%)', WebkitBackdropFilter: 'blur(14px) saturate(130%)' }}
            onClick={() => deferClose(() => setRoleModalOpen(false))} />
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl animate-us-modal-in max-h-[90vh] flex flex-col border border-slate-100">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                <h2 className="text-lg font-bold text-slate-800">{editingRole ? 'Editar Rol' : 'Nuevo Rol'}</h2>
                <button type="button" onClick={() => deferClose(() => setRoleModalOpen(false))}
                  className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="overflow-y-auto p-6">
                <form onSubmit={handleSaveRole} className="space-y-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Nombre del Rol</label>
                    <input
                      value={roleForm.name}
                      onChange={e => setRoleForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                      placeholder="Ej. Servicio al Cliente"
                      disabled={editingRole?.name === 'Administrador'}
                      className="us-input"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Descripción</label>
                    <input
                      value={roleForm.description}
                      onChange={e => setRoleForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Ej. Gestión operativa de cobros y pedidos"
                      className="us-input"
                    />
                  </div>
                  
                  <div>
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Asignar Permisos</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border border-slate-100 rounded-xl p-4 bg-slate-50/40 max-h-60 overflow-y-auto">
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
                              className="w-4 h-4 mt-0.5 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                            />
                            <label htmlFor={`perm-${p.id}`} className="text-xs font-semibold text-slate-600 select-none cursor-pointer leading-tight">
                              {p.name}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
                    <button type="button" onClick={() => deferClose(() => setRoleModalOpen(false))} className="us-btn-ghost">Cancelar</button>
                    <button type="submit" disabled={saving} className="us-btn-primary-purple">
                      <span
                        className={`inline-block h-4 w-4 border-2 border-white/30 border-t-white rounded-full mr-1.5 ${saving ? 'animate-spin' : 'hidden'}`}
                        aria-hidden={!saving}
                      />
                      {editingRole ? 'Guardar cambios' : 'Crear Rol'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </ModalPortal>
    </div>
  );
};
