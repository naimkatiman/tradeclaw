import { NextRequest, NextResponse } from 'next/server';
import { assertAdminApi } from '../../../lib/admin-gate';

const METAAPI_BASE = 'https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai';

interface MetaApiError {
  error: string;
  message: string;
}

function isMetaApiError(data: unknown): data is MetaApiError {
  return typeof data === 'object' && data !== null && 'error' in data && 'message' in data;
}

export async function GET(request: NextRequest) {
  const unauthorized = await assertAdminApi(request);
  if (unauthorized) return unauthorized;

  const token = process.env.METAAPI_TOKEN;
  const accountId = process.env.METAAPI_ACCOUNT_ID;
  if (!token || !accountId) {
    return NextResponse.json({
      available: false,
      error: 'MetaApi account viewer is not configured. Set METAAPI_TOKEN and METAAPI_ACCOUNT_ID on the server.',
    }, { status: 503 });
  }

  const headers = { 'auth-token': token, 'Content-Type': 'application/json' };

  try {
    const [accountRes, positionsRes] = await Promise.all([
      fetch(`${METAAPI_BASE}/users/current/accounts/${encodeURIComponent(accountId)}/account-information`, {
        headers,
        signal: AbortSignal.timeout(15_000),
        cache: 'no-store',
      }),
      fetch(`${METAAPI_BASE}/users/current/accounts/${encodeURIComponent(accountId)}/positions`, {
        headers,
        signal: AbortSignal.timeout(15_000),
        cache: 'no-store',
      }),
    ]);

    if (!accountRes.ok || !positionsRes.ok) {
      const failed = !accountRes.ok ? accountRes : positionsRes;
      const detail = await failed.json().catch(() => null);
      const message = isMetaApiError(detail) ? detail.message : `MetaApi returned ${failed.status}`;
      return NextResponse.json({ available: false, error: message }, { status: failed.status >= 500 ? 502 : failed.status });
    }

    const [accountInfo, positions] = await Promise.all([accountRes.json(), positionsRes.json()]);
    return NextResponse.json({
      available: true,
      source: 'MetaApi',
      accountInfo,
      positions: Array.isArray(positions) ? positions : [],
      observedAt: new Date().toISOString(),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === 'TimeoutError';
    return NextResponse.json({
      available: false,
      error: timedOut ? 'MetaApi request timed out.' : 'Unable to reach MetaApi.',
    }, { status: timedOut ? 504 : 502 });
  }
}

export async function POST() {
  return NextResponse.json({ error: 'Method not allowed. Broker credentials are server-managed.' }, { status: 405 });
}
