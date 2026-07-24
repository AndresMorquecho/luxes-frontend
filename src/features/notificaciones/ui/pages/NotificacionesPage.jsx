import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck, ArrowRight, User } from 'lucide-react';
import {
  getNotifications,
  markAsRead,
  notifyNotificationsUpdated,
  AUTH_EXPIRED_ERROR,
  NETWORK_ERROR,
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

const getNotificationRoute = (notification) => {
  const title = (notification.title || '').toLowerCase();
  const message = (notification.message || '').toLowerCase();

  if (title.includes('proforma') || message.includes('proforma')) {
    const match =
      (notification.message || '').match(/PRO-\d+/i) ||
      (notification.title || '').match(/PRO-\d+/i) ||
      (notification.message || '').match(/PROF-\d+/i) ||
      (notification.title || '').match(/PROF-\d+/i);
    if (match) return `/proformas/detalle/${match[0].toUpperCase()}`;
    return '/proformas';
  }

  if (title.includes('aprobada') || message.includes('ha sido aprobada')) {
    return '/compras/recepcion';
  }

  if (title.includes('orden de compra') || message.includes('orden de compra')) {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const userRole = (user?.rol || '').toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'administrador';
    return isAdmin ? '/compras?vista=aprobaciones' : '/compras';
  }

  if (title.includes('tarea') || message.includes('tarea')) {
    return '/tareas';
  }

  if (title.includes('impresi') || message.includes('impresi')) {
    const matchProjId = (notification.message || '').match(/\[PROYECTO_ID:(.+?)\]/);
    if (matchProjId) {
      return `/proyectos/${matchProjId[1]}?tab=produccion`;
    }
    return '/colas-impresion';
  }

  if (title.includes('horas extras') || message.includes('horas extras')) {
    return '/nomina/horas-extras';
  }

  if (
    title.includes('herramienta en devolución') ||
    title.includes('herramienta por devolver') ||
    title.includes('herramientas por devolver') ||
    message.includes('por devolver') ||
    message.includes('debes devolver')
  ) {
    return '/devoluciones';
  }

  if (
    title.includes('instalación') ||
    title.includes('instalacion') ||
    message.includes('instalación') ||
    message.includes('instalacion') ||
    title.includes('montaje') ||
    message.includes('montaje')
  ) {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const userRole = (user?.rol || '').toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'administrador';

    const proyectoId =
      notification.proyectoId ||
      notification.data?.proyectoId ||
      (notification.message || '').match(/\[PROYECTO_ID:(.+?)\]/)?.[1] ||
      (notification.message || '').match(/PROY-\d+/i)?.[0] ||
      (notification.message || '').match(/[0-9a-fA-F]{24}/)?.[0];

    if (isAdmin) {
      if (proyectoId) return `/proyectos/${proyectoId}`;
      return '/proyectos';
    }
    if (proyectoId) return `/proyectos/${proyectoId}`;
    return '/instalaciones';
  }

  return null;
};

const getSenderName = (notification) =>
  notification.createdBy || notification.created_by || 'Sistema Luxes';

const displayMessage = (message) =>
  (message || '')
    .replace(/\[seed-prueba\]\s*/gi, '')
    .replace(/\[PROYECTO_ID:.+?\]\s*/g, '')
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
        if (
          !cancelled &&
          err.message !== AUTH_EXPIRED_ERROR &&
          err.message !== NETWORK_ERROR
        ) {
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
    let route = getNotificationRoute(notification);
    if (route) {
      const title = (notification.title || '').toLowerCase();
      if (
        title.includes('instalación completada') ||
        title.includes('instalacion completada')
      ) {
        const proyectoId =
          (notification.message || '').match(/\[PROYECTO_ID:(.+?)\]/)?.[1] ||
          notification.proyectoId ||
          notification.data?.proyectoId;
        window.dispatchEvent(
          new CustomEvent('instalacion-completada-admin', {
            detail: { proyectoId: proyectoId || null, notificationId: notification.id },
          })
        );
      }
      if (!notification.isRead) {
        handleMarkRead(notification.id);
      }
      if (route === '/colas-impresion' || route.includes('/proyectos/')) {
        window.dispatchEvent(new Event('print-queue-updated'));
        localStorage.setItem('luxes_print_sync_trigger', Date.now().toString());
      }

      const sep = route.includes('?') ? '&' : '?';
      route = `${route}${sep}refresh=${Date.now()}`;

      navigate(route);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const hasUnread = unreadCount > 0;

  const kpiCards = [
    {
      label: 'Total',
      value: notifications.length,
      hint: 'Todas las alertas',
      border: 'border-t-blue-600',
      color: 'text-blue-600',
    },
    {
      label: 'Sin leer',
      value: unreadCount,
      hint: 'Pendientes de revisión',
      border: 'border-t-amber-500',
      color: 'text-amber-600',
    },
    {
      label: 'Leídas',
      value: notifications.length - unreadCount,
      hint: 'Ya revisadas',
      border: 'border-t-emerald-500',
      color: 'text-emerald-600',
    },
  ];

  return (
    <div
      className="space-y-3 sm:space-y-5 animate-slide-up"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <style>{`
        .shadow-card { box-shadow: 0 1px 2px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02); }
        .nt-date-full { display: inline; }
        .nt-date-short { display: none; }
        @media (max-width: 767px) {
          .nt-date-full { display: none; }
          .nt-date-short { display: inline; }
        }
      `}</style>

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-5 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 bg-blue-50 border-blue-100">
              <Bell className="w-5 h-5 text-blue-600" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-800">Notificaciones</h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide bg-blue-100 text-blue-700">
                  Buzón
                </span>
                {hasUnread && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                    {unreadCount} sin leer
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Alertas de compra, aprobaciones y estado del sistema
              </p>
            </div>
          </div>
          {hasUnread && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-700 transition-opacity shadow-sm shrink-0"
            >
              <CheckCheck size={15} />
              Marcar todas como leídas
            </button>
          )}
        </div>
      </div>

      {/* KPIs */}
      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          {kpiCards.map(({ label, value, hint, border, color }) => (
            <div
              key={label}
              className={`bg-white shadow-card rounded-xl border border-gray-100 border-t-2 ${border} px-4 py-4 min-w-0`}
            >
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider truncate">{label}</p>
              <p className={`text-2xl font-bold mt-1 tabular-nums truncate ${color}`}>{value}</p>
              <p className="text-xs text-slate-400 mt-1.5 truncate">{hint}</p>
            </div>
          ))}
        </div>
      )}

      {/* Lista */}
      <div className="bg-white shadow-card rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-700">
            {loading
              ? 'Cargando…'
              : `${notifications.length} notificación${notifications.length !== 1 ? 'es' : ''}`}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-slate-400 text-sm">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-200 border-t-blue-600" />
            <span>Cargando notificaciones...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="w-12 h-12 mx-auto mb-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400">
              <Bell size={22} strokeWidth={1.5} />
            </div>
            <p className="text-slate-500 font-medium text-sm">Sin notificaciones</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Todo está al día. No tienes nuevas alertas o solicitudes pendientes.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((n) => {
              const hasRoute = !!getNotificationRoute(n);
              const actionLabel =
                n.title?.toLowerCase().includes('impresi') ||
                n.message?.toLowerCase().includes('impresi')
                  ? 'Ver'
                  : 'Ir';

              return (
                <article
                  key={n.id}
                  className={`relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 px-4 sm:px-5 py-4 pl-5 sm:pl-6 ${
                    n.isRead ? 'bg-white opacity-75 hover:opacity-100' : 'bg-slate-50/40'
                  } hover:bg-slate-50/60 transition-colors`}
                >
                  {!n.isRead && (
                    <span
                      className="absolute left-2 sm:left-2.5 top-5 w-2 h-2 rounded-full bg-blue-600"
                      aria-hidden="true"
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-3">
                      <h4 className="text-sm font-semibold text-slate-800 leading-snug">
                        {n.title}
                      </h4>
                      <time
                        className="nt-date-full text-xs text-slate-400 font-medium whitespace-nowrap shrink-0"
                        dateTime={n.createdAt}
                      >
                        {fmtDate(n.createdAt)}
                      </time>
                      <time
                        className="nt-date-short text-xs text-slate-400 font-medium whitespace-nowrap"
                        dateTime={n.createdAt}
                      >
                        {fmtDateShort(n.createdAt)}
                      </time>
                    </div>

                    <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                      {displayMessage(n.message)}
                    </p>

                    <p className="flex items-center gap-1.5 text-xs text-slate-400 mt-1.5">
                      <User size={12} className="shrink-0" />
                      <span className="truncate">Enviado por: {getSenderName(n)}</span>
                    </p>
                  </div>

                  {(hasRoute || !n.isRead) && (
                    <div className="flex items-center gap-2 shrink-0 sm:pt-0.5">
                      {hasRoute && (
                        <button
                          type="button"
                          onClick={() => handleGoToNotification(n)}
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
                          title="Ir a la página relacionada"
                        >
                          <ArrowRight size={13} />
                          {actionLabel}
                        </button>
                      )}
                      {!n.isRead && (
                        <button
                          type="button"
                          onClick={() => handleMarkRead(n.id)}
                          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 text-xs font-semibold transition-colors"
                          title="Marcar como leída"
                        >
                          <Check size={13} />
                          <span className="sm:hidden">Leída</span>
                        </button>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
