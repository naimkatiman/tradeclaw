/**
 * Binance Futures clientOrderId builder.
 *
 * Constraint: `newClientOrderId` ≤ 36 chars and must be unique per open order.
 *
 * `signal_history.id` is a UUID = exactly 36 chars, so naive `${id}-sl`
 * truncated to 36 collides with `${id}` itself — Binance accepts the entry,
 * rejects the bracket legs with -2026 (duplicate). We strip hyphens and take
 * a 28-char prefix from the UUID's hex, leaving room for a short suffix.
 *
 * For non-UUID inputs (tests, manual replays) we fall back to the input
 * verbatim, only enforcing the 28-char base cap.
 */

export const MAX_CLIENT_ORDER_ID_LEN = 36;
const BASE_LEN = 28;

export interface ExecutionClientIds {
  base: string;
  entry: string;
  sl: string;
  tp1: string;
  slBe: string;
}

export function buildClientIds(signalId: string): ExecutionClientIds {
  const base = signalId.replace(/-/g, '').slice(0, BASE_LEN);
  return {
    base,
    entry: `${base}-e`,
    sl: `${base}-sl`,
    tp1: `${base}-tp1`,
    slBe: `${base}-slbe`,
  };
}
