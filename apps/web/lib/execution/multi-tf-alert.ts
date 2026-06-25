import { promises as fs } from 'fs';
import path from 'path';
import { sendMessage } from '../telegram';
import type { MultiTFResult, SignalMode } from '../../app/lib/signal-generator';

const DATA_DIR = path.join(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'multi-tf-confluence-alerts.json');
const ALERT_THRESHOLD = 4;

interface AlertState {
  lastKey: string | null;
  lastSentAt: string | null;
}

function defaultState(): AlertState {
  return { lastKey: null, lastSentAt: null };
}

async function readState(file = STATE_FILE): Promise<AlertState> {
  try {
    const raw = await fs.readFile(file, 'utf8');
    const parsed = JSON.parse(raw) as Partial<AlertState>;
    return {
      lastKey: typeof parsed.lastKey === 'string' ? parsed.lastKey : null,
      lastSentAt: typeof parsed.lastSentAt === 'string' ? parsed.lastSentAt : null,
    };
  } catch {
    return defaultState();
  }
}

async function writeState(state: AlertState, file = STATE_FILE): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

export function getAlignedMultiTFResults(results: MultiTFResult[]): MultiTFResult[] {
  return results.filter((result) => result.agreementCount === ALERT_THRESHOLD);
}

export function buildMultiTFAlertKey(results: MultiTFResult[], mode: SignalMode): string {
  return getAlignedMultiTFResults(results)
    .map((result) => {
      const directions = result.timeframes.map((tf) => tf.direction).join('');
      return [mode, result.symbol, result.dominantDirection, directions, result.confluenceBonus].join(':');
    })
    .sort()
    .join('|');
}

export function formatMultiTFAlert(results: MultiTFResult[], mode: SignalMode): string {
  const aligned = getAlignedMultiTFResults(results);
  const heading = `<b>4-TF confluence alert</b>`;
  const modeLine = `Mode: <code>${mode}</code>`;
  const countLine = `Aligned signals: <b>${aligned.length}</b>`;
  const lines = aligned
    .map((result) => {
      const timeframes = result.timeframes.map((tf) => `${tf.timeframe}:${tf.direction}`).join(' / ');
      const bonus = result.confluenceBonus > 0 ? `+${result.confluenceBonus}` : `${result.confluenceBonus}`;
      return `• <b>${result.symbol}</b> ${result.dominantDirection} — ${timeframes} — bonus ${bonus}%`;
    })
    .join('\n');

  return [heading, modeLine, countLine, lines, '<i>Not financial advice.</i>']
    .filter((part) => part.trim() !== '')
    .join('\n');
}

export interface MultiTFAlertDispatchResult {
  sent: boolean;
  skippedReason?: 'no_aligned_signals' | 'duplicate' | 'no_chat_id';
  alertKey?: string;
}

export async function notifyMultiTFConfluence(
  results: MultiTFResult[],
  mode: SignalMode,
  opts: { chatId?: string | null; stateFile?: string } = {},
): Promise<MultiTFAlertDispatchResult> {
  const aligned = getAlignedMultiTFResults(results);
  if (aligned.length === 0) {
    return { sent: false, skippedReason: 'no_aligned_signals' };
  }

  const chatId = opts.chatId ?? process.env.EXEC_TELEGRAM_CHAT_ID ?? null;
  if (!chatId || chatId.trim() === '') {
    return { sent: false, skippedReason: 'no_chat_id' };
  }

  const alertKey = buildMultiTFAlertKey(results, mode);
  if (!alertKey) {
    return { sent: false, skippedReason: 'no_aligned_signals' };
  }

  const stateFile = opts.stateFile ?? STATE_FILE;
  const state = await readState(stateFile);
  if (state.lastKey === alertKey) {
    return { sent: false, skippedReason: 'duplicate', alertKey };
  }

  const message = formatMultiTFAlert(results, mode);
  try {
    await sendMessage(chatId, message);
  } catch (err) {
    console.warn(
      '[multi-tf-alert] Telegram send failed:',
      err instanceof Error ? err.message : String(err),
    );
    return { sent: false, alertKey };
  }

  await writeState({ lastKey: alertKey, lastSentAt: new Date().toISOString() }, stateFile);
  return { sent: true, alertKey };
}
