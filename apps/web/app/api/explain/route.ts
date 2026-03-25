import { NextRequest, NextResponse } from 'next/server';

interface ExplainBody {
  symbol: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
  entry: number;
  timeframe: string;
  indicators?: string[];
}

// Deterministic fallback explanations keyed by symbol + direction
const FALLBACK: Record<string, string[]> = {
  BUY: [
    'Momentum is shifting upward as price reclaims a key demand zone with strong volume confirmation.',
    'The trend structure shows higher lows while RSI diverges positively from the recent swing low.',
    'Price is compressing near a multi-week support level with MACD histogram turning green.',
    'An EMA crossover on the higher timeframe is aligning with a bullish engulfing candle on the entry frame.',
    'Stochastic is crossing above the oversold zone while price holds above the 200 EMA.',
  ],
  SELL: [
    'Bearish divergence on RSI signals weakening momentum near a well-established resistance cluster.',
    'Price has failed to break above the 200 EMA three times, forming a distribution pattern.',
    'MACD is rolling over below the signal line while volume on rallies is declining — distribution pattern.',
    'A bearish engulfing candle printed at a prior swing high, confirming supply zone rejection.',
    'The higher timeframe trend is down, and this pullback rally is losing steam at the 50% retracement.',
  ],
};

function seededRandom(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function getFallbackExplanation(body: ExplainBody): string {
  const seed = body.symbol.charCodeAt(0) * 17 + body.confidence * 3;
  const pool = FALLBACK[body.direction];
  const idx = Math.floor(seededRandom(seed) * pool.length);
  const secondSeed = seed + body.timeframe.length * 11;
  const pool2 = FALLBACK[body.direction === 'BUY' ? 'SELL' : 'BUY'];
  const idx2 = Math.floor(seededRandom(secondSeed) * pool2.length);
  // Second sentence is the contrarian note
  const contrarian = pool2[idx2].replace(
    /^(Bearish|Bullish|An? |Price|MACD|Stochastic|Momentum)/,
    body.direction === 'BUY' ? 'Watch for ' : 'Note that '
  );
  return `${pool[idx]} ${contrarian.charAt(0).toUpperCase() + contrarian.slice(1)}`;
}

export async function POST(req: NextRequest) {
  let body: ExplainBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (apiKey) {
    try {
      const prompt = `You are a professional trading analyst. Explain this trading signal in exactly 2 sentences — first sentence: technical reason for the signal, second sentence: key risk to watch. Be specific about the indicator logic. No bullet points, no hedging disclaimers.

Signal: ${body.direction} ${body.symbol} on ${body.timeframe}
Entry: ${body.entry}
Confidence: ${body.confidence}%
${body.indicators?.length ? `Indicators triggering: ${body.indicators.join(', ')}` : ''}`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 120,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data?.content?.[0]?.text?.trim();
        if (text) {
          return NextResponse.json({ explanation: text, source: 'ai' });
        }
      }
    } catch { /* fall through to fallback */ }
  }

  // Deterministic fallback — works without API key
  const explanation = getFallbackExplanation(body);
  return NextResponse.json({ explanation, source: 'fallback' });
}
