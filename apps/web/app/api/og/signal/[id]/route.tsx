import { ImageResponse } from 'next/og';
import { getTrackedSignalsForRequest } from '../../../../../lib/tracked-signals';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parts = id.toUpperCase().split('-');

  const direction = parts[parts.length - 1] as 'BUY' | 'SELL';
  const timeframe = parts[parts.length - 2];
  const symbol = parts.slice(0, parts.length - 2).join('-');

  const isBuy = direction === 'BUY';
  const accentColor = isBuy ? '#10b981' : '#f43f5e';
  const accentBg = isBuy ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)';
  const accentBorder = isBuy ? 'rgba(16,185,129,0.25)' : 'rgba(244,63,94,0.25)';

  // Fetch signal data (best-effort)
  let entry = 0;
  let sl = 0;
  let tp1 = 0;
  let tp2 = 0;
  let tp3 = 0;
  let confidence = 0;
  let rsiValue = 0;
  let macdHist = 0;
  let timestamp = new Date().toISOString();

  try {
    const { signals } = await getTrackedSignalsForRequest(_request, { symbol, timeframe, direction });
    if (signals.length > 0) {
      const sig = signals[0];
      entry = sig.entry;
      sl = sig.stopLoss;
      tp1 = sig.takeProfit1;
      tp2 = sig.takeProfit2 ?? 0;
      tp3 = sig.takeProfit3 ?? 0;
      confidence = sig.confidence;
      rsiValue = sig.indicators.rsi.value;
      macdHist = sig.indicators.macd.histogram;
      timestamp = sig.timestamp;
    }
  } catch {
    // Render with partial data if signal fetch fails
  }

  const fmtPrice = (n: number) =>
    n === 0 ? '—'
    : n >= 1000 ? n.toFixed(2)
    : n >= 1 ? n.toFixed(4)
    : n.toFixed(5);

  const fmtDate = new Date(timestamp).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#050505',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'monospace, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Ambient glow */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            left: isBuy ? '-100px' : 'auto',
            right: isBuy ? 'auto' : '-100px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${isBuy ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)'} 0%, transparent 70%)`,
          }}
        />

        {/* Left accent bar */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '4px',
            height: '100%',
            background: `linear-gradient(to bottom, ${accentColor}, transparent)`,
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', padding: '48px 56px', flex: 1 }}>
          {/* Top: branding + timeframe */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: '#10b981',
                  boxShadow: '0 0 12px #10b981',
                }}
              />
              <span style={{ color: '#10b981', fontSize: '15px', letterSpacing: '0.15em', fontWeight: 600 }}>
                TRADECLAW
              </span>
            </div>
            <span
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: '#71717a',
                fontSize: '14px',
                padding: '6px 16px',
                borderRadius: '8px',
                letterSpacing: '0.1em',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {timeframe}
            </span>
          </div>

          {/* Main content row */}
          <div style={{ display: 'flex', flex: 1, gap: '48px' }}>
            {/* Left: symbol + direction + confidence */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              {/* Direction badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '16px',
                }}
              >
                <div
                  style={{
                    background: accentBg,
                    border: `1px solid ${accentBorder}`,
                    borderRadius: '8px',
                    padding: '6px 20px',
                    color: accentColor,
                    fontSize: '18px',
                    fontWeight: 800,
                    letterSpacing: '0.12em',
                  }}
                >
                  {direction}
                </div>
                <span style={{ color: accentColor, fontSize: '22px' }}>
                  {isBuy ? '▲' : '▼'}
                </span>
              </div>

              {/* Symbol */}
              <div
                style={{
                  fontSize: '72px',
                  fontWeight: 800,
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                  marginBottom: '24px',
                }}
              >
                {symbol}
              </div>

              {/* Confidence */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '16px' }}>
                <span
                  style={{
                    fontSize: '56px',
                    fontWeight: 800,
                    color: accentColor,
                    letterSpacing: '-0.02em',
                    lineHeight: 1,
                  }}
                >
                  {confidence > 0 ? `${confidence}%` : '—'}
                </span>
                <span style={{ color: '#52525b', fontSize: '16px', letterSpacing: '0.08em' }}>
                  CONFIDENCE
                </span>
              </div>

              {/* Confidence bar */}
              {confidence > 0 && (
                <div
                  style={{
                    width: '100%',
                    height: '6px',
                    background: 'rgba(255,255,255,0.06)',
                    borderRadius: '3px',
                    marginBottom: '24px',
                  }}
                >
                  <div
                    style={{
                      width: `${confidence}%`,
                      height: '6px',
                      background: accentColor,
                      borderRadius: '3px',
                    }}
                  />
                </div>
              )}

              {/* RSI / MACD row */}
              {rsiValue > 0 && (
                <div style={{ display: 'flex', gap: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: '#52525b', fontSize: '11px', letterSpacing: '0.08em' }}>RSI</span>
                    <span style={{ color: '#a1a1aa', fontSize: '16px', fontWeight: 600 }}>
                      {rsiValue.toFixed(1)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ color: '#52525b', fontSize: '11px', letterSpacing: '0.08em' }}>MACD</span>
                    <span
                      style={{
                        color: macdHist > 0 ? '#10b981' : '#f43f5e',
                        fontSize: '16px',
                        fontWeight: 600,
                      }}
                    >
                      {macdHist > 0 ? '+' : ''}{macdHist}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Right: price levels */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                minWidth: '280px',
                justifyContent: 'center',
              }}
            >
              {[
                { label: 'ENTRY', value: fmtPrice(entry), color: '#ffffff' },
                { label: 'STOP LOSS', value: fmtPrice(sl), color: '#f43f5e' },
                { label: 'TP1', value: fmtPrice(tp1), color: '#10b981' },
                { label: 'TP2', value: fmtPrice(tp2), color: '#10b981' },
                { label: 'TP3', value: fmtPrice(tp3), color: '#10b981' },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '10px',
                    padding: '10px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ color: '#52525b', fontSize: '11px', letterSpacing: '0.08em' }}>
                    {label}
                  </span>
                  <span style={{ color, fontSize: '15px', fontWeight: 700 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '24px',
              paddingTop: '20px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <span style={{ color: '#27272a', fontSize: '13px', letterSpacing: '0.05em' }}>
              tradeclaw.com — Open-Source AI Trading Signals
            </span>
            <span style={{ color: '#3f3f46', fontSize: '12px' }}>{fmtDate}</span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
