import { useState, useEffect } from 'react';
import { subscribeToUnreadCount } from '../../features/notificaciones/application/notificationsService.js';

/**
 * Contador de notificaciones no leídas con caché y polling compartido.
 * Varios componentes pueden usarlo sin multiplicar peticiones a la API.
 */
export function useUnreadNotifications(user, { enabled = true } = {}) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user || !enabled) {
      setUnreadCount(0);
      return undefined;
    }

    return subscribeToUnreadCount(setUnreadCount);
  }, [user, enabled]);

  return unreadCount;
}
