/**
 * Optional LLM mapping layer for the Weekly Regime Card.
 *
 * The deterministic {@link parseAdminNote} is the PRIMARY path. This module adds
 * an OpenRouter / Gemini-Flash fallback that maps a messier free-text note into
 * the exact card input, or asks ONE clarifying question. On ANY failure — no API
 * key, fetch error, bad JSON, or output that fails {@link validateRegimeInput} —
 * it falls back to the deterministic parser.
 *
 * Mirrors the OpenRouter pattern in `lib/llm-risk-verify.ts` (same URL, model,
 * headers, timeout, code-fence stripping).
 *
 * Client-safe by import graph: depends only on `./parser`, `./validator`,
 * `./types`. No `server-only`/DB — the network call is guarded by the env key.
 */

import { parseAdminNote } from './parser';
import { validateRegimeInput } from './validator';
import { ASSET_CLASSES, type RegimeInput } from './types';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-3.1-flash-lite-preview';

/**
 * System prompt instructing the LLM to emit EXACT card-input JSON for the five
 * asset classes, or ask ONE clarifying question when the note is ambiguous.
 */
export const WEEKLY_REGIME_SYSTEM_PROMPT = `You convert a trading desk admin's free-text weekly note into a strict JSON regime input.

There are exactly five asset classes: crypto, commodities, stocks, forex, indices.

For EACH class output:
- "bias": one of "LONG", "SHORT", "NONE".
- "conviction": an integer 0-3. 0 only when bias is "NONE".
- "thesis": a short string (the relevant phrase from the note, or "").

Mapping rules:
- crypto/btc/bitcoin -> crypto. gold/oil/commodity/commodities -> commodities.
  stocks/equities/equity -> stocks. forex/fx/eurusd/gbpusd/usd/currency -> forex.
  indices/spx/nasdaq/index/sp500 -> indices.
- long/bull/bullish/up/buy -> "LONG". short/bear/bearish/down/sell -> "SHORT".
  flat/neutral/range/sideways/chop/none/"no edge" -> "NONE".
- conviction: strong/high/max/conviction/aggressive -> 3. medium/moderate -> 2.
  weak/slight/small/low -> 1. A direction with no qualifier -> 2. "NONE" bias -> 0.
- A class not mentioned -> {"bias":"NONE","conviction":0,"thesis":""}.

If the note is ambiguous — conflicting directions for one class, or a class is
mentioned with no parseable direction — DO NOT GUESS. Instead return:
{"clarify":"<one specific question>"}

Otherwise return ONLY this JSON object (no markdown, no prose), with all five classes:
{
  "crypto": {"bias":"...","conviction":0,"thesis":"..."},
  "commodities": {"bias":"...","conviction":0,"thesis":"..."},
  "stocks": {"bias":"...","conviction":0,"thesis":"..."},
  "forex": {"bias":"...","conviction":0,"thesis":"..."},
  "indices": {"bias":"...","conviction":0,"thesis":"..."}
}`;

/** Strip accidental markdown code fences the model may wrap JSON in. */
function stripFences(content: string): string {
  return content
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
}

/**
 * Map a free-text note to a {@link RegimeInput} via the LLM, falling back to the
 * deterministic {@link parseAdminNote} on any error. The deterministic parser is
 * the primary path; this only helps with phrasing the parser can't reach.
 */
export async function mapNoteWithLLM(
  text: string,
): Promise<{ ok: true; input: RegimeInput } | { ok: false; clarify: string }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return parseAdminNote(text);
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://tradeclaw.win',
        'X-Title': 'TradeClaw Weekly Regime Mapper',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: WEEKLY_REGIME_SYSTEM_PROMPT },
          { role: 'user', content: text },
        ],
        max_tokens: 512,
        temperature: 0,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      return parseAdminNote(text);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return parseAdminNote(text);
    }

    const parsed = JSON.parse(stripFences(content)) as unknown;

    // The model may answer with a clarifying question instead of a card.
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'clarify' in parsed &&
      typeof (parsed as { clarify: unknown }).clarify === 'string'
    ) {
      const clarify = (parsed as { clarify: string }).clarify.trim();
      if (clarify.length > 0) {
        return { ok: false, clarify };
      }
      return parseAdminNote(text);
    }

    // Otherwise it must be a full, valid RegimeInput — validate strictly.
    const validation = validateRegimeInput(parsed);
    if (validation.ok) {
      return { ok: true, input: validation.input };
    }
    return parseAdminNote(text);
  } catch (err) {
    console.error(
      '[weekly-regime] LLM mapping failed, falling back to deterministic parser:',
      err instanceof Error ? err.message : String(err),
    );
    return parseAdminNote(text);
  }
}

// Re-export the canonical class list so callers can render a preview without
// re-importing from types directly.
export { ASSET_CLASSES };
