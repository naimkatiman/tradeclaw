'use client';

// ---------------------------------------------------------------------------
// Browser Notification Helpers (client-side only)
// ---------------------------------------------------------------------------

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export function sendNotification(
  title: string,
  body: string,
  options?: {
    icon?: string;
    tag?: string;
    data?: Record<string, unknown>;
  }
): Notification | null {
  if (typeof window === 'undefined' || !('Notification' in window)) return null;
  if (Notification.permission !== 'granted') return null;

  return new Notification(title, {
    body,
    icon: options?.icon ?? '/icon-192.png',
    tag: options?.tag,
    data: options?.data,
  });
}

export function sendAlertTriggeredNotification(params: {
  symbol: string;
  direction: 'above' | 'below';
  targetPrice: number;
  currentPrice: number;
}): Notification | null {
  const dirLabel = params.direction === 'above' ? '▲ Above' : '▼ Below';
  const priceStr = formatPrice(params.currentPrice);
  const targetStr = formatPrice(params.targetPrice);

  return sendNotification(
    `${params.symbol} Alert Triggered`,
    `Price ${priceStr} hit your ${dirLabel} target of ${targetStr}`,
    {
      tag: `alert-${params.symbol}-${params.direction}`,
      data: { symbol: params.symbol },
    }
  );
}

function formatPrice(p: number): string {
  if (p >= 1000) return p.toFixed(2);
  if (p >= 1) return p.toFixed(4);
  return p.toFixed(5);
}

export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker
    .register('/sw.js')
    .catch(() => {/* ignore registration errors */});
}
