import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Check,
  ArrowRight,
  Clock,
  User
} from 'lucide-react';
import {
  getNotifications,
  markAsRead,
  notifyNotificationsUpdated,
  AUTH_EXPIRED_ERROR,
  NETWORK_ERROR
} from '../../application/notificationsService';
import { toast } from '../../../../shared/ui/components/Toast';

const fmtDate = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('es-EC', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const fmtDateShort = (d) => {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('es-EC', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Helper para extraer ruta o ID de proyecto desde metadatos o texto
const extractProyectoRoute = (notification) => {
  const msg = notification.message || '';
  const title = notification.title || '';
  const combined = `${msg} ${title}`;

  const navMatch = combined.match(/\[NAV:(\/proyectos\/[^\]\s?]+)/i);
  if (navMatch?.[1]) {
    return navMatch[1].split('?')[0];
  }

  if (notification.url?.startsWith('/proyectos/')) {
    return notification.url.split('?')[0];
  }

  const idFromTag = combined.match(/\[PROYECTO_ID:([^\]]+)\]/i)?.[1]?.trim();
  if (idFromTag) {
    return `/proyectos/${idFromTag.toUpperCase()}`;
  }

  const idFromParens = combined.match(/\(PROY-\d+\)/i)?.[0]?.replace(/[()]/g, '');
  if (idFromParens) {
    return `/proyectos/${idFromParens.toUpperCase()}`;
  }

  const idBare = combined.match(/PROY-\d+/i)?.[0];
  if (idBare) {
    return `/proyectos/${idBare.toUpperCase()}`;
  }

  return null;
};

// Helper para determinar la ruta basada en el tipo de notificación
const getNotificationRoute = (notification) => {
  const title = (notification.title || '').toLowerCase();
  const message = (notification.message || '').toLowerCase();

  // Fases de proyecto (nueva fase, fase completada)
  if (title.includes('fase') || message.includes(' fase ') || message.includes('fase "')) {
    return extractProyectoRoute(notification);
  }

  // Nuevo proyecto creado
  if (title.includes('nuevo proyecto') || message.includes('nuevo proyecto') || message.includes('se ha creado el proyecto')) {
    return extractProyectoRoute(notification);
  }

  // Proformas (aprobación, rechazo, nueva pendiente)
  if (title.includes('proforma') || message.includes('proforma')) {
    const match = (notification.message || '').match(/PRO-\d+/i)
      || (notification.title || '').match(/PRO-\d+/i)
      || (notification.message || '').match(/PROF-\d+/i)
      || (notification.title || '').match(/PROF-\d+/i);
    if (match) return `/proformas/detalle/${match[0].toUpperCase()}`;
    return '/proformas';
  }

  // Orden aprobada → lista de compras del solicitante
  if (title.includes('aprobada') || message.includes('ha sido aprobada')) {
    return '/compras';
  }

  // Nueva orden pendiente → aprobaciones (admin) o compras (solicitante)
  if (title.includes('orden de compra') || message.includes('orden de compra')) {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const userRole = (user?.rol || '').toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'administrador';
    return isAdmin ? '/compras?vista=aprobaciones' : '/compras';
  }

  // Tareas -> Panel de tareas
  if (title.includes('tarea') || message.includes('tarea')) {
    return '/tareas';
  }

  // Impresión / Colas de Impresión
  if (title.includes('impresi') || message.includes('impresi')) {
    const matchProjId = (notification.message || '').match(/\[PROYECTO_ID:(.+?)\]/);
    if (matchProjId) {
      return `/proyectos/${matchProjId[1]}?tab=produccion`;
    }
    return '/colas-impresion';
  }

  // Horas extras pendientes de aprobación
  if (title.includes('horas extras') || message.includes('horas extras')) {
    return '/nomina/horas-extras';
  }

  // Herramientas pendientes de devolución tras instalación
  if (title.includes('herramienta en devolución')
    || title.includes('herramienta por devolver')
    || title.includes('herramientas por devolver')
    || message.includes('por devolver')
    || message.includes('debes devolver')) {
    return '/instalaciones';
  }

  // Instalación iniciada o completada / Montaje
  if (title.includes('instalación') || title.includes('instalacion')
    || message.includes('instalación') || message.includes('instalacion')
    || title.includes('montaje') || message.includes('montaje')) {

    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const userRole = (user?.rol || '').toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'administrador';

    const proyectoRoute = extractProyectoRoute(notification);

    if (isAdmin) {
      if (proyectoRoute) return proyectoRoute;
      return '/proyectos';
    } else {
      if (proyectoRoute) return proyectoRoute;
      return '/instalaciones';
    }
  }

  return null;
};

const getNotificationActionLabel = (notification) => {
  const title = (notification.title || '').toLowerCase();
  const message = (notification.message || '').toLowerCase();

  if (title.includes('fase') || message.includes(' fase ') || message.includes('fase "')) {
    return 'Ir a ver';
  }
  if (title.includes('nuevo proyecto') || message.includes('nuevo proyecto') || message.includes('se ha creado el proyecto')) {
    return 'Ir a ver';
  }
  if (title.includes('impresi') || message.includes('impresi')) {
    return 'Ver Producción';
  }
  return 'Ir al Módulo';
};

const getSenderName = (notification) =>
  notification.createdBy || notification.created_by || 'Sistema Luxes';

const displayMessage = (message) =>
  (message || '')
    .replace(/\[seed-prueba\]\s*/gi, '')
    .replace(/\[PROYECTO_ID:[^\]]+\]\s*/g, '')
    .replace(/\[NAV:[^\]]+\]\s*/g, '')
    .trim();

const getLoadErrorMessage = (err) => {
  if (err.message === NETWORK_ERROR) {
    return 'No se puede conectar con el servidor. Verifica que el backend esté activo (puerto 4000).';
  }
  return err.message;
};

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
        toast.error('Error al cargar notificaciones: ' + getLoadErrorMessage(err));
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
        if (!cancelled && err.message !== AUTH_EXPIRED_ERROR && err.message !== NETWORK_ERROR) {
          toast.error('Error al cargar notificaciones: ' + getLoadErrorMessage(err));
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
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      toast.error('Error al actualizar notificación: ' + err.message);
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter((n) => !n.isRead);
    if (unread.length === 0) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
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
    let route = getNotificationRoute(notification);
    if (route) {
      const title = (notification.title || '').toLowerCase();
      if (title.includes('instalación completada') || title.includes('instalacion completada')) {
        const proyectoRoute = extractProyectoRoute(notification);
        const proyectoId = proyectoRoute?.match(/PROY-\d+/i)?.[0] || null;
        window.dispatchEvent(new CustomEvent('instalacion-completada-admin', {
          detail: { proyectoId, notificationId: notification.id },
        }));
      }
      // Marcar como leída antes de navegar
      if (!notification.isRead) {
        handleMarkRead(notification.id);
      }
      if (route === '/colas-impresion' || route.includes('/proyectos/')) {
        window.dispatchEvent(new Event('print-queue-updated'));
        localStorage.setItem('luxes_print_sync_trigger', Date.now().toString());
      }

      // Forzar refresco si el usuario ya se encuentra en la ruta
      const sep = route.includes('?') ? '&' : '?';
      route = `${route}${sep}refresh=${Date.now()}`;

      navigate(route);
    }
  };

  // Contador de no leídas
  const unreadCount = useMemo(() => notifications.filter((n) => !n.isRead).length, [notifications]);

  return (
    <div className="w-full pb-20 md:pb-6 animate-slide-up nt-root" style={{ fontFamily: "var(--font-main, 'Inter', system-ui, -apple-system, sans-serif)" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        .nt-root, .nt-root * {
          font-family: var(--font-main, 'Inter', system-ui, -apple-system, sans-serif) !important;
          box-sizing: border-box;
        }
      `}</style>

      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs mb-4 sm:mb-6 overflow-hidden">
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 text-blue-600 shadow-xs">
              <Bell size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800">Notificaciones</h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-blue-100 text-blue-700">
                  Buzón
                </span>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                    {unreadCount} nuevas
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-0.5">Alertas de compras, aprobaciones, proyectos y estado del sistema</p>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-white rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all shadow-xs w-full sm:w-auto bg-[#0b2d64] hover:bg-[#071f45] shrink-0 cursor-pointer active:scale-[0.99]"
            >
              <CheckCheck size={16} />
              Marcar todas como leídas
            </button>
          )}
        </div>
      </div>

      {/* Lista de Notificaciones */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-[#0b2d64]" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 mb-3 shadow-xs">
              <Bell size={24} strokeWidth={1.5} />
            </div>
            <h3 className="text-base font-bold text-slate-700">Sin notificaciones</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Todo está al día. No tienes nuevas alertas o solicitudes pendientes en este momento.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((n) => {
              const hasRoute = !!getNotificationRoute(n);
              const actionLabel = getNotificationActionLabel(n);

              return (
                <article
                  key={n.id}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${!n.isRead ? 'bg-blue-50/25 hover:bg-blue-50/40' : 'hover:bg-slate-50/70'
                    }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Indicador de estado */}
                    <div className="pt-1 shrink-0">
                      {!n.isRead ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600 block ring-4 ring-blue-100" />
                      ) : (
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-300 block" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className={`text-sm ${!n.isRead ? 'font-bold text-slate-900' : 'font-semibold text-slate-700'}`}>
                          {n.title}
                        </h4>
                        <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                          <Clock size={12} />
                          {fmtDate(n.createdAt)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 mt-1 leading-relaxed whitespace-pre-line">
                        {displayMessage(n.message)}
                      </p>

                      <div className="flex items-center gap-2 mt-2 text-[11px] font-medium text-slate-400">
                        <User size={12} className="text-slate-400" />
                        <span>Enviado por: <strong className="text-slate-600 font-semibold">{getSenderName(n)}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 shrink-0 sm:self-center ml-5 sm:ml-0">
                    {hasRoute && (
                      <button
                        type="button"
                        onClick={() => handleGoToNotification(n)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0b2d64] hover:bg-[#071f45] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer active:scale-[0.99]"
                        title="Ir a la pantalla correspondiente"
                      >
                        <span>{actionLabel}</span>
                        <ArrowRight size={13} />
                      </button>
                    )}

                    {!n.isRead && (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(n.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-200 text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer"
                        title="Marcar como leída"
                      >
                        <Check size={13} />
                        <span>Leída</span>
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
