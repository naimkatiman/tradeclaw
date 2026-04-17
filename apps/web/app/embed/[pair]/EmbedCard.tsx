'use client';

import { useState, useEffect, useCallback } from 'react';
import { TradeClawLogo } from '../../../components/tradeclaw-logo';
import type { TradingSignal } from '../../lib/signals';

interface Props {
  pair: string;
  theme: 'dark' | 'light';
}

function formatPrice(p: number): string {
  if (p >= 1000) return p.toFixed(2);
  if (p >= 1) return p.toFixed(4);
  return p.toFixed(5);
}

const REPO_URL = 'https://github.com/naimkatiman/tradeclaw';

export function EmbedCard({ pair, theme }: Props) {
  const [signal, setSignal] = useState<TradingSignal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const isDark = theme === 'dark';

  const fetchSignal = useCallback(async () => {
    try {
      const res = await fetch(`/api/signals?symbol=${pair}`);
      if (!res.ok) throw new Error('bad response');
      const data = await res.json() as { signals: TradingSignal[] };
      if (data.signals && data.signals.length > 0) {
        setSignal(data.signals[0]);
        setError(false);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  }, [pair]);

  useEffect(() => {
    fetchSignal();
    const interval = setInterval(fetchSignal, 60_000);
    return () => clearInterval(interval);
  }, [fetchSignal]);

  const bg = isDark ? '#050505' : '#fafafa';
  const cardBg = isDark ? '#0a0a0a' : '#ffffff';
  const cardBorder = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
  const textPrimary = isDark ? '#f5f5f5' : '#0a0a0a';
  const textMuted = isDark ? '#71717a' : '#a1a1aa';
  const textFaint = isDark ? '#3f3f46' : '#d4d4d8';
  const dividerColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';

  const buyColor = '#10b981';
  const sellColor = '#f43f5e';

  if (loading) {
    return (
      <div style={{
        background: bg, width: '100%', height: '100dvh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" style={{ color: '#10b981', margin: '0 auto 8px', display: 'block' }}>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.3" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
              <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
            </path>
          </svg>
          <p style={{ color: textMuted, fontSize: '11px', fontFamily: 'monospace', margin: 0 }}>Loading {pair}…</p>
        </div>
      </div>
    );
  }

  if (error || !signal) {
    return (
      <div style={{
        background: bg, width: '100%', height: '100dvh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
      }}>
        <div style={{ textAlign: 'center', padding: '0 16px' }}>
          <p style={{ color: textMuted, fontSize: '12px', margin: '0 0 4px' }}>No signal for {pair}</p>
          <p style={{ color: textFaint, fontSize: '10px', fontFamily: 'monospace', margin: 0 }}>Check pair name or try again later</p>
        </div>
      </div>
    );
  }

  const isBuy = signal.direction === 'BUY';
  const accentColor = isBuy ? buyColor : sellColor;
  const accentBg = isBuy ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)';
  const accentBorder = isBuy ? 'rgba(16,185,129,0.25)' : 'rgba(244,63,94,0.25)';

  const confColor = signal.confidence >= 80 ? buyColor
    : signal.confidence >= 65 ? '#f59e0b'
    : sellColor;

  return (
    <div style={{
      background: bg,
      width: '100%',
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)',
      fontVariantNumeric: 'tabular-nums',
      WebkitFontSmoothing: 'antialiased',
      padding: '10px',
      boxSizing: 'border-box',
    }}>
      {/* Card */}
      <div style={{
        flex: 1,
        background: cardBg,
        border: `1px solid ${cardBorder}`,
        borderRadius: '14px',
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        boxShadow: isDark
          ? 'inset 0 1px 1px rgba(255,255,255,0.04), 0 4px 20px rgba(0,0,0,0.4)'
          : '0 2px 12px rgba(0,0,0,0.08)',
      }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{
              fontSize: '20px', fontWeight: 700, color: textPrimary,
              fontFamily: 'var(--font-geist-mono, monospace)', letterSpacing: '-0.5px',
              lineHeight: 1.1,
            }}>
              {signal.symbol}
            </div>
            <div style={{ marginTop: '5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                display: 'inline-block',
                background: accentBg,
                border: `1px solid ${accentBorder}`,
                color: accentColor,
                fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
                borderRadius: '4px', padding: '2px 7px',
              }}>
                {signal.direction}
              </span>
              <span style={{ fontSize: '10px', color: textMuted, fontFamily: 'monospace' }}>
                {signal.timeframe}
              </span>
            </div>
          </div>
          {/* Confidence */}
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: '26px', fontWeight: 700, color: confColor,
              fontFamily: 'var(--font-geist-mono, monospace)',
              lineHeight: 1,
            }}>
              {signal.confidence}%
            </div>
            <div style={{ fontSize: '9px', color: textMuted, marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              confidence
            </div>
          </div>
        </div>

        {/* Confidence bar */}
        <div style={{
          height: '3px', background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)',
          borderRadius: '99px', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', width: `${signal.confidence}%`,
            background: confColor, borderRadius: '99px',
          }} />
        </div>

        {/* Entry price */}
        <div style={{
          background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
          border: `1px solid ${dividerColor}`,
          borderRadius: '8px', padding: '8px 10px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '10px', color: textMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Entry</span>
          <span style={{ fontSize: '14px', fontWeight: 600, color: textPrimary, fontFamily: 'monospace' }}>
            {formatPrice(signal.entry)}
          </span>
        </div>

        {/* SL / TP row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
          {[
            { label: 'Stop Loss', value: signal.stopLoss, color: sellColor },
            { label: 'TP1', value: signal.takeProfit1, color: buyColor },
            { label: 'TP2', value: signal.takeProfit2, color: buyColor },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
              border: `1px solid ${dividerColor}`,
              borderRadius: '7px', padding: '6px 5px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '9px', color: textFaint, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>
                {label}
              </div>
              <div style={{ fontSize: '10px', fontWeight: 600, color, fontFamily: 'monospace' }}>
                {formatPrice(value)}
              </div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{ height: '1px', background: dividerColor }} />

        {/* Indicators */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[
            {
              label: 'RSI',
              value: `${signal.indicators.rsi.value.toFixed(1)}`,
              sub: signal.indicators.rsi.signal,
              color: signal.indicators.rsi.signal === 'oversold' ? buyColor
                : signal.indicators.rsi.signal === 'overbought' ? sellColor
                : textPrimary,
            },
            {
              label: 'MACD',
              value: `${signal.indicators.macd.histogram > 0 ? '+' : ''}${signal.indicators.macd.histogram}`,
              sub: signal.indicators.macd.signal,
              color: signal.indicators.macd.signal === 'bullish' ? buyColor
                : signal.indicators.macd.signal === 'bearish' ? sellColor
                : textPrimary,
            },
            {
              label: 'EMA Trend',
              value: signal.indicators.ema.trend.toUpperCase(),
              sub: null,
              color: signal.indicators.ema.trend === 'up' ? buyColor
                : signal.indicators.ema.trend === 'down' ? sellColor
                : textPrimary,
            },
            {
              label: 'Stochastic',
              value: `${signal.indicators.stochastic.k} / ${signal.indicators.stochastic.d}`,
              sub: signal.indicators.stochastic.signal,
              color: signal.indicators.stochastic.signal === 'oversold' ? buyColor
                : signal.indicators.stochastic.signal === 'overbought' ? sellColor
                : textPrimary,
            },
          ].map(({ label, value, sub, color }) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: '10px', color: textMuted, fontFamily: 'monospace' }}>{label}</span>
              <span style={{ fontSize: '10px', fontFamily: 'monospace', color }}>
                {value}
                {sub && <span style={{ color: textFaint, marginLeft: '4px' }}>({sub})</span>}
              </span>
            </div>
          ))}
        </div>

        {/* Footer spacer */}
        <div style={{ flex: 1 }} />

        {/* Timestamp + powered by */}
        <div style={{
          paddingTop: '8px',
          borderTop: `1px solid ${dividerColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '9px', color: textFaint, fontFamily: 'monospace' }}>
            {lastUpdated
              ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '—'}
          </span>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '9px', color: textMuted, textDecoration: 'none',
              display: 'flex', alignItems: 'center', gap: '3px',
            }}
          >
            <TradeClawLogo className="h-2 w-2 shrink-0" id="embedcard" />
            Powered by TradeClaw
          </a>
        </div>
      </div>
    </div>
  );
}
