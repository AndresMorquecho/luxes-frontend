import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useUnreadNotifications } from '../../../../shared/hooks/useUnreadNotifications.js';
import { isAdminUser, getDisplayRole } from '../../../../shared/utils/userRoleHelpers';
import { isModuleHidden, normalizeHiddenModules } from '../../application/sidebarModules.js';
import aluxLogoHQ from '../../../../assets/aluxLogoHQ.png';
import aluxIcon from '../../../../assets/icon.png';
import './Sidebar.css';

export const Sidebar = ({ isCollapsed, onMouseEnter, onMouseLeave, user, onLogout }) => {
  const userName = user?.nombre || 'Usuario';
  const userRole = getDisplayRole(user).toUpperCase();
  const userInitial = userName.charAt(0).toUpperCase();
  const isAdmin = isAdminUser(user);
  const hasAprobacionPermission = true;

  const [showAll, setShowAll] = useState(() => {
    const saved = localStorage.getItem('luxes_sidebar_show_all');
    if (saved !== null) return saved === 'true';
    return true;
  });

  let hiddenModules = ['relaciones', 'inventario'];
  if (user?.sidebarConfig) {
    try {
      const configObj = typeof user.sidebarConfig === 'string'
        ? JSON.parse(user.sidebarConfig)
        : user.sidebarConfig;
      if (configObj && Array.isArray(configObj.hiddenModules)) {
        hiddenModules = normalizeHiddenModules(configObj.hiddenModules);
      }
    } catch (e) {
      console.error('Error parsing sidebarConfig:', e);
    }
  }

  const canViewDashboard = isAdmin;
  const canViewNomina = isAdmin;
  const canViewProformas = isAdmin;
  const canViewInventario = isAdmin;
  const canViewGastos = isAdmin;
  const canViewFinanzas = isAdmin;
  const canViewTareas = true;
  const canViewProyectos = true;
  const canViewInstalaciones = false;
  const canViewCompras = true;
  const canViewRelaciones = isAdmin;
  const canViewVentas = isAdmin;

  const shouldShowModule = (moduleKey, originalCanView) => {
    if (!originalCanView) return false;
    if (!isAdmin) return true;
    if (showAll) return true;
    return !isModuleHidden(hiddenModules, moduleKey);
  };

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isNominaOpen, setIsNominaOpen] = useState(false);
  const [isRelacionesOpen, setIsRelacionesOpen] = useState(false);
  const [isInventarioOpen, setIsInventarioOpen] = useState(false);
  const [isComprasOpen, setIsComprasOpen] = useState(false);
  const [isFinanzasOpen, setIsFinanzasOpen] = useState(false);
  const location = useLocation();
  const currentPath = location.pathname;

  const unreadCount = useUnreadNotifications(user);

  // Auto-open submenus based on current route
  React.useEffect(() => {
    if (currentPath.startsWith('/impresiones') || currentPath.startsWith('/colas-impresion')) {
      setIsPrintOpen(true);
    }
    if (currentPath.startsWith('/nomina')) {
      setIsNominaOpen(true);
    }
    if (currentPath.startsWith('/clientes') || currentPath.startsWith('/proveedores')) {
      setIsRelacionesOpen(true);
    }
    if (currentPath.startsWith('/usuarios') || currentPath.startsWith('/configuracion')) {
      setIsConfigOpen(true);
    }
    if (currentPath.startsWith('/inventario')) {
      setIsInventarioOpen(true);
    }
    if (currentPath === '/compras/metodos-pago' || currentPath.startsWith('/cierre-caja') || currentPath.startsWith('/movimientos')) {
      setIsFinanzasOpen(true);
    } else if (currentPath.startsWith('/compras')) {
      setIsComprasOpen(true);
    }
  }, [currentPath]);

  return (
    <aside 
      className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      
      {/* Sidebar Logo Panel */}
      <div className="sidebar-logo-box">
        <img 
          src={aluxIcon} 
          alt="Alux Logo Icon" 
          className="sidebar-logo-img sidebar-logo-collapsed" 
        />
        <div className="sidebar-logo-expanded-wrapper">
          <div className="sidebar-banner-left">
            <div className="sidebar-banner-socials">
              <svg className="sidebar-social-svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.86 4.46V11.2a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-.04-.63z"/>
              </svg>
              <svg className="sidebar-social-svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <svg className="sidebar-social-svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.13-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </div>
            <span className="sidebar-banner-handle">aluxconstrucciones</span>
          </div>
          <div className="sidebar-banner-right">
            <img 
              src={aluxLogoHQ} 
              alt="Alux Constructores en Aluminio & Vidrio" 
              className="sidebar-banner-logo-hq" 
            />
          </div>
        </div>
      </div>

      {/* Navigation menu list */}
      <nav className="sidebar-nav">
        {isAdmin && (
          <div className="sidebar-layout-customizer-box" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {isCollapsed ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  title={showAll ? "Ver Módulos Principales" : "Ver Todos los Módulos"}
                  className={`sidebar-switch-toggle ${showAll ? 'active' : ''}`}
                  onClick={() => {
                    const newValue = !showAll;
                    setShowAll(newValue);
                    localStorage.setItem('luxes_sidebar_show_all', String(newValue));
                  }}
                  style={{ cursor: 'pointer', border: 'none' }}
                >
                  <div className="sidebar-switch-handle" />
                </button>
                <button
                  type="button"
                  onClick={() => window.open('/nomina/registro-asistencia?kiosk=true', '_blank')}
                  className="sidebar-quick-action-btn"
                  title="Registrar Asistencia"
                  style={{
                    cursor: 'pointer',
                    border: 'none',
                    background: 'rgba(59, 130, 246, 0.1)',
                    color: '#3b82f6',
                    padding: '6px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ width: '1rem', height: '1rem' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', padding: '0 0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b' }}>
                    {showAll ? 'Ver todo' : 'Módulos Principales'}
                  </span>
                  <button
                    type="button"
                    className={`sidebar-switch-toggle ${showAll ? 'active' : ''}`}
                    onClick={() => {
                      const newValue = !showAll;
                      setShowAll(newValue);
                      localStorage.setItem('luxes_sidebar_show_all', String(newValue));
                    }}
                    style={{ cursor: 'pointer', border: 'none' }}
                  >
                    <div className="sidebar-switch-handle" />
                  </button>
                </div>
                
                <button
                  type="button"
                  onClick={() => window.open('/nomina/registro-asistencia?kiosk=true', '_blank')}
                  style={{
                    cursor: 'pointer',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    background: 'rgba(59, 130, 246, 0.05)',
                    color: '#2563eb',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '5px 8px',
                    borderRadius: '7px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    width: '100%',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.05)';
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ width: '0.85rem', height: '0.85rem' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  <span>Registrar Asistencia</span>
                </button>
              </div>
            )}
          </div>
        )}

        <div className="sidebar-category">
          <span className="sidebar-category-title">PRINCIPAL</span>
          <ul>
            {canViewDashboard && (
              <li className={currentPath === '/' ? 'active' : ''}>
                <Link to="/">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-icon sidebar-icon-dashboard">
                    <rect x="3" y="3" width="7" height="9" rx="1" />
                    <rect x="14" y="3" width="7" height="5" rx="1" />
                    <rect x="14" y="12" width="7" height="9" rx="1" />
                    <rect x="3" y="16" width="7" height="5" rx="1" />
                  </svg>
                  <span className="sidebar-link-text">Dashboard</span>
                </Link>
              </li>
            )}
            {!isAdmin && (
              <li className={currentPath.startsWith('/nomina/registro-asistencia') || currentPath === '/asistencia' ? 'active' : ''}>
                <Link to="/nomina/registro-asistencia" onClick={() => {
                  setIsComprasOpen(false);
                  setIsNominaOpen(false);
                  setIsPrintOpen(false);
                  setIsRelacionesOpen(false);
                  setIsInventarioOpen(false);
                  setIsConfigOpen(false);
                  setIsFinanzasOpen(false);
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  <span className="sidebar-link-text">Asistencia</span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="chevron-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              </li>
            )}
            <li className={currentPath === '/notificaciones' ? 'active' : ''}>
              <Link to="/notificaciones">
                <div className="sidebar-icon-wrapper">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-icon sidebar-icon-bell">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="sidebar-badge-count">{unreadCount}</span>
                  )}
                </div>
                <span className="sidebar-link-text">Notificaciones</span>
              </Link>
            </li>
          </ul>
        </div>

        <div className="sidebar-category">
          <span className="sidebar-category-title">MÓDULOS</span>
          <ul>
            {shouldShowModule('finanzas', canViewFinanzas) && (
              <li className={`sidebar-has-submenu ${isFinanzasOpen ? 'submenu-open' : ''} ${(currentPath.startsWith('/cierre-caja') || currentPath === '/compras/metodos-pago' || currentPath.startsWith('/movimientos')) ? 'active' : ''}`}>
                <button
                  type="button"
                  onClick={() => {
                    setIsFinanzasOpen(prev => !prev);
                    // Contraer los demás módulos
                    if (!isFinanzasOpen) {
                      setIsNominaOpen(false);
                      setIsPrintOpen(false);
                      setIsRelacionesOpen(false);
                      setIsInventarioOpen(false);
                      setIsComprasOpen(false);
                      setIsConfigOpen(false);
                    }
                  }}
                  className="sidebar-submenu-toggle"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-icon sidebar-icon-dollar">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v8M9.5 10h4.5a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4.5" />
                  </svg>
                  <span className="sidebar-link-text">Finanzas</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className={`chevron-icon submenu-chevron ${isFinanzasOpen ? 'rotated' : ''}`}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>

                {isFinanzasOpen && (
                  <ul className="sidebar-submenu">
                    <li className={currentPath.startsWith('/movimientos') ? 'submenu-active' : ''}>
                      <Link to="/movimientos" className="sidebar-submenu-link">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-submenu-icon">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 7l5-5 5 5M7 17l5 5 5-5M12 2v20" />
                        </svg>
                        <span className="sidebar-submenu-text">Movimientos</span>
                      </Link>
                    </li>
                    <li className={currentPath === '/compras/metodos-pago' ? 'submenu-active' : ''}>
                      <Link to="/compras/metodos-pago" className="sidebar-submenu-link">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-submenu-icon">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-6.75 3h16.5a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5H4.5a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5z" />
                        </svg>
                        <span className="sidebar-submenu-text">Métodos de Pago</span>
                      </Link>
                    </li>
                    <li className={currentPath.startsWith('/cierre-caja') ? 'submenu-active' : ''}>
                      <Link to="/cierre-caja" className="sidebar-submenu-link">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-submenu-icon">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9l2 2 4-4" />
                        </svg>
                        <span className="sidebar-submenu-text">Cierre de Caja</span>
                      </Link>
                    </li>
                  </ul>
                )}
              </li>
            )}

            {shouldShowModule('nomina', canViewNomina) && (
              <li className={`sidebar-has-submenu ${isNominaOpen ? 'submenu-open' : ''} ${currentPath.startsWith('/nomina') ? 'active' : ''}`}>
                <button
                  type="button"
                  onClick={() => {
                    setIsNominaOpen(prev => !prev);
                    // Contraer los demás módulos
                    if (!isNominaOpen) {
                      setIsPrintOpen(false);
                      setIsRelacionesOpen(false);
                      setIsInventarioOpen(false);
                      setIsComprasOpen(false);
                      setIsConfigOpen(false);
                      setIsFinanzasOpen(false);
                    }
                  }}
                  className="sidebar-submenu-toggle"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-icon sidebar-icon-dollar">
                    <rect x="2" y="6" width="20" height="12" rx="2" />
                    <circle cx="12" cy="12" r="2" />
                    <path d="M6 12h.01M18 12h.01" />
                  </svg>
                  <span className="sidebar-link-text">Nómina</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className={`chevron-icon submenu-chevron ${isNominaOpen ? 'rotated' : ''}`}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>

                {isNominaOpen && (
                  <ul className="sidebar-submenu">
                    <li className={currentPath.startsWith('/nomina/empleados') ? 'submenu-active' : ''}>
                      <Link to="/nomina/empleados" className="sidebar-submenu-link">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-submenu-icon">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                        </svg>
                        <span className="sidebar-submenu-text">Empleados</span>
                      </Link>
                    </li>
                    <li className={currentPath === '/nomina/registro-asistencia' || currentPath === '/nomina' ? 'submenu-active' : ''}>
                      <Link to="/nomina/registro-asistencia" className="sidebar-submenu-link">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-submenu-icon">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                        </svg>
                        <span className="sidebar-submenu-text">Registro de Asistencia</span>
                      </Link>
                    </li>
                    <li className={currentPath === '/nomina/horas-extras' ? 'submenu-active' : ''}>
                      <Link to="/nomina/horas-extras" className="sidebar-submenu-link">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-submenu-icon">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                        </svg>
                        <span className="sidebar-submenu-text">Horas Extras</span>
                      </Link>
                    </li>
                    <li className={currentPath === '/nomina/nomina-del-mes' ? 'submenu-active' : ''}>
                      <Link to="/nomina/nomina-del-mes" className="sidebar-submenu-link">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-submenu-icon">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-6.75 3h16.5a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5H4.5a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5z" />
                        </svg>
                        <span className="sidebar-submenu-text">Nómina del Mes</span>
                      </Link>
                    </li>
                  </ul>
                )}
              </li>
            )}

            {shouldShowModule('proformas', canViewProformas) && (
              <li className={currentPath.startsWith('/proformas') ? 'active' : ''}>
                <Link to="/proformas">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-icon sidebar-icon-doc">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
                  </svg>
                  <span className="sidebar-link-text">Proformas</span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="chevron-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              </li>
            )}

            {shouldShowModule('inventario', canViewInventario) && (
              <li className={`sidebar-has-submenu ${isInventarioOpen ? 'submenu-open' : ''} ${currentPath.startsWith('/inventario') ? 'active' : ''}`}>
                <button
                  type="button"
                  onClick={() => {
                    setIsInventarioOpen(prev => !prev);
                    // Contraer los demás módulos
                    if (!isInventarioOpen) {
                      setIsNominaOpen(false);
                      setIsPrintOpen(false);
                      setIsRelacionesOpen(false);
                      setIsComprasOpen(false);
                      setIsConfigOpen(false);
                      setIsFinanzasOpen(false);
                    }
                  }}
                  className="sidebar-submenu-toggle"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-icon sidebar-icon-box">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25" />
                  </svg>
                  <span className="sidebar-link-text">Inventario</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className={`chevron-icon submenu-chevron ${isInventarioOpen ? 'rotated' : ''}`}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>

                {isInventarioOpen && (
                  <ul className="sidebar-submenu">
                    <li className={currentPath === '/inventario' ? 'submenu-active' : ''}>
                      <Link to="/inventario" className="sidebar-submenu-link">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-submenu-icon">
                          <rect x="3" y="3" width="7" height="9" rx="1" />
                          <rect x="14" y="3" width="7" height="5" rx="1" />
                          <rect x="14" y="12" width="7" height="9" rx="1" />
                          <rect x="3" y="16" width="7" height="5" rx="1" />
                        </svg>
                        <span className="sidebar-submenu-text">Stock de Materiales</span>
                      </Link>
                    </li>
                  </ul>
                )}
              </li>
            )}

            {shouldShowModule('gastos', canViewGastos) && (
              <li className={currentPath.startsWith('/gastos') ? 'active' : ''}>
                <Link to="/gastos" onClick={() => {
                  setIsNominaOpen(false);
                  setIsPrintOpen(false);
                  setIsRelacionesOpen(false);
                  setIsInventarioOpen(false);
                  setIsComprasOpen(false);
                  setIsConfigOpen(false);
                  setIsFinanzasOpen(false);
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-icon sidebar-icon-card">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-6.75 3h16.5a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5H4.5a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5z" />
                  </svg>
                  <span className="sidebar-link-text">Gastos</span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="chevron-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              </li>
            )}

            {shouldShowModule('tareas', canViewTareas) && (
              <li className={currentPath.startsWith('/tareas') ? 'active' : ''}>
                <Link to="/tareas" onClick={() => {
                  setIsNominaOpen(false);
                  setIsPrintOpen(false);
                  setIsRelacionesOpen(false);
                  setIsInventarioOpen(false);
                  setIsComprasOpen(false);
                  setIsConfigOpen(false);
                  setIsFinanzasOpen(false);
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-icon sidebar-icon-tasks">
                    <rect x="8" y="2" width="8" height="4" rx="1" />
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                    <path d="M9 12h6M9 16h6" />
                  </svg>
                  <span className="sidebar-link-text">Tareas</span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="chevron-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              </li>
            )}


            {shouldShowModule('compras', canViewCompras) && (
              <li className={`sidebar-has-submenu ${isComprasOpen ? 'submenu-open' : ''} ${currentPath.startsWith('/compras') ? 'active' : ''}`}>
                <button
                  type="button"
                  onClick={() => {
                    setIsComprasOpen(prev => !prev);
                    if (!isComprasOpen) {
                      setIsNominaOpen(false);
                      setIsPrintOpen(false);
                      setIsRelacionesOpen(false);
                      setIsInventarioOpen(false);
                      setIsConfigOpen(false);
                      setIsFinanzasOpen(false);
                    }
                  }}
                  className="sidebar-submenu-toggle"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-icon sidebar-icon-bag">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 0 0-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  <span className="sidebar-link-text">Compras</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className={`chevron-icon submenu-chevron ${isComprasOpen ? 'rotated' : ''}`}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>

                {isComprasOpen && (
                  <ul className="sidebar-submenu">
                    <li className={currentPath === '/compras' ? 'submenu-active' : ''}>
                      <Link to="/compras" className="sidebar-submenu-link">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-submenu-icon">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
                        </svg>
                        <span className="sidebar-submenu-text">Órdenes de Compra</span>
                      </Link>
                    </li>
                    {isAdmin && (
                      <li className={currentPath === '/compras/cuentas-por-pagar' ? 'submenu-active' : ''}>
                        <Link to="/compras/cuentas-por-pagar" className="sidebar-submenu-link">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-submenu-icon">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-6.75 3h16.5a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5H4.5a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5z" />
                          </svg>
                          <span className="sidebar-submenu-text">Cuentas por Pagar</span>
                        </Link>
                      </li>
                    )}
                  </ul>
                )}
              </li>
            )}

            {shouldShowModule('proyectos', canViewProyectos) && (
              <li className={currentPath.startsWith('/proyectos') ? 'active' : ''}>
                <Link to="/proyectos">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-icon sidebar-icon-briefcase">
                    <rect x="2" y="7" width="20" height="14" rx="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                  <span className="sidebar-link-text">Proyectos</span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="chevron-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              </li>
            )}

            {shouldShowModule('ventas', canViewVentas) && (
              <li className={currentPath.startsWith('/ventas') ? 'active' : ''}>
                <Link to="/ventas">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-icon sidebar-icon-cart">
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="20" cy="21" r="1" />
                    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                  </svg>
                  <span className="sidebar-link-text">Ventas</span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="chevron-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              </li>
            )}

            {/* Módulo: Relaciones */}
            {shouldShowModule('relaciones', canViewRelaciones) && (
              <li className={`sidebar-has-submenu ${isRelacionesOpen ? 'submenu-open' : ''}`}>
                <button
                  type="button"
                  onClick={() => {
                    setIsRelacionesOpen(!isRelacionesOpen);
                    if (!isRelacionesOpen) {
                      setIsNominaOpen(false);
                      setIsPrintOpen(false);
                      setIsInventarioOpen(false);
                      setIsComprasOpen(false);
                      setIsConfigOpen(false);
                      setIsFinanzasOpen(false);
                    }
                  }}
                  className="sidebar-submenu-toggle"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-icon sidebar-icon-users">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  <span className="sidebar-link-text">Contactos</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className={`chevron-icon submenu-chevron ${isRelacionesOpen ? 'rotated' : ''}`}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>

                {isRelacionesOpen && (
                  <ul className="sidebar-submenu">
                    <li className={currentPath.startsWith('/clientes') ? 'submenu-active' : ''}>
                      <Link to="/clientes" className="sidebar-submenu-link">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-submenu-icon">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                        </svg>
                        <span className="sidebar-submenu-text">Clientes</span>
                      </Link>
                    </li>
                    <li className={currentPath.startsWith('/proveedores') ? 'submenu-active' : ''}>
                      <Link to="/proveedores" className="sidebar-submenu-link">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-submenu-icon">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                        </svg>
                        <span className="sidebar-submenu-text">Proveedores</span>
                      </Link>
                    </li>
                  </ul>
                )}
              </li>
            )}

          </ul>
        </div>

        {isAdmin && (
          <div className="sidebar-category">
            <span className="sidebar-category-title">SISTEMA</span>
            <ul>
              <li className={`sidebar-has-submenu ${isConfigOpen ? 'submenu-open' : ''}`}>
                <button 
                  type="button"
                  onClick={() => {
                    setIsConfigOpen(!isConfigOpen);
                    if (!isConfigOpen) {
                      setIsNominaOpen(false);
                      setIsPrintOpen(false);
                      setIsRelacionesOpen(false);
                      setIsInventarioOpen(false);
                      setIsComprasOpen(false);
                      setIsFinanzasOpen(false);
                    }
                  }}
                  className="sidebar-submenu-toggle"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-icon sidebar-icon-gear">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  <span className="sidebar-link-text">Configuraciones</span>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor" 
                    strokeWidth="2.5" 
                    className={`chevron-icon submenu-chevron ${isConfigOpen ? 'rotated' : ''}`}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>

                {isConfigOpen && (
                  <ul className="sidebar-submenu">
                    <li className={currentPath.startsWith('/usuarios') ? 'submenu-active' : ''}>
                      <Link to="/usuarios" className="sidebar-submenu-link">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-submenu-icon">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                        </svg>
                        <span className="sidebar-submenu-text">Usuarios</span>
                      </Link>
                    </li>
                    <li className={currentPath === '/configuracion' || currentPath.startsWith('/configuracion/general') ? 'submenu-active' : ''}>
                      <Link to="/configuracion" className="sidebar-submenu-link">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-submenu-icon">
                          <circle cx="12" cy="12" r="3" />
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                        <span className="sidebar-submenu-text">General</span>
                      </Link>
                    </li>
                    <li className={currentPath.startsWith('/configuracion/landing') ? 'submenu-active' : ''}>
                      <Link to="/configuracion/landing" className="sidebar-submenu-link">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-submenu-icon">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
                        </svg>
                        <span className="sidebar-submenu-text">Landing Page</span>
                      </Link>
                    </li>
                  </ul>
                )}
              </li>
            </ul>
          </div>
        )}
      </nav>

      {/* Sidebar Footer - Profile Info / Logout */}
      <div className="sidebar-footer">
        {isCollapsed ? (
          <a 
            href="#logout" 
            className="sidebar-profile-collapsed-btn" 
            title="Cerrar sesión"
            onClick={(e) => {
              e.preventDefault();
              onLogout();
            }}
          >
            <div className="avatar-circle">
              {user?.foto ? (
                <img src={user.foto} alt={userName} className="w-full h-full object-cover rounded-full" />
              ) : (
                <span>{userInitial}</span>
              )}
            </div>
          </a>
        ) : (
          <div className="sidebar-profile-container">
            <div className="sidebar-profile-info-box">
              <div className="avatar-circle">
                {user?.foto ? (
                  <img src={user.foto} alt={userName} className="w-full h-full object-cover rounded-full" />
                ) : (
                  <span>{userInitial}</span>
                )}
              </div>
              <div className="profile-info">
                <span className="profile-name">{userName}</span>
                <span className="profile-role">{userRole}</span>
              </div>
            </div>
            <a 
              href="#logout" 
              className="logout-trigger-btn" 
              aria-label="Cerrar sesión" 
              title="Cerrar sesión"
              onClick={(e) => {
                e.preventDefault();
                onLogout();
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="logout-icon">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
              </svg>
            </a>
          </div>
        )}
      </div>

    </aside>
  );
};
