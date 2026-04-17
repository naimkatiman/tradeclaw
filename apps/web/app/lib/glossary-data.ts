export interface GlossaryTerm {
  id: string;
  term: string;
  fullName: string;
  letter: string;
  category:
    | "technical-analysis"
    | "risk-management"
    | "order-types"
    | "market-structure"
    | "performance"
    | "strategy";
  definition: string;
  tcRelevance: string;
  relatedTerms: string[];
  relatedPage?: string;
  tags: string[];
}

export const CATEGORIES: Record<
  GlossaryTerm["category"],
  { label: string; color: string }
> = {
  "technical-analysis": {
    label: "Technical Analysis",
    color: "bg-blue-500/20 text-blue-400",
  },
  "risk-management": {
    label: "Risk Management",
    color: "bg-zinc-500/20 text-zinc-400",
  },
  "order-types": {
    label: "Order Types",
    color: "bg-purple-500/20 text-purple-400",
  },
  "market-structure": {
    label: "Market Structure",
    color: "bg-cyan-500/20 text-cyan-400",
  },
  performance: {
    label: "Performance",
    color: "bg-rose-500/20 text-rose-400",
  },
  strategy: {
    label: "Strategy",
    color: "bg-emerald-500/20 text-emerald-400",
  },
};

export const glossaryTerms: GlossaryTerm[] = [
  // ── Technical Analysis (15) ──────────────────────────────────────────
  {
    id: "rsi",
    term: "RSI",
    fullName: "Relative Strength Index",
    letter: "R",
    category: "technical-analysis",
    definition:
      "A momentum oscillator that measures the speed and magnitude of recent price changes on a scale of 0 to 100. Readings above 70 typically indicate overbought conditions while readings below 30 suggest oversold conditions. Developed by J. Welles Wilder, it is one of the most widely used technical indicators.",
    tcRelevance:
      "TradeClaw calculates RSI across multiple timeframes and fires real-time signals when RSI crosses key overbought/oversold thresholds, helping you catch momentum shifts before the crowd.",
    relatedTerms: ["macd", "stochastic", "divergence"],
    relatedPage: "/signals",
    tags: ["momentum", "oscillator", "overbought", "oversold"],
  },
  {
    id: "macd",
    term: "MACD",
    fullName: "Moving Average Convergence Divergence",
    letter: "M",
    category: "technical-analysis",
    definition:
      "A trend-following momentum indicator that shows the relationship between two exponential moving averages of price. The MACD line is the difference between the 12-period and 26-period EMA, while the signal line is a 9-period EMA of the MACD line. Crossovers, divergences, and rapid rises/falls are commonly used as trading signals.",
    tcRelevance:
      "TradeClaw monitors MACD crossovers and histogram direction changes in real time, combining them with other indicators to produce higher-confidence composite signals.",
    relatedTerms: ["ema", "divergence", "trend"],
    relatedPage: "/signals",
    tags: ["momentum", "trend", "crossover"],
  },
  {
    id: "ema",
    term: "EMA",
    fullName: "Exponential Moving Average",
    letter: "E",
    category: "technical-analysis",
    definition:
      "A type of moving average that gives greater weight to more recent price data, making it more responsive to new information than a simple moving average. The weighting factor decreases exponentially with each preceding data point. Traders commonly use 12, 26, 50, and 200-period EMAs.",
    tcRelevance:
      "TradeClaw uses EMA crossovers as a core building block in its signal engine, detecting golden crosses, death crosses, and dynamic support/resistance levels automatically.",
    relatedTerms: ["sma", "macd", "trend"],
    relatedPage: "/signals",
    tags: ["moving-average", "trend", "smoothing"],
  },
  {
    id: "sma",
    term: "SMA",
    fullName: "Simple Moving Average",
    letter: "S",
    category: "technical-analysis",
    definition:
      "An arithmetic moving average calculated by summing recent closing prices and dividing by the number of periods. Each data point in the window carries equal weight. The SMA smooths out volatility and is commonly used to identify trend direction and potential support/resistance levels.",
    tcRelevance:
      "TradeClaw compares SMA with EMA values to detect trend acceleration or deceleration and incorporates SMA-based signals into its multi-indicator scoring system.",
    relatedTerms: ["ema", "trend", "support", "resistance"],
    relatedPage: "/signals",
    tags: ["moving-average", "trend", "smoothing"],
  },
  {
    id: "bollinger-bands",
    term: "Bollinger Bands",
    fullName: "Bollinger Bands",
    letter: "B",
    category: "technical-analysis",
    definition:
      "A volatility indicator consisting of a middle SMA band and two outer bands set at standard deviations above and below the mean. When bands contract, it signals low volatility and a potential breakout. When price touches or breaks the bands, it can indicate overbought or oversold conditions.",
    tcRelevance:
      "TradeClaw detects Bollinger Band squeezes and breakouts automatically, alerting traders when volatility compression is likely to resolve into a directional move.",
    relatedTerms: ["atr", "sma", "breakout", "consolidation"],
    relatedPage: "/signals",
    tags: ["volatility", "bands", "squeeze"],
  },
  {
    id: "stochastic",
    term: "Stochastic",
    fullName: "Stochastic Oscillator",
    letter: "S",
    category: "technical-analysis",
    definition:
      "A momentum indicator comparing a particular closing price to a range of prices over a given period. It generates values between 0 and 100 using %K and %D lines. Readings above 80 suggest overbought conditions, while readings below 20 indicate oversold territory.",
    tcRelevance:
      "TradeClaw combines Stochastic readings with RSI to create a dual-oscillator confirmation system, reducing false signals and improving entry timing.",
    relatedTerms: ["rsi", "williams-r", "divergence"],
    relatedPage: "/signals",
    tags: ["momentum", "oscillator", "overbought", "oversold"],
  },
  {
    id: "atr",
    term: "ATR",
    fullName: "Average True Range",
    letter: "A",
    category: "technical-analysis",
    definition:
      "A volatility indicator that measures the average range between high and low prices over a specified period, accounting for gaps. Higher ATR values indicate greater volatility. Traders use ATR to set dynamic stop-loss levels and determine position sizes proportional to market volatility.",
    tcRelevance:
      "TradeClaw uses ATR to calculate intelligent stop-loss and take-profit levels, automatically adjusting position sizing recommendations based on current market volatility.",
    relatedTerms: ["stop-loss", "position-sizing", "bollinger-bands"],
    relatedPage: "/signals",
    tags: ["volatility", "range", "stops"],
  },
  {
    id: "adx",
    term: "ADX",
    fullName: "Average Directional Index",
    letter: "A",
    category: "technical-analysis",
    definition:
      "A trend strength indicator that quantifies how strong the current trend is, regardless of direction, on a 0-100 scale. Readings above 25 generally indicate a strong trend, while readings below 20 suggest a range-bound market. It is typically used alongside +DI and -DI lines to determine trend direction.",
    tcRelevance:
      "TradeClaw monitors ADX values to filter out signals in choppy, range-bound markets, only triggering trend-following signals when ADX confirms sufficient trend strength.",
    relatedTerms: ["trend", "consolidation", "atr"],
    relatedPage: "/signals",
    tags: ["trend", "strength", "directional"],
  },
  {
    id: "vwap",
    term: "VWAP",
    fullName: "Volume Weighted Average Price",
    letter: "V",
    category: "technical-analysis",
    definition:
      "The average price of a security weighted by volume, giving a benchmark that reflects the true average price traders paid throughout the day. Institutional traders use VWAP to gauge whether they received a good fill. Price above VWAP suggests bullish sentiment, while price below indicates bearish pressure.",
    tcRelevance:
      "TradeClaw integrates VWAP into its intraday signal engine, helping day traders identify favorable entry points relative to the volume-weighted average.",
    relatedTerms: ["obv", "support", "resistance"],
    relatedPage: "/signals",
    tags: ["volume", "intraday", "benchmark"],
  },
  {
    id: "obv",
    term: "OBV",
    fullName: "On-Balance Volume",
    letter: "O",
    category: "technical-analysis",
    definition:
      "A cumulative volume-based indicator that adds volume on up days and subtracts it on down days. Rising OBV confirms an uptrend as volume flows into the asset, while falling OBV confirms a downtrend. Divergence between OBV and price often precedes a reversal.",
    tcRelevance:
      "TradeClaw tracks OBV divergences to detect smart money accumulation or distribution, providing early warning of potential trend changes before price confirms.",
    relatedTerms: ["vwap", "divergence", "trend"],
    relatedPage: "/signals",
    tags: ["volume", "accumulation", "distribution"],
  },
  {
    id: "fibonacci",
    term: "Fibonacci",
    fullName: "Fibonacci Retracement",
    letter: "F",
    category: "technical-analysis",
    definition:
      "A technical analysis tool that uses horizontal lines at key Fibonacci ratios (23.6%, 38.2%, 50%, 61.8%, 78.6%) to identify potential support and resistance levels. These levels are derived from the Fibonacci sequence and are widely watched by traders for potential reversal zones after a significant price move.",
    tcRelevance:
      "TradeClaw automatically plots Fibonacci retracement levels on detected swing highs and lows, highlighting confluence zones where multiple indicators align for stronger trade setups.",
    relatedTerms: ["support", "resistance", "confluence"],
    relatedPage: "/signals",
    tags: ["retracement", "support", "resistance", "ratios"],
  },
  {
    id: "ichimoku",
    term: "Ichimoku",
    fullName: "Ichimoku Cloud (Ichimoku Kinko Hyo)",
    letter: "I",
    category: "technical-analysis",
    definition:
      "A comprehensive indicator that defines support and resistance, identifies trend direction, gauges momentum, and provides trading signals all in one view. It consists of five lines: Tenkan-sen, Kijun-sen, Senkou Span A, Senkou Span B, and Chikou Span, forming a cloud that visualizes future support/resistance areas.",
    tcRelevance:
      "TradeClaw parses all five Ichimoku components to generate cloud breakout signals and TK cross alerts, offering a single-glance trend assessment for each asset.",
    relatedTerms: ["trend", "support", "resistance", "ema"],
    relatedPage: "/signals",
    tags: ["cloud", "trend", "support", "resistance"],
  },
  {
    id: "parabolic-sar",
    term: "Parabolic SAR",
    fullName: "Parabolic Stop and Reverse",
    letter: "P",
    category: "technical-analysis",
    definition:
      "A trend-following indicator that places dots above or below price to signal potential reversals. When dots flip from above to below price, it indicates a bullish reversal; dots moving from below to above suggest a bearish reversal. It also provides trailing stop levels that tighten as the trend progresses.",
    tcRelevance:
      "TradeClaw monitors Parabolic SAR flips as confirmation signals and uses its trailing stop values to suggest dynamic exit points for open positions.",
    relatedTerms: ["trailing-stop", "trend", "reversal"],
    relatedPage: "/signals",
    tags: ["trend", "reversal", "trailing-stop"],
  },
  {
    id: "williams-r",
    term: "Williams %R",
    fullName: "Williams Percent Range",
    letter: "W",
    category: "technical-analysis",
    definition:
      "A momentum oscillator that measures overbought and oversold levels on a scale of 0 to -100. Readings between 0 and -20 indicate overbought conditions, while readings between -80 and -100 signal oversold territory. It is similar to the Stochastic Oscillator but plotted on a negative scale.",
    tcRelevance:
      "TradeClaw uses Williams %R alongside RSI and Stochastic in its oscillator suite, providing triple confirmation before flagging overbought or oversold conditions.",
    relatedTerms: ["rsi", "stochastic", "cci"],
    relatedPage: "/signals",
    tags: ["momentum", "oscillator", "overbought", "oversold"],
  },
  {
    id: "cci",
    term: "CCI",
    fullName: "Commodity Channel Index",
    letter: "C",
    category: "technical-analysis",
    definition:
      "A versatile oscillator that measures the deviation of price from its statistical mean. Readings above +100 indicate overbought conditions, while readings below -100 suggest oversold territory. Despite its name, CCI is used across all asset classes to identify cyclical turns and extreme price movements.",
    tcRelevance:
      "TradeClaw incorporates CCI into its multi-indicator scoring model, weighting extreme readings to boost overall signal confidence when they align with other indicators.",
    relatedTerms: ["rsi", "williams-r", "stochastic"],
    relatedPage: "/signals",
    tags: ["momentum", "oscillator", "mean-reversion"],
  },

  // ── Risk Management (8) ──────────────────────────────────────────────
  {
    id: "stop-loss",
    term: "Stop-Loss",
    fullName: "Stop-Loss Order",
    letter: "S",
    category: "risk-management",
    definition:
      "An order placed to sell a security when it reaches a certain price, designed to limit an investor's loss on a position. Stop-losses automate risk management by ensuring a position is closed before losses exceed a predetermined threshold. They are essential for disciplined trading and capital preservation.",
    tcRelevance:
      "TradeClaw auto-calculates optimal stop-loss levels using ATR-based volatility analysis and displays them directly on every signal card, so you never enter a trade without a defined risk level.",
    relatedTerms: ["take-profit", "atr", "risk-reward", "trailing-stop"],
    relatedPage: "/signals",
    tags: ["risk", "order", "protection"],
  },
  {
    id: "take-profit",
    term: "Take-Profit",
    fullName: "Take-Profit Order",
    letter: "T",
    category: "risk-management",
    definition:
      "An order that automatically closes a position when it reaches a specified profit target. Take-profit orders lock in gains and prevent the emotional temptation of holding too long. They are typically used in conjunction with stop-loss orders to define a complete trade plan.",
    tcRelevance:
      "Every TradeClaw signal includes multiple take-profit targets (TP1, TP2, TP3) calculated from key technical levels, letting you scale out of positions at optimal reward zones.",
    relatedTerms: ["stop-loss", "risk-reward", "fibonacci"],
    relatedPage: "/signals",
    tags: ["risk", "order", "profit"],
  },
  {
    id: "position-sizing",
    term: "Position Sizing",
    fullName: "Position Sizing",
    letter: "P",
    category: "risk-management",
    definition:
      "The process of determining how many units of a security to buy or sell based on account size, risk tolerance, and the distance to the stop-loss. Proper position sizing ensures that no single trade can significantly damage the overall portfolio. It is widely considered the most important aspect of risk management.",
    tcRelevance:
      "TradeClaw provides built-in position size calculators on each signal, using your risk percentage and account size to recommend exact lot sizes before you place a trade.",
    relatedTerms: ["kelly-criterion", "stop-loss", "risk-reward"],
    relatedPage: "/signals",
    tags: ["risk", "sizing", "capital"],
  },
  {
    id: "kelly-criterion",
    term: "Kelly Criterion",
    fullName: "Kelly Criterion",
    letter: "K",
    category: "risk-management",
    definition:
      "A mathematical formula used to determine the optimal percentage of capital to risk on each trade based on win rate and average win/loss ratio. The formula is f* = (bp - q) / b, where b is the odds, p is the probability of winning, and q is the probability of losing. It maximizes long-term growth rate while minimizing the risk of ruin.",
    tcRelevance:
      "TradeClaw calculates your Kelly fraction from your backtest results and live performance metrics, suggesting optimal bet sizes that maximize geometric growth without excessive drawdown.",
    relatedTerms: ["position-sizing", "win-rate", "drawdown"],
    relatedPage: "/backtest",
    tags: ["risk", "math", "optimal", "sizing"],
  },
  {
    id: "risk-reward",
    term: "Risk-Reward",
    fullName: "Risk-to-Reward Ratio",
    letter: "R",
    category: "risk-management",
    definition:
      "A ratio comparing the potential loss (risk) to the potential gain (reward) of a trade. A ratio of 1:3 means the potential profit is three times the potential loss. Traders typically look for setups with a minimum 1:2 risk-reward ratio to ensure profitability even with a lower win rate.",
    tcRelevance:
      "TradeClaw displays the risk-reward ratio for every signal alongside its stop-loss and take-profit levels, filtering out setups that don't meet your minimum R:R threshold.",
    relatedTerms: ["stop-loss", "take-profit", "r-multiple"],
    relatedPage: "/signals",
    tags: ["risk", "reward", "ratio"],
  },
  {
    id: "trailing-stop",
    term: "Trailing Stop",
    fullName: "Trailing Stop Order",
    letter: "T",
    category: "risk-management",
    definition:
      "A dynamic stop-loss order that moves with the market price at a fixed distance or percentage. As the price moves in your favor, the stop adjusts upward (for long positions), locking in profits while still protecting against reversals. The stop never moves backward, ensuring a minimum exit level.",
    tcRelevance:
      "TradeClaw supports ATR-based trailing stop suggestions that adapt to real-time volatility, helping traders ride winning trends longer while protecting accumulated gains.",
    relatedTerms: ["stop-loss", "parabolic-sar", "atr"],
    relatedPage: "/signals",
    tags: ["risk", "dynamic", "trailing"],
  },
  {
    id: "hedging",
    term: "Hedging",
    fullName: "Hedging",
    letter: "H",
    category: "risk-management",
    definition:
      "A strategy used to offset potential losses by taking an opposing position in a related asset. For example, a trader long on a stock might buy put options to limit downside risk. Hedging reduces overall portfolio volatility but typically comes at a cost that reduces maximum potential profit.",
    tcRelevance:
      "TradeClaw identifies correlated assets in your portfolio and suggests potential hedging opportunities when concentrated directional exposure exceeds configurable thresholds.",
    relatedTerms: ["drawdown", "position-sizing", "risk-reward"],
    relatedPage: "/portfolio",
    tags: ["risk", "protection", "correlation"],
  },
  {
    id: "drawdown",
    term: "Drawdown",
    fullName: "Drawdown",
    letter: "D",
    category: "risk-management",
    definition:
      "The peak-to-trough decline in portfolio or account value, expressed as a percentage from the highest point. Drawdown measures the downside risk of a strategy and is a key metric for evaluating trading performance. Understanding drawdown tolerance is essential for maintaining psychological discipline during losing streaks.",
    tcRelevance:
      "TradeClaw tracks real-time drawdown across your strategies and backtests, alerting you when drawdown approaches your configured maximum tolerance to prevent catastrophic losses.",
    relatedTerms: ["max-drawdown", "sharpe-ratio", "risk-reward"],
    relatedPage: "/results",
    tags: ["risk", "performance", "decline"],
  },

  // ── Order Types (7) ──────────────────────────────────────────────────
  {
    id: "market-order",
    term: "Market Order",
    fullName: "Market Order",
    letter: "M",
    category: "order-types",
    definition:
      "An order to buy or sell a security immediately at the best available current price. Market orders guarantee execution but not price, meaning the fill price may differ from the last quoted price, especially in volatile or illiquid markets. They are the simplest and most common order type.",
    tcRelevance:
      "TradeClaw signal alerts indicate when market orders are appropriate versus limit orders, based on current spread conditions and volatility assessment for each asset.",
    relatedTerms: ["limit-order", "slippage", "spread"],
    tags: ["order", "execution", "immediate"],
  },
  {
    id: "limit-order",
    term: "Limit Order",
    fullName: "Limit Order",
    letter: "L",
    category: "order-types",
    definition:
      "An order to buy or sell a security at a specified price or better. A buy limit order executes at or below the limit price, while a sell limit order executes at or above it. Limit orders give traders price control but do not guarantee execution if the market never reaches the specified price.",
    tcRelevance:
      "TradeClaw suggests limit order entry prices based on support/resistance analysis, helping you enter positions at optimal prices rather than chasing market orders.",
    relatedTerms: ["market-order", "support", "resistance", "entry"],
    tags: ["order", "price-control", "passive"],
  },
  {
    id: "stop-order",
    term: "Stop Order",
    fullName: "Stop Order (Stop-Market Order)",
    letter: "S",
    category: "order-types",
    definition:
      "An order that becomes a market order once price reaches a specified trigger level. Buy stop orders are placed above the current price to catch breakouts, while sell stop orders are placed below to limit losses. Unlike limit orders, stop orders guarantee execution but not the exact fill price.",
    tcRelevance:
      "TradeClaw generates stop order levels for breakout strategies, placing triggers at key technical levels so you can automate entries without watching the screen constantly.",
    relatedTerms: ["market-order", "stop-loss", "breakout"],
    tags: ["order", "trigger", "breakout"],
  },
  {
    id: "bracket-order",
    term: "Bracket Order",
    fullName: "Bracket Order (OCO)",
    letter: "B",
    category: "order-types",
    definition:
      "A three-part order that simultaneously places an entry order, a stop-loss order, and a take-profit order. When the entry fills, both exit orders become active. When one exit order fills, the other is automatically canceled (One-Cancels-Other). Bracket orders automate complete trade management.",
    tcRelevance:
      "TradeClaw provides ready-to-use bracket order parameters with every signal, including entry, stop-loss, and take-profit levels that you can copy directly into your broker.",
    relatedTerms: ["stop-loss", "take-profit", "entry"],
    tags: ["order", "automation", "oco"],
  },
  {
    id: "entry",
    term: "Entry",
    fullName: "Trade Entry Point",
    letter: "E",
    category: "order-types",
    definition:
      "The specific price level or condition at which a trader initiates a new position. A well-defined entry point is based on technical analysis, market structure, or a signal and is a core component of any trade plan. Good entries maximize the risk-reward ratio by placing the stop-loss close to a logical invalidation level.",
    tcRelevance:
      "Every TradeClaw signal specifies a precise entry zone calculated from multi-indicator confluence, giving you a clear price level at which the setup offers the best risk-adjusted opportunity.",
    relatedTerms: ["stop-loss", "take-profit", "confluence"],
    relatedPage: "/signals",
    tags: ["order", "entry", "setup"],
  },
  {
    id: "slippage",
    term: "Slippage",
    fullName: "Slippage",
    letter: "S",
    category: "order-types",
    definition:
      "The difference between the expected price of a trade and the actual price at which the trade is executed. Slippage commonly occurs during periods of high volatility or low liquidity and can be either positive (better price) or negative (worse price). It is a hidden cost that directly affects trading profitability.",
    tcRelevance:
      "TradeClaw factors estimated slippage into backtest results and signal performance tracking, ensuring historical performance metrics reflect real-world execution conditions.",
    relatedTerms: ["market-order", "spread", "limit-order"],
    relatedPage: "/backtest",
    tags: ["cost", "execution", "liquidity"],
  },
  {
    id: "spread",
    term: "Spread",
    fullName: "Bid-Ask Spread",
    letter: "S",
    category: "order-types",
    definition:
      "The difference between the highest price a buyer is willing to pay (bid) and the lowest price a seller is willing to accept (ask). Tighter spreads indicate higher liquidity and lower trading costs. The spread is an implicit cost of every trade and must be considered in any profitable trading strategy.",
    tcRelevance:
      "TradeClaw monitors real-time spread data to assess liquidity conditions and filters signals to prioritize assets with tighter spreads, reducing your implicit trading costs.",
    relatedTerms: ["slippage", "market-order", "limit-order"],
    tags: ["cost", "liquidity", "bid-ask"],
  },

  // ── Market Structure (8) ─────────────────────────────────────────────
  {
    id: "support",
    term: "Support",
    fullName: "Support Level",
    letter: "S",
    category: "market-structure",
    definition:
      "A price level where buying pressure is strong enough to prevent the price from declining further. Support forms when buyers consistently step in at a particular level, creating a floor. When support breaks, it often becomes resistance, and the breakdown can accelerate selling pressure.",
    tcRelevance:
      "TradeClaw automatically identifies key support levels using historical price action and volume clusters, incorporating them into signal entries and stop-loss placement.",
    relatedTerms: ["resistance", "breakout", "fibonacci"],
    relatedPage: "/signals",
    tags: ["price-level", "buying", "floor"],
  },
  {
    id: "resistance",
    term: "Resistance",
    fullName: "Resistance Level",
    letter: "R",
    category: "market-structure",
    definition:
      "A price level where selling pressure is strong enough to prevent the price from rising further. Resistance forms when sellers consistently enter at a particular level, creating a ceiling. When resistance breaks, it often becomes support, and the breakout can trigger accelerated buying.",
    tcRelevance:
      "TradeClaw maps dynamic resistance zones across timeframes and uses them as take-profit targets and breakout trigger levels in its signal generation engine.",
    relatedTerms: ["support", "breakout", "fibonacci"],
    relatedPage: "/signals",
    tags: ["price-level", "selling", "ceiling"],
  },
  {
    id: "trend",
    term: "Trend",
    fullName: "Market Trend",
    letter: "T",
    category: "market-structure",
    definition:
      "The general direction of market price movement over a period of time. An uptrend consists of higher highs and higher lows, a downtrend shows lower highs and lower lows, and a sideways trend (range) shows no clear direction. Identifying the trend is the foundation of most trading strategies.",
    tcRelevance:
      "TradeClaw classifies the current trend on every timeframe using EMA alignment and ADX strength, ensuring signals align with the prevailing market direction for higher win rates.",
    relatedTerms: ["ema", "adx", "consolidation", "reversal"],
    relatedPage: "/signals",
    tags: ["direction", "uptrend", "downtrend"],
  },
  {
    id: "consolidation",
    term: "Consolidation",
    fullName: "Price Consolidation",
    letter: "C",
    category: "market-structure",
    definition:
      "A period when price moves within a defined range without establishing a clear trend. Consolidation occurs after a strong move as the market digests gains or losses. It typically precedes a breakout and can be identified by decreasing volume and narrowing price ranges.",
    tcRelevance:
      "TradeClaw detects consolidation patterns using Bollinger Band width and ADX readings, preparing breakout alerts so you can position before the next major move.",
    relatedTerms: ["breakout", "bollinger-bands", "adx"],
    relatedPage: "/signals",
    tags: ["range", "sideways", "squeeze"],
  },
  {
    id: "breakout",
    term: "Breakout",
    fullName: "Price Breakout",
    letter: "B",
    category: "market-structure",
    definition:
      "A price movement through an established support or resistance level, usually accompanied by increased volume and volatility. Breakouts signal the start of a new trend or the continuation of an existing one. False breakouts (fakeouts) occur when price briefly pierces a level but quickly reverses.",
    tcRelevance:
      "TradeClaw scores breakout quality using volume confirmation and multi-timeframe alignment, filtering out likely false breakouts and alerting only high-probability setups.",
    relatedTerms: ["support", "resistance", "consolidation", "obv"],
    relatedPage: "/signals",
    tags: ["movement", "volume", "volatility"],
  },
  {
    id: "reversal",
    term: "Reversal",
    fullName: "Trend Reversal",
    letter: "R",
    category: "market-structure",
    definition:
      "A change in the prevailing price direction from an uptrend to a downtrend or vice versa. Reversals can be identified by chart patterns (head and shoulders, double tops/bottoms), indicator divergences, or exhaustion candles. Distinguishing between a true reversal and a temporary pullback is one of trading's greatest challenges.",
    tcRelevance:
      "TradeClaw combines divergence detection, candlestick pattern recognition, and multi-indicator confluence to identify high-probability reversal setups with clear invalidation levels.",
    relatedTerms: ["divergence", "trend", "support", "resistance"],
    relatedPage: "/signals",
    tags: ["direction-change", "pattern", "divergence"],
  },
  {
    id: "divergence",
    term: "Divergence",
    fullName: "Price-Indicator Divergence",
    letter: "D",
    category: "market-structure",
    definition:
      "A condition where price makes a new high or low that is not confirmed by a corresponding move in an indicator (such as RSI, MACD, or OBV). Bullish divergence occurs when price makes a lower low but the indicator makes a higher low. Bearish divergence occurs when price makes a higher high but the indicator makes a lower high.",
    tcRelevance:
      "TradeClaw scans for divergences across RSI, MACD, and OBV simultaneously, flagging them as early warning signals for potential trend reversals in real time.",
    relatedTerms: ["rsi", "macd", "obv", "reversal"],
    relatedPage: "/signals",
    tags: ["warning", "momentum", "confirmation"],
  },
  {
    id: "confluence",
    term: "Confluence",
    fullName: "Technical Confluence",
    letter: "C",
    category: "market-structure",
    definition:
      "A condition where multiple independent technical factors align at the same price level or point in time, increasing the probability of a successful trade. Confluence might include a Fibonacci level coinciding with a support zone, EMA, and rising RSI. The more factors that align, the stronger the trade setup.",
    tcRelevance:
      "TradeClaw is built around confluence scoring. Each signal aggregates multiple indicator readings into a single confidence score, so you only trade setups where several factors agree.",
    relatedTerms: ["fibonacci", "support", "resistance", "entry"],
    relatedPage: "/signals",
    tags: ["alignment", "probability", "multi-factor"],
  },

  // ── Performance (7) ──────────────────────────────────────────────────
  {
    id: "sharpe-ratio",
    term: "Sharpe Ratio",
    fullName: "Sharpe Ratio",
    letter: "S",
    category: "performance",
    definition:
      "A measure of risk-adjusted return calculated as the portfolio return minus the risk-free rate, divided by the standard deviation of returns. A higher Sharpe ratio indicates better return per unit of risk. Values above 1 are generally considered acceptable, above 2 very good, and above 3 excellent.",
    tcRelevance:
      "TradeClaw calculates Sharpe ratios for every strategy backtest and live portfolio, letting you compare performance on a risk-adjusted basis rather than raw returns alone.",
    relatedTerms: ["sortino-ratio", "max-drawdown", "calmar-ratio"],
    relatedPage: "/results",
    tags: ["risk-adjusted", "return", "volatility"],
  },
  {
    id: "sortino-ratio",
    term: "Sortino Ratio",
    fullName: "Sortino Ratio",
    letter: "S",
    category: "performance",
    definition:
      "A variation of the Sharpe ratio that only penalizes downside volatility rather than total volatility. It is calculated using the downside deviation instead of standard deviation. The Sortino ratio is more appropriate for evaluating strategies where upside volatility is desirable and should not be penalized.",
    tcRelevance:
      "TradeClaw reports Sortino ratios alongside Sharpe ratios in backtest results, giving you a clearer picture of downside risk that matters more than upside variance.",
    relatedTerms: ["sharpe-ratio", "max-drawdown", "drawdown"],
    relatedPage: "/results",
    tags: ["risk-adjusted", "downside", "return"],
  },
  {
    id: "max-drawdown",
    term: "Max Drawdown",
    fullName: "Maximum Drawdown",
    letter: "M",
    category: "performance",
    definition:
      "The largest peak-to-trough decline in a portfolio or strategy over a given time period. It represents the worst-case scenario an investor would have experienced. Max drawdown is critical for evaluating the risk of a strategy and determining if you can psychologically and financially handle its worst periods.",
    tcRelevance:
      "TradeClaw prominently displays max drawdown in all backtest and live performance reports, enabling you to stress-test whether a strategy fits your risk tolerance before committing real capital.",
    relatedTerms: ["drawdown", "calmar-ratio", "sharpe-ratio"],
    relatedPage: "/results",
    tags: ["risk", "worst-case", "decline"],
  },
  {
    id: "win-rate",
    term: "Win Rate",
    fullName: "Win Rate (Hit Rate)",
    letter: "W",
    category: "performance",
    definition:
      "The percentage of trades that are profitable out of the total number of trades taken. While a high win rate is desirable, it must be considered alongside the average win size versus average loss size. A strategy with a 40% win rate can be highly profitable if winning trades are significantly larger than losing ones.",
    tcRelevance:
      "TradeClaw tracks win rate for every signal type, strategy, and timeframe, and pairs it with risk-reward data so you can evaluate signal quality beyond surface-level accuracy.",
    relatedTerms: ["profit-factor", "risk-reward", "r-multiple"],
    relatedPage: "/results",
    tags: ["accuracy", "percentage", "success"],
  },
  {
    id: "profit-factor",
    term: "Profit Factor",
    fullName: "Profit Factor",
    letter: "P",
    category: "performance",
    definition:
      "The ratio of gross profits to gross losses over a given period. A profit factor greater than 1.0 means the strategy is profitable overall. Values above 1.5 are generally considered good, and above 2.0 are excellent. It is a simple but powerful metric for assessing overall strategy profitability.",
    tcRelevance:
      "TradeClaw computes profit factor across all backtest results and leaderboard entries, making it easy to compare strategies and identify which produce the most consistent edge.",
    relatedTerms: ["win-rate", "sharpe-ratio", "r-multiple"],
    relatedPage: "/results",
    tags: ["profitability", "ratio", "gross"],
  },
  {
    id: "calmar-ratio",
    term: "Calmar Ratio",
    fullName: "Calmar Ratio",
    letter: "C",
    category: "performance",
    definition:
      "A risk-adjusted performance metric calculated as the annualized rate of return divided by the maximum drawdown. It measures how much return is generated per unit of drawdown risk. A higher Calmar ratio indicates that returns are being achieved with relatively small drawdowns, suggesting a smoother equity curve.",
    tcRelevance:
      "TradeClaw includes Calmar ratio in its strategy leaderboard rankings, helping you identify strategies that deliver strong returns without stomach-churning equity swings.",
    relatedTerms: ["max-drawdown", "sharpe-ratio", "sortino-ratio"],
    relatedPage: "/results",
    tags: ["risk-adjusted", "drawdown", "return"],
  },
  {
    id: "r-multiple",
    term: "R-Multiple",
    fullName: "R-Multiple (Risk Multiple)",
    letter: "R",
    category: "performance",
    definition:
      "A measure of trade profit or loss expressed as a multiple of the initial risk (R). If you risk $100 and make $300, the trade is a 3R winner. If you lose $100, it is a -1R loser. Thinking in R-multiples normalizes returns regardless of position size and simplifies expectancy calculations.",
    tcRelevance:
      "TradeClaw tracks R-multiples for every closed signal, allowing you to evaluate trade quality in risk units and calculate your system expectancy over time.",
    relatedTerms: ["risk-reward", "win-rate", "profit-factor"],
    relatedPage: "/results",
    tags: ["risk-unit", "expectancy", "normalized"],
  },

  // ── Strategy (5) ─────────────────────────────────────────────────────
  {
    id: "backtesting",
    term: "Backtesting",
    fullName: "Strategy Backtesting",
    letter: "B",
    category: "strategy",
    definition:
      "The process of testing a trading strategy on historical data to evaluate how it would have performed in the past. Backtesting helps validate a strategy before risking real capital by simulating entries, exits, and portfolio metrics. Accurate backtesting requires accounting for slippage, commissions, and survivorship bias.",
    tcRelevance:
      "TradeClaw offers a full backtesting engine that tests any indicator combination against historical OHLCV data, producing detailed performance reports with Sharpe ratio, drawdown, and trade-by-trade analysis.",
    relatedTerms: ["overfitting", "sharpe-ratio", "paper-trading"],
    relatedPage: "/backtest",
    tags: ["historical", "simulation", "validation"],
  },
  {
    id: "paper-trading",
    term: "Paper Trading",
    fullName: "Paper Trading (Simulated Trading)",
    letter: "P",
    category: "strategy",
    definition:
      "The practice of simulating trades without risking real money, using live market data to test strategies in real time. Paper trading bridges the gap between backtesting and live trading by letting traders build confidence and refine execution without financial risk. It is essential for validating strategies in current market conditions.",
    tcRelevance:
      "TradeClaw includes a built-in paper trading module that executes simulated trades based on live signals, tracking virtual P&L and performance metrics in real time.",
    relatedTerms: ["backtesting", "overfitting", "win-rate"],
    relatedPage: "/paper-trading",
    tags: ["simulation", "practice", "risk-free"],
  },
  {
    id: "overfitting",
    term: "Overfitting",
    fullName: "Curve Fitting / Overfitting",
    letter: "O",
    category: "strategy",
    definition:
      "A condition where a trading strategy is excessively optimized to historical data, performing perfectly on past data but poorly on new, unseen data. Overfitting occurs when a model captures noise rather than genuine market patterns. It is the most common pitfall in strategy development and the primary reason backtests fail to translate to live performance.",
    tcRelevance:
      "TradeClaw combats overfitting through walk-forward analysis, out-of-sample testing, and Monte Carlo simulations in its backtest engine, ensuring strategy robustness before deployment.",
    relatedTerms: ["backtesting", "sharpe-ratio", "win-rate"],
    relatedPage: "/backtest",
    tags: ["bias", "optimization", "robustness"],
  },
  {
    id: "multi-timeframe",
    term: "Multi-Timeframe",
    fullName: "Multi-Timeframe Analysis",
    letter: "M",
    category: "strategy",
    definition:
      "An analysis approach that examines price action across multiple timeframes (e.g., weekly, daily, 4-hour, 1-hour) to identify the dominant trend and optimal entry points. Higher timeframes reveal the big picture while lower timeframes refine entries and exits. Aligning signals across timeframes increases trade probability.",
    tcRelevance:
      "TradeClaw provides a dedicated Multi-Timeframe view that shows indicator alignment across up to six timeframes simultaneously, highlighting confluence zones for higher-probability entries.",
    relatedTerms: ["trend", "confluence", "ema"],
    relatedPage: "/multi-timeframe",
    tags: ["analysis", "alignment", "timeframe"],
  },
  {
    id: "alpha",
    term: "Alpha",
    fullName: "Alpha (Excess Return)",
    letter: "A",
    category: "strategy",
    definition:
      "The excess return of a strategy or portfolio relative to its benchmark index. Positive alpha means the strategy outperformed the benchmark on a risk-adjusted basis. Generating consistent alpha is the ultimate goal of active trading and is what separates skilled traders from those who would be better off holding an index fund.",
    tcRelevance:
      "TradeClaw measures alpha against configurable benchmarks (BTC, SPY, QQQ) in all performance reports, helping you determine whether your active trading adds genuine value over passive holding.",
    relatedTerms: ["sharpe-ratio", "backtesting", "profit-factor"],
    relatedPage: "/results",
    tags: ["excess-return", "benchmark", "outperformance"],
  },
];
