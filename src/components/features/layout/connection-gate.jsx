'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, WifiOff } from 'lucide-react';

const CHECK_EVERY_MS = 10000;
const CHECK_TIMEOUT_MS = 5000;

/**
 * True when the app can reach its own server. navigator.onLine alone is not
 * enough: a device can be on a network with no internet access.
 */
async function serverReachable() {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
  try {
    const res = await fetch(`/manifest.webmanifest?connection-check=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Blocks the whole app while the device is offline. The page is blurred and
 * made inert (no clicks, no keyboard focus), and the notice has no close
 * control. It disappears by itself once the connection is back.
 */
export function ConnectionGate() {
  const [offline, setOffline] = useState(false);
  const [checking, setChecking] = useState(false);
  const [mounted, setMounted] = useState(false);
  const overlayRef = useRef(null);
  const dialogRef = useRef(null);

  useEffect(() => {
    setMounted(true);
    let cancelled = false;

    async function check() {
      setChecking(true);
      const reachable = await serverReachable();
      if (!cancelled) {
        setOffline(!reachable);
        setChecking(false);
      }
    }

    const onOffline = () => setOffline(true);
    const onOnline = () => check();
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    check();
    const timer = setInterval(check, CHECK_EVERY_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  // Make everything else on the page inert while offline, so nothing can be
  // clicked or reached with the keyboard.
  useEffect(() => {
    if (!offline) return undefined;
    const siblings = Array.from(document.body.children).filter((el) => el !== overlayRef.current);
    const previous = siblings.map((el) => el.inert);
    siblings.forEach((el) => {
      el.inert = true;
    });
    dialogRef.current?.focus();
    return () => {
      siblings.forEach((el, i) => {
        el.inert = previous[i];
      });
    };
  }, [offline]);

  if (!mounted || !offline) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="bg-background/60 fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-md"
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="connection-lost-title"
        aria-describedby="connection-lost-body"
        tabIndex={-1}
        className="bg-card text-card-foreground shadow-enterprise-lg ring-foreground/[0.08] w-full max-w-sm space-y-3 rounded-2xl p-6 text-center ring-1 outline-none"
      >
        <div className="bg-destructive/10 text-destructive mx-auto flex size-12 items-center justify-center rounded-full">
          <WifiOff className="size-6" aria-hidden="true" />
        </div>
        <h2 id="connection-lost-title" className="text-base font-semibold tracking-tight">
          Connection lost
        </h2>
        <p id="connection-lost-body" className="text-muted-foreground text-sm leading-relaxed">
          Factor Grid has lost its connection. Connect to the internet to continue. This notice will close by
          itself as soon as you are back online.
        </p>
        <p
          className="text-muted-foreground flex items-center justify-center gap-2 pt-1 text-xs"
          aria-live="polite"
        >
          <Loader2 className={`size-3.5 ${checking ? 'animate-spin' : ''}`} aria-hidden="true" />
          {checking ? 'Checking connection…' : 'Waiting for connection…'}
        </p>
      </div>
    </div>,
    document.body,
  );
}
