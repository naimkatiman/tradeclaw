import { NextRequest, NextResponse } from 'next/server';
import { saveExpoPushToken, deleteExpoPushToken, getExpoTokenStats } from '../../../../lib/expo-push-tokens';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, DELETE, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json(null, { headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, platform, deviceName, pairs, minConfidence, directions, enabled } = body as {
      token?: string;
      platform?: string;
      deviceName?: string;
      pairs?: string[];
      minConfidence?: number;
      directions?: ('BUY' | 'SELL' | 'both')[];
      enabled?: boolean;
    };

    if (!token || !token.startsWith('ExponentPushToken[')) {
      return NextResponse.json(
        { error: 'Missing or invalid Expo push token' },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    const record = await saveExpoPushToken(token, {
      platform,
      deviceName,
      pairs,
      minConfidence,
      directions,
      enabled,
    });

    return NextResponse.json(
      { success: true, id: record.id },
      { headers: CORS_HEADERS },
    );
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400, headers: CORS_HEADERS },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { token } = body as { token?: string };

    if (!token) {
      return NextResponse.json(
        { error: 'Missing token' },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    await deleteExpoPushToken(token);

    return NextResponse.json(
      { success: true },
      { headers: CORS_HEADERS },
    );
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400, headers: CORS_HEADERS },
    );
  }
}

export async function GET() {
  try {
    const stats = await getExpoTokenStats();
    return NextResponse.json(
      { success: true, stats },
      { headers: CORS_HEADERS },
    );
  } catch {
    return NextResponse.json(
      { error: 'Failed to load stats' },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
