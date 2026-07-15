import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { saveAlert } from "@/lib/tradingview-alerts";
import { evaluateEntryFanoutGate } from "@/lib/entry-fanout-gate";

const rateLimitMap = new Map<string, { count: number; reset: number }>();

function verifySecret(provided: string | null): boolean {
  const expected = process.env.TRADINGVIEW_WEBHOOK_SECRET;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.reset) {
    rateLimitMap.set(ip, { count: 1, reset: now + 60000 });
    return true;
  }
  if (entry.count >= 60) return false;
  entry.count++;
  return true;
}

// Unknown actions currently render as SELL, so they remain entry-like. Only
// explicit lifecycle/test actions may fan out without opening a new position.
const NON_ENTRY_ACTIONS = new Set([
  "cancel",
  "cancelled",
  "close",
  "close_long",
  "close_short",
  "exit",
  "exit_long",
  "exit_short",
  "flat",
  "sl",
  "stop_loss",
  "stoploss",
  "take_profit",
  "takeprofit",
  "test",
  "tp",
  "trailing_stop",
]);

function isEntryLikeAction(action: string): boolean {
  const normalized = action.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return !NON_ENTRY_ACTIONS.has(normalized);
}

function routedActionLabel(action: string, normalizedAction: string): string {
  if (isEntryLikeAction(action)) return normalizedAction;
  return action.trim().toUpperCase().replace(/[\s_-]+/g, " ");
}

async function routeToTelegram(alert: { action: string; normalizedPair: string; normalizedAction: string; close?: number; message?: string }): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;
  try {
    const entryLike = isEntryLikeAction(alert.action);
    const emoji = entryLike
      ? (alert.normalizedAction === "BUY" ? "\u{1F7E2}" : "\u{1F534}")
      : "\u{1F7E1}";
    const actionLabel = routedActionLabel(alert.action, alert.normalizedAction);
    const text = `${emoji} *TradingView Alert*\n*${alert.normalizedPair}* ${actionLabel}${alert.close ? `\nPrice: ${alert.close}` : ""}${alert.message ? `\n${alert.message}` : ""}`;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    });
    return true;
  } catch { return false; }
}

async function routeToDiscord(alert: { action: string; normalizedPair: string; normalizedAction: string; close?: number; message?: string }): Promise<boolean> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return false;
  try {
    const entryLike = isEntryLikeAction(alert.action);
    const color = entryLike
      ? (alert.normalizedAction === "BUY" ? 0x10b981 : 0xf43f5e)
      : 0xf59e0b;
    const actionLabel = routedActionLabel(alert.action, alert.normalizedAction);
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [{
          title: `${alert.normalizedPair} - ${actionLabel}`,
          color,
          fields: [
            ...(alert.close ? [{ name: "Price", value: String(alert.close), inline: true }] : []),
            ...(alert.message ? [{ name: "Signal", value: alert.message, inline: false }] : []),
          ],
          footer: { text: "TradeClaw x TradingView" },
          timestamp: new Date().toISOString(),
        }],
      }),
    });
    return true;
  } catch { return false; }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ ok: false, error: "Rate limit exceeded. Max 60 requests/min." }, { status: 429 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }
  const headerSecret = req.headers.get("x-webhook-secret");
  const bodySecret = typeof body.secret === "string" ? (body.secret as string) : null;
  if (!verifySecret(headerSecret ?? bodySecret)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  delete body.secret;
  const symbol = (body.symbol ?? body.ticker) as string | undefined;
  const action = (body.action ?? body.side ?? body.direction) as string | undefined;
  if (!symbol || !action) {
    return NextResponse.json({ ok: false, error: "Missing required fields: symbol (or ticker) and action (or side/direction)" }, { status: 400 });
  }
  const alert = saveAlert({
    symbol: String(symbol),
    exchange: body.exchange ? String(body.exchange) : undefined,
    interval: body.interval ? String(body.interval) : undefined,
    action: String(action),
    close: body.close != null ? Number(body.close) : undefined,
    volume: body.volume != null ? Number(body.volume) : undefined,
    message: body.message ? String(body.message) : undefined,
  });

  if (isEntryLikeAction(String(action))) {
    const rawSignalId = body.signalId ?? body.signal_id;
    const signalId = typeof rawSignalId === "string" ? rawSignalId : undefined;
    const gate = await evaluateEntryFanoutGate({
      symbol: alert.normalizedPair,
      signalId,
    });
    if (!gate.allowed) {
      return NextResponse.json(
        {
          ok: false,
          alertId: alert.id,
          normalizedPair: alert.normalizedPair,
          normalizedAction: alert.normalizedAction,
          routed: [],
          halted: gate.reason,
          evidence: gate.evidence,
        },
        { status: 503 },
      );
    }
  }

  const routed: string[] = [];
  const [tg, dc] = await Promise.all([routeToTelegram(alert), routeToDiscord(alert)]);
  if (tg) routed.push("telegram");
  if (dc) routed.push("discord");
  return NextResponse.json({ ok: true, alertId: alert.id, normalizedPair: alert.normalizedPair, normalizedAction: alert.normalizedAction, routed });
}
