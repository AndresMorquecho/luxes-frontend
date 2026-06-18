import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from '../../../features/navigation/infrastructure/ui/Sidebar';
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

  const allowedModules = user?.rol === 'taller'
    ? [
        { name: 'Taller: Impresiones', path: '/impresiones' },
        { name: 'Taller: Colas de Impresión', path: '/colas-impresion' },
        { name: 'Instalaciones de Equipos', path: '/instalaciones' },
        { name: 'Notificaciones', path: '/notificaciones' }
      ]
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

  return (
    <div className={`layout-container ${isMobile ? 'mobile' : ''} ${isMobileOpen ? 'mobile-open' : ''} ${(!isMobile && isCollapsed) ? 'collapsed' : ''} ${isAsistenciaMode ? 'kiosk-layout' : ''}`}>
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
      {isMobile && isMobileOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {!isAsistenciaMode && (
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
    </div>
  );
};

