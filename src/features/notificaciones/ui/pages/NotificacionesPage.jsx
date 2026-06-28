import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, markAsRead, notifyNotificationsUpdated, AUTH_EXPIRED_ERROR } from '../../application/notificationsService';
import { toast } from '../../../../shared/ui/components/Toast';
import './NotificacionesPage.css';

const fmtDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('es-EC', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Helper para determinar la ruta basada en el tipo de notificación
const getNotificationRoute = (notification) => {
  const title = (notification.title || '').toLowerCase();
  const message = (notification.message || '').toLowerCase();
  
  // Orden aprobada → lista de compras del solicitante
  if (title.includes('aprobada') || message.includes('ha sido aprobada')) {
    return '/compras/recepcion';
  }

  // Nueva orden pendiente → aprobaciones (admin) o compras (solicitante)
  if (title.includes('orden de compra') || message.includes('orden de compra')) {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const userRole = (user?.rol || '').toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'administrador';
    return isAdmin ? '/compras/aprobaciones' : '/compras';
  }
  
  // Tareas -> Panel de tareas
  if (title.includes('tarea') || message.includes('tarea')) {
    return '/tareas';
  }
  
  // Impresión / Colas de Impresión
  if (title.includes('impresi') || message.includes('impresi')) {
    return '/colas-impresion';
  }

  // Proformas (aprobación, rechazo, nueva pendiente)
  if (title.includes('proforma') || message.includes('proforma')) {
    const match = (notification.message || '').match(/PROF-\d+/i)
      || (notification.title || '').match(/PROF-\d+/i);
    if (match) return `/proformas/detalle/${match[0]}`;
    return '/proformas';
  }

  // Instalación iniciada o completada / Montaje
  if (title.includes('instalación') || title.includes('instalacion')
    || message.includes('instalación') || message.includes('instalacion')
    || title.includes('montaje') || message.includes('montaje')) {
    
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const userRole = (user?.rol || '').toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'administrador';

    const proyectoId = notification.proyectoId
      || notification.data?.proyectoId
      || (notification.message || '').match(/PROY-\d+/i)?.[0]
      || (notification.message || '').match(/[0-9a-fA-F]{24}/)?.[0];
      
    if (isAdmin) {
      if (proyectoId) return `/proyectos/${proyectoId}`;
      return '/proyectos';
    } else {
      if (proyectoId) return `/proyectos/${proyectoId}`;
      return '/instalaciones';
    }
  }
  
  return null;
};

const getSenderName = (notification) =>
  notification.createdBy || notification.created_by || 'Sistema Luxes';

export const NotificacionesPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await getNotifications();
      setNotifications(data || []);
    } catch (err) {
      if (err.message !== AUTH_EXPIRED_ERROR) {
        toast.error('Error al cargar notificaciones: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let pollTimer = null;
    let debounceTimer = null;

    const load = async () => {
      if (cancelled || document.visibilityState !== 'visible') return;
      try {
        const data = await getNotifications();
        if (!cancelled) setNotifications(data || []);
      } catch (err) {
        if (!cancelled && err.message !== AUTH_EXPIRED_ERROR) {
          toast.error('Error al cargar notificaciones: ' + err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const scheduleReload = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(load, 400);
    };

    load();

    pollTimer = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 120_000);

    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };

    window.addEventListener('notifications-updated', scheduleReload);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      clearInterval(pollTimer);
      clearTimeout(debounceTimer);
      window.removeEventListener('notifications-updated', scheduleReload);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await markAsRead(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      toast.error('Error al actualizar notificación: ' + err.message);
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.isRead);
    if (unread.length === 0) return;
    setNotifications([]);
    try {
      await Promise.all(unread.map((n) => markAsRead(n.id, { silent: true })));
      notifyNotificationsUpdated();
      toast.success('Todas las notificaciones marcadas como leídas');
      loadNotifications();
    } catch (err) {
      toast.error('Error al actualizar notificaciones: ' + err.message);
    }
  };

  const handleGoToNotification = (notification) => {
    const route = getNotificationRoute(notification);
    if (route) {
      // Marcar como leída antes de navegar
      if (!notification.isRead) {
        handleMarkRead(notification.id);
      }
      if (route === '/colas-impresion') {
        window.dispatchEvent(new Event('print-queue-updated'));
        localStorage.setItem('luxes_print_sync_trigger', Date.now().toString());
      }
      navigate(route);
    }
  };

  return (
    <div className="nt-page animate-slide-up">
      {/* Header */}
      <div className="nt-card nt-header">
        <div>
          <h1 className="nt-title">Buzón de Notificaciones</h1>
          <p className="nt-subtitle">Alertas de compra, aprobaciones y estado del sistema</p>
        </div>
        {notifications.some(n => !n.isRead) && (
          <button onClick={handleMarkAllRead} className="nt-btn-primary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Marcar todas como leídas
          </button>
        )}
      </div>

      {/* List Container */}
      <div className="nt-card nt-list-card">
        {loading ? (
          <div className="nt-loader-box"><div className="nt-spinner" /></div>
        ) : notifications.length === 0 ? (
          <div className="nt-empty-state">
            <div className="nt-empty-icon">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </div>
            <h3>Sin notificaciones</h3>
            <p>Todo está al día. No tienes nuevas alertas o solicitudes de aprobación pendientes.</p>
          </div>
        ) : (
          <div className="nt-list">
            {notifications.map(n => {
              const hasRoute = !!getNotificationRoute(n);
              return (
                <div key={n.id} className={`nt-item ${n.isRead ? 'nt-read' : 'nt-unread'}`}>
                  {/* Unread indicator dot */}
                  {!n.isRead && <span className="nt-dot" />}
                  
                  <div className="nt-item-body">
                    <div className="nt-item-header">
                      <h4 className="nt-item-title">{n.title}</h4>
                      <span className="nt-item-date">{fmtDate(n.createdAt)}</span>
                    </div>
                    <p className="nt-item-message">{n.message}</p>
                    <p className="nt-item-user">
                      <svg className="w-3 h-3 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                      Enviado por: {getSenderName(n)}
                    </p>
                  </div>

                  <div className="nt-actions-group">
                    {hasRoute && (
                      <button 
                        onClick={() => handleGoToNotification(n)} 
                        className="nt-action-btn-primary"
                        title="Ir a la página relacionada"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                        {(n.title?.toLowerCase().includes('impresi') || n.message?.toLowerCase().includes('impresi')) ? 'Ver' : 'Ir'}
                      </button>
                    )}
                    {!n.isRead && (
                      <button 
                        onClick={() => handleMarkRead(n.id)} 
                        className="nt-action-btn"
                        title="Marcar como leída"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
