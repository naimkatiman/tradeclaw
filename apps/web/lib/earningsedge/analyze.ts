import Anthropic from '@anthropic-ai/sdk';

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
Always respond with valid JSON matching the exact schema requested.`;

export async function analyzeTranscript(
  transcript: string,
): Promise<EarningsAnalysis> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `Analyze this earnings call transcript and return a JSON object with this exact structure:
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
      "beat": true/false/null (true if beat, false if missed, null if no comparison available)
    }
  ],
  "managementTone": {
    "overall": "bullish|neutral|bearish",
    "confidence": "high|medium|low",
    "keySignals": ["2-3 specific phrases or behaviors indicating tone"],
    "forwardGuidance": "one-sentence summary of guidance"
  },
  "tradingThesis": "one clear sentence: what a trader should know about this stock right now",
  "confidence": "high|medium|low (confidence in analysis quality based on transcript completeness)"
}

TRANSCRIPT:
${transcript.slice(0, 15000)}`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = content.text.match(/```(?:json)?\s*([\s\S]*?)```/) ||
    content.text.match(/(\{[\s\S]*\})/);
  const jsonStr = jsonMatch ? jsonMatch[1] : content.text;

  const analysis = JSON.parse(jsonStr.trim()) as EarningsAnalysis;
  analysis.analyzedAt = new Date().toISOString();
  return analysis;
}
