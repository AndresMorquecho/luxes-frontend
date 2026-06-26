const AUTH_EXPIRED_ERROR = 'AUTH_EXPIRED';
const NETWORK_ERROR = 'NETWORK_UNAVAILABLE';

/** Tiempo que se reutiliza el contador sin llamar a la API */
const UNREAD_CACHE_TTL_MS = 60_000;
/** Mínimo entre dos peticiones reales al servidor */
const MIN_REQUEST_GAP_MS = 15_000;
/** Intervalo del polling global (solo con pestaña visible) */
const POLL_INTERVAL_MS = 120_000;

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };
};

const parseResponse = async (response) => {
  if (response.status === 502 || response.status === 503) {
    throw new Error(NETWORK_ERROR);
  }

  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    if (response.status === 502 || response.status === 503) {
      throw new Error(NETWORK_ERROR);
    }
    throw new Error(`Respuesta inválida del servidor (${response.status})`);
  }

  if (response.status === 401) {
    window.dispatchEvent(new Event('auth-session-expired'));
    throw new Error(AUTH_EXPIRED_ERROR);
  }

  if (!response.ok || !data?.success) {
    throw new Error(data?.error?.message || `Error en la operación (${response.status})`);
  }

  return data.data;
};

export { AUTH_EXPIRED_ERROR, NETWORK_ERROR };

export async function getNotifications() {
  return parseResponse(await fetch('/api/notifications', { headers: getHeaders() }));
}

export async function getUnreadCount() {
  return parseResponse(await fetch('/api/notifications/unread-count', { headers: getHeaders() }));
}

export async function markAsRead(id, { silent = false } = {}) {
  const result = await parseResponse(
    await fetch(`/api/notifications/${id}/read`, {
      method: 'PUT',
      headers: getHeaders(),
    }),
  );
  if (!silent) notifyNotificationsUpdated();
  return result;
}

/** Invalida caché y avisa a toda la app que refresque notificaciones */
export function notifyNotificationsUpdated() {
  invalidateUnreadCache();
  window.dispatchEvent(new Event('notifications-updated'));
}

// ── Caché y polling compartido del contador no leído ───────────────────────

let unreadCache = { count: 0, at: 0 };
let unreadInflight = null;
let lastApiCallAt = 0;
const subscribers = new Set();
let pollTimer = null;
let globalListenersAttached = false;

function invalidateUnreadCache() {
  unreadCache.at = 0;
}

async function fetchUnreadCountCached(force = false) {
  const now = Date.now();

  if (!force && unreadCache.at && now - unreadCache.at < UNREAD_CACHE_TTL_MS) {
    return unreadCache.count;
  }

  if (!force && lastApiCallAt && now - lastApiCallAt < MIN_REQUEST_GAP_MS && unreadCache.at) {
    return unreadCache.count;
  }

  if (unreadInflight) return unreadInflight;

  lastApiCallAt = now;
  unreadInflight = getUnreadCount()
    .then((data) => {
      const count = data?.count ?? 0;
      unreadCache = { count, at: Date.now() };
      return count;
    })
    .catch((err) => {
      if (unreadCache.at) return unreadCache.count;
      throw err;
    })
    .finally(() => {
      unreadInflight = null;
    });

  return unreadInflight;
}

function broadcastUnreadCount(count) {
  subscribers.forEach((cb) => {
    try {
      cb(count);
    } catch (e) {
      console.error('Error en suscriptor de notificaciones:', e);
    }
  });
}

async function refreshUnreadCount(force = false) {
  if (!force && document.visibilityState !== 'visible') return;
  if (subscribers.size === 0) return;

  try {
    const count = await fetchUnreadCountCached(force);
    broadcastUnreadCount(count);
  } catch (err) {
    if (err.message !== AUTH_EXPIRED_ERROR && err.message !== NETWORK_ERROR) {
      console.error('Error al obtener contador de notificaciones:', err);
    }
    if (unreadCache.at) broadcastUnreadCount(unreadCache.count);
  }
}

function startSharedPoller() {
  if (pollTimer) return;
  pollTimer = setInterval(() => refreshUnreadCount(false), POLL_INTERVAL_MS);
}

function stopSharedPoller() {
  if (!pollTimer) return;
  clearInterval(pollTimer);
  pollTimer = null;
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible') {
    refreshUnreadCount(true);
    startSharedPoller();
  }
}

function onNotificationsUpdated() {
  refreshUnreadCount(true);
}

function attachGlobalListeners() {
  if (globalListenersAttached) return;
  globalListenersAttached = true;
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('notifications-updated', onNotificationsUpdated);
}

function detachGlobalListeners() {
  if (subscribers.size > 0) return;
  document.removeEventListener('visibilitychange', onVisibilityChange);
  window.removeEventListener('notifications-updated', onNotificationsUpdated);
  globalListenersAttached = false;
  stopSharedPoller();
}

/**
 * Suscripción única al contador no leído (un solo polling para toda la app).
 * @returns {() => void} función para cancelar la suscripción
 */
export function subscribeToUnreadCount(callback) {
  subscribers.add(callback);
  attachGlobalListeners();
  startSharedPoller();
  refreshUnreadCount(true);

  return () => {
    subscribers.delete(callback);
    if (subscribers.size === 0) {
      stopSharedPoller();
      detachGlobalListeners();
    }
  };
}
