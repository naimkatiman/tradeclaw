import { NextRequest, NextResponse } from 'next/server';
import { issueLicense, listLicenses, ALLOWED_PREMIUM_STRATEGIES } from '@/lib/licenses';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      issuedTo?: string;
      strategies?: unknown;
      expiresAt?: string | null;
      notes?: string;
    };

    if (!Array.isArray(body.strategies) || body.strategies.length === 0) {
      return NextResponse.json(
        { error: 'strategies must be a non-empty array' },
        { status: 400 },
      );
    }

    const strategies = body.strategies.filter(
      (s): s is string => typeof s === 'string' && ALLOWED_PREMIUM_STRATEGIES.has(s),
    );
    if (strategies.length === 0) {
      return NextResponse.json(
        { error: 'no valid strategies in payload' },
        { status: 400 },
      );
    }

    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      return NextResponse.json({ error: 'invalid expiresAt' }, { status: 400 });
    }

    const result = await issueLicense({
      issuedTo: body.issuedTo,
      strategies,
      expiresAt,
      notes: body.notes,
    });

    return NextResponse.json({
      license: result.license,
      plaintextKey: result.plaintextKey,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown error' },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const licenses = await listLicenses();
    return NextResponse.json({ licenses });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown error' },
      { status: 500 },
    );
  }
}
