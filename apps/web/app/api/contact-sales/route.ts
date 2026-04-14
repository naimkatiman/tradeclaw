import { NextRequest, NextResponse } from 'next/server';
import { createContactSalesInquiry } from '../../../lib/contact-sales';

export const dynamic = 'force-dynamic';

interface InquiryBody {
  name?: unknown;
  email?: unknown;
  telegram?: unknown;
  company?: unknown;
  useCase?: unknown;
  budget?: unknown;
  userId?: unknown;
}

function str(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t || t.length > max) return null;
  return t;
}

function optStr(v: unknown, max: number): string | null {
  if (v == null || v === '') return null;
  return str(v, max);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  let body: InquiryBody;
  try {
    body = (await request.json()) as InquiryBody;
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const name = str(body.name, 255);
  const email = str(body.email, 255);
  const useCase = str(body.useCase, 4000);
  if (!name || !email || !useCase || !EMAIL_RE.test(email) || useCase.length < 10) {
    return NextResponse.json(
      { success: false, error: 'name, email, and useCase (min 10 chars) are required' },
      { status: 400 },
    );
  }

  const userIdRaw = typeof body.userId === 'string' ? body.userId : null;
  const userId = userIdRaw && UUID_RE.test(userIdRaw) ? userIdRaw : null;

  try {
    const inquiry = await createContactSalesInquiry({
      name,
      email: email.toLowerCase(),
      telegram: optStr(body.telegram, 64),
      company: optStr(body.company, 255),
      useCase,
      budget: optStr(body.budget, 64),
      userId,
    });

    const botToken = process.env.TELEGRAM_SALES_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_SALES_CHAT_ID;
    if (botToken && chatId) {
      const text =
        `New Custom-tier inquiry\n` +
        `Name: ${inquiry.name}\n` +
        `Email: ${inquiry.email}\n` +
        (inquiry.company ? `Company: ${inquiry.company}\n` : '') +
        (inquiry.telegram ? `Telegram: ${inquiry.telegram}\n` : '') +
        (inquiry.budget ? `Budget: ${inquiry.budget}\n` : '') +
        `\nUse case:\n${inquiry.useCase}`;
      fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
      }).catch(() => undefined);
    }

    return NextResponse.json({ success: true, data: { id: inquiry.id } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
