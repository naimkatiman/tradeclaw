// Quad-Bot Handler - Manages Police Bot, Scholar Bot, Bro Guy, and BroBo routing
// Supports multi-tenant: each tenant has its own set of 4 bot tokens
// Police Bot: Moderation, enforcement, strike system
// Scholar Bot: RAG knowledge, research assistance
// Bro Guy: Trading community vibe, Bahasa Pasar, psychological support
// BroBo: Specialized customer support assistant, KB-focused, multi-lingual

import { Env } from '../types/env';
import { TelegramUpdate } from '../types/telegram';
import { TelegramBot } from '../services/telegram';
import { OpenRouterService } from '../services/openrouter';
import { ConversationManager } from '../services/conversation';
import { parseAdminIds } from '../utils/env';
import { TenantService } from '../services/tenant';
import { DEFAULT_TENANT_ID } from '../types/tenant';
import type { BotPersonality } from '../config/personalities';
import { GroupConfigService } from '../services/group-config';

interface CachedBotInstance {
    bot: TelegramBot;
    manager: ConversationManager;
}

// Global bot cache keyed by "{tenantId}:{personality}"
// Tracks which token was used to detect stale cache after secret rotation
const botCache: Map<string, CachedBotInstance> = new Map();
const cachedTokens: Record<string, string> = {};

// ---------------------------------------------------------------------------
// Token Resolution
// ---------------------------------------------------------------------------

/** Mapping from personality to legacy env var name */
const LEGACY_TOKEN_MAP: Record<BotPersonality, keyof Env> = {
    police: 'POLICE_BOT_TOKEN',
    scholar: 'SCHOLAR_BOT_TOKEN',
    bro: 'TELEGRAM_BOT_TOKEN',
    brobo: 'BROBO_BOT_TOKEN',
    leha: 'LEHA_BOT_TOKEN',
};

/**
 * Resolve bot token for a tenant + personality.
 * Order: tenant-prefixed env var -> legacy env var -> null
 */
function resolveBotToken(env: Env, tenantId: string, personality: BotPersonality): string | undefined {
    // Tenant-prefixed: e.g. TCA_ID_POLICE_BOT_TOKEN
    const prefix = tenantId.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    const suffix = personality === 'bro' ? 'TELEGRAM_BOT_TOKEN' : `${personality.toUpperCase()}_BOT_TOKEN`;
    const tenantKey = `${prefix}_${suffix}`;
    const tenantToken = (env as unknown as Record<string, string>)[tenantKey];
    if (tenantToken) return tenantToken;

    // Legacy fallback (works for default tenant)
    const legacyKey = LEGACY_TOKEN_MAP[personality];
    return env[legacyKey] as string | undefined;
}

// ---------------------------------------------------------------------------
// Unified Bot Getter
// ---------------------------------------------------------------------------

/**
 * Get or create a bot instance for a specific tenant + personality.
 * Instances are cached globally and invalidated on token change.
 */
function getBot(
    env: Env,
    tenantId: string,
    personality: BotPersonality
): CachedBotInstance | null {
    const token = resolveBotToken(env, tenantId, personality);
    const openRouterKey = env.OPENROUTER_API_KEY;

    if (!token || !openRouterKey) {
        console.error(`Missing token for ${tenantId}:${personality} or OPENROUTER_API_KEY`);
        return null;
    }

    const cacheKey = `${tenantId}:${personality}`;

    if (!botCache.has(cacheKey) || cachedTokens[cacheKey] !== token) {
        const bot = new TelegramBot({ token });
        const ai = new OpenRouterService(openRouterKey);
        const adminIds = parseAdminIds(env);
        const tenantService = new TenantService(env, tenantId);

        const manager = new ConversationManager(
            bot,
            ai,
            env,
            adminIds,
            personality,
            tenantService,
        );

        botCache.set(cacheKey, { bot, manager });
        cachedTokens[cacheKey] = token;
    }

    return botCache.get(cacheKey)!;
}

// ---------------------------------------------------------------------------
// Webhook Handlers
// ---------------------------------------------------------------------------

/**
 * Generic tenant-aware webhook handler.
 * Used for /webhook/{tenantId}/{personality} routes.
 */
export async function handleTenantWebhook(
    request: Request,
    env: Env,
    tenantId: string,
    personality: BotPersonality
): Promise<Response> {
    const secretToken = env.TELEGRAM_WEBHOOK_SECRET;
    if (secretToken) {
        const tgToken = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
        if (tgToken !== secretToken) {
            return jsonResponse({ error: 'Unauthorized' }, 401);
        }
    }

    if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    try {
        const update = await request.json() as TelegramUpdate;
        const instance = getBot(env, tenantId, personality);

        if (!instance) {
            return jsonResponse({ error: `${personality} bot not configured for tenant ${tenantId}` }, 500);
        }

        await instance.manager.handleUpdate(update);
        return jsonResponse({ ok: true });
    } catch (error) {
        console.error(`${tenantId}:${personality} webhook error:`, error);
        return jsonResponse({ error: 'Webhook processing failed' }, 500);
    }
}

// Legacy handlers — resolve tenant from the incoming chat ID
async function resolveTenantFromUpdate(env: Env, request: Request, personality: BotPersonality): Promise<Response> {
    const secretToken = env.TELEGRAM_WEBHOOK_SECRET;
    if (secretToken) {
        const tgToken = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
        if (tgToken !== secretToken) {
            return jsonResponse({ error: 'Unauthorized' }, 401);
        }
    }

    if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    try {
        const update = await request.json() as TelegramUpdate;

        // Extract chat ID from update to resolve tenant
        const chatId = update.message?.chat?.id
            ?? update.callback_query?.message?.chat?.id
            ?? update.chat_member?.chat?.id;

        let tenantId = DEFAULT_TENANT_ID;
        if (chatId) {
            try {
                tenantId = await TenantService.resolveTenantFromChatId(env, chatId);
            } catch {
                // Non-critical — use default tenant
            }
        }

        const instance = getBot(env, tenantId, personality);
        if (!instance) {
            return jsonResponse({ error: `${personality} bot not configured for tenant ${tenantId}` }, 500);
        }

        await instance.manager.handleUpdate(update);
        return jsonResponse({ ok: true });
    } catch (error) {
        console.error(`Legacy ${personality} webhook error:`, error);
        return jsonResponse({ error: 'Webhook processing failed' }, 500);
    }
}

export async function handlePoliceWebhook(request: Request, env: Env): Promise<Response> {
    return resolveTenantFromUpdate(env, request, 'police');
}
export async function handleScholarWebhook(request: Request, env: Env): Promise<Response> {
    return resolveTenantFromUpdate(env, request, 'scholar');
}
export async function handleBroWebhook(request: Request, env: Env): Promise<Response> {
    return resolveTenantFromUpdate(env, request, 'bro');
}
export async function handleBroBoWebhook(request: Request, env: Env): Promise<Response> {
    return resolveTenantFromUpdate(env, request, 'brobo');
}
export async function handleLehaWebhook(request: Request, env: Env): Promise<Response> {
    return resolveTenantFromUpdate(env, request, 'leha');
}

// ---------------------------------------------------------------------------
// Webhook Setup
// ---------------------------------------------------------------------------

/**
 * Setup webhooks for all four bots of a specific tenant.
 * Legacy /webhook/setup uses default tenant.
 */
export async function setupTenantWebhooks(env: Env, tenantId: string): Promise<Response> {
    const baseUrl = env.WORKER_URL;
    if (!baseUrl) return jsonResponse({ error: 'WORKER_URL not configured' }, 500);

    const personalities: BotPersonality[] = ['police', 'scholar', 'bro', 'brobo', 'leha'];
    const results: Record<string, { success: boolean; webhookUrl?: string; error?: string }> = {};

    for (const p of personalities) {
        const token = resolveBotToken(env, tenantId, p);
        if (token) {
            try {
                const bot = new TelegramBot({ token });
                // Tenant-aware route for new tenants, legacy route for default
                const webhookUrl = tenantId === DEFAULT_TENANT_ID
                    ? `${baseUrl}/webhook/${p}`
                    : `${baseUrl}/webhook/${tenantId}/${p}`;
                // Police Bot needs chat_member events to track manual admin actions
                const allowedUpdates = p === 'police'
                    ? ['message', 'callback_query', 'chat_member']
                    : undefined;
                const success = await bot.setWebhook(webhookUrl, allowedUpdates);
                results[p] = { success, webhookUrl };
            } catch (error) {
                results[p] = { success: false, error: String(error) };
            }
        } else {
            results[p] = { success: false, error: `Token not set for ${tenantId}:${p}` };
        }
    }

    const allSuccess = Object.values(results).every(r => r.success);
    return jsonResponse({
        success: allSuccess,
        tenantId,
        message: allSuccess ? 'All webhooks configured' : 'Some webhooks failed',
        results,
    });
}

/** Legacy setup — delegates to default tenant */
export async function setupQuadBotWebhooks(env: Env): Promise<Response> {
    return setupTenantWebhooks(env, DEFAULT_TENANT_ID);
}

// ---------------------------------------------------------------------------
// Bot Command Registration (per-group scoped)
// ---------------------------------------------------------------------------

type BotCommand = { command: string; description: string };

/** Chart commands — Bro Guy only, chartAnalysis groups only */
const CHART_COMMANDS: BotCommand[] = [
    { command: 'scalper', description: 'XAUUSD scalper view (M5)' },
    { command: 'intraday', description: 'XAUUSD intraday view (H1)' },
    { command: 'swing', description: 'XAUUSD swing view (H4/D1)' },
];

/** Scholar commands — /learn + /explain */
const SCHOLAR_COMMANDS: BotCommand[] = [
    { command: 'learn', description: 'Learn a trading topic' },
    { command: 'explain', description: 'Visual diagram of a concept' },
];

/** BroBo /ask — visible in all groups */
const ASK_COMMAND: BotCommand[] = [
    { command: 'ask', description: 'Ask a question' },
];

/**
 * Register per-group bot commands for all active groups of a tenant.
 * Minimal menus: Bro Guy gets chart commands (chart groups only),
 * BroBo gets /ask everywhere, Police/Scholar get nothing.
 */
export async function registerBotCommands(env: Env, tenantId: string): Promise<Record<string, unknown>> {
    const groupConfigService = new GroupConfigService(env);
    const groups = await groupConfigService.getAllActiveGroups();
    const tenantGroups = groups.filter(g => g.tenantId === tenantId);

    const personalities: BotPersonality[] = ['police', 'scholar', 'bro', 'brobo', 'leha'];
    const results: Record<string, unknown> = {};

    for (const p of personalities) {
        const token = resolveBotToken(env, tenantId, p);
        if (!token) {
            results[p] = { error: `No token for ${tenantId}:${p}` };
            continue;
        }

        const bot = new TelegramBot({ token });
        const perGroup: Record<string, { success: boolean; commands: string[] }> = {};

        // Clear default (non-group) commands for all bots
        await bot.deleteMyCommands();

        // Set per-group scoped commands
        for (const group of tenantGroups) {
            if (!group.activeBots.includes(p)) continue;

            let commands: BotCommand[] = [];
            if (p === 'bro' && group.features.chartAnalysis) {
                commands = CHART_COMMANDS;
            } else if (p === 'scholar') {
                commands = SCHOLAR_COMMANDS;
            } else if (p === 'brobo') {
                commands = ASK_COMMAND;
            }

            const scope = { type: 'chat', chat_id: group.chatId };
            await bot.deleteMyCommands(scope);

            const success = commands.length > 0
                ? await bot.setMyCommands(commands, scope)
                : true;

            perGroup[String(group.chatId)] = {
                success,
                commands: commands.map(c => c.command),
            };
        }

        results[p] = { groups: perGroup };
    }

    return results;
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

export async function getQuadBotStatus(env: Env): Promise<Response> {
    const status = {
        police: {
            configured: !!env.POLICE_BOT_TOKEN,
            active: botCache.has(`${DEFAULT_TENANT_ID}:police`),
            personality: 'Colonel Misai - Moderation & enforcement',
        },
        scholar: {
            configured: !!env.SCHOLAR_BOT_TOKEN,
            active: botCache.has(`${DEFAULT_TENANT_ID}:scholar`),
            personality: 'Scholar - research & assistance',
        },
        bro: {
            configured: !!env.TELEGRAM_BOT_TOKEN,
            active: botCache.has(`${DEFAULT_TENANT_ID}:bro`),
            personality: 'Bro Guy - Trading community vibe',
        },
        brobo: {
            configured: !!env.BROBO_BOT_TOKEN,
            active: botCache.has(`${DEFAULT_TENANT_ID}:brobo`),
            personality: 'BroBo - Customer support assistant',
        },
        tenantBots: Array.from(botCache.keys()),
        sharedResources: {
            kv: 'Roboforex_KV',
            database: 'DB',
            vectorize: 'Roboforex_VECTORIZE',
        },
    };

    return jsonResponse({ success: true, data: status });
}

// ---------------------------------------------------------------------------
// Shared Utilities
// ---------------------------------------------------------------------------

export async function getUserReputation(
    env: Env,
    userId: number,
    chatId: number
): Promise<{ strikes: number; rank: string; isTroublemaker: boolean }> {
    try {
        const result = await env.DB.prepare(`
      SELECT offense_count, rank
      FROM user_moderation_states
      WHERE user_id = ? AND chat_id = ?
    `).bind(userId, chatId).first<{ offense_count: number; rank: string }>();

        if (!result) {
            return { strikes: 0, rank: 'Budak Baru \ud83d\udc76', isTroublemaker: false };
        }

        return {
            strikes: result.offense_count,
            rank: result.rank,
            isTroublemaker: result.offense_count >= 2,
        };
    } catch {
        return { strikes: 0, rank: 'Budak Baru \ud83d\udc76', isTroublemaker: false };
    }
}

function jsonResponse(
    data: Record<string, unknown>,
    status = 200
): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}
