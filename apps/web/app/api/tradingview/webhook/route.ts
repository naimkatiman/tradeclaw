import { NextRequest, NextResponse } from "next/server";
import { saveAlert } from "@/lib/tradingview-alerts";

const rateLimitMap = new Map<string, { count: number; reset: number }>();

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

async function routeToTelegram(alert: { normalizedPair: string; normalizedAction: string; close?: number; message?: string }): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;
  try {
    const emoji = alert.normalizedAction === "BUY" ? "\u{1F7E2}" : "\u{1F534}";
    const text = `${emoji} *TradingView Alert*\n*${alert.normalizedPair}* ${alert.normalizedAction}${alert.close ? `\nPrice: ${alert.close}` : ""}${alert.message ? `\n${alert.message}` : ""}`;
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    });
    return true;
  } catch { return false; }
}

async function routeToDiscord(alert: { normalizedPair: string; normalizedAction: string; close?: number; message?: string }): Promise<boolean> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return false;
  try {
    const color = alert.normalizedAction === "BUY" ? 0x10b981 : 0xf43f5e;
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [{
          title: `${alert.normalizedPair} — ${alert.normalizedAction}`,
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
  const routed: string[] = [];
  const [tg, dc] = await Promise.all([routeToTelegram(alert), routeToDiscord(alert)]);
  if (tg) routed.push("telegram");
  if (dc) routed.push("discord");
  return NextResponse.json({ ok: true, alertId: alert.id, normalizedPair: alert.normalizedPair, normalizedAction: alert.normalizedAction, routed });
}
