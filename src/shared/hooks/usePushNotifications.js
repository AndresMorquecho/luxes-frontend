import { useCallback } from 'react';

const VAPID_PUBLIC_KEY = 'BGaCyuEvn4KNQMYB-u_L_b_QWHU_z-tYrDojo_Mo9g8_FsActYFyGUuwDtX9ZNrNtjf4MejzYq6q_gsU5xnaWuE';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const subscribeUser = useCallback(async (user) => {
    if (import.meta.env.DEV) {
      return;
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    if (!user) {
      return;
    }

    if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
      return;
    }

    let registration;
    try {
      registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    } catch (err) {
      console.error('Service Worker registration failed:', err);
      return;
    }

    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          return;
        }
      }

      const readyReg = await navigator.serviceWorker.ready;

      // 6. Subscribe to Push Manager
      const options = {
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      };

      const subscription = await readyReg.pushManager.subscribe(options);
      console.log('Successfully subscribed to Browser Push Service:', subscription);

      // 7. Save subscription on backend
      const token = localStorage.getItem('token');
      const res = await fetch('/api/notifications/push-subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(subscription)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Error al guardar suscripción push en el servidor');
      }

      console.log('Saved push subscription on server.');
    } catch (err) {
      console.error('Error during push notifications subscription registration:', err);
    }
  }, []);

  const unsubscribeUser = useCallback(async (user) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    try {
      const readyReg = await navigator.serviceWorker.ready;
      const subscription = await readyReg.pushManager.getSubscription();

      if (!subscription) return;

      const endpoint = subscription.endpoint;

      // 1. Delete subscription on backend
      const token = localStorage.getItem('token');
      await fetch('/api/notifications/push-unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ endpoint })
      });

      // 2. Unsubscribe browser from Push Service
      await subscription.unsubscribe();
      console.log('Successfully unsubscribed user from push notifications.');
    } catch (err) {
      console.error('Error unsubscribing push notifications:', err);
    }
  }, []);

  return { subscribeUser, unsubscribeUser };
}
