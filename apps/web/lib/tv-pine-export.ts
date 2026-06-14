export interface PineExportStats {
  winRate24h: number;
  totalSignals: number;
  resolvedSignals: number;
}

export function generateTradeClawPineScript(stats?: PineExportStats): string {
  const header = stats
    ? `// TradeClaw Verified Track Record
// Win Rate (24h): ${stats.winRate24h}% | Total Signals: ${stats.totalSignals} | Resolved: ${stats.resolvedSignals}
// Downloaded from tradeclaw.win/tradingview-export`
    : `// TradeClaw Signal Engine
// Downloaded from tradeclaw.win/tradingview-export`;

  return `${header}
//@version=5
indicator("TradeClaw Signal Engine", shorttitle="TradeClaw", overlay=true)

// === Inputs ===
rsiLen      = input.int(14, "RSI Length", group="Indicators")
macdFast    = input.int(12, "MACD Fast", group="Indicators")
macdSlow    = input.int(26, "MACD Slow", group="Indicators")
macdSig     = input.int(9, "MACD Signal", group="Indicators")
emaFastLen  = input.int(20, "EMA Fast", group="Indicators")
emaSlowLen  = input.int(50, "EMA Slow", group="Indicators")
bbLen       = input.int(20, "BB Length", group="Indicators")
bbMult      = input.float(2.0, "BB Multiplier", group="Indicators")
stochKLen   = input.int(14, "Stoch %K", group="Indicators")
stochDLen   = input.int(3, "Stoch %D", group="Indicators")
confThresh  = input.int(55, "Confidence Threshold", minval=0, maxval=100, group="TradeClaw")

// === Indicators ===
rsi       = ta.rsi(close, rsiLen)
[macdLine, signalLine, hist] = ta.macd(close, macdFast, macdSlow, macdSig)
emaFast   = ta.ema(close, emaFastLen)
emaSlow   = ta.ema(close, emaSlowLen)
[bbMid, bbUpper, bbLower] = ta.bb(close, bbLen, bbMult)
stochKVal = ta.stoch(close, high, low, stochKLen)
stochDVal = ta.sma(stochKVal, stochDLen)

// === Scoring (matches TradeClaw engine weights) ===
buyScore = (rsi < 30 ? 20 : 0) +
           (hist > 0 and hist > hist[1] ? 25 : 0) +
           (emaFast > emaSlow ? 20 : 0) +
           (stochKVal < 20 and ta.crossover(stochKVal, stochDVal) ? 15 : 0) +
           (close <= bbLower ? 10 : 0)

sellScore = (rsi > 70 ? 20 : 0) +
            (hist < 0 and hist < hist[1] ? 25 : 0) +
            (emaFast < emaSlow ? 20 : 0) +
            (stochKVal > 80 and ta.crossunder(stochKVal, stochDVal) ? 15 : 0) +
            (close >= bbUpper ? 10 : 0)

confidence = math.max(buyScore, sellScore)
direction  = buyScore > sellScore ? "BUY" : sellScore > buyScore ? "SELL" : "NEUTRAL"

// === Signals (prevent consecutive duplicates) ===
isBuy  = direction == "BUY"  and confidence >= confThresh and not (direction[1] == "BUY"  and confidence[1] >= confThresh)
isSell = direction == "SELL" and confidence >= confThresh and not (direction[1] == "SELL" and confidence[1] >= confThresh)

// === Plots ===
plot(emaFast, "EMA 20", color=color.new(color.blue, 50))
plot(emaSlow, "EMA 50", color=color.new(color.orange, 50))

plotshape(isBuy,  "Buy Signal",  shape.triangleup,   location.belowbar, color.new(color.green, 0), size=size.normal)
plotshape(isSell, "Sell Signal", shape.triangledown, location.abovebar, color.new(color.red, 0),   size=size.normal)

// === Info Panel ===
var table info = table.new(position.top_right, 2, 4, bgcolor=color.new(color.black, 20), border_color=color.gray, border_width=1)
if barstate.islast
    dirColor = buyScore > sellScore ? color.green : sellScore > buyScore ? color.red : color.gray
    table.cell(info, 0, 0, "Direction",  text_color=color.white, text_size=size.small)
    table.cell(info, 1, 0, direction,    text_color=dirColor,    text_size=size.small)
    table.cell(info, 0, 1, "Confidence", text_color=color.white, text_size=size.small)
    table.cell(info, 1, 1, str.tostring(confidence) + "%", text_color=color.white, text_size=size.small)
    table.cell(info, 0, 2, "RSI",        text_color=color.white, text_size=size.small)
    table.cell(info, 1, 2, str.tostring(rsi, "#.#"), text_color=color.white, text_size=size.small)
    table.cell(info, 0, 3, "MACD Hist",  text_color=color.white, text_size=size.small)
    table.cell(info, 1, 3, str.tostring(hist, "#.####"), text_color=color.white, text_size=size.small)

// === Alerts ===
alertcondition(isBuy,  "TradeClaw Buy",  "TradeClaw Buy Signal on {{ticker}}")
alertcondition(isSell, "TradeClaw Sell", "TradeClaw Sell Signal on {{ticker}}")
`;
}
