import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface SendSmsBody {
  to: string;
  message: string;
}

/**
 * POST /api/sms/send — Send SMS via Twilio REST API (raw fetch, no SDK)
 * Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER env vars.
 */
export async function POST(request: NextRequest) {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      return NextResponse.json(
        { sent: false, error: 'Twilio credentials not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER)' },
        { status: 503 },
      );
    }

    const body = (await request.json()) as SendSmsBody;
    const { to, message } = body;

    if (!to || !message) {
      return NextResponse.json(
        { sent: false, error: 'Missing required fields: to, message' },
        { status: 400 },
      );
    }

    // Twilio Messages API
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    const params = new URLSearchParams();
    params.append('To', to);
    params.append('From', fromNumber);
    params.append('Body', message);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      },
      body: params.toString(),
    });

    const data = await res.json() as Record<string, unknown>;

    if (!res.ok) {
      return NextResponse.json(
        {
          sent: false,
          error: (data.message as string) ?? 'Twilio API error',
          code: data.code,
          status: res.status,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      sent: true,
      sid: data.sid,
      to: data.to,
      status: data.status,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { sent: false, error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
