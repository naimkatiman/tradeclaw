/**
 * EarningsEdge — AI analysis via Google Gemini (OpenRouter)
 * Replaced Anthropic/Claude with google/gemini-2.5-flash-lite-preview
 */

export interface EarningsAnalysis {
  symbol: string;
  companyName: string;
  bullCase: string[];
  bearCase: string[];
  keyMetrics: KeyMetric[];
  managementTone: ManagementTone;
  tradingThesis: string;
  confidence: 'high' | 'medium' | 'low';
  analyzedAt: string;
}

export interface KeyMetric {
  name: string;
  reported: string;
  expected?: string;
  beat: boolean | null;
}

export interface ManagementTone {
  overall: 'bullish' | 'neutral' | 'bearish';
  confidence: 'high' | 'medium' | 'low';
  keySignals: string[];
  forwardGuidance: string;
}

const SYSTEM_PROMPT = `You are an expert financial analyst specializing in earnings call analysis for retail traders.
Analyze the provided earnings call transcript and extract structured insights that help traders make informed decisions.
Be concise, factual, and focused on what matters most for trading decisions.
Always respond with valid JSON matching the exact schema requested. Do not include markdown formatting or code blocks in your response — return raw JSON only.`;

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-3.1-flash-lite-preview';

export async function analyzeTranscript(
  transcript: string,
): Promise<EarningsAnalysis> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable not set');
  }

  const prompt = `Analyze this earnings call transcript and return a JSON object with this EXACT structure. Return raw JSON only — no markdown, no code blocks:
{
  "symbol": "stock ticker symbol (e.g. AAPL) - extract from transcript or use UNKNOWN",
  "companyName": "full company name",
  "bullCase": ["3-5 specific bullish points for traders"],
  "bearCase": ["3-5 specific bearish points for traders"],
  "keyMetrics": [
    {
      "name": "metric name (e.g. Revenue, EPS, Guidance)",
      "reported": "actual reported value",
      "expected": "analyst estimate if mentioned, otherwise null",
      "beat": true or false or null
    }
  ],
  "managementTone": {
    "overall": "bullish or neutral or bearish",
    "confidence": "high or medium or low",
    "keySignals": ["2-3 specific phrases or behaviors indicating tone"],
    "forwardGuidance": "one-sentence summary of guidance"
  },
  "tradingThesis": "one clear sentence: what a trader should know about this stock right now",
  "confidence": "high or medium or low based on transcript completeness"
}

TRANSCRIPT:
${transcript.slice(0, 15000)}`;

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://tradeclaw.win',
      'X-Title': 'EarningsEdge',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      max_tokens: 2048,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${errorText}`);
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response from Gemini');
  }

  // Parse JSON — handle any accidental markdown wrapping
  const jsonStr = content
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  const analysis = JSON.parse(jsonStr) as EarningsAnalysis;
  analysis.analyzedAt = new Date().toISOString();
  return analysis;
}
