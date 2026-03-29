'use client';

import { useState, useEffect } from 'react';
<<<<<<< HEAD
=======
import { Download } from 'lucide-react';
>>>>>>> origin/main

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed recently
    const lastDismissed = localStorage.getItem('pwa-install-dismissed');
    if (lastDismissed && Date.now() - parseInt(lastDismissed) < 7 * 86400000) {
      return;
    }

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show banner after 30 seconds of browsing
      setTimeout(() => setShowBanner(true), 30000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowBanner(false);
    localStorage.setItem('pwa-install-dismissed', String(Date.now()));
  };

  if (!showBanner || dismissed || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-80 z-40 animate-in slide-in-from-bottom-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-2xl shadow-black/50">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
<<<<<<< HEAD
            <span className="text-emerald-400 text-lg">📲</span>
=======
            <Download className="w-5 h-5 text-emerald-400" />
>>>>>>> origin/main
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-zinc-200">Install TradeClaw</h4>
            <p className="text-xs text-zinc-500 mt-0.5">
              Get instant access with push notifications and offline support
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="text-zinc-600 hover:text-zinc-400 text-sm flex-shrink-0"
          >
            ✕
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleInstall}
            className="flex-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-medium rounded-lg text-xs transition-colors"
          >
            Install App
          </button>
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
