import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const NOTION_SCHEMA = {
  Name: { title: {} },
  Pair: {
    select: {
      options: [
        { name: 'BTCUSDT', color: 'yellow' },
        { name: 'ETHUSDT', color: 'blue' },
        { name: 'XAUUSD', color: 'orange' },
        { name: 'SOLUSDT', color: 'purple' },
        { name: 'BNBUSDT', color: 'yellow' },
        { name: 'ADAUSDT', color: 'blue' },
        { name: 'DOGEUSDT', color: 'orange' },
        { name: 'XRPUSDT', color: 'gray' },
        { name: 'AVAXUSDT', color: 'red' },
        { name: 'DOTUSDT', color: 'pink' },
        { name: 'LINKUSDT', color: 'blue' },
        { name: 'MATICUSDT', color: 'purple' },
      ],
    },
  },
  Direction: {
    select: {
      options: [
        { name: 'BUY', color: 'green' },
        { name: 'SELL', color: 'red' },
      ],
    },
  },
  Confidence: { number: { format: 'percent' } },
  Timeframe: {
    select: {
      options: [
        { name: '1h', color: 'gray' },
        { name: '4h', color: 'blue' },
        { name: '1d', color: 'purple' },
      ],
    },
  },
  'Entry Price': { number: { format: 'number' } },
  'MACD Signal': {
    select: {
      options: [
        { name: 'bullish', color: 'green' },
        { name: 'bearish', color: 'red' },
      ],
    },
  },
  Outcome: {
    select: {
      options: [
        { name: 'WIN', color: 'green' },
        { name: 'LOSS', color: 'red' },
        { name: 'PENDING', color: 'gray' },
      ],
    },
  },
  Date: { date: {} },
  'PnL %': { number: { format: 'percent' } },
};

const CURL_COMMAND = `curl -X POST 'https://api.notion.com/v1/databases' \\
  -H 'Authorization: Bearer YOUR_INTEGRATION_TOKEN' \\
  -H 'Notion-Version: 2022-06-28' \\
  -H 'Content-Type: application/json' \\
  -d '{
  "parent": { "type": "page_id", "page_id": "YOUR_PAGE_ID" },
  "title": [{ "type": "text", "text": { "content": "TradeClaw Signals" } }],
  "properties": ${JSON.stringify(NOTION_SCHEMA, null, 2)}
}'`;

export async function GET() {
  return NextResponse.json({
    schema: NOTION_SCHEMA,
    curl: CURL_COMMAND,
    note: 'Replace YOUR_INTEGRATION_TOKEN and YOUR_PAGE_ID with your actual values.',
  });
}
