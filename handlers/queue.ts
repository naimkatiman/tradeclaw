// Queue handlers for crawl, embed, and video pipelines

import type { Env, CrawlMessage, EmbedMessage, VideoMessage, UrlRecord } from '../types';
import { CrawlerService } from '../services/crawler';
import { ChunkerService } from '../services/chunker';
import { EmbedderService } from '../services/embedder';
import { VideoGenService } from '../services/video-gen';
import { TelegramBot } from '../services/telegram';
import { incrementAdviceCounters } from '../services/trading-advice-videos';

/**
 * Handle crawl queue messages — sequential to avoid D1 overload
 */
export async function handleCrawlQueue(
  batch: MessageBatch<CrawlMessage>,
  env: Env
): Promise<void> {
  const crawler = new CrawlerService(env);
  const chunker = new ChunkerService(env);

  for (const message of batch.messages) {
    try {
      const crawlMessage = message.body;

      if (crawlMessage.type === 'discover') {
        await crawler.startCrawl(
          crawlMessage.source,
          crawlMessage.jobId || crypto.randomUUID(),
          crawlMessage.crawlType
        );
      } else if (crawlMessage.type === 'crawl') {
        const extracted = await crawler.crawlUrl(crawlMessage);

        if (extracted) {
          const urlRecord = await env.DB.prepare(
            'SELECT * FROM urls WHERE url = ?'
          ).bind(crawlMessage.url).first<UrlRecord>();

          if (urlRecord) {
            await chunker.chunkContent(extracted, urlRecord);
          }
        }

        if (crawlMessage.jobId) {
          await updateJobProgress(env, crawlMessage.jobId, extracted !== null);
        }
      }

      message.ack();
    } catch (error) {
      const isD1Overload = error instanceof Error && error.message.includes('D1_ERROR');
      console.error('Crawl queue error:', error);

      if (message.attempts < 3) {
        const baseDelay = isD1Overload ? 60 : 30;
        message.retry({ delaySeconds: Math.pow(2, message.attempts) * baseDelay });
      } else {
        console.error(`Message failed after ${message.attempts} attempts:`, message.body);
        message.ack();
      }
    }
  }
}

/**
 * Handle embed queue messages — sequential to avoid D1 overload
 */
export async function handleEmbedQueue(
  batch: MessageBatch<EmbedMessage>,
  env: Env
): Promise<void> {
  const embedder = new EmbedderService(env);

  for (const message of batch.messages) {
    try {
      await embedder.processEmbedMessage(message.body);
      message.ack();
    } catch (error) {
      const isD1Overload = error instanceof Error && error.message.includes('D1_ERROR');
      console.error('Embed queue error:', error);

      if (message.attempts < 3) {
        // Longer backoff for D1 overload to let pressure clear
        const baseDelay = isD1Overload ? 60 : 15;
        message.retry({ delaySeconds: Math.pow(2, message.attempts) * baseDelay });
      } else {
        console.error(`Embed message failed after ${message.attempts} attempts:`, message.body);
        message.ack();
      }
    }
  }
}

/**
 * Update crawl job progress
 */
async function updateJobProgress(env: Env, jobId: string, success: boolean): Promise<void> {
  if (success) {
    await env.DB.prepare(`
      UPDATE crawl_jobs
      SET crawled_urls = crawled_urls + 1
      WHERE job_id = ?
    `).bind(jobId).run();
  } else {
    await env.DB.prepare(`
      UPDATE crawl_jobs
      SET failed_urls = failed_urls + 1
      WHERE job_id = ?
    `).bind(jobId).run();
  }

  // Check if job is complete
  const job = await env.DB.prepare(`
    SELECT total_urls, crawled_urls, failed_urls
    FROM crawl_jobs WHERE job_id = ?
  `).bind(jobId).first<{
    total_urls: number;
    crawled_urls: number;
    failed_urls: number;
  }>();

  if (job && job.crawled_urls + job.failed_urls >= job.total_urls) {
    await env.DB.prepare(`
      UPDATE crawl_jobs
      SET status = 'completed', completed_at = datetime('now')
      WHERE job_id = ?
    `).bind(jobId).run();
  }
}

/**
 * Safely edit a Telegram message — swallows "message is not modified" errors.
 */
async function safeEditMessage(bot: TelegramBot, chatId: number, messageId: number, text: string): Promise<void> {
  try {
    await bot.editMessageText(chatId, messageId, text);
  } catch (err) {
    // Telegram throws when new text === old text — not a real error
    const msg = err instanceof Error ? err.message : '';
    if (!msg.includes('message is not modified')) {
      console.warn('[VideoQueue] editMessage failed:', msg);
    }
  }
}

/**
 * Handle video queue messages — generate trading advice videos via Wan 2.6
 * Runs in queue consumer (up to 15 min per batch) to handle long generation times.
 */
export async function handleVideoQueue(
  batch: MessageBatch<VideoMessage>,
  env: Env
): Promise<void> {
  for (const message of batch.messages) {
    const job = message.body;
    const bot = new TelegramBot({ token: job.botToken });

    try {
      const apiKey = env.OPENROUTER_API_KEY;
      if (!apiKey) {
        console.error('[VideoQueue] OPENROUTER_API_KEY not configured');
        await safeEditMessage(bot, job.chatId, job.statusMessageId,
          'Video generation not configured. Contact admin.');
        message.ack();
        continue;
      }

      const videoGen = new VideoGenService(apiKey);

      // Update status: queued → generating (different text from initial message)
      await safeEditMessage(bot, job.chatId, job.statusMessageId,
        job.language === 'id'
          ? 'Video sedang diproses oleh AI... \ud83c\udfac Sabar ya, 1-3 menit!'
          : 'Video tengah diproses oleh AI... \ud83c\udfac Sabar, 1-3 minit!');

      console.log(`[VideoQueue] Starting ${job.type} generation for chat ${job.chatId}`);
      console.log(`[VideoQueue] Prompt: ${job.prompt.substring(0, 200)}...`);

      let videoData: ArrayBuffer | null;

      if (job.type === 'image-to-video' && job.imageUrl) {
        videoData = await videoGen.generateImageToVideo(
          job.imageUrl,
          job.prompt,
          { negativePrompt: job.negativePrompt, timeoutMs: 300000 },
        );
      } else {
        videoData = await videoGen.generateTextToVideo(
          job.prompt,
          { negativePrompt: job.negativePrompt, timeoutMs: 300000 },
        );
      }

      if (!videoData || videoData.byteLength < 10000) {
        console.error('[VideoQueue] Video generation failed or too small:', videoData?.byteLength ?? 0);
        await safeEditMessage(bot, job.chatId, job.statusMessageId,
          job.language === 'id'
            ? 'Aduh, video gagal kali ini. Coba lagi nanti!'
            : 'Alamak, video tak jadi kali ni. Cuba lagi lepas ni!');
        message.ack();
        continue;
      }

      console.log(`[VideoQueue] Video ready (${videoData.byteLength} bytes), sending to chat ${job.chatId}`);

      // Send video to Telegram
      try {
        await bot.sendVideoBuffer(job.chatId, videoData, job.caption, {
          filename: 'brobo-advice.mp4',
          width: 1280,
          height: 720,
        });
      } catch (sendErr) {
        console.error('[VideoQueue] Failed to send video:', sendErr);
        await safeEditMessage(bot, job.chatId, job.statusMessageId,
          job.language === 'id'
            ? 'Video udah jadi tapi gagal kirim. Coba /advice lagi!'
            : 'Video dah siap tapi gagal hantar. Cuba /advice lagi!');
        message.ack();
        continue;
      }

      // Clean up status message
      try {
        await bot.deleteMessage(job.chatId, job.statusMessageId);
      } catch {
        // Non-critical — status message may already be gone
      }

      // Increment rate limit counters (skip for admins — unlimited)
      if (!job.isAdmin) {
        await incrementAdviceCounters(env.Roboforex_KV, job.chatId, job.userId);
      }

      console.log(`[VideoQueue] Advice video delivered to chat ${job.chatId}`);
      message.ack();
    } catch (error) {
      console.error('[VideoQueue] Unexpected error:', error);

      await safeEditMessage(bot, job.chatId, job.statusMessageId,
        job.language === 'id'
          ? 'Aduh, video gagal. Coba /advice lagi nanti!'
          : 'Alamak, video tak jadi. Cuba /advice lagi lepas ni!');

      if (message.attempts < 1) {
        message.retry({ delaySeconds: 30 });
      } else {
        message.ack();
      }
    }
  }
}

/**
 * Trigger a crawl job manually
 */
export async function triggerCrawl(
  env: Env,
  source: 'support_center' | 'public_site',
  crawlType?: 'full' | 'news'
): Promise<string> {
  const jobId = crypto.randomUUID();

  await env.CRAWL_QUEUE.send({
    type: 'discover',
    url: '',
    source,
    crawlType,
    jobId,
  });

  return jobId;
}
