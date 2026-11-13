'use client';

import { useEffect } from 'react';

/** Registers the service worker in production builds (see public/sw.js). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
      // Installation is optional; the app works without a service worker.
    });
  }, []);
  return null;
}
