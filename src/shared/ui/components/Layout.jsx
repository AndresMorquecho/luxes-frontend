import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Sidebar } from '../../../features/navigation/infrastructure/ui/Sidebar';
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications.js';
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
    { name: 'Nómina: Credenciales', path: '/nomina/credenciales' },
    { name: 'Nómina: Registro Asistencia', path: '/nomina/registro-asistencia' },
    { name: 'Nómina: Horas Extras', path: '/nomina/horas-extras' },
    { name: 'Nómina: Vacaciones', path: '/nomina/vacaciones' },
    { name: 'Nómina: Nómina del Mes', path: '/nomina/nomina-del-mes' },
    { name: 'Proformas / Cotizaciones', path: '/proformas' },
    { name: 'Inventario de Materiales', path: '/inventario' },
    { name: 'Taller: Impresiones', path: '/impresiones' },
    { name: 'Taller: Colas de Impresión', path: '/colas-impresion' },
    { name: 'Gastos y Egresos', path: '/gastos' },
    { name: 'Gestión de Proyectos', path: '/proyectos' },
    { name: 'Instalaciones de Equipos', path: '/instalaciones' },
    { name: 'Compras de Materiales', path: '/compras' },
    { name: 'Ventas y Facturación', path: '/ventas' },
    { name: 'Relaciones: Clientes', path: '/clientes' },
    { name: 'Relaciones: Proveedores', path: '/proveedores' },
    { name: 'Relaciones: Contactos', path: '/contactos' },
    { name: 'Configuración: Usuarios', path: '/usuarios' },
    { name: 'Configuración: General', path: '/configuracion' },
  ];

  const allowedModules = user?.rol?.toLowerCase() === 'taller'
    ? [
        { name: 'Notificaciones', path: '/notificaciones' },
        { name: 'Instalaciones de Equipos', path: '/instalaciones' },
        { name: 'Tareas', path: '/tareas' },
        { name: 'Devoluciones', path: '/devoluciones' },
        { name: 'Recibir productos', path: '/compras/recepcion' },
        { name: 'Compras de Materiales', path: '/compras' }
      ]
    : (user?.rol?.toLowerCase() === 'admin' || user?.rol?.toLowerCase() === 'administrador')
      ? modules.filter(m => m.path !== '/instalaciones')
      : modules;

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

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location]);

  const isAsistenciaMode = user?.rol === 'asistencia';
  const isTallerMobile = isMobile && user?.rol?.toLowerCase() === 'taller';

  const unreadCount = useUnreadNotifications(user, {
    enabled: user?.rol?.toLowerCase() === 'taller',
  });

  const isTabActive = (path) => {
    if (path === '/notificaciones') {
      return location.pathname === '/notificaciones';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className={`layout-container ${isMobile ? 'mobile' : ''} ${isMobileOpen ? 'mobile-open' : ''} ${(!isMobile && isCollapsed) ? 'collapsed' : ''} ${isAsistenciaMode ? 'kiosk-layout' : ''} ${isTallerMobile ? 'mobile-taller-layout' : ''}`}>
      {isAsistenciaMode ? (
        <header className="w-full flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white" style={{ height: '70px', fontFamily: "'Inter', sans-serif" }}>
          <div className="flex items-center gap-3">
            <img src="/LogoGlobo.png" alt="Luxes Logo" style={{ width: '32px', height: '32px', objectFit: 'contain' }} />
            <div>
              <h1 className="text-sm font-bold text-slate-800 m-0">Terminal de Registro de Asistencia</h1>
              <p className="text-[10px] text-slate-400 font-medium m-0">Kiosco de Marcaciones Luxes · 2026</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-200 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ width: '14px', height: '14px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
            </svg>
            Cerrar Sesión
          </button>
        </header>
      ) : isTallerMobile ? (
        <header className="mobile-taller-header">
          <div className="mobile-taller-logo-box">
            <img src="/LogoGlobo.png" alt="Luxes Logo" className="mobile-taller-logo" />
            <div className="mobile-taller-user-info">
              <span className="mobile-taller-brand">Luxes Taller</span>
              <span className="mobile-taller-username">{user?.nombre || 'Taller'}</span>
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
      ) : (
        /* Top mobile header */
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

          {/* Quick search bar */}
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

            {/* Search Dropdown */}
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
      )}

      {/* Backdrop overlay for mobile drawer */}
      {isMobile && isMobileOpen && !isTallerMobile && (
        <div 
          className="sidebar-overlay"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {!isAsistenciaMode && !isTallerMobile && (
        <Sidebar 
          isCollapsed={isMobile ? false : isCollapsed} 
          onMouseEnter={() => {
            if (!isMobile) setIsCollapsed(false);
          }}
          onMouseLeave={() => {
            if (!isMobile) setIsCollapsed(true);
          }}
          user={user}
          onLogout={onLogout}
        />
      )}
      
      <main className="layout-main" style={isAsistenciaMode ? { margin: 0, padding: 0, width: '100%', maxWidth: '100%', height: 'calc(100vh - 70px)', overflowY: 'auto' } : undefined}>
        {children}
      </main>

      {isTallerMobile && (
        <nav className="mobile-bottom-nav">
          <Link to="/instalaciones" className={`mobile-nav-item ${isTabActive('/instalaciones') ? 'active' : ''}`}>
            <div className="mobile-nav-icon-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="mobile-nav-icon">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
            </div>
            <span className="mobile-nav-label">Instalaciones</span>
          </Link>

          <Link to="/tareas" className={`mobile-nav-item ${isTabActive('/tareas') ? 'active' : ''}`}>
            <div className="mobile-nav-icon-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="mobile-nav-icon">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
              </svg>
            </div>
            <span className="mobile-nav-label">Tareas</span>
          </Link>

          <Link to="/devoluciones" className={`mobile-nav-item ${isTabActive('/devoluciones') ? 'active' : ''}`}>
            <div className="mobile-nav-icon-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="mobile-nav-icon">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L17.5 12M21 7.5H7.5" />
              </svg>
            </div>
            <span className="mobile-nav-label">Devoluciones</span>
          </Link>
          
          <Link to="/compras/recepcion" className={`mobile-nav-item ${isTabActive('/compras/recepcion') ? 'active' : ''}`}>
            <div className="mobile-nav-icon-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="mobile-nav-icon">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
              </svg>
            </div>
            <span className="mobile-nav-label">Recibir</span>
          </Link>
          
          <Link to="/compras" className={`mobile-nav-item ${isTabActive('/compras') ? 'active' : ''}`}>
            <div className="mobile-nav-icon-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="mobile-nav-icon">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12a1.125 1.125 0 0 1 1.263-1.123h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0z" />
              </svg>
            </div>
            <span className="mobile-nav-label">Compras</span>
          </Link>
        </nav>
      )}
    </div>
  );
};

