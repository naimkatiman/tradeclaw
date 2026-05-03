// Cron handlers for scheduled tasks

import type { Env } from '../types';
import { triggerCrawl } from './queue';
import { CrawlerService } from '../services/crawler';
import { ChunkerService } from '../services/chunker';
import { EvaluationService } from '../services/evaluation';
import {
  SupportInsightsService,
  getDailyLeaderboardData,
  formatDailyLeaderboard,
  formatWeeklyRecognition,
  generateMotivationalLine,
  generateSceneImage,
  getWeeklyRecognitionData,
} from '../services/insights';
import { getReadyOnboardingMessages } from '../services/onboarding';
import { getRandomTradingMeme, buildMemeCaption } from '../services/trading-memes';
import { generateTradingComic } from '../services/trading-comics';
import { AutoLearningService } from '../services/auto-learning';
import { getLoreStats, formatLoreLeaderboard } from '../services/lore';
import { TelegramBot } from '../services/telegram';
import { parseAdminIds } from '../utils/env';
import { ProactiveEngagementService } from '../services/proactive';
import { BotConversationService } from '../services/bot-conversation';
import { MemoryService } from '../services/memory';
import { SelfLearningService } from '../services/self-learning';
import { ConversationEvolverService } from '../services/conversation-evolver';
import { GroupConfigService } from '../services/group-config';
import { handleDailyHumanSupportAnnouncement, handleDailyIndonesiaSupportAnnouncement } from '../services/human-support';
import { rotateWeeklyModifiers } from '../services/personality-rotation';
import { handleProductEducation } from '../services/product-education';
import { resolveBotToken } from '../utils/bot-tokens';
import { TenantService } from '../services/tenant';
import { handleDailyNewsAlert, handleWeeklyNewsOutlook } from '../services/news-alerts';
import { TrustJudgeService } from '../services/trust-judge';
import { TrustReflectionService } from '../services/trust-reflection';

/**
 * Resolve bot token for a group's tenant.
 * Re-exported from utils/bot-tokens for backward compatibility.
 */
export const resolveCronBotToken = resolveBotToken;

/**
 * Handle scheduled cron events
 */
export async function handleScheduled(
  event: ScheduledEvent,
  env: Env
): Promise<void> {
  const trigger = event.cron;

  console.log(`Cron triggered: ${trigger} at ${new Date(event.scheduledTime).toISOString()}`);

  switch (trigger) {
    case '0 2 * * *':
      // Daily Support Center crawl at 2 AM UTC
      await handleDailySupportCenterCrawl(env);
      break;

    case '0 4 1 * *':
      // Monthly public site crawl on 1st at 4 AM UTC
      await handleMonthlyPublicSiteCrawl(env);
      break;

    case '0 3 * * 0':
    case '0 3 * * 7':
      // Weekly news section crawl Sunday 3 AM UTC
      await handleWeeklyNewsCrawl(env);
      break;

    case '0 5 * * *':
      // Daily chunk pruning at 5 AM UTC
      await handleDailyChunkPruning(env);
      break;

    case '*/30 * * * *':
      // Health check every 30 minutes
      await handleHealthCheck(env);
      // Onboarding drip delivery (runs alongside health check)
      await handleOnboardingDrip(env);
      // Drop-off detection (System B: Self-Learning)
      await handleDropOffDetection(env);
      break;

    case '0 1 * * 7':
      // Weekly RAG evaluation Sunday 1 AM UTC
      await handleWeeklyRagEvaluation(env);
      break;

    case '30 1 * * 7':
      // Weekly support insights digest + bot leaderboard + group recognition Sunday 1:30 AM UTC
      await handleWeeklySupportInsights(env);
      await handleWeeklyBotLeaderboard(env);
      await handleWeeklyRecognition(env);
      break;

    case '0 0 * * *':
      // Daily Trading Pulse at 8 AM MYT (00:00 UTC)
      await handleDailyPulse(env);
      // Generate random engagement schedule for today
      await generateDailyEngagementSchedule(env);
      // Monday: rotate weekly personality modifiers
      {
        const dayOfWeek = new Date(Date.now() + 8 * 60 * 60 * 1000).getUTCDay();
        if (dayOfWeek === 1) {
          await rotateWeeklyModifiers(env.Roboforex_KV);
        }
      }
      break;

    case '0 6 * * *':
      // Daily Auto-FAQ generation at 6 AM UTC
      await handleAutoFAQ(env);
      break;

    case '30 6 * * 0':
    case '30 6 * * 7':
      // Weekly gap detection Sunday 6:30 AM UTC
      await handleGapDetection(env);
      break;

    case '0 4 * * *':
      // Memory pruning at 12 PM MYT
      await handleMemoryMaintenance(env);
      break;

    case '0 2-14 * * *':
      // Hourly engagement check 10 AM–10 PM MYT — only fires at randomized daily schedule
      await handleRandomEngagement(env, event.scheduledTime);
      break;

    case '0 7 * * *':
      // Daily pattern analysis (System B: Self-Learning)
      await handlePatternAnalysis(env);
      break;

    case '30 7 * * 7':
      // Weekly lesson decay (System B: Self-Learning) Sunday 7:30 AM UTC
      await handleLessonDecay(env);
      break;

    case '0 3 * * 1':
      // Weekly experiment loop (System A: ConversationEvolver) Monday 3 AM UTC
      await handleExperimentLoop(env);
      break;

    case '30 1 * * 1-5':
      // Daily human support availability announcement 9:30 AM MYT (01:30 UTC) weekdays only — Malaysia
      await handleDailyHumanSupportAnnouncement(env);
      break;

    case '15 2 * * 1-5':
      // Daily Indonesia support announcement 9:15 AM WIB (02:15 UTC) weekdays only
      await handleDailyIndonesiaSupportAnnouncement(env);
      break;

    case '0 10 * * *':
      // Daily high-impact news alert at 6 PM MYT (10:00 UTC)
      await handleDailyNewsAlert(env);
      break;

    case '0 2 * * 1':
      // Weekly news outlook Monday 10 AM MYT (02:00 UTC)
      await handleWeeklyNewsOutlook(env);
      break;

    case '0 18 * * *':
      // Nightly Trust Battery: judge + reflection at 02:00 GMT+8 (18:00 UTC)
      await handleNightlyTrustLoop(env);
      break;

    default:
      console.log(`Unknown cron trigger: ${trigger}`);
  }
}


/**
 * Generate random engagement schedule for the day.
 * Picks 2 random UTC hours from [2-14] (10 AM–10 PM MYT), at least 3h apart.
 * Stored in KV so the hourly cron can check if it should fire.
 */
async function generateDailyEngagementSchedule(env: Env): Promise<void> {
  const today = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
  const key = `proactive:schedule:${today}`;

  // Don't regenerate if already exists
  if (await env.Roboforex_KV.get(key)) return;

  // Pool: UTC hours 2-14 = MYT 10 AM–10 PM — single slot to reduce noise
  const pool = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  const slot = pool[Math.floor(Math.random() * pool.length)];

  const schedule = [slot];

  await env.Roboforex_KV.put(key, JSON.stringify(schedule), { expirationTtl: 86400 });
  console.log(`[Schedule] Random engagement for ${today}: ${schedule.map(h => `${h + 8}:00 MYT`).join(', ')}`);
}

/**
 * Hourly engagement check — only fires proactive content if the current hour
 * matches one of the 2 randomly scheduled hours for today.
 * Primary slot (first hour) gets meme/comic + Monday product education.
 * Secondary slot (second hour) gets proactive engagement only.
 */
async function handleRandomEngagement(env: Env, scheduledTime: number): Promise<void> {
  const currentUtcHour = new Date(scheduledTime).getUTCHours();
  const today = new Date(scheduledTime + 8 * 60 * 60 * 1000).toISOString().split('T')[0];
  const key = `proactive:schedule:${today}`;

  let raw = await env.Roboforex_KV.get(key);
  if (!raw) {
    // Schedule not yet generated (edge case: 0 0 cron failed), generate on the fly
    await generateDailyEngagementSchedule(env);
    raw = await env.Roboforex_KV.get(key);
  }
  if (!raw) return;

  const schedule: number[] = JSON.parse(raw);
  if (!schedule.includes(currentUtcHour)) {
    // Not our hour — skip silently (this fires 11 out of 13 hours)
    return;
  }

  const isPrimary = schedule[0] === currentUtcHour;
  console.log(`[RandomEngagement] Firing ${isPrimary ? 'primary' : 'secondary'} slot at ${currentUtcHour + 8}:00 MYT`);

  await handlePeakHourEngagement(env, isPrimary ? 'noon' : 'evening');
}

/**
 * Peak Hour Engagement: proactive content at randomized daily times.
 *
 * Primary slot:
 *  1. Try multi-bot conversation first, fallback to solo proactive
 *  2. Weekday meme or comic (alternate by day-of-month)
 *  3. Monday: weekly product education (BroBo)
 *
 * Secondary slot:
 *  1. Solo proactive first, fallback to multi-bot
 */
async function handlePeakHourEngagement(env: Env, window: 'noon' | 'evening'): Promise<void> {
  console.log(`[PeakHour] Starting ${window} engagement...`);

  const groupConfig = new GroupConfigService(env);
  const groups = await groupConfig.getGroupsWithFeature('proactiveEngagement');

  const preferMultiBot = window === 'noon';

  for (const group of groups) {
    try {
      let sent = false;

      if (preferMultiBot) {
        const botConv = new BotConversationService(env);
        sent = await botConv.tryConversation(group.chatId);
        console.log(`[PeakHour:BotConv] Chat ${group.chatId} (${group.name}): ${sent ? 'conversation sent' : 'skipped'}`);
      }

      if (!sent) {
        const proactive = new ProactiveEngagementService(env);
        sent = await proactive.tryInitiateConversation(group.chatId);
        console.log(`[PeakHour:Proactive] Chat ${group.chatId} (${group.name}): ${sent ? 'message sent' : 'skipped'}`);
      }
    } catch (e) {
      console.error(`[PeakHour] Failed for chat ${group.chatId}:`, e);
    }
  }

  // Primary slot only: meme/comic + product education
  if (window === 'noon') {
    const now = new Date(Date.now() + 8 * 60 * 60 * 1000);
    const dayOfWeek = now.getUTCDay();
    const dayOfMonth = now.getUTCDate();

    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      if (dayOfMonth % 2 === 0) {
        await handleDailyMeme(env);
      } else {
        await handleDailyComic(env);
      }
    }

    if (dayOfWeek === 1) {
      await handleProductEducation(env);
    }
  }
}

/**
 * Memory maintenance: prune expired memories and stale proactive threads.
 */
async function handleMemoryMaintenance(env: Env): Promise<void> {
  console.log('Starting memory maintenance...');

  try {
    const memory = new MemoryService(env);
    const pruned = await memory.pruneExpiredMemories();
    console.log(`[Memory] Pruned ${pruned} expired memories`);

    const proactive = new ProactiveEngagementService(env);
    const expired = await proactive.expireStaleThreads();
    console.log(`[Proactive] Expired ${expired} stale threads`);
  } catch (e) {
    console.error('Memory maintenance failed:', e);
  }
}

/**
 * Daily Support Center crawl
 */
async function handleDailySupportCenterCrawl(env: Env): Promise<void> {
  console.log('Starting daily Support Center crawl...');

  try {
    const jobId = await triggerCrawl(env, 'support_center');
    console.log(`Support Center crawl job started: ${jobId}`);

    // Store job info in KV for monitoring
    await env.Roboforex_KV.put('last_support_crawl', JSON.stringify({
      jobId,
      startedAt: new Date().toISOString(),
      trigger: 'cron_daily',
    }));
  } catch (error) {
    console.error('Failed to start Support Center crawl:', error);
  }
}

/**
 * Monthly public site crawl (full site)
 */
async function handleMonthlyPublicSiteCrawl(env: Env): Promise<void> {
  console.log('Starting monthly public site crawl (full site)...');

  try {
    const jobId = await triggerCrawl(env, 'public_site', 'full');
    console.log(`Monthly public site crawl job started: ${jobId}`);

    // Store job info in KV for monitoring
    await env.Roboforex_KV.put('last_public_crawl', JSON.stringify({
      jobId,
      startedAt: new Date().toISOString(),
      trigger: 'cron_monthly',
      crawlType: 'full',
    }));
  } catch (error) {
    console.error('Failed to start monthly public site crawl:', error);
  }
}

/**
 * Weekly news section crawl
 */
async function handleWeeklyNewsCrawl(env: Env): Promise<void> {
  console.log('Starting weekly news section crawl...');

  try {
    const jobId = await triggerCrawl(env, 'public_site', 'news');
    console.log(`Weekly news crawl job started: ${jobId}`);

    // Store job info in KV for monitoring
    await env.Roboforex_KV.put('last_news_crawl', JSON.stringify({
      jobId,
      startedAt: new Date().toISOString(),
      trigger: 'cron_weekly_news',
      crawlType: 'news',
    }));
  } catch (error) {
    console.error('Failed to start weekly news crawl:', error);
  }
}

/**
 * Daily chunk pruning - remove expired content
 */
async function handleDailyChunkPruning(env: Env): Promise<void> {
  console.log('Starting daily chunk pruning...');

  try {
    const now = new Date().toISOString();

    // Get expired chunks
    const expired = await env.DB.prepare(`
      SELECT chunk_id FROM chunks 
      WHERE expires_at IS NOT NULL AND expires_at < ?
    `).bind(now).all<{ chunk_id: string }>();

    if (!expired.results || expired.results.length === 0) {
      console.log('No expired chunks to prune');
      return;
    }

    const expiredIds = expired.results.map(r => r.chunk_id);
    console.log(`Found ${expiredIds.length} expired chunks to prune`);

    // Delete from D1 in batches
    const batchSize = 100;
    for (let i = 0; i < expiredIds.length; i += batchSize) {
      const batch = expiredIds.slice(i, i + batchSize);
      const placeholders = batch.map(() => '?').join(',');

      await env.DB.prepare(`DELETE FROM chunks WHERE chunk_id IN (${placeholders})`)
        .bind(...batch)
        .run();

      // Also clean up lexical index
      await env.DB.prepare(`DELETE FROM lexical_index WHERE chunk_id IN (${placeholders})`)
        .bind(...batch)
        .run();
    }

    // Delete from R2
    for (const chunkId of expiredIds) {
      try {
        await env.Roboforex_CHUNK_BUCKET.delete(`chunks/${chunkId}`);
      } catch (e) {
        // Ignore R2 delete errors
      }
    }

    console.log(`Pruned ${expiredIds.length} expired chunks`);

    // Store prune stats
    await env.Roboforex_KV.put('last_chunk_prune', JSON.stringify({
      prunedCount: expiredIds.length,
      timestamp: now,
    }));
  } catch (error) {
    console.error('Chunk pruning failed:', error);
  }
}

/**
 * Health check - verify system is operational
 */
async function handleHealthCheck(env: Env): Promise<void> {
  interface HealthCheck {
    ok: boolean;
    error?: string;
  }

  const checks: Record<string, HealthCheck> = {};

  // Check D1
  try {
    const result = await env.DB.prepare('SELECT 1 as ok').first<{ ok: number }>();
    checks.d1 = { ok: result?.ok === 1 };
  } catch (error) {
    checks.d1 = { ok: false, error: String(error) };
  }

  // Check KV
  try {
    await env.Roboforex_KV.put('health_check', 'ok', { expirationTtl: 60 });
    const val = await env.Roboforex_KV.get('health_check');
    checks.kv = { ok: val === 'ok' };
  } catch (error) {
    checks.kv = { ok: false, error: String(error) };
  }

  // Check R2
  try {
    await env.Roboforex_CONTENT_BUCKET.put('health_check', 'ok');
    const obj = await env.Roboforex_CONTENT_BUCKET.get('health_check');
    checks.r2 = { ok: obj !== null };
    await env.Roboforex_CONTENT_BUCKET.delete('health_check');
  } catch (error) {
    checks.r2 = { ok: false, error: String(error) };
  }

  const health: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    checks,
  };

  // Get crawl stats
  try {
    const crawler = new CrawlerService(env);
    const crawlStats = await crawler.getStats();
    health.crawlStats = crawlStats;
  } catch (error) {
    health.crawlStats = { error: String(error) };
  }

  // Get chunk stats
  try {
    const chunker = new ChunkerService(env);
    const chunkStats = await chunker.getStats();
    health.chunkStats = chunkStats;
  } catch (error) {
    health.chunkStats = { error: String(error) };
  }

  // Store health check result
  await env.Roboforex_KV.put('health_status', JSON.stringify(health), {
    expirationTtl: 3600, // 1 hour
  });

  // Log if any checks failed
  const failedChecks = Object.entries(checks)
    .filter(([, check]) => !check.ok)
    .map(([key]) => key);

  if (failedChecks.length > 0) {
    console.error(`Health check failed for: ${failedChecks.join(', ')}`);
  } else {
    console.log('Health check passed');
  }
}

/**
 * Get last health status
 */
export async function getHealthStatus(env: Env): Promise<Record<string, unknown> | null> {
  const status = await env.Roboforex_KV.get('health_status');
  return status ? JSON.parse(status) : null;
}

/**
 * Weekly RAG evaluation using LLM-as-Judge
 */
async function handleWeeklyRagEvaluation(env: Env): Promise<void> {
  console.log('Starting weekly RAG evaluation...');

  try {
    const evaluator = new EvaluationService(env);
    const report = await evaluator.runEvaluation();

    console.log(`RAG Evaluation complete:
      - Total tests: ${report.totalTests}
      - Passed: ${report.passedTests}
      - Average score: ${report.averageScore.toFixed(2)}/5
      - Average latency: ${report.averageLatencyMs.toFixed(0)}ms
      - Failed tests: ${report.failedTests.length}`);

    // Store last evaluation timestamp
    await env.Roboforex_KV.put('last_rag_evaluation', JSON.stringify({
      runId: report.runId,
      runAt: report.runAt,
      averageScore: report.averageScore,
      passRate: (report.passedTests / report.totalTests * 100).toFixed(1) + '%',
    }));

    // Alert if score drops below threshold
    if (report.averageScore < 3.0) {
      console.error(`⚠️ RAG quality degradation detected! Average score: ${report.averageScore.toFixed(2)}`);
    }
  } catch (error) {
    console.error('RAG evaluation failed:', error);
  }
}

async function handleWeeklySupportInsights(env: Env): Promise<void> {
  console.log('Starting weekly support insights digest...');

  try {
    const insights = new SupportInsightsService(env, parseAdminIds(env));
    const sent = await insights.sendWeeklyDigest();

    await env.Roboforex_KV.put('last_support_insights', JSON.stringify({
      sent,
      timestamp: new Date().toISOString(),
    }));

    if (!sent) {
      console.warn('Weekly support insights digest was not delivered');
    }
  } catch (error) {
    console.error('Weekly support insights digest failed:', error);
  }
}

/**
 * Weekly Bot Leaderboard — sent alongside the support insights digest
 */
async function handleWeeklyBotLeaderboard(env: Env): Promise<void> {
  console.log('Generating weekly bot leaderboard...');

  try {
    // Iterate per tenant and generate per-tenant leaderboards.
    // Skip tenants where every bot recorded 0 actions — empty leaderboards are noise.
    const tenants = await TenantService.getAllActiveTenants(env);
    const allLeaderboards: string[] = [];
    const silentTenants: string[] = [];
    for (const tenant of tenants) {
      const stats = await getLoreStats(env, tenant.tenantId);
      const total =
        stats.brobo.answers +
        stats.scholar.answers + stats.scholar.tips + stats.scholar.lessons +
        stats.bro.vibes +
        stats.police.strikes;
      if (total === 0) {
        silentTenants.push(tenant.name);
        continue;
      }
      allLeaderboards.push(`<b>${tenant.name}</b>\n${formatLoreLeaderboard(stats)}`);
    }

    if (silentTenants.length > 0) {
      allLeaderboards.push(`<i>Silent tenants (no bot activity): ${silentTenants.join(', ')}</i>`);
    }

    if (allLeaderboards.length === 0) {
      console.log('Bot leaderboard skipped: no tenant had activity this week');
      return;
    }

    const leaderboard = allLeaderboards.join('\n\n');

    // Send only to super admin (first admin ID)
    const adminIds = parseAdminIds(env);
    const superAdminId = adminIds[0];

    const token = env.BROBO_BOT_TOKEN || env.TELEGRAM_BOT_TOKEN || env.SCHOLAR_BOT_TOKEN || env.POLICE_BOT_TOKEN;
    if (!token || !superAdminId) {
      console.warn('Bot leaderboard skipped: missing super admin ID or bot token');
      return;
    }

    const bot = new TelegramBot({ token });
    try {
      await bot.sendMessage(superAdminId, leaderboard, { disableWebPagePreview: true });
    } catch (error) {
      console.error(`Failed to deliver bot leaderboard to super admin ${superAdminId}:`, error);
    }
  } catch (error) {
    console.error('Weekly bot leaderboard failed:', error);
  }
}

/**
 * Weekly Recognition — Sunday 9:30 AM MYT (1:30 AM UTC)
 * Sends a single "Top Contributors" shoutout to each group via BroBo.
 */
async function handleWeeklyRecognition(env: Env): Promise<void> {
  console.log('Starting weekly recognition...');

  const groupConfig = new GroupConfigService(env);
  const groups = await groupConfig.getGroupsWithFeature('weeklyRecognition');

  if (groups.length === 0) return;

  for (const group of groups) {
    const sentKey = `recognition:${group.chatId}:${new Date().toISOString().split('T')[0]}`;

    try {
      // Resolve tenant-specific bot token
      const tenantId = await TenantService.resolveTenantFromChatId(env, group.chatId);
      const botToken = resolveBotToken(env, tenantId, 'brobo');
      if (!botToken) {
        console.warn(`[Recognition] No bot token for chat ${group.chatId} (tenant ${tenantId}), skipping`);
        continue;
      }
      const bot = new TelegramBot({ token: botToken });

      // Prevent double-sends
      if (await env.Roboforex_KV.get(sentKey)) continue;

      const language = group.language ?? 'ms';
      const data = await getWeeklyRecognitionData(env.DB, env.Roboforex_KV, group.chatId, env, language);

      if (data.podium.length === 0) {
        console.log(`[Recognition] No qualifying contributors for chat ${group.chatId} (${group.name})`);
        continue;
      }
      const message = formatWeeklyRecognition(data, language);

      await bot.sendMessage(group.chatId, message, { disableWebPagePreview: true });
      await env.Roboforex_KV.put(sentKey, '1', { expirationTtl: 604800 }); // 7 day TTL
      console.log(`[Recognition] Sent for chat ${group.chatId} (${group.name})`);
    } catch (error) {
      console.error(`[Recognition] Failed for chat ${group.chatId}:`, error);
    }
  }
}

/**
 * Daily Leaderboard — 8 AM MYT (00:00 UTC)
 * Sends yesterday's gamification leaderboard (top active, points, streaks, rank-ups) via Bro Guy.
 */
async function handleDailyPulse(env: Env): Promise<void> {
  console.log('[Leaderboard] Starting daily leaderboard...');

  const groupConfig = new GroupConfigService(env);
  const groups = await groupConfig.getGroupsWithFeature('dailyPulse');

  if (groups.length === 0) {
    console.warn('[Leaderboard] No groups with dailyPulse enabled, skipping');
    return;
  }

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Cache motivational line per language so we don't regenerate per group but
  // still produce a tenant-correct line (ID groups must not get BM punchlines).
  const motivationalByLang = new Map<'ms' | 'id' | 'en', string>();
  const getMotivational = async (lang: 'ms' | 'id' | 'en'): Promise<string> => {
    const cached = motivationalByLang.get(lang);
    if (cached) return cached;
    const line = await generateMotivationalLine(env, lang);
    motivationalByLang.set(lang, line);
    return line;
  };

  for (const group of groups) {
    const chatId = group.chatId;
    const language = (group.language ?? 'ms') as 'ms' | 'id' | 'en';
    const sentKey = `pulse:last_sent:${chatId}:${yesterday}`;

    try {
      // Resolve tenant-specific bot token
      const tenantId = await TenantService.resolveTenantFromChatId(env, chatId);
      const botToken = resolveBotToken(env, tenantId, 'bro');
      if (!botToken) {
        console.warn(`[Leaderboard] No bot token for chat ${chatId} (tenant ${tenantId}), skipping`);
        continue;
      }
      const bot = new TelegramBot({ token: botToken });

      // Prevent double-sends
      if (await env.Roboforex_KV.get(sentKey)) {
        console.log(`[Leaderboard] Already sent for chat ${chatId} on ${yesterday}`);
        continue;
      }

      const data = await getDailyLeaderboardData(env.DB, env.Roboforex_KV, chatId, env, language);

      // Skip if no activity
      if (!data.topActive) {
        console.log(`[Leaderboard] No activity yesterday for chat ${chatId}, skipping`);
        continue;
      }

      // Generate scene image depicting yesterday's vibe (non-blocking — text sends even if image fails)
      if (data.sceneDepiction) {
        try {
          const sceneImageData = await generateSceneImage(env, data.sceneDepiction, data.moodSnapshot?.label ?? null, language);
          if (sceneImageData) {
            // Telegram photo caption limit is 1024 chars
            const caption = data.sceneDepiction.length > 950
              ? `🎬 ${data.sceneDepiction.slice(0, 950)}...`
              : `🎬 ${data.sceneDepiction}`;
            await bot.sendPhotoBuffer(chatId, sceneImageData, caption, { filename: 'morning-vibes.png' });
            console.log(`[Leaderboard] Scene image sent for chat ${chatId}`);
          }
        } catch (err) {
          console.warn(`[Leaderboard] Scene image failed for chat ${chatId}, continuing with text:`, err);
        }
      }

      const motivationalLine = await getMotivational(language);
      const message = formatDailyLeaderboard(data, motivationalLine, language);
      await bot.sendMessage(chatId, message, { disableWebPagePreview: true });

      // Store rank snapshots for tomorrow's rank-up detection
      const activeUsers = await env.DB.prepare(`
        SELECT user_id, rank
        FROM user_moderation_states
        WHERE chat_id = ? AND daily_message_count > 0 AND is_banned = 0
      `).bind(chatId).all<{ user_id: number; rank: string }>();

      for (const user of (activeUsers.results ?? [])) {
        await env.Roboforex_KV.put(
          `rank_snapshot:${chatId}:${user.user_id}`,
          user.rank,
          { expirationTtl: 172800 }, // 48h TTL
        );
      }

      await env.Roboforex_KV.put(sentKey, '1', { expirationTtl: 172800 });

      // Clean up consumed daily quotes and counter KV keys
      await env.Roboforex_KV.delete(`daily_quotes:${chatId}:${yesterday}`);
      await env.Roboforex_KV.delete(`quote_counter:${chatId}:${yesterday}`);

      console.log(`[Leaderboard] Sent for chat ${chatId} on ${yesterday}`);
    } catch (error) {
      console.error(`[Leaderboard] Failed for chat ${chatId}:`, error);
    }
  }
}

/**
 * Onboarding drip — send pending onboarding steps to users.
 * Runs every 30 minutes alongside health check.
 */
async function handleOnboardingDrip(env: Env): Promise<void> {
  try {
    const messages = await getReadyOnboardingMessages(env);
    if (messages.length === 0) return;

    console.log(`[Onboarding] Sending ${messages.length} drip message(s)`);

    for (const msg of messages) {
      try {
        // Resolve tenant-specific BroBo token per message
        const tenantId = await TenantService.resolveTenantFromChatId(env, msg.chatId);
        const botToken = resolveBotToken(env, tenantId, 'brobo');
        if (!botToken) {
          console.warn(`[Onboarding] No brobo token for chat ${msg.chatId} (tenant ${tenantId}), skipping`);
          continue;
        }
        const bot = new TelegramBot({ token: botToken });

        await bot.sendMessage(msg.chatId, msg.message, { disableWebPagePreview: true });

        if (msg.isLast) {
          await bot.sendMessage(
            msg.chatId,
            '🎉 That completes your onboarding journey! You\'re all set. Ask me anything anytime!'
          );
        }
      } catch (error) {
        console.error(`[Onboarding] Failed to send step ${msg.stepIndex} to user ${msg.userId}:`, error);
      }
    }
  } catch (error) {
    console.error('[Onboarding] Drip handler failed:', error);
  }
}

/**
 * Post a daily trading meme/GIF to the group via Bro Guy bot.
 */
async function handleDailyMeme(env: Env): Promise<void> {
  console.log('[Meme] Fetching daily trading meme...');

  try {
    const meme = await getRandomTradingMeme(env);
    if (!meme) {
      console.log('[Meme] No meme found, skipping.');
      return;
    }

    const groupConfig = new GroupConfigService(env);
    const groups = await groupConfig.getGroupsWithFeature('dailyMeme');
    if (groups.length === 0) {
      console.error('[Meme] No groups with dailyMeme enabled.');
      return;
    }

    const caption = buildMemeCaption(meme);

    for (const group of groups) {
      try {
        // Resolve tenant-specific bot token
        const tenantId = await TenantService.resolveTenantFromChatId(env, group.chatId);
        const broToken = resolveBotToken(env, tenantId, 'bro');
        if (!broToken) {
          console.warn(`[Meme] No bot token for chat ${group.chatId} (tenant ${tenantId}), skipping`);
          continue;
        }
        const bot = new TelegramBot({ token: broToken });

        if (meme.type === 'gif') {
          await bot.sendAnimation(group.chatId, meme.url, caption);
        } else {
          await bot.sendPhoto(group.chatId, meme.url, caption);
        }
        console.log(`[Meme] Posted to ${group.chatId} (${group.name}): ${meme.title} (${meme.source})`);
      } catch (e) {
        console.error(`[Meme] Failed for chat ${group.chatId}:`, e);
      }
    }
  } catch (error) {
    console.error('[Meme] Daily meme failed:', error);
  }
}

/**
 * Daily Auto-FAQ generation from high-hit missed queries
 */
async function handleAutoFAQ(env: Env): Promise<void> {
  console.log('Starting daily auto-FAQ generation...');

  try {
    const autoLearning = new AutoLearningService(env);
    const result = await autoLearning.generateAutoFAQs('cron');

    await env.Roboforex_KV.put('last_auto_faq_run', JSON.stringify({
      timestamp: new Date().toISOString(),
      itemsProcessed: result.itemsProcessed,
      itemsCreated: result.itemsCreated,
      itemsFailed: result.itemsFailed,
    }));

    if (result.itemsCreated > 0) {
      console.log(`[AutoFAQ] Generated ${result.itemsCreated} new FAQ chunks`);
    }
  } catch (error) {
    console.error('Auto-FAQ generation failed:', error);
  }
}

/**
 * Weekly gap detection — cluster missed queries and trigger targeted crawls
 */
async function handleGapDetection(env: Env): Promise<void> {
  console.log('Starting weekly gap detection...');

  try {
    const autoLearning = new AutoLearningService(env);
    const result = await autoLearning.detectAndFillGaps('cron');

    await env.Roboforex_KV.put('last_gap_detection_run', JSON.stringify({
      timestamp: new Date().toISOString(),
      itemsProcessed: result.itemsProcessed,
      itemsCreated: result.itemsCreated,
      itemsFailed: result.itemsFailed,
    }));

    if (result.itemsCreated > 0) {
      console.log(`[GapDetection] Queued ${result.itemsCreated} new URLs for crawl`);
    }
  } catch (error) {
    console.error('Gap detection failed:', error);
  }
}

// ---------------------------------------------------------------------------
// System B: Self-Learning Cron Handlers
// ---------------------------------------------------------------------------

/**
 * Daily pattern analysis — extract lessons from negative-signal conversations
 */
async function handlePatternAnalysis(env: Env): Promise<void> {
  console.log('[SelfLearn] Starting daily pattern analysis...');

  try {
    const selfLearning = new SelfLearningService(env);
    const result = await selfLearning.analyzeFailurePatterns('cron');

    await env.Roboforex_KV.put('last_pattern_analysis', JSON.stringify({
      timestamp: new Date().toISOString(),
      ...result,
    }));

    console.log(`[SelfLearn] Pattern analysis complete: ${result.lessonsCreated} created, ${result.lessonsUpdated} updated`);
  } catch (error) {
    console.error('[SelfLearn] Pattern analysis failed:', error);
  }
}

/**
 * Weekly lesson decay — reduce confidence of unvalidated lessons, disable ineffective ones
 */
async function handleLessonDecay(env: Env): Promise<void> {
  console.log('[SelfLearn] Starting weekly lesson decay...');

  try {
    const selfLearning = new SelfLearningService(env);
    const result = await selfLearning.decayLessons();

    console.log(`[SelfLearn] Lesson decay complete: ${result.lessonsDecayed} decayed/disabled`);
  } catch (error) {
    console.error('[SelfLearn] Lesson decay failed:', error);
  }
}

/**
 * Drop-off detection — mark conversations where user left without response
 * Piggybacks on the 30-minute health check cron
 */
async function handleDropOffDetection(env: Env): Promise<void> {
  try {
    const selfLearning = new SelfLearningService(env);
    await selfLearning.detectDropOffs();
  } catch (error) {
    console.error('[SelfLearn] Drop-off detection failed:', error);
  }
}

// ---------------------------------------------------------------------------
// System A: ConversationEvolver Cron Handler
// ---------------------------------------------------------------------------

/**
 * Weekly experiment loop — propose, test, and apply conversation parameter mutations
 * Runs Monday 2 AM UTC (after Sunday eval at 1 AM)
 */
async function handleExperimentLoop(env: Env): Promise<void> {
  console.log('[Evolver] Starting weekly experiment loop...');

  try {
    const evolver = new ConversationEvolverService(env);
    const result = await evolver.runExperiment();

    await env.Roboforex_KV.put('last_experiment_run', JSON.stringify({
      timestamp: new Date().toISOString(),
      ...result,
    }));

    if (result.status === 'completed') {
      console.log(`[Evolver] Experiment ${result.experimentId}: winner=${result.winner}, baseline=${result.baselineScore?.toFixed(2)}, mutated=${result.mutatedScore?.toFixed(2)}`);
    } else {
      console.log(`[Evolver] Experiment status: ${result.status} — ${result.error || 'no details'}`);
    }
  } catch (error) {
    console.error('[Evolver] Experiment loop failed:', error);
  }
}

// ---------------------------------------------------------------------------
// Daily Auto-Comic (weekdays only, 8:30 AM MYT)
// ---------------------------------------------------------------------------

async function handleDailyComic(env: Env): Promise<void> {
  console.log('[Comic] Starting daily auto-comic...');

  // Double-check weekday (cron should handle this, but belt-and-suspenders)
  const day = new Date(Date.now() + 8 * 60 * 60 * 1000).getUTCDay();
  if (day === 0 || day === 6) {
    console.log('[Comic] Weekend — skipping auto-comic');
    return;
  }

  const groupConfig = new GroupConfigService(env);
  const groups = await groupConfig.getGroupsWithFeature('dailyMeme'); // reuse dailyMeme feature flag
  if (groups.length === 0) {
    console.warn('[Comic] No groups with dailyMeme enabled, skipping');
    return;
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const sentKey = `comic_auto:${today}`;

    // Prevent double-sends
    if (await env.Roboforex_KV.get(sentKey)) {
      console.log('[Comic] Already sent auto-comic today');
      return;
    }

    // Generate per-tenant comic (different language/scenarios per tenant)
    const comicCache = new Map<string, { image: ArrayBuffer; caption: string } | null>();

    for (const group of groups) {
      try {
        const tenantId = await TenantService.resolveTenantFromChatId(env, group.chatId);
        const botToken = resolveBotToken(env, tenantId, 'brobo');
        if (!botToken) {
          console.warn(`[Comic] No bot token for chat ${group.chatId} (tenant ${tenantId}), skipping`);
          continue;
        }

        // Generate comic once per tenant, reuse for same-tenant groups
        if (!comicCache.has(tenantId)) {
          const tenantService = new TenantService(env, tenantId);
          const tenantConfig = await tenantService.getTenantConfig();
          const lang = (tenantConfig?.language as 'ms' | 'id' | 'en') || 'ms';
          comicCache.set(tenantId, await generateTradingComic(env, undefined, group.chatId, lang));
        }

        const result = comicCache.get(tenantId);
        if (!result) {
          console.warn(`[Comic] Generation failed for tenant ${tenantId}, skipping`);
          continue;
        }

        const bot = new TelegramBot({ token: botToken });
        await bot.sendPhotoBuffer(group.chatId, result.image, result.caption, {
          filename: 'brobo-daily-comic.png',
        });
        console.log(`[Comic] Posted to ${group.chatId} (${group.name}) [${tenantId}]`);
      } catch (e) {
        console.error(`[Comic] Failed for chat ${group.chatId}:`, e);
      }
    }

    await env.Roboforex_KV.put(sentKey, '1', { expirationTtl: 86400 });
  } catch (error) {
    console.error('[Comic] Daily auto-comic failed:', error);
  }
}

// Weekly suggestion report has been folded into the consolidated weekly digest
// (`handleWeeklySupportInsights` → `SupportInsightsService.sendWeeklyDigest`).
// New suggestions are surfaced as a "💡 New user suggestions" section, and the
// service marks them reviewed after a successful send.

async function handleNightlyTrustLoop(env: Env): Promise<void> {
  try {
    const judge = new TrustJudgeService(env);
    const judgeResult = await judge.run({ batchSize: 30 });
    console.log(`[TrustJudge] done — processed=${judgeResult.processed} skipped=${judgeResult.skipped} failed=${judgeResult.failed}`);

    const reflection = new TrustReflectionService(env);
    const reflectionResult = await reflection.run();
    console.log(`[TrustReflection] done — processed=${reflectionResult.processed} failed=${reflectionResult.failed}`);
  } catch (err) {
    console.error('[TrustLoop] nightly loop failed:', err);
  }
}
