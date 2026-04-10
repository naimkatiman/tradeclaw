export function FeatureHighlights() {
  return (
    <section className="px-6 py-24 bg-[var(--background)]">
      <div className="mx-auto max-w-6xl space-y-32">
        {/* Feature 1: Left Text, Right SVG */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1.5 text-xs uppercase tracking-widest text-emerald-400">
              Multi-Indicator Confluence
            </div>
            <h3 className="text-3xl font-bold tracking-tight sm:text-4xl text-[var(--foreground)] mb-6">
              Neural network precision for every tick
            </h3>
            <p className="text-[var(--text-secondary)] leading-relaxed mb-6">
              TradeClaw doesn't just rely on a single indicator. It aggregates RSI, MACD, EMA crosses, Bollinger Bands, and volume anomalies into a unified decision matrix. Our engine processes hundreds of data points per second to output a single, high-confidence signal.
            </p>
            <ul className="space-y-3 text-sm text-[var(--text-secondary)]">
              <li className="flex items-center gap-3">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Aggregated sentiment scoring
              </li>
              <li className="flex items-center gap-3">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Divergence detection across 5+ timeframes
              </li>
              <li className="flex items-center gap-3">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Dynamic weight adjustment based on volatility
              </li>
            </ul>
          </div>
          <div className="relative rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8 aspect-square sm:aspect-[4/3] flex items-center justify-center overflow-hidden">
            {/* Glowing background */}
            <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 to-purple-500/5" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/20 blur-[100px] rounded-full" />
            
            {/* Complex Node SVG */}
            <svg viewBox="0 0 400 400" className="w-full h-full relative z-10 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <defs>
                <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity="0.8" />
                </linearGradient>
                <linearGradient id="lineGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>

              {/* Connecting Lines */}
              <g stroke="url(#lineGrad)" strokeWidth="2" fill="none" opacity="0.6">
                <path d="M100 150 Q150 100 200 200 T300 120" className="animate-[dash_3s_linear_infinite]" strokeDasharray="5,5" />
                <path d="M80 250 Q180 300 200 200 T320 280" />
                <path d="M200 200 L150 80" />
                <path d="M200 200 L280 320" />
                <path d="M200 200 L320 200" />
                <path d="M200 200 L80 200" />
                <path d="M150 80 Q250 50 300 120" stroke="url(#lineGrad2)" strokeDasharray="4,6" className="animate-[dash_4s_linear_infinite_reverse]" />
                <path d="M80 250 Q120 180 100 150" />
                <path d="M320 280 Q250 250 320 200" />
              </g>

              {/* Central Node */}
              <circle cx="200" cy="200" r="24" fill="#064e3b" stroke="#10b981" strokeWidth="4" filter="url(#glow)" />
              <circle cx="200" cy="200" r="10" fill="#34d399" className="animate-pulse" />

              {/* Outer Nodes */}
              <g fill="#0f172a" stroke="#a855f7" strokeWidth="3">
                <circle cx="100" cy="150" r="14" />
                <circle cx="300" cy="120" r="16" />
                <circle cx="80" cy="250" r="12" />
                <circle cx="320" cy="280" r="18" />
                <circle cx="150" cy="80" r="15" />
                <circle cx="280" cy="320" r="14" />
                <circle cx="320" cy="200" r="12" />
                <circle cx="80" cy="200" r="16" />
              </g>

              {/* Data Packets (Moving dots) */}
              <circle cx="100" cy="150" r="4" fill="#34d399" filter="url(#glow)">
                <animateMotion path="M0 0 Q50 -50 100 50" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx="80" cy="250" r="4" fill="#34d399" filter="url(#glow)">
                <animateMotion path="M0 0 Q100 50 120 -50" dur="3s" repeatCount="indefinite" />
              </circle>
              <circle cx="150" cy="80" r="4" fill="#60a5fa" filter="url(#glow)">
                <animateMotion path="M0 0 L50 120" dur="1.5s" repeatCount="indefinite" />
              </circle>
            </svg>

            {/* Decorative Overlay UI elements */}
            <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-md border border-white/10 rounded-lg px-3 py-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-mono text-emerald-400">RSI_DIVERGENCE: DETECTED</span>
            </div>
            <div className="absolute bottom-4 right-4 bg-black/40 backdrop-blur-md border border-white/10 rounded-lg px-3 py-2 flex flex-col gap-1">
              <span className="text-[10px] font-mono text-zinc-400">CONFIDENCE_SCORE</span>
              <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="w-[87%] h-full bg-emerald-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Feature 2: Left SVG, Right Text */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1 relative rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-8 aspect-square sm:aspect-[4/3] flex items-center justify-center overflow-hidden">
            {/* Glowing background */}
            <div className="absolute inset-0 bg-gradient-to-bl from-rose-500/5 to-orange-500/5" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-rose-500/10 blur-[100px] rounded-full" />

            {/* Complex Chart SVG */}
            <svg viewBox="0 0 400 300" className="w-full h-full relative z-10">
              <defs>
                <linearGradient id="bullGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#047857" />
                </linearGradient>
                <linearGradient id="bearGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#f43f5e" />
                  <stop offset="100%" stopColor="#be123c" />
                </linearGradient>
                <linearGradient id="trendGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
                  <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <g stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1">
                <line x1="0" y1="50" x2="400" y2="50" />
                <line x1="0" y1="100" x2="400" y2="100" />
                <line x1="0" y1="150" x2="400" y2="150" />
                <line x1="0" y1="200" x2="400" y2="200" />
                <line x1="0" y1="250" x2="400" y2="250" />
                <line x1="50" y1="0" x2="50" y2="300" />
                <line x1="150" y1="0" x2="150" y2="300" />
                <line x1="250" y1="0" x2="250" y2="300" />
                <line x1="350" y1="0" x2="350" y2="300" />
              </g>

              {/* Candlesticks (Wick then Body) */}
              {/* Bear 1 */}
              <line x1="60" y1="80" x2="60" y2="160" stroke="#f43f5e" strokeWidth="2" />
              <rect x="52" y="100" width="16" height="50" fill="url(#bearGrad)" rx="2" />
              
              {/* Bull 1 */}
              <line x1="100" y1="120" x2="100" y2="220" stroke="#10b981" strokeWidth="2" />
              <rect x="92" y="130" width="16" height="70" fill="url(#bullGrad)" rx="2" />

              {/* Bull 2 */}
              <line x1="140" y1="90" x2="140" y2="180" stroke="#10b981" strokeWidth="2" />
              <rect x="132" y="100" width="16" height="40" fill="url(#bullGrad)" rx="2" />

              {/* Bear 2 */}
              <line x1="180" y1="80" x2="180" y2="150" stroke="#f43f5e" strokeWidth="2" />
              <rect x="172" y="90" width="16" height="50" fill="url(#bearGrad)" rx="2" />

              {/* Bear 3 */}
              <line x1="220" y1="120" x2="220" y2="210" stroke="#f43f5e" strokeWidth="2" />
              <rect x="212" y="130" width="16" height="60" fill="url(#bearGrad)" rx="2" />

              {/* Bull 3 (Breakout) */}
              <line x1="260" y1="70" x2="260" y2="190" stroke="#10b981" strokeWidth="2" />
              <rect x="252" y="80" width="16" height="100" fill="url(#bullGrad)" rx="2" />

              {/* Bull 4 (Current) */}
              <line x1="300" y1="40" x2="300" y2="110" stroke="#10b981" strokeWidth="2" />
              <rect x="292" y="50" width="16" height="40" fill="url(#bullGrad)" rx="2" className="animate-[pulse_1s_ease-in-out_infinite]" />

              {/* Trend Line */}
              <path d="M40 220 Q160 160 320 80" fill="none" stroke="url(#trendGrad)" strokeWidth="4" strokeDasharray="10,5" className="animate-[dash_2s_linear_infinite]" />

              {/* Signal Marker */}
              <g transform="translate(260, 40)">
                <path d="M-15,-20 L15,-20 L15,0 L5,0 L0,10 L-5,0 L-15,0 Z" fill="#10b981" filter="url(#glow)" />
                <text x="0" y="-7" fill="#000" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">BUY</text>
              </g>
              
              <g transform="translate(220, 240)">
                <path d="M-15,20 L15,20 L15,0 L5,0 L0,-10 L-5,0 L-15,0 Z" fill="#f43f5e" filter="url(#glow)" />
                <text x="0" y="14" fill="#fff" fontSize="10" fontWeight="bold" textAnchor="middle" fontFamily="monospace">SELL</text>
              </g>
            </svg>

            {/* Decorative Overlay UI elements */}
            <div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-md border border-white/10 rounded-lg px-3 py-2 flex items-center gap-3">
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-zinc-400">ENTRY</span>
                <span className="text-xs font-mono font-bold text-white">64,210.50</span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-zinc-400">TP</span>
                <span className="text-xs font-mono font-bold text-emerald-400">65,800.00</span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-zinc-400">SL</span>
                <span className="text-xs font-mono font-bold text-rose-400">63,900.00</span>
              </div>
            </div>
          </div>
          
          <div className="order-1 lg:order-2">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-3.5 py-1.5 text-xs uppercase tracking-widest text-purple-400">
              Real-Time Execution
            </div>
            <h3 className="text-3xl font-bold tracking-tight sm:text-4xl text-[var(--foreground)] mb-6">
              Instant signal delivery. Zero lag.
            </h3>
            <p className="text-[var(--text-secondary)] leading-relaxed mb-6">
              The moment our backend consensus algorithm flags a high-probability setup, it's pushed to your dashboard via WebSocket. No refreshing, no delayed webhooks. By running TradeClaw on your own server, you eliminate middleman latency entirely.
            </p>
            <ul className="space-y-3 text-sm text-[var(--text-secondary)]">
              <li className="flex items-center gap-3">
                <div className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                Sub-50ms WebSocket broadcasting
              </li>
              <li className="flex items-center gap-3">
                <div className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                Automated Stop Loss & Take Profit targets
              </li>
              <li className="flex items-center gap-3">
                <div className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                Direct Telegram and Discord integrations
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
