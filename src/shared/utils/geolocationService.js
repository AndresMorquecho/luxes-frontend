const STORAGE_KEY = 'luxes:last-ubicacion';
export const DEFAULT_UBICACION = { lat: -2.19616, lng: -79.88621 };
const CACHE_TTL_MS = 30 * 60 * 1000;

const GEO_OPTIONS_HIGH = {
  enableHighAccuracy: true,
  maximumAge: 120_000,
  timeout: 20_000,
};

const GEO_OPTIONS_LOW = {
  enableHighAccuracy: false,
  maximumAge: 600_000,
  timeout: 30_000,
};

let watchId = null;
let currentPosition = null;
let errorMessage = null;
let status = 'idle';
let permissionState = 'unknown';
let lowAccuracyAttempted = false;
let initialized = false;
const subscribers = new Set();

function loadCached() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.lat || !data?.lng || Date.now() - data.ts > CACHE_TTL_MS) return null;
    return { lat: data.lat, lng: data.lng };
  } catch {
    return null;
  }
}

function saveCached(pos) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...pos, ts: Date.now() }));
  } catch {
    /* ignore quota errors */
  }
}

function getDeniedMessage() {
  const ua = navigator.userAgent || '';
  if (/Edg\//i.test(ua)) return 'Permite ubicación en el candado de la barra (Edge).';
  if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) return 'Permite ubicación en el candado de la barra (Chrome).';
  if (/Firefox/i.test(ua)) return 'Permite ubicación en Preferencias del sitio (Firefox).';
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'Activa ubicación en Ajustes del sitio (Safari).';
  return 'Permite el acceso a ubicación en la configuración del navegador.';
}

function getInsecureMessage() {
  return 'El GPS requiere abrir la app en http://localhost:5173 (no uses la IP de red sin HTTPS).';
}

export function isGeolocationSupported() {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator;
}

export function isSecureGeolocationContext() {
  return typeof window !== 'undefined' && window.isSecureContext === true;
}

function snapshot() {
  return {
    ubicacion: currentPosition,
    error: errorMessage,
    status,
    permission: permissionState,
    supported: isGeolocationSupported(),
    secure: isSecureGeolocationContext(),
  };
}

function notify() {
  const state = snapshot();
  subscribers.forEach((fn) => fn(state));
}

function applyPosition(coords) {
  currentPosition = { lat: coords.latitude, lng: coords.longitude };
  saveCached(currentPosition);
  status = 'ready';
  errorMessage = null;
  notify();
}

function handleWatchError(err) {
  switch (err.code) {
    case 1: // PERMISSION_DENIED
      permissionState = 'denied';
      stopWatch();
      if (currentPosition || loadCached()) {
        if (!currentPosition) currentPosition = loadCached();
        status = 'cached';
        errorMessage = null;
      } else {
        status = 'denied';
        errorMessage = getDeniedMessage();
      }
      break;
    case 2: // POSITION_UNAVAILABLE
      tryLowAccuracyOnce();
      return;
    case 3: // TIMEOUT
      if (currentPosition || loadCached()) {
        if (!currentPosition) currentPosition = loadCached();
        status = 'cached';
        errorMessage = null;
      } else {
        tryLowAccuracyOnce();
        return;
      }
      break;
    default:
      if (currentPosition || loadCached()) {
        if (!currentPosition) currentPosition = loadCached();
        status = 'cached';
        errorMessage = null;
      } else {
        status = 'unavailable';
        errorMessage = 'GPS temporalmente no disponible.';
      }
  }
  notify();
}

function tryLowAccuracyOnce() {
  if (lowAccuracyAttempted || !isGeolocationSupported()) {
    const cached = loadCached();
    if (cached) {
      currentPosition = cached;
      status = 'cached';
      errorMessage = null;
    } else {
      status = 'unavailable';
      errorMessage = 'GPS no disponible. Se usará ubicación de referencia.';
    }
    notify();
    return;
  }

  lowAccuracyAttempted = true;
  navigator.geolocation.getCurrentPosition(
    (pos) => applyPosition(pos.coords),
    () => {
      const cached = loadCached();
      if (cached) {
        currentPosition = cached;
        status = 'cached';
        errorMessage = null;
      } else {
        status = 'unavailable';
        errorMessage = 'GPS no disponible. Se usará ubicación de referencia.';
      }
      notify();
    },
    GEO_OPTIONS_LOW
  );
}

function startWatch() {
  if (watchId != null || !isGeolocationSupported()) return;

  status = currentPosition ? 'ready' : 'loading';
  errorMessage = null;
  notify();

  watchId = navigator.geolocation.watchPosition(
    (pos) => applyPosition(pos.coords),
    handleWatchError,
    GEO_OPTIONS_HIGH
  );
}

function stopWatch() {
  if (watchId != null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

async function bindPermissionListener() {
  if (!navigator.permissions?.query) return;

  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    permissionState = result.state;
    result.addEventListener('change', () => {
      permissionState = result.state;
      if (result.state === 'granted') {
        lowAccuracyAttempted = false;
        startWatch();
      } else if (result.state === 'denied') {
        stopWatch();
        handleWatchError({ code: 1, PERMISSION_DENIED: 1 });
      }
      notify();
    });
  } catch {
    /* Permissions API no disponible en este navegador */
  }
}

export function ensureGeolocationWatch() {
  if (initialized) return;
  initialized = true;

  if (!isGeolocationSupported()) {
    status = 'unsupported';
    errorMessage = 'La geolocalización no es compatible con este navegador.';
    notify();
    return;
  }

  if (!isSecureGeolocationContext()) {
    status = 'insecure';
    errorMessage = getInsecureMessage();
    const cached = loadCached();
    if (cached) {
      currentPosition = cached;
      status = 'cached';
    }
    notify();
    return;
  }

  const cached = loadCached();
  if (cached) {
    currentPosition = cached;
    status = 'cached';
    notify();
  } else {
    status = 'loading';
    notify();
  }

  bindPermissionListener().then(() => {
    if (permissionState === 'denied') {
      handleWatchError({ code: 1, PERMISSION_DENIED: 1 });
      return;
    }
    startWatch();
  });
}

export function subscribeGeolocation(callback) {
  ensureGeolocationWatch();
  subscribers.add(callback);
  callback(snapshot());
  return () => subscribers.delete(callback);
}

export function getGeolocationSnapshot() {
  ensureGeolocationWatch();
  return snapshot();
}

export async function resolveUbicacion() {
  ensureGeolocationWatch();

  if (currentPosition) return currentPosition;

  const cached = loadCached();
  if (cached) return cached;

  if (!isGeolocationSupported() || !isSecureGeolocationContext()) {
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        currentPosition = loc;
        saveCached(loc);
        status = 'ready';
        notify();
        resolve(loc);
      },
      () => resolve(null),
      GEO_OPTIONS_LOW
    );
  });
}

/** Reinicia el seguimiento tras conceder permiso manualmente en el navegador. */
export function retryGeolocation() {
  lowAccuracyAttempted = false;
  stopWatch();
  initialized = false;
  ensureGeolocationWatch();
}
