import { NextRequest, NextResponse } from 'next/server';

// TODO: Integrate web-push library for real push notifications.
// Install: npm install web-push
// Generate VAPID keys: npx web-push generate-vapid-keys
// Then use webpush.sendNotification(subscription, payload) here.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, body: messageBody } = body as {
      endpoint?: string;
      title?: string;
      body?: string;
    };

    // Mock implementation — returns a simulated signal notification
    return NextResponse.json({
      success: true,
      message: 'Test notification queued',
      notification: {
        title: title ?? 'TradeClaw Signal Alert',
        body: messageBody ?? 'BTCUSD BUY signal detected — confidence 87%',
      },
      signal: {
        pair: 'BTCUSD',
        direction: 'BUY',
        confidence: 87,
        entry: 84250,
      },
    });
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    );
  }
}
