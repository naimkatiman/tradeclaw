'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'tc-telegram-config';

interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
}

export function TelegramSettings() {
  const [config, setConfig] = useState<TelegramConfig>({ botToken: '', chatId: '', enabled: false });
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) setConfig(JSON.parse(stored));
      } catch { /* ignore */ }
    }, 0);
  }, []);

  const save = (updates: Partial<TelegramConfig>) => {
    const next = { ...config, ...updates };
    setConfig(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const sendTest = async () => {
    if (!config.botToken || !config.chatId) {
      setError('Enter bot token and chat ID first');
      return;
    }
    setStatus('testing');
    setError('');
    try {
      const res = await fetch('/api/telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Opt-in to the self-host manual-send path. The hosted route
          // refuses without this header so it is not a public relay.
          'X-TradeClaw-Self-Host': '1',
        },
        body: JSON.stringify({ botToken: config.botToken, chatId: config.chatId, test: true }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus('success');
        save({ enabled: true });
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        setStatus('error');
        setError(data.error || 'Failed');
      }
    } catch {
      setStatus('error');
      setError('Network error');
    }
  };

  return (
    <div className="glass-card rounded-2xl p-5">
      <button
        className="w-full flex items-center justify-between"
        onClick={() => setOpen(o => !o)}
      >
        <div>
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 3L7 7L13 3M1 3V11H13V3M1 3H13" stroke={config.enabled ? '#10B981' : 'rgba(255,255,255,0.3)'} strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <span className="text-xs font-semibold text-white tracking-tight">Telegram Alerts</span>
            {config.enabled && (
              <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-semibold">LIVE</span>
            )}
          </div>
          <div className="text-[11px] text-zinc-600 mt-0.5 text-left">Receive signals in your Telegram</div>
        </div>
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M3 4.5L6 7.5L9 4.5" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      </button>

      {open && (
        <div className="mt-4 space-y-3 border-t border-white/5 pt-4">
          <div className="text-[10px] text-zinc-600 leading-relaxed">
            Create a bot via <span className="text-zinc-400">@BotFather</span>, then get your chat ID from{' '}
            <span className="text-zinc-400">@userinfobot</span>.
          </div>

          <div>
            <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">Bot Token</label>
            <input
              type="password"
              value={config.botToken}
              placeholder="123456:ABC-DEF..."
              onChange={e => save({ botToken: e.target.value })}
              className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-1.5 text-xs text-zinc-300 outline-none focus:border-emerald-500/30 font-mono placeholder:text-zinc-700"
            />
          </div>

          <div>
            <label className="text-[10px] text-zinc-600 uppercase tracking-wider block mb-1">Chat ID</label>
            <input
              type="text"
              value={config.chatId}
              placeholder="-100123456789"
              onChange={e => save({ chatId: e.target.value })}
              className="w-full bg-white/5 border border-white/8 rounded-lg px-3 py-1.5 text-xs text-zinc-300 outline-none focus:border-emerald-500/30 font-mono placeholder:text-zinc-700"
            />
          </div>

          {error && (
            <div className="text-[10px] text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">{error}</div>
          )}

          <button
            onClick={sendTest}
            disabled={status === 'testing'}
            className={`w-full py-2 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 ${
              status === 'success'
                ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                : status === 'error'
                ? 'bg-red-500/15 border border-red-500/20 text-red-400'
                : 'bg-white/5 border border-white/8 text-zinc-400 hover:text-zinc-200 hover:bg-white/8'
            }`}
          >
            {status === 'testing' ? 'Sending...' : status === 'success' ? 'Connected' : status === 'error' ? 'Failed — retry' : 'Send test message'}
          </button>

          {config.enabled && (
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-zinc-600">Auto-send on new signals</span>
              <button
                onClick={() => save({ enabled: !config.enabled })}
                className={`w-8 h-4 rounded-full transition-all duration-200 relative ${config.enabled ? 'bg-emerald-500/40' : 'bg-white/10'}`}
              >
                <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all duration-200 ${config.enabled ? 'left-4 bg-emerald-400' : 'left-0.5 bg-zinc-600'}`} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
