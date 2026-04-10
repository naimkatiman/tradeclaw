/**
 * Discord subscription persistence — JSON file-backed with in-memory Map cache.
 * Mirrors the pattern used by apps/web/lib/telegram-subscribers.ts
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SUBS_FILE = path.join(DATA_DIR, 'discord-subscriptions.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Load subscriptions from disk into a Map.
 * Returns Map<channelId, { guildId, pair, minConfidence }>
 */
function loadSubscriptions() {
  const map = new Map();
  ensureDataDir();

  if (!fs.existsSync(SUBS_FILE)) return map;

  try {
    const raw = fs.readFileSync(SUBS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return map;

    for (const entry of parsed) {
      if (entry.channelId) {
        map.set(entry.channelId, {
          guildId: entry.guildId || null,
          pair: entry.pair || null,
          minConfidence: typeof entry.minConfidence === 'number' ? entry.minConfidence : 60,
        });
      }
    }
  } catch {
    // Corrupted file — start fresh
  }

  return map;
}

/**
 * Persist the full subscriptions Map to disk.
 * @param {Map<string, {guildId: string|null, pair: string|null, minConfidence: number}>} map
 */
function saveSubscriptions(map) {
  ensureDataDir();

  const entries = [];
  for (const [channelId, opts] of map) {
    entries.push({
      channelId,
      guildId: opts.guildId || null,
      pair: opts.pair || null,
      minConfidence: opts.minConfidence,
    });
  }

  fs.writeFileSync(SUBS_FILE, JSON.stringify(entries, null, 2), 'utf-8');
}

module.exports = { loadSubscriptions, saveSubscriptions };
