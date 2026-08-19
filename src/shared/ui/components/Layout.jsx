import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Sidebar } from '../../../features/navigation/infrastructure/ui/Sidebar';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications.js';
import { isAdminUser } from '../../utils/userRoleHelpers.js';
import './Layout.css';

export const Layout = ({ children, user, onLogout }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const modules = [
    { name: 'Dashboard / Inicio', path: '/' },
    { name: 'Nómina: Empleados', path: '/nomina/empleados' },
    { name: 'Nómina: Credenciales', path: '/nomina/empleados?vista=credenciales' },
    { name: 'Nómina: Registro Asistencia', path: '/nomina/registro-asistencia' },
    { name: 'Nómina: Horas Extras', path: '/nomina/horas-extras' },
    { name: 'Nómina: Nómina del Mes', path: '/nomina/nomina-del-mes' },
    { name: 'Proformas / Cotizaciones', path: '/proformas' },
    { name: 'Inventario de Materiales', path: '/inventario' },
    { name: 'Taller: Impresiones', path: '/impresiones' },
    { name: 'Gastos y Egresos', path: '/gastos' },
    { name: 'Gestión de Proyectos', path: '/proyectos' },
    { name: 'Instalaciones de Equipos', path: '/instalaciones' },
    { name: 'Compras de Materiales', path: '/compras' },
    { name: 'Ventas y Facturación', path: '/ventas' },
    { name: 'Contactos: Clientes', path: '/clientes' },
    { name: 'Contactos: Proveedores', path: '/proveedores' },
    { name: 'Configuración: Usuarios', path: '/usuarios' },
    { name: 'Configuración: General', path: '/configuracion' },
  ];

  const allowedModules = isAdminUser(user)
    ? modules
    : [
        { name: 'Gestión de Proyectos', path: '/proyectos' },
        { name: 'Tareas', path: '/tareas' },
        { name: 'Nómina: Registro Asistencia', path: '/nomina/registro-asistencia' },
        { name: 'Notificaciones', path: '/notificaciones' },
      ];

  const filteredModules = searchQuery.trim() === ''
    ? []
    : allowedModules.filter(m => 
        m.name.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const handleModuleClick = (path) => {
    navigate(path);
    setSearchQuery('');
    setIsSearchFocused(false);
  };

  const [hideBottomNav, setHideBottomNav] = useState(false);

  useEffect(() => {
    const handleFocus = () => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.tagName === 'SELECT' || 
        activeEl.isContentEditable
      );
      setHideBottomNav(!!isInput);
    };

    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleFocus);

    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      const activeEl = document.activeElement;
      const isInput = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.tagName === 'SELECT'
      );
      if (isInput && window.visualViewport && window.visualViewport.height < window.innerHeight * 0.8) {
        setHideBottomNav(true);
      }
    };

    window.addEventListener('resize', handleResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }

    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleFocus);
      window.removeEventListener('resize', handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location]);

  const isAsistenciaMode = user?.rol === 'asistencia';
  const isAdminMobile = isMobile && isAdminUser(user);
  const isBottomNavMobile = isMobile && !isAsistenciaMode;

  const unreadCount = useUnreadNotifications(user, {
    enabled: isBottomNavMobile,
  });

  const isTabActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    if (path === '/notificaciones') {
      return location.pathname === '/notificaciones';
    }
    if (path === '/nomina/nomina-del-mes') {
      return location.pathname.startsWith('/nomina');
    }
    if (path === '/compras') {
      return location.pathname === '/compras' ||
             location.pathname.startsWith('/compras/aprobacion') ||
             location.pathname.startsWith('/compras/historial') ||
             location.pathname.startsWith('/compras/nueva') ||
             location.pathname.startsWith('/compras/editar');
    }
    return location.pathname.startsWith(path);
  };

  const mobileBrandLabel = isAdminMobile ? 'Admin' : 'Trabajador';
  const mobileUserLabel = user?.nombre || mobileBrandLabel;

  const hoverTimeoutRef = React.useRef(null);

  const handleMouseEnterSidebar = () => {
    if (isMobile) return;
    setIsCollapsed(false);
  };

  const handleMouseLeaveSidebar = () => {
    if (isMobile) return;
    setIsCollapsed(true);
  };

  return (
    <div className={`layout-container ${isMobile ? 'mobile' : ''} ${isMobileOpen ? 'mobile-open' : ''} ${(!isMobile && isCollapsed) ? 'collapsed' : ''} ${isAsistenciaMode ? 'kiosk-layout' : ''} ${isBottomNavMobile ? 'mobile-taller-layout' : ''}`}>
      {/* Backdrop overlay for mobile drawer */}
      {isMobile && isMobileOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {!isAsistenciaMode && (!isBottomNavMobile || (isMobile && isMobileOpen)) && (
        <Sidebar 
          isCollapsed={isMobile ? false : isCollapsed} 
          onMouseEnter={handleMouseEnterSidebar}
          onMouseLeave={handleMouseLeaveSidebar}
          user={user}
          onLogout={onLogout}
        />
      )}
      
      <div className={`layout-body ${isMobile && searchQuery ? 'has-mobile-search' : ''}`} style={isAsistenciaMode ? { marginLeft: 0 } : undefined}>
        {isAsistenciaMode ? (
          <header className="kiosk-header w-full flex items-center justify-between px-3 sm:px-5 py-2 border-b border-slate-200 bg-white shrink-0" style={{ fontFamily: "'Inter', sans-serif" }}>
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <img src="/LogoGlobo.png" alt="Luxes Logo" className="w-6 h-6 sm:w-7 sm:h-7 object-contain shrink-0" />
              <div className="min-w-0">
                <h1 className="text-xs sm:text-sm font-bold text-slate-800 m-0 leading-tight truncate">Terminal de Registro de Asistencia</h1>
                <p className="text-[10px] text-slate-400 font-medium m-0 hidden sm:block">Kiosco de Marcaciones Luxes · 2026</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 transition-all border border-slate-200 cursor-pointer shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5 sm:w-3.5 sm:h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
              </svg>
              <span className="sm:hidden">Salir</span>
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </header>
        ) : isBottomNavMobile ? (
          <header className="mobile-taller-header">
            <div className="mobile-taller-logo-box">
              <img src="/LogoGlobo.png" alt="Luxes Logo" className="mobile-taller-logo" />
              <div className="mobile-taller-user-info">
                <span className="mobile-taller-brand">Luxes {mobileBrandLabel}</span>
                <span className="mobile-taller-username">{mobileUserLabel}</span>
              </div>
            </div>
            <div className="mobile-taller-header-actions">
              <Link to="/notificaciones" className={`mobile-taller-notif-btn ${isTabActive('/notificaciones') ? 'active' : ''}`} aria-label="Notificaciones">
                <div className="mobile-nav-icon-wrapper">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.25" className="mobile-taller-notif-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="mobile-nav-badge" style={{ top: '-8px', right: '-10px' }}>{unreadCount}</span>
                  )}
                </div>
              </Link>
              <button onClick={onLogout} className="mobile-taller-logout-btn" aria-label="Cerrar sesión">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="logout-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                </svg>
              </button>
            </div>
          </header>
        ) : isMobile ? (
          <header className="mobile-header">
            <button 
              className="mobile-menu-toggle"
              onClick={() => setIsMobileOpen(prev => !prev)}
              aria-label="Toggle menu"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="mobile-toggle-icon">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="mobile-search-container">
              <div className="mobile-search-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="mobile-search-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input 
                  type="text" 
                  placeholder="Ir a módulo..." 
                  className="mobile-search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                />
                {searchQuery && (
                  <button className="mobile-search-clear" onClick={() => setSearchQuery('')}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </button>
                )}
              </div>

              {isSearchFocused && filteredModules.length > 0 && (
                <ul className="mobile-search-results">
                  {filteredModules.map((m) => (
                    <li key={m.path} onMouseDown={() => handleModuleClick(m.path)}>
                      {m.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </header>
        ) : null}

        <main className="layout-main">
          {children}
        </main>
      </div>

      {isBottomNavMobile && !hideBottomNav && (
        <nav className="mobile-bottom-nav">
          {isAdminMobile ? (
            <>
              <Link to="/proformas" className={`mobile-nav-item ${isTabActive('/proformas') ? 'active' : ''}`}>
                <div className="mobile-nav-icon-wrapper">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="mobile-nav-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <span className="mobile-nav-label">Proformas</span>
              </Link>

              <Link to="/compras?vista=aprobaciones" className={`mobile-nav-item ${isTabActive('/compras') ? 'active' : ''}`}>
                <div className="mobile-nav-icon-wrapper">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="mobile-nav-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                  </svg>
                </div>
                <span className="mobile-nav-label">Compras</span>
              </Link>

              <Link to="/proyectos" className={`mobile-nav-item mobile-nav-item-fab ${isTabActive('/proyectos') ? 'active' : ''}`}>
                <div className="mobile-nav-fab-circle">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="mobile-nav-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.008 1.24l.885 1.77a2.25 2.25 0 002.007 1.24h1.98a2.25 2.25 0 002.007-1.24l.885-1.77a2.25 2.25 0 012.007-1.24h3.86m-18 0a2.25 2.25 0 00-2.25 2.25v.9a2.25 2.25 0 002.25 2.25h16.5a2.25 2.25 0 002.25-2.25v-.9a2.25 2.25 0 00-2.25-2.25m-18 0V7.5A2.25 2.25 0 012.25 5.25h16.5A2.25 2.25 0 0121 7.5v6m-18 0h18" />
                  </svg>
                </div>
                <span className="mobile-nav-label">Proyectos</span>
              </Link>

              <Link to="/" className={`mobile-nav-item ${isTabActive('/') ? 'active' : ''}`}>
                <div className="mobile-nav-icon-wrapper">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="mobile-nav-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                  </svg>
                </div>
                <span className="mobile-nav-label">Dashboard</span>
              </Link>

              <button
                type="button"
                onClick={() => setIsMobileOpen(true)}
                className={`mobile-nav-item ${isMobileOpen ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <div className="mobile-nav-icon-wrapper">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.25" className="mobile-nav-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                </div>
                <span className="mobile-nav-label">Más</span>
              </button>
            </>
          ) : (
            <>
              {/* Trabajador Tabs */}
              <Link to="/tareas" className={`mobile-nav-item ${isTabActive('/tareas') ? 'active' : ''}`}>
                <div className="mobile-nav-icon-wrapper">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="mobile-nav-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
                  </svg>
                </div>
                <span className="mobile-nav-label">Tareas</span>
              </Link>

              <Link to="/notificaciones" className={`mobile-nav-item ${isTabActive('/notificaciones') ? 'active' : ''}`}>
                <div className="mobile-nav-icon-wrapper">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="mobile-nav-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="mobile-nav-badge">{unreadCount}</span>
                  )}
                </div>
                <span className="mobile-nav-label">Avisos</span>
              </Link>

              {/* Central FAB - Proyectos */}
              <Link to="/proyectos" className={`mobile-nav-item mobile-nav-item-fab ${isTabActive('/proyectos') ? 'active' : ''}`}>
                <div className="mobile-nav-fab-circle">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="mobile-nav-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 012.008 1.24l.885 1.77a2.25 2.25 0 002.007 1.24h1.98a2.25 2.25 0 002.007-1.24l.885-1.77a2.25 2.25 0 012.007-1.24h3.86m-18 0a2.25 2.25 0 00-2.25 2.25v.9a2.25 2.25 0 002.25 2.25h16.5a2.25 2.25 0 002.25-2.25v-.9a2.25 2.25 0 00-2.25-2.25m-18 0V7.5A2.25 2.25 0 012.25 5.25h16.5A2.25 2.25 0 0121 7.5v6m-18 0h18" />
                  </svg>
                </div>
                <span className="mobile-nav-label">Proyectos</span>
              </Link>

              <Link to="/nomina/registro-asistencia" className={`mobile-nav-item ${isTabActive('/nomina/registro-asistencia') ? 'active' : ''}`}>
                <div className="mobile-nav-icon-wrapper">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="mobile-nav-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <span className="mobile-nav-label">Asistencia</span>
              </Link>

              <button
                type="button"
                onClick={() => setIsMobileOpen(true)}
                className={`mobile-nav-item ${isMobileOpen ? 'active' : ''}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <div className="mobile-nav-icon-wrapper">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.25" className="mobile-nav-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                  </svg>
                </div>
                <span className="mobile-nav-label">Más</span>
              </button>
            </>
          )}
        </nav>
      )}
    </div>
  );
};


