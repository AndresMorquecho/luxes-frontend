import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from '../../../features/navigation/infrastructure/ui/Sidebar';
import { AppHeader } from './AppHeader';
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
    { name: 'Nómina: Colaboradores', path: '/nomina/empleados' },
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
    { name: 'Configuración: Landing page', path: '/configuracion/landing' },
  ];

  const filteredModules = searchQuery.trim() === ''
    ? []
    : modules.filter(m =>
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

  useEffect(() => {
    setIsMobileOpen(false);
  }, [location]);

  return (
    <div className={`layout-container ${isMobile ? 'mobile' : ''} ${isMobileOpen ? 'mobile-open' : ''} ${(!isMobile && isCollapsed) ? 'collapsed' : ''}`}>
      {isMobile && isMobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <Sidebar
        isCollapsed={isMobile ? false : isCollapsed}
        user={user}
        onMouseEnter={() => {
          if (!isMobile) setIsCollapsed(false);
        }}
        onMouseLeave={() => {
          if (!isMobile) setIsCollapsed(true);
        }}
      />

      <div className={`layout-body ${isMobile ? 'has-mobile-search' : ''}`}>
        <div className="layout-top-bar">
          <AppHeader
            user={user}
            onLogout={onLogout}
            showMenuToggle={isMobile}
            onMenuToggle={() => setIsMobileOpen(prev => !prev)}
          />

          {isMobile && (
            <div className="mobile-search-bar">
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
                    onChange={e => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                  />
                  {searchQuery && (
                    <button type="button" className="mobile-search-clear" onClick={() => setSearchQuery('')}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                      </svg>
                    </button>
                  )}
                </div>

                {isSearchFocused && filteredModules.length > 0 && (
                  <ul className="mobile-search-results">
                    {filteredModules.map(m => (
                      <li key={m.path} onMouseDown={() => handleModuleClick(m.path)}>
                        {m.name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        <main className="layout-main">
          {children}
        </main>
      </div>
    </div>
  );
};
