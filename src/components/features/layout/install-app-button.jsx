'use client';

import { useEffect, useState } from 'react';
import { Download, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/**
 * Install button for the top bar. Chrome, Edge and Android offer a one-tap
 * install; iPhone and iPad (Safari) show the Add to Home Screen steps.
 * Hidden when the app is already installed or the browser cannot install it.
 */
export function InstallAppButton() {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(true);
  const [isIos, setIsIos] = useState(false);
  const [showIosSteps, setShowIosSteps] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    setInstalled(standalone);
    setIsIos(/iphone|ipad|ipod/i.test(window.navigator.userAgent));

    function onBeforeInstall(event) {
      event.preventDefault();
      setDeferred(event);
    }
    function onInstalled() {
      setInstalled(true);
      setDeferred(null);
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed || (!deferred && !isIos)) return null;

  async function handleClick() {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      return;
    }
    setShowIosSteps(true);
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        aria-label="Install app"
        title="Install app"
        className="text-foreground"
      >
        <Download data-icon="inline-start" />
        <span className="hidden lg:inline">Install app</span>
      </Button>
      <Dialog open={showIosSteps} onOpenChange={setShowIosSteps}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Install Factor Grid</DialogTitle>
            <DialogDescription>Add the app to your Home Screen in three steps:</DialogDescription>
          </DialogHeader>
          <ol className="text-foreground space-y-2 text-sm">
            <li>
              1. Tap the Share button <Share className="inline size-4 align-text-bottom" aria-hidden="true" />{' '}
              in Safari.
            </li>
            <li>2. Scroll down and tap “Add to Home Screen”.</li>
            <li>3. Tap “Add”. Open Factor Grid from your Home Screen.</li>
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}
