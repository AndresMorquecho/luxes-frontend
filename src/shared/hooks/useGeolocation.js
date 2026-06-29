import { useEffect, useState } from 'react';
import {
  resolveUbicacion,
  retryGeolocation,
  subscribeGeolocation,
} from '../utils/geolocationService';

export function useGeolocation() {
  const [state, setState] = useState(() => ({
    ubicacion: null,
    error: null,
    status: 'idle',
    permission: 'unknown',
    supported: true,
    secure: true,
  }));

  useEffect(() => subscribeGeolocation(setState), []);

  return {
    ubicacion: state.ubicacion,
    error: state.error,
    status: state.status,
    permission: state.permission,
    supported: state.supported,
    secure: state.secure,
    resolveUbicacion,
    retryGeolocation,
  };
}

export function getGpsBadgeProps({ status, error, secure }) {
  if (!secure) {
    return {
      tone: 'amber',
      text: error || 'Abre la app en http://localhost:5173 para activar GPS',
    };
  }
  if (status === 'ready') {
    return { tone: 'emerald', text: 'GPS activo y listo' };
  }
  if (status === 'cached') {
    return { tone: 'emerald', text: 'GPS listo (última ubicación)' };
  }
  if (status === 'loading' || status === 'idle') {
    return { tone: 'slate', text: 'Obteniendo GPS…' };
  }
  if (status === 'denied' || status === 'unavailable') {
    return {
      tone: 'amber',
      text: error || 'GPS limitado · marcación disponible',
    };
  }
  if (status === 'unsupported') {
    return { tone: 'amber', text: 'GPS no compatible · marcación disponible' };
  }
  return { tone: 'slate', text: 'GPS en preparación…' };
}
