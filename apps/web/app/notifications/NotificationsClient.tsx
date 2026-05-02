'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Bell,
  BellOff,
  BellRing,
  Check,
  X,
  Settings,
  ChevronDown,
  Star,
} from 'lucide-react';
import { PageNavBar } from '../../components/PageNavBar';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAIRS = [
  'BTCUSD', 'ETHUSD', 'XAUUSD', 'XAGUSD', 'EURUSD',
  'GBPUSD', 'USDJPY', 'BNBUSD', 'SOLUSD', 'ADAUSD',
] as const;

type Direction = 'BUY' | 'SELL' | 'both';

interface PairPref {
  enabled: boolean;
  threshold: number;
  direction: Direction;
}

interface NotifEntry {
  id: string;
  title: string;
  body: string;
  time: string;
  pair: string;
  direction: string;
}

const LS_SUBSCRIBED = 'tc-push-subscribed';
const LS_PREFS = 'tc-push-prefs';
const LS_HISTORY = 'tc-notif-history';
const LS_MASTER = 'tc-push-master';

function defaultPairPrefs(): Record<string, PairPref> {
  const prefs: Record<string, PairPref> = {};
  for (const p of PAIRS) {
    prefs[p] = { enabled: true, threshold: 70, direction: 'both' };
  }
  return prefs;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function NotificationsClient() {
  const [permission, setPermission] = useState<'default' | 'granted' | 'denied'>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [masterEnabled, setMasterEnabled] = useState(true);
  const [pairPrefs, setPairPrefs] = useState<Record<string, PairPref>>(defaultPairPrefs);
  const [notifHistory, setNotifHistory] = useState<NotifEntry[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [prefsOpen, setPrefsOpen] = useState(true);

  // ---- Load from localStorage ----
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if ('Notification' in window) {
      setPermission(Notification.permission as 'default' | 'granted' | 'denied');
    }

    try {
      const sub = localStorage.getItem(LS_SUBSCRIBED);
      if (sub === 'true') setIsSubscribed(true);
    } catch { /* noop */ }

    try {
      const master = localStorage.getItem(LS_MASTER);
      if (master !== null) setMasterEnabled(master === 'true');
    } catch { /* noop */ }

    try {
      const saved = localStorage.getItem(LS_PREFS);
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, PairPref>;
        setPairPrefs((prev) => ({ ...prev, ...parsed }));
      }
    } catch { /* noop */ }

    try {
      const hist = localStorage.getItem(LS_HISTORY);
      if (hist) setNotifHistory(JSON.parse(hist) as NotifEntry[]);
    } catch { /* noop */ }
  }, []);

  // ---- Persist helpers ----
  const persistPrefs = useCallback((next: Record<string, PairPref>) => {
    setPairPrefs(next);
    try { localStorage.setItem(LS_PREFS, JSON.stringify(next)); } catch { /* noop */ }
  }, []);

  const persistMaster = useCallback((val: boolean) => {
    setMasterEnabled(val);
    try { localStorage.setItem(LS_MASTER, String(val)); } catch { /* noop */ }
  }, []);

  const persistSubscribed = useCallback((val: boolean) => {
    setIsSubscribed(val);
    try { localStorage.setItem(LS_SUBSCRIBED, String(val)); } catch { /* noop */ }
  }, []);

  const addHistory = useCallback((entry: NotifEntry) => {
    setNotifHistory((prev) => {
      const next = [entry, ...prev].slice(0, 10);
      try { localStorage.setItem(LS_HISTORY, JSON.stringify(next)); } catch { /* noop */ }
      return next;
    });
  }, []);

  // ---- Actions ----
  async function requestPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result as 'default' | 'granted' | 'denied');
  }

  async function handleSubscribe() {
    persistSubscribed(true);
    showToast('Subscribed to push notifications');
  }

  async function handleUnsubscribe() {
    persistSubscribed(false);
    showToast('Unsubscribed from push notifications');
  }

  async function handleTest() {
    setIsTesting(true);
    try {
      const res = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        const entry: NotifEntry = {
          id: `test-${Date.now()}`,
          title: data.notification?.title ?? 'Test Signal',
          body: data.notification?.body ?? '',
          time: new Date().toISOString(),
          pair: data.signal?.pair ?? 'BTCUSD',
          direction: data.signal?.direction ?? 'BUY',
        };
        addHistory(entry);

        if (permission === 'granted') {
          try {
            new Notification(entry.title, { body: entry.body, icon: '/icon-192.png' });
          } catch { /* noop */ }
        }

        showToast('Test notification sent successfully');
      }
    } catch {
      showToast('Failed to send test notification');
    } finally {
      setIsTesting(false);
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function updatePairPref(pair: string, update: Partial<PairPref>) {
    const next = { ...pairPrefs, [pair]: { ...pairPrefs[pair], ...update } };
    persistPrefs(next);
  }

  function clearHistory() {
    setNotifHistory([]);
    try { localStorage.removeItem(LS_HISTORY); } catch { /* noop */ }
  }

  // ---- Render ----
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <PageNavBar />
      <div className="max-w-2xl mx-auto px-4 py-12">

        {/* Toast */}
        {toast && (
          <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-lg flex items-center gap-2 animate-fade-up">
            <Check className="w-4 h-4" />
            {toast}
          </div>
        )}

        {/* Hero */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <Bell className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Signal Notifications</h1>
          <p className="text-[var(--text-secondary)] max-w-md mx-auto">
            Get real-time browser push notifications when high-confidence trading signals fire. Never miss an entry.
          </p>
        </div>

        {/* Permission banner */}
        {permission !== 'granted' && (
          <div className="mb-8 p-4 rounded-2xl border border-zinc-500/30 bg-zinc-500/5">
            <div className="flex items-start gap-3">
              <BellOff className="w-5 h-5 text-zinc-400 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-zinc-300 mb-1">
                  {permission === 'denied'
                    ? 'Notifications are blocked'
                    : 'Enable browser notifications'}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mb-3">
                  {permission === 'denied'
                    ? 'You need to allow notifications in your browser settings to receive signal alerts.'
                    : 'Allow TradeClaw to send you push notifications for trading signals.'}
                </p>
                {permission !== 'denied' && (
                  <button
                    onClick={requestPermission}
                    className="px-4 py-2 text-xs font-medium rounded-xl bg-zinc-500/20 text-zinc-300 hover:bg-zinc-500/30 transition-colors"
                  >
                    Enable Notifications
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Master toggle */}
        <div className="mb-6 p-5 rounded-2xl border border-[var(--border)] bg-[var(--glass-bg)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BellRing className="w-5 h-5 text-emerald-400" />
              <div>
                <p className="text-sm font-medium">Push Notifications</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Receive push notifications for trading signals
                </p>
              </div>
            </div>
            <button
              onClick={() => persistMaster(!masterEnabled)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                masterEnabled ? 'bg-emerald-500' : 'bg-zinc-700'
              }`}
              aria-label="Toggle master notifications"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  masterEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Subscription status */}
        <div className="mb-6 p-5 rounded-2xl border border-[var(--border)] bg-[var(--glass-bg)]">
          <div className="flex items-center gap-2 mb-3">
            <Settings className="w-4 h-4 text-[var(--text-secondary)]" />
            <p className="text-sm font-medium">Subscription Status</p>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                isSubscribed ? 'bg-emerald-400' : 'bg-zinc-500'
              }`}
            />
            <span className="text-sm text-[var(--text-secondary)]">
              {isSubscribed ? 'Subscribed to push notifications' : 'Not subscribed'}
            </span>
          </div>
          <div className="flex gap-3">
            {isSubscribed ? (
              <button
                onClick={handleUnsubscribe}
                className="px-4 py-2 text-xs font-medium rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                Unsubscribe
              </button>
            ) : (
              <button
                onClick={handleSubscribe}
                className="px-4 py-2 text-xs font-medium rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors"
              >
                Subscribe
              </button>
            )}
            <button
              onClick={handleTest}
              disabled={isTesting}
              className="px-4 py-2 text-xs font-medium rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--glass-bg)] transition-colors disabled:opacity-50"
            >
              {isTesting ? 'Sending…' : 'Test Notification'}
            </button>
          </div>
        </div>

        {/* Pair preferences */}
        <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--glass-bg)] overflow-hidden">
          <button
            onClick={() => setPrefsOpen(!prefsOpen)}
            className="w-full flex items-center justify-between p-5"
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-[var(--text-secondary)]" />
              <p className="text-sm font-medium">Per-Pair Preferences</p>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-[var(--text-secondary)] transition-transform ${
                prefsOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {prefsOpen && (
            <div className="px-5 pb-5 space-y-3">
              {PAIRS.map((pair) => {
                const pref = pairPrefs[pair] ?? { enabled: true, threshold: 70, direction: 'both' as Direction };
                return (
                  <div
                    key={pair}
                    className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--background)]"
                  >
                    {/* Toggle + Pair name */}
                    <button
                      onClick={() => updatePairPref(pair, { enabled: !pref.enabled })}
                      className={`w-8 h-4 rounded-full transition-colors relative shrink-0 ${
                        pref.enabled ? 'bg-emerald-500' : 'bg-zinc-700'
                      }`}
                      aria-label={`Toggle ${pair}`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                          pref.enabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <span className="text-xs font-mono font-medium w-16">{pair}</span>

                    {/* Threshold slider */}
                    <div className="flex items-center gap-2 flex-1 min-w-[140px]">
                      <span className="text-[10px] text-[var(--text-secondary)]">Conf</span>
                      <input
                        type="range"
                        min={50}
                        max={95}
                        step={5}
                        value={pref.threshold}
                        onChange={(e) =>
                          updatePairPref(pair, { threshold: Number(e.target.value) })
                        }
                        className="flex-1 accent-emerald-500 h-1"
                      />
                      <span className="text-[10px] font-mono text-emerald-400 w-7 text-right">
                        {pref.threshold}%
                      </span>
                    </div>

                    {/* Direction select */}
                    <select
                      value={pref.direction}
                      onChange={(e) =>
                        updatePairPref(pair, { direction: e.target.value as Direction })
                      }
                      className="text-[10px] bg-[var(--glass-bg)] border border-[var(--border)] rounded-lg px-2 py-1 text-[var(--foreground)]"
                    >
                      <option value="both">Both</option>
                      <option value="BUY">BUY</option>
                      <option value="SELL">SELL</option>
                    </select>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Notification history */}
        <div className="mb-8 rounded-2xl border border-[var(--border)] bg-[var(--glass-bg)]">
          <div className="flex items-center justify-between p-5">
            <p className="text-sm font-medium">Recent Notifications</p>
            {notifHistory.length > 0 && (
              <button
                onClick={clearHistory}
                className="text-[10px] text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Clear All
              </button>
            )}
          </div>
          {notifHistory.length === 0 ? (
            <div className="px-5 pb-5">
              <p className="text-xs text-[var(--text-secondary)]">
                No notifications yet. Send a test notification to see it here.
              </p>
            </div>
          ) : (
            <div className="px-5 pb-5 space-y-2">
              {notifHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)] bg-[var(--background)]"
                >
                  <BellRing className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{entry.title}</p>
                    <p className="text-[10px] text-[var(--text-secondary)] truncate">{entry.body}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                      {entry.pair}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        entry.direction === 'BUY'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {entry.direction}
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)]">
                      {new Date(entry.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* GitHub star CTA */}
        <div className="text-center">
          <Link
            href="/star"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors text-sm font-medium"
          >
            <Star className="w-4 h-4" />
            Star on GitHub
          </Link>
        </div>
      </div>
    </div>
  );
}
