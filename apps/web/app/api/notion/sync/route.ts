import { NextRequest, NextResponse } from 'next/server';
import { readHistory } from '../../../../lib/signal-history';

export const dynamic = 'force-dynamic';

interface SyncRequestBody {
  token: string;
  databaseId: string;
  pair?: string;
  direction?: string;
  minConfidence?: number;
  limit?: number;
}

function getOutcomeLabel(outcomes: { '4h': { hit: boolean } | null; '24h': { hit: boolean } | null }): string {
  if (outcomes['24h']?.hit === true) return 'WIN';
  if (outcomes['24h']?.hit === false) return 'LOSS';
  return 'PENDING';
}

function getMacdLabel(direction: 'BUY' | 'SELL'): string {
  return direction === 'BUY' ? 'bullish' : 'bearish';
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SyncRequestBody;

    if (!body.token || !body.databaseId) {
      return NextResponse.json(
        { success: false, error: 'token and databaseId are required' },
        { status: 400 },
      );
    }

    let records = readHistory();

    // Apply filters
    if (body.pair) {
      const pairUpper = body.pair.toUpperCase();
      records = records.filter((r) => r.pair === pairUpper);
    }
    if (body.direction) {
      const dirUpper = body.direction.toUpperCase();
      records = records.filter((r) => r.direction === dirUpper);
    }
    if (body.minConfidence !== undefined) {
      records = records.filter((r) => r.confidence >= body.minConfidence!);
    }

    // Sort newest first, cap at limit
    records.sort((a, b) => b.timestamp - a.timestamp);
    const cap = Math.min(Math.max(body.limit ?? 50, 1), 100);
    records = records.slice(0, cap);

    let synced = 0;
    const errors: string[] = [];

    for (const record of records) {
      const notionBody = {
        parent: { database_id: body.databaseId },
        properties: {
          Name: {
            title: [{ text: { content: `${record.pair} ${record.direction} ${record.timeframe}` } }],
          },
          Pair: { select: { name: record.pair } },
          Direction: { select: { name: record.direction } },
          Confidence: { number: record.confidence },
          Timeframe: { select: { name: record.timeframe } },
          'Entry Price': { number: record.entryPrice },
          Outcome: { select: { name: getOutcomeLabel(record.outcomes) } },
          Date: { date: { start: new Date(record.timestamp).toISOString() } },
          'MACD Signal': { select: { name: getMacdLabel(record.direction) } },
          'PnL %': { number: record.outcomes['24h']?.pnlPct ?? 0 },
        },
      };

      try {
        const res = await fetch('https://api.notion.com/v1/pages', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${body.token}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(notionBody),
          signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) {
          const errData = (await res.json().catch(() => ({}))) as { message?: string };
          errors.push(`${record.id}: ${res.status} ${errData.message ?? res.statusText}`);
        } else {
          synced++;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`${record.id}: ${msg}`);
      }

      // Rate-limit: stay under 3 req/s
      if (records.indexOf(record) < records.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
    }

    return NextResponse.json({ success: true, synced, errors });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 },
    );
  }
}
