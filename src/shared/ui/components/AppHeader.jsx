import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getUnreadCount } from '../../../features/notificaciones/application/notificationsService';
import headerBg from '../../../assets/header-bg.png';
import './AppHeader.css';

const HEADER_STYLE = {
  backgroundColor: '#02188E',
  backgroundImage: `linear-gradient(90deg, rgba(1, 12, 72, 0.55) 0%, rgba(4, 51, 255, 0.25) 50%, rgba(1, 12, 72, 0.55) 100%), url(${headerBg})`,
  backgroundPosition: 'center',
  backgroundSize: 'cover',
  backgroundRepeat: 'no-repeat',
};

export const AppHeader = ({ user, onLogout, showMenuToggle, onMenuToggle }) => {
  const location = useLocation();
  const userName = user?.nombre || 'Usuario';
  const userRole = (user?.rol || 'visor').toUpperCase();
  const userInitial = userName.charAt(0).toUpperCase();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const data = await getUnreadCount();
      setUnreadCount(data.count || 0);
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchUnreadCount();
    window.addEventListener('notifications-updated', fetchUnreadCount);
    const interval = setInterval(fetchUnreadCount, 15000);
    return () => {
      window.removeEventListener('notifications-updated', fetchUnreadCount);
      clearInterval(interval);
    };
  }, [fetchUnreadCount]);

  return (
    <header className="app-header" style={HEADER_STYLE}>
      <div className="app-header-left">
        {showMenuToggle && (
          <button
            type="button"
            className="app-header-menu-btn"
            onClick={onMenuToggle}
            aria-label="Abrir menú"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
      </div>

      <div className="app-header-actions">
        <Link
          to="/notificaciones"
          className={`app-header-notif-btn ${location.pathname === '/notificaciones' ? 'active' : ''}`}
          title="Notificaciones"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
          {unreadCount > 0 && (
            <span className="app-header-notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
          <span className="app-header-notif-label">Notificaciones</span>
        </Link>

        <div className="app-header-divider" />

        <div className="app-header-user">
          <div className="app-header-avatar">
            <span>{userInitial}</span>
          </div>
          <div className="app-header-user-info">
            <span className="app-header-user-name">{userName}</span>
            <span className="app-header-user-role">{userRole}</span>
          </div>
          <button
            type="button"
            className="app-header-logout-btn"
            onClick={onLogout}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};
