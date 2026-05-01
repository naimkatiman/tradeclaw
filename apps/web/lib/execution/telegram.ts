/**
 * TradeClaw Pilot — Telegram notifications.
 *
 * Phase 1 sends to a single private chat (env: EXEC_TELEGRAM_CHAT_ID).
 * Phase 2 will route per-user once we go multi-tenant.
 *
 * Failures are logged and swallowed — Telegram outages must not block
 * the executor or position manager from continuing their work.
 */

import { sendMessage } from '../telegram';
import { isTestnet, type OrderSide } from './binance-futures';

function getChatId(): string | null {
  const id = process.env.EXEC_TELEGRAM_CHAT_ID;
  return id && id.trim() !== '' ? id : null;
}

function modeBadge(): string {
  return isTestnet() ? '[testnet]' : '[live]';
}

async function safeSend(text: string): Promise<void> {
  const chatId = getChatId();
  if (!chatId) return;
  try {
    await sendMessage(chatId, text);
  } catch (err) {
    console.warn('[pilot/telegram] send failed:', err instanceof Error ? err.message : err);
  }
}

// ─── Notifiers ─────────────────────────────────────────────────────────

export interface EntryFilledNotice {
  signalId: string;
  symbol: string;
  side: OrderSide;
  qty: number;
  entryPrice: number;
  stopPrice: number;
  tp1Price: number;
  notionalUsd: number;
  riskUsd: number;
  leverage: number;
}

export async function notifyEntryFilled(n: EntryFilledNotice): Promise<void> {
  const sideEmoji = n.side === 'BUY' ? '🟢' : '🔴';
  const text =
    `<b>Pilot ${modeBadge()} entry filled</b>\n` +
    `${sideEmoji} <b>${n.side} ${n.symbol}</b>\n` +
    `qty: ${n.qty}\n` +
    `entry: ${n.entryPrice}\n` +
    `stop: ${n.stopPrice}\n` +
    `tp1: ${n.tp1Price}\n` +
    `notional: $${n.notionalUsd.toFixed(2)}  risk: $${n.riskUsd.toFixed(2)}  lev: ${n.leverage}x\n` +
    `signal: <code>${n.signalId}</code>\n` +
    `<i>not investment advice</i>`;
  await safeSend(text);
}

export interface PositionClosedNotice {
  signalId: string;
  symbol: string;
  side: OrderSide;
  qty: number;
  entryPrice: number;
}

export async function notifyPositionClosed(n: PositionClosedNotice): Promise<void> {
  const text =
    `<b>Pilot ${modeBadge()} closed</b>\n` +
    `${n.side} ${n.symbol}  qty=${n.qty}  entry=${n.entryPrice}\n` +
    `signal: <code>${n.signalId}</code>`;
  await safeSend(text);
}

export async function notifyError(stage: string, signalId: string | null, msg: string): Promise<void> {
  const text =
    `<b>Pilot ${modeBadge()} error</b>\n` +
    `stage: ${stage}\n` +
    (signalId ? `signal: <code>${signalId}</code>\n` : '') +
    msg.slice(0, 400);
  await safeSend(text);
}
