import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Banknote, Car, ClipboardCheck, ClockPlus, Palmtree, Wallet } from 'lucide-react';
import faviconIcon from '../../../../assets/icon/favicon.png';
import headerBg from '../../../../assets/header-bg.png';
import './Sidebar.css';

const LOGO_BOX_STYLE = {
  backgroundColor: '#02188E',
  backgroundImage: `linear-gradient(90deg, rgba(1, 12, 72, 0.55) 0%, rgba(4, 51, 255, 0.25) 50%, rgba(1, 12, 72, 0.55) 100%), url(${headerBg})`,
  backgroundPosition: 'center',
  backgroundSize: 'cover',
  backgroundRepeat: 'no-repeat',
};

export const Sidebar = ({ isCollapsed, onMouseEnter, onMouseLeave, user }) => {
  const userRole = (user?.rol || 'visor').toUpperCase();
  const isAdmin = userRole === 'ADMIN' || userRole === 'ADMINISTRADOR';
  const hasAprobacionPermission = user?.permissions?.includes('aprobacion_ordenes_compra') || isAdmin;

  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [isNominaOpen, setIsNominaOpen] = useState(false);
  const [isRelacionesOpen, setIsRelacionesOpen] = useState(false);
  const [isInventarioOpen, setIsInventarioOpen] = useState(false);
  const [isComprasOpen, setIsComprasOpen] = useState(false);
  const [isGastosOpen, setIsGastosOpen] = useState(false);
  const location = useLocation();
  const currentPath = location.pathname;

  // Auto-open submenus based on current route
  React.useEffect(() => {
    if (currentPath.startsWith('/impresiones') || currentPath.startsWith('/colas-impresion')) {
      setIsPrintOpen(true);
    }
    if (currentPath.startsWith('/nomina')) {
      setIsNominaOpen(true);
    }
    if (currentPath.startsWith('/clientes') || currentPath.startsWith('/proveedores') || currentPath.startsWith('/contactos')) {
      setIsRelacionesOpen(true);
    }
    if (currentPath.startsWith('/usuarios')) {
      setIsConfigOpen(true);
    }
    if (currentPath.startsWith('/inventario')) {
      setIsInventarioOpen(true);
    }
    if (currentPath.startsWith('/compras')) {
      setIsComprasOpen(true);
    }
    if (currentPath.startsWith('/gastos')) {
      setIsGastosOpen(true);
    }
  }, [currentPath]);

  return (
    <aside 
      className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      
      {/* Sidebar Logo Panel */}
      <div className="sidebar-logo-box" style={LOGO_BOX_STYLE}>
        <img
          src={isCollapsed ? faviconIcon : '/LogoBanner.png'}
          alt="Luxes Logo"
          className="sidebar-logo-img"
        />
      </div>

      {/* Navigation menu list */}
      <nav className="sidebar-nav">
        <div className="sidebar-category">
          <ul>
            <li className={currentPath === '/' ? 'active' : ''}>
              <Link to="/">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-icon">
                  <rect x="3" y="3" width="7" height="9" rx="1" />
                  <rect x="14" y="3" width="7" height="5" rx="1" />
                  <rect x="14" y="12" width="7" height="9" rx="1" />
                  <rect x="3" y="16" width="7" height="5" rx="1" />
                </svg>
                <span className="sidebar-link-text">Dashboard</span>
              </Link>
            </li>

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
                    setIsGastosOpen(false);
                    setIsConfigOpen(false);
                  }
                }}
                className="sidebar-submenu-toggle sidebar-submenu-toggle--text-only"
              >
                <span className="sidebar-link-text">Nómina</span>
                {!isCollapsed && (
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
                )}
              </button>

              {!isCollapsed && isNominaOpen && (
                <ul className="sidebar-submenu">
                  <li className={currentPath.startsWith('/nomina/empleados') ? 'submenu-active' : ''}>
                    <Link to="/nomina/empleados" className="sidebar-submenu-link">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-submenu-icon">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                      </svg>
                      <span className="sidebar-submenu-text">Colaboradores</span>
                    </Link>
                  </li>
                  <li className={currentPath === '/nomina/credenciales' ? 'submenu-active' : ''}>
                    <Link to="/nomina/credenciales" className="sidebar-submenu-link">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-submenu-icon">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm1.294 6.336a6.721 6.721 0 0 1-3.17.789 6.721 6.721 0 0 1-3.168-.789 3.376 3.376 0 0 1 6.338 0Z" />
                      </svg>
                      <span className="sidebar-submenu-text">Credenciales</span>
                    </Link>
                  </li>
                  <li className={currentPath === '/nomina/registro-asistencia' || currentPath === '/nomina' ? 'submenu-active' : ''}>
                    <Link to="/nomina/registro-asistencia" className="sidebar-submenu-link">
                      <ClipboardCheck className="sidebar-submenu-icon" size={18} strokeWidth={1.75} />
                      <span className="sidebar-submenu-text">Asistencia</span>
                    </Link>
                  </li>
                  <li className={currentPath === '/nomina/horas-extras' ? 'submenu-active' : ''}>
                    <Link to="/nomina/horas-extras" className="sidebar-submenu-link">
                      <ClockPlus className="sidebar-submenu-icon" size={18} strokeWidth={1.75} />
                      <span className="sidebar-submenu-text">Horas Extras</span>
                    </Link>
                  </li>
                  <li className={currentPath === '/nomina/vacaciones' ? 'submenu-active' : ''}>
                    <Link to="/nomina/vacaciones" className="sidebar-submenu-link">
                      <Palmtree className="sidebar-submenu-icon" size={18} strokeWidth={1.75} />
                      <span className="sidebar-submenu-text">Vacaciones</span>
                    </Link>
                  </li>
                  <li className={currentPath === '/nomina/nomina-del-mes' ? 'submenu-active' : ''}>
                    <Link to="/nomina/nomina-del-mes" className="sidebar-submenu-link">
                      <Banknote className="sidebar-submenu-icon" size={18} strokeWidth={1.75} />
                      <span className="sidebar-submenu-text">Nómina del Mes</span>
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            <li className={currentPath.startsWith('/proformas') ? 'active' : ''}>
              <Link to="/proformas">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
                </svg>
                <span className="sidebar-link-text">Proformas</span>
                {!isCollapsed && (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="chevron-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                )}
              </Link>
            </li>

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
                    setIsGastosOpen(false);
                    setIsConfigOpen(false);
                  }
                }}
                className="sidebar-submenu-toggle"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
                <span className="sidebar-link-text">Inventario</span>
                {!isCollapsed && (
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
                )}
              </button>

              {!isCollapsed && isInventarioOpen && (
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
                  <li className={currentPath.startsWith('/inventario/recepcion') ? 'submenu-active' : ''}>
                    <Link to="/inventario/recepcion" className="sidebar-submenu-link">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-submenu-icon">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                      </svg>
                      <span className="sidebar-submenu-text">Recepción de Insumos</span>
                    </Link>
                  </li>
                  <li className={currentPath.startsWith('/inventario/prestamos') ? 'submenu-active' : ''}>
                    <Link to="/inventario/prestamos" className="sidebar-submenu-link">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-submenu-icon">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L17.5 12M21 7.5H7.5" />
                      </svg>
                      <span className="sidebar-submenu-text">Préstamos</span>
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            <li className={`sidebar-has-submenu ${isPrintOpen ? 'submenu-open' : ''} ${(currentPath.startsWith('/impresiones') || currentPath.startsWith('/colas-impresion')) ? 'active' : ''}`}>
              <button
                type="button"
                onClick={() => {
                  setIsPrintOpen(!isPrintOpen);
                  // Contraer los demás módulos
                  if (!isPrintOpen) {
                    setIsNominaOpen(false);
                    setIsRelacionesOpen(false);
                    setIsInventarioOpen(false);
                    setIsComprasOpen(false);
                    setIsGastosOpen(false);
                    setIsConfigOpen(false);
                  }
                }}
                className="sidebar-submenu-toggle"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2m2 4h6a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2zm8-12V5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v4" />
                </svg>
                <span className="sidebar-link-text">Taller de Impresión</span>
                {!isCollapsed && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className={`chevron-icon submenu-chevron ${isPrintOpen ? 'rotated' : ''}`}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                )}
              </button>

              {!isCollapsed && isPrintOpen && (
                <ul className="sidebar-submenu">
                  <li className={currentPath.startsWith('/impresiones') ? 'submenu-active' : ''}>
                    <Link to="/impresiones" className="sidebar-submenu-link">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-submenu-icon">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2m2 4h6a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2zm8-12V5a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v4" />
                      </svg>
                      <span className="sidebar-submenu-text">Impresiones</span>
                    </Link>
                  </li>
                  <li className={currentPath.startsWith('/colas-impresion') ? 'submenu-active' : ''}>
                    <Link to="/colas-impresion" className="sidebar-submenu-link">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-submenu-icon">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 8.25V6a2.25 2.25 0 0 0-2.25-2.25H6A2.25 2.25 0 0 0 3.75 6v8.25A2.25 2.25 0 0 0 6 16.5h2.25m3.375-3.375V18a2.25 2.25 0 0 0 2.25 2.25H18A2.25 2.25 0 0 0 20.25 18v-5.25A2.25 2.25 0 0 0 18 10.5h-5.25a2.25 2.25 0 0 0-2.25 2.25z" />
                      </svg>
                      <span className="sidebar-submenu-text">Colas de Impresión</span>
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            <li className={`sidebar-has-submenu ${isGastosOpen ? 'submenu-open' : ''} ${currentPath.startsWith('/gastos') ? 'active' : ''}`}>
              <button
                type="button"
                onClick={() => {
                  setIsGastosOpen(prev => !prev);
                  if (!isGastosOpen) {
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
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-6.75 3h16.5a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5H4.5a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5z" />
                </svg>
                <span className="sidebar-link-text">Gastos</span>
                {!isCollapsed && (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className={`chevron-icon submenu-chevron ${isGastosOpen ? 'rotated' : ''}`}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                )}
              </button>

              {!isCollapsed && isGastosOpen && (
                <ul className="sidebar-submenu">
                  <li className={currentPath === '/gastos' ? 'submenu-active' : ''}>
                    <Link to="/gastos" className="sidebar-submenu-link">
                      <Wallet className="sidebar-submenu-icon" size={18} strokeWidth={1.75} />
                      <span className="sidebar-submenu-text">Gastos Generales</span>
                    </Link>
                  </li>
                  <li className={currentPath.startsWith('/gastos/carros') ? 'submenu-active' : ''}>
                    <Link to="/gastos/carros" className="sidebar-submenu-link">
                      <Car className="sidebar-submenu-icon" size={18} strokeWidth={1.75} />
                      <span className="sidebar-submenu-text">Gastos de Carros</span>
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            <li className={currentPath.startsWith('/tareas') ? 'active' : ''}>
              <Link to="/tareas" onClick={() => {
                setIsNominaOpen(false);
                setIsPrintOpen(false);
                setIsRelacionesOpen(false);
                setIsInventarioOpen(false);
                setIsComprasOpen(false);
                setIsGastosOpen(false);
                setIsConfigOpen(false);
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <span className="sidebar-link-text">Tareas</span>
                {!isCollapsed && (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="chevron-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                )}
              </Link>
            </li>

            <li className={currentPath.startsWith('/proyectos') ? 'active' : ''}>
              <Link to="/proyectos">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9l2 2 4-4" />
                </svg>
                <span className="sidebar-link-text">Gestion de Proyectos</span>
                {!isCollapsed && (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="chevron-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                )}
              </Link>
            </li>

            <li className={currentPath.startsWith('/instalaciones') ? 'active' : ''}>
              <Link to="/instalaciones">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
                <span className="sidebar-link-text">Instalaciones</span>
                {!isCollapsed && (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="chevron-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                )}
              </Link>
            </li>

            <li className={`sidebar-has-submenu ${isComprasOpen ? 'submenu-open' : ''} ${currentPath.startsWith('/compras') ? 'active' : ''}`}>
              <button
                type="button"
                onClick={() => {
                  setIsComprasOpen(prev => !prev);
                  // Contraer los demás módulos
                  if (!isComprasOpen) {
                    setIsNominaOpen(false);
                    setIsPrintOpen(false);
                    setIsRelacionesOpen(false);
                    setIsInventarioOpen(false);
                    setIsGastosOpen(false);
                    setIsConfigOpen(false);
                  }
                }}
                className="sidebar-submenu-toggle"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12a1.125 1.125 0 0 1 1.263-1.123h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0z" />
                </svg>
                <span className="sidebar-link-text">Compras</span>
                {!isCollapsed && (
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
                )}
              </button>

              {!isCollapsed && isComprasOpen && (
                <ul className="sidebar-submenu">
                  <li className={currentPath === '/compras' ? 'submenu-active' : ''}>
                    <Link to="/compras" className="sidebar-submenu-link">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-submenu-icon">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
                      </svg>
                      <span className="sidebar-submenu-text">Órdenes de Compra</span>
                    </Link>
                  </li>
                  {hasAprobacionPermission && (
                    <li className={currentPath === '/compras/aprobaciones' ? 'submenu-active' : ''}>
                      <Link to="/compras/aprobaciones" className="sidebar-submenu-link">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-submenu-icon">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                        </svg>
                        <span className="sidebar-submenu-text">Aprobaciones</span>
                      </Link>
                    </li>
                  )}
                  <li className={currentPath === '/compras/cuentas-por-pagar' ? 'submenu-active' : ''}>
                    <Link to="/compras/cuentas-por-pagar" className="sidebar-submenu-link">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-submenu-icon">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-6.75 3h16.5a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5H4.5a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5z" />
                      </svg>
                      <span className="sidebar-submenu-text">Cuentas por Pagar</span>
                    </Link>
                  </li>
                  <li className={currentPath === '/compras/metodos-pago' ? 'submenu-active' : ''}>
                    <Link to="/compras/metodos-pago" className="sidebar-submenu-link">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-submenu-icon">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                      <span className="sidebar-submenu-text">Métodos de Pago</span>
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            <li className={currentPath.startsWith('/ventas') ? 'active' : ''}>
              <Link to="/ventas">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0z" />
                </svg>
                <span className="sidebar-link-text">Ventas</span>
                {!isCollapsed && (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" className="chevron-icon">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                )}
              </Link>
            </li>

            {/* Módulo: Relaciones */}
            <li className={`sidebar-has-submenu ${isRelacionesOpen ? 'submenu-open' : ''}`}>
              <button
                type="button"
                onClick={() => {
                  setIsRelacionesOpen(!isRelacionesOpen);
                  // Contraer los demás módulos
                  if (!isRelacionesOpen) {
                    setIsNominaOpen(false);
                    setIsPrintOpen(false);
                    setIsInventarioOpen(false);
                    setIsComprasOpen(false);
                    setIsGastosOpen(false);
                    setIsConfigOpen(false);
                  }
                }}
                className="sidebar-submenu-toggle"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-icon">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                </svg>
                <span className="sidebar-link-text">Relaciones</span>
                {!isCollapsed && (
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
                )}
              </button>

              {!isCollapsed && isRelacionesOpen && (
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
                  <li className={currentPath.startsWith('/contactos') ? 'submenu-active' : ''}>
                    <Link to="/contactos" className="sidebar-submenu-link">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-submenu-icon">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 1 0-2.636 6.364M16.5 12V8.25" />
                      </svg>
                      <span className="sidebar-submenu-text">Contactos</span>
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            <li className={`sidebar-has-submenu ${isConfigOpen ? 'submenu-open' : ''}`}>
              <button 
                type="button"
                onClick={() => {
                  setIsConfigOpen(!isConfigOpen);
                  // Contraer los demás módulos
                  if (!isConfigOpen) {
                    setIsNominaOpen(false);
                    setIsPrintOpen(false);
                    setIsRelacionesOpen(false);
                    setIsInventarioOpen(false);
                    setIsComprasOpen(false);
                    setIsGastosOpen(false);
                  }
                }}
                className="sidebar-submenu-toggle"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-icon">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                <span className="sidebar-link-text">Configuraciones</span>
                {!isCollapsed && (
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
                )}
              </button>

              {/* Submenu: Usuarios */}
              {!isCollapsed && isConfigOpen && (
                <ul className="sidebar-submenu">
                  <li className={currentPath.startsWith('/usuarios') ? 'submenu-active' : ''}>
                    <Link to="/usuarios" className="sidebar-submenu-link">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="sidebar-submenu-icon">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                      </svg>
                      <span className="sidebar-submenu-text">Usuarios</span>
                    </Link>
                  </li>
                </ul>
              )}
            </li>
          </ul>
        </div>
      </nav>

    </aside>
  );
};
