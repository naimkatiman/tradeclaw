/**
 * LLM Risk Verifier — Gemini Flash advisory layer via OpenRouter.
 *
 * Runs at each cron cycle (every 4h) to provide a second opinion on
 * regime classification and risk state. The LLM is ADVISORY ONLY:
 *
 * Decision matrix:
 * | Deterministic | LLM          | Result                              |
 * |---------------|--------------|-------------------------------------|
 * | APPROVE       | concur       | APPROVE (full allocation)           |
 * | APPROVE       | halt/reduce  | APPROVE (reduced to 50% allocation) |
 * | REJECT        | concur       | REJECT                              |
 * | REJECT        | proceed      | REJECT (deterministic wins)         |
 *
 * The LLM can only make things MORE conservative, never less.
 * On API failure, returns a default "concur" to avoid blocking trading.
 *
 * Cost: ~$0.02/month at 6 calls/day via Gemini Flash.
 */

import type { MarketRegime } from '@tradeclaw/signals';
import type { ReconstructedRiskState } from './risk-state';

// ── Types ────────────────────────────────────────────────────

export interface LlmRiskVerification {
  concur: boolean;
  suggestedAction: 'proceed' | 'reduce' | 'halt';
  concerns: string[];
  reasoning: string;
  model: string;
  latencyMs: number;
}

interface SignalSummary {
  symbol: string;
  direction: 'BUY' | 'SELL';
  confidence: number;
}

// ── Config ───────────────────────────────────────────────────

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-3.1-flash-lite-preview';

const SYSTEM_PROMPT = `You are a risk management advisor for an automated trading system.
Your role is to review the current market regime, circuit breaker state, and recent trade
outcomes, then provide a second opinion on whether the system should proceed with trading.

You are ADVISORY ONLY — the deterministic risk engine makes the final decision.
Your job is to catch edge cases the rules might miss: regime misclassification,
unusual correlation patterns, or deteriorating conditions that haven't yet triggered
a circuit breaker.

Be concise. Focus on actionable concerns. If everything looks fine, say so.
Always respond with valid JSON matching the exact schema requested.
Do not include markdown formatting or code blocks — return raw JSON only.`;

// ── Main function ────────────────────────────────────────────

export async function verifyRiskWithLlm(
  regime: MarketRegime,
  riskState: ReconstructedRiskState,
  pendingSignals: SignalSummary[],
  activeBreakers: string[],
): Promise<LlmRiskVerification> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return defaultConcur('OPENROUTER_API_KEY not configured');
  }

  const prompt = buildPrompt(regime, riskState, pendingSignals, activeBreakers);
  const startMs = Date.now();

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://tradeclaw.win',
        'X-Title': 'TradeClaw Risk Verifier',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        max_tokens: 512,
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[llm-risk] OpenRouter API error ${response.status}: ${errorText}`);
      return defaultConcur(`API error ${response.status}`);
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return defaultConcur('Empty response from LLM');
    }

    // Parse JSON — handle accidental markdown wrapping
    const jsonStr = content
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();

    const parsed = JSON.parse(jsonStr) as {
      concur?: boolean;
      suggestedAction?: string;
      concerns?: string[];
      reasoning?: string;
    };

    const latencyMs = Date.now() - startMs;

    return {
      concur: parsed.concur !== false,
      suggestedAction: validateAction(parsed.suggestedAction),
      concerns: Array.isArray(parsed.concerns) ? parsed.concerns.slice(0, 5) : [],
      reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning.slice(0, 500) : '',
      model: MODEL,
      latencyMs,
    };
  } catch (err) {
    console.error(
      '[llm-risk] Verification failed:',
      err instanceof Error ? err.message : String(err),
    );
    return defaultConcur(err instanceof Error ? err.message : 'Unknown error');
  }
}

// ── Prompt builder ───────────────────────────────────────────

function buildPrompt(
  regime: MarketRegime,
  riskState: ReconstructedRiskState,
  pendingSignals: SignalSummary[],
  activeBreakers: string[],
): string {
  const { summary, recentOutcomes } = riskState;

  const recentStr = recentOutcomes
    .slice(0, 10)
    .map((o) => `${o.symbol} ${o.hit ? 'WIN' : 'LOSS'} ${o.pnlPct > 0 ? '+' : ''}${o.pnlPct.toFixed(2)}%`)
    .join(', ');

  const signalsStr = pendingSignals
    .map((s) => `${s.symbol} ${s.direction} ${s.confidence}%`)
    .join(', ');

  return `Review this trading system state and respond with JSON:
{
  "concur": true/false (do you agree with the current risk assessment?),
  "suggestedAction": "proceed" | "reduce" | "halt",
  "concerns": ["list of specific concerns, max 5"],
  "reasoning": "one paragraph explaining your assessment"
}

CURRENT STATE:
- Market regime: ${regime}
- Daily PnL: ${summary.dailyPnlPct > 0 ? '+' : ''}${summary.dailyPnlPct.toFixed(2)}%
- Weekly PnL: ${summary.weeklyPnlPct > 0 ? '+' : ''}${summary.weeklyPnlPct.toFixed(2)}%
- Drawdown from peak: ${summary.drawdownFromPeakPct.toFixed(2)}%
- Consecutive losses: ${summary.consecutiveLosses}
- Win rate (30d): ${summary.winRate}% across ${summary.totalRecentTrades} trades
- Active circuit breakers: ${activeBreakers.length > 0 ? activeBreakers.join(', ') : 'none'}

RECENT OUTCOMES (newest first):
${recentStr || 'No recent trades'}

PENDING SIGNALS TO BROADCAST:
${signalsStr || 'None'}

KEY QUESTIONS:
1. Does the regime classification match the recent outcome pattern?
2. Are there correlation risks in the pending signals?
3. Should we be more conservative given the recent performance?
4. Any concerns about the consecutive loss streak or drawdown level?`;
}

// ── Helpers ──────────────────────────────────────────────────

function validateAction(action: unknown): 'proceed' | 'reduce' | 'halt' {
  if (action === 'reduce' || action === 'halt') return action;
  return 'proceed';
}

function defaultConcur(reason: string): LlmRiskVerification {
  return {
    concur: true,
    suggestedAction: 'proceed',
    concerns: [],
    reasoning: `LLM verification skipped: ${reason}. Deferring to deterministic pipeline.`,
    model: MODEL,
    latencyMs: 0,
  };
}
