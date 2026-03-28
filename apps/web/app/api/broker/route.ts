import { NextRequest, NextResponse } from 'next/server';

const METAAPI_BASE = 'https://mt-client-api-v1.agiliumtrade.agiliumtrade.ai';

interface MetaApiError {
  id: number;
  error: string;
  message: string;
}

function isMetaApiError(data: unknown): data is MetaApiError {
  return (
    typeof data === 'object' &&
    data !== null &&
    'error' in data &&
    'message' in data
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, accountId } = body as { token?: string; accountId?: string };

    if (!token || !accountId) {
      return NextResponse.json(
        { error: 'Missing required fields: token and accountId' },
        { status: 400 }
      );
    }

    const headers = {
      'auth-token': token,
      'Content-Type': 'application/json',
    };

    // Fetch account info and positions in parallel
    const [accountRes, positionsRes] = await Promise.all([
      fetch(
        `${METAAPI_BASE}/users/current/accounts/${accountId}/account-information`,
        { headers, signal: AbortSignal.timeout(15000) }
      ),
      fetch(
        `${METAAPI_BASE}/users/current/accounts/${accountId}/positions`,
        { headers, signal: AbortSignal.timeout(15000) }
      ),
    ]);

    // Handle account info response
    if (!accountRes.ok) {
      const errData = await accountRes.json().catch(() => null);
      const message = isMetaApiError(errData)
        ? errData.message
        : `MetaApi returned ${accountRes.status}`;
      return NextResponse.json(
        { error: message, status: accountRes.status },
        { status: accountRes.status >= 500 ? 502 : accountRes.status }
      );
    }

    // Handle positions response
    if (!positionsRes.ok) {
      const errData = await positionsRes.json().catch(() => null);
      const message = isMetaApiError(errData)
        ? errData.message
        : `MetaApi returned ${positionsRes.status}`;
      return NextResponse.json(
        { error: message, status: positionsRes.status },
        { status: positionsRes.status >= 500 ? 502 : positionsRes.status }
      );
    }

    const [accountInfo, positions] = await Promise.all([
      accountRes.json(),
      positionsRes.json(),
    ]);

    return NextResponse.json({
      accountInfo,
      positions: Array.isArray(positions) ? positions : [],
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      return NextResponse.json(
        { error: 'MetaApi request timed out. The account may not be deployed or the server is unreachable.' },
        { status: 504 }
      );
    }
    if (err instanceof TypeError && err.message.includes('fetch')) {
      return NextResponse.json(
        { error: 'Unable to reach MetaApi servers. Check your network connection.' },
        { status: 502 }
      );
    }
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Broker API error: ${message}` },
      { status: 500 }
    );
  }
}
