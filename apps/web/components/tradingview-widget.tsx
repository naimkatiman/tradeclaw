'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

interface TradingViewWidgetProps {
  symbol: string;
  interval?: '1' | '5' | '15' | '30' | '60' | '240' | 'D' | 'W';
  theme?: 'dark' | 'light';
  height?: number;
  studies?: string[];
}

const SYMBOL_MAP: Record<string, string> = {
  BTCUSDT: 'BINANCE:BTCUSDT',
  ETHUSDT: 'BINANCE:ETHUSDT',
  SOLUSDT: 'BINANCE:SOLUSDT',
  XRPUSDT: 'BINANCE:XRPUSDT',
  BNBUSDT: 'BINANCE:BNBUSDT',
  ADAUSDT: 'BINANCE:ADAUSDT',
  DOGEUSDT: 'BINANCE:DOGEUSDT',
  EURUSD: 'FX:EURUSD',
  GBPUSD: 'FX:GBPUSD',
  USDJPY: 'FX:USDJPY',
  AUDUSD: 'FX:AUDUSD',
  USDCAD: 'FX:USDCAD',
  XAUUSD: 'OANDA:XAUUSD',
  XAGUSD: 'OANDA:XAGUSD',
  AAPL: 'NASDAQ:AAPL',
  MSFT: 'NASDAQ:MSFT',
  GOOGL: 'NASDAQ:GOOGL',
  AMZN: 'NASDAQ:AMZN',
  NVDA: 'NASDAQ:NVDA',
  TSLA: 'NASDAQ:TSLA',
  META: 'NASDAQ:META',
};

function resolveSymbol(symbol: string): string {
  return SYMBOL_MAP[symbol] ?? symbol;
}

const MOBILE_QUERY = '(max-width: 640px)';

// SSR-safe matchMedia subscription. useSyncExternalStore avoids calling
// setState inside an effect (react-hooks/set-state-in-effect) while keeping
// the server snapshot stable (false) to prevent hydration mismatch.
function subscribeMobile(callback: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mq = window.matchMedia(MOBILE_QUERY);
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

function getMobileSnapshot(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(MOBILE_QUERY).matches;
}

function useIsMobile(): boolean {
  return useSyncExternalStore(subscribeMobile, getMobileSnapshot, () => false);
}

export function TradingViewWidget({
  symbol,
  interval = '60',
  theme = 'dark',
  height = 480,
  studies = ['RSI@tv-basicstudies', 'MACD@tv-basicstudies'],
}: TradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const isMobile = useIsMobile();

  // Shorter chart on phones so it doesn't dominate the viewport (issue #37).
  const effectiveHeight = isMobile ? Math.min(height, 240) : height;

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = '';
    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = `${effectiveHeight}px`;
    widgetDiv.style.width = '100%';
    container.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.onload = () => setLoaded(true);
    script.innerHTML = JSON.stringify({
      autosize: false,
      width: '100%',
      height: effectiveHeight,
      symbol: resolveSymbol(symbol),
      interval,
      timezone: 'Etc/UTC',
      theme,
      style: '1',
      locale: 'en',
      enable_publishing: false,
      allow_symbol_change: false,
      hide_side_toolbar: false,
      studies,
      support_host: 'https://www.tradingview.com',
    });
    container.appendChild(script);

    return () => {
      container.innerHTML = '';
    };
  }, [symbol, interval, theme, effectiveHeight, studies]);

  return (
    <div className="tradingview-widget-container" style={{ height: effectiveHeight, width: '100%' }}>
      <div ref={containerRef} style={{ height: effectiveHeight, width: '100%' }} />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-500">
          Loading chart…
        </div>
      )}
    </div>
  );
}

export default TradingViewWidget;
