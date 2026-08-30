import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { NextRequest, type NextResponse } from 'next/server';
import { createAdminSession } from '../../../../../../../../lib/admin-session';

const ROUTE_PATH = resolve(__dirname, '../route.ts');
const originalAdminSecret = process.env.ADMIN_SECRET;
const AUDIT_AT = '2026-08-29T15:59:59.999Z';
const BEFORE_LAST = '2026-08-29T12:47:50.999Z';
const PRIVATE_CACHE = 'private, no-store, max-age=0';

interface HandoffRoute {
  runtime?: string;
  dynamic?: string;
  GET: (
    request: NextRequest,
    context: { params: Promise<{ taskId: string }> },
  ) => Promise<NextResponse>;
  POST?: unknown;
  PUT?: unknown;
  PATCH?: unknown;
  DELETE?: unknown;
}

function loadRoute(): HandoffRoute | null {
  if (!existsSync(ROUTE_PATH)) return null;
  return jest.requireActual('../route') as HandoffRoute;
}

function context(taskId: string): { params: Promise<{ taskId: string }> } {
  return { params: Promise.resolve({ taskId }) };
}

function request(taskId: string, cookie?: string, query = ''): NextRequest {
  return new NextRequest(
    `http://localhost/api/admin/research-intake/review/${encodeURIComponent(taskId)}/handoff.yaml${query}`,
    cookie ? { headers: { cookie } } : undefined,
  );
}

afterEach(() => {
  jest.useRealTimers();
  if (originalAdminSecret === undefined) {
    delete process.env.ADMIN_SECRET;
  } else {
    process.env.ADMIN_SECRET = originalAdminSecret;
  }
});

describe('GET /api/admin/research-intake/review/[taskId]/handoff.yaml', () => {
  it('authenticates before path parameters and the server clock are observed', async () => {
    const route = loadRoute();
    expect(route).not.toBeNull();
    if (!route) return;

    process.env.ADMIN_SECRET = 'integration-only-secret';
    const unreadParams = {
      then: () => {
        throw new Error('path parameters were observed before authentication');
      },
    } as unknown as Promise<{ taskId: string }>;

    const response = await route.GET(request('TC-255'), { params: unreadParams });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(JSON.stringify(body)).not.toMatch(/candidate|draft|queue|research|task/i);
    expect(response.headers.get('cache-control')).toBe(PRIVATE_CACHE);
    expect(response.headers.get('vary')).toBe('Cookie, Authorization');
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('returns one deterministic blank YAML attachment for a signed admin', async () => {
    const route = loadRoute();
    expect(route).not.toBeNull();
    if (!route) return;

    jest.useFakeTimers().setSystemTime(new Date(AUDIT_AT));
    const secret = 'integration-only-secret';
    process.env.ADMIN_SECRET = secret;
    const token = await createAdminSession(secret);
    const response = await route.GET(
      request(
        'TC-255',
        `tc_admin=${encodeURIComponent(token)}`,
        '?limit=1&unknown=ignored',
      ),
      context('TC-255'),
    );
    const body = await response.text();
    const parsed = parse(body) as Record<string, unknown>;

    expect(route.runtime).toBe('nodejs');
    expect(route.dynamic).toBe('force-dynamic');
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/yaml; charset=utf-8');
    expect(response.headers.get('content-disposition')).toBe(
      'attachment; filename="tradeclaw-research-review-handoff-TC-255.yaml"',
    );
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('cache-control')).toBe(PRIVATE_CACHE);
    expect(response.headers.get('vary')).toBe('Cookie, Authorization');
    expect(response.headers.get('access-control-allow-origin')).toBeNull();
    expect(parsed).toMatchObject({
      schemaVersion: 1,
      templateStatus: 'blank-template-not-recorded',
      completionRecorded: false,
      mutationSupported: false,
      ownerDecisionRecorded: false,
      grantsPublicationAuthority: false,
      grantsTradingAuthority: false,
      taskId: 'TC-255',
      reviewedProjectionObservedAt: AUDIT_AT,
      reviewer: null,
      reviewedAt: null,
      outcome: null,
      notes: null,
    });
  });

  it('uses one generic private 404 for future, unknown, and non-canonical tasks', async () => {
    const route = loadRoute();
    expect(route).not.toBeNull();
    if (!route) return;

    jest.useFakeTimers().setSystemTime(new Date(BEFORE_LAST));
    const secret = 'integration-only-secret';
    process.env.ADMIN_SECRET = secret;
    const token = await createAdminSession(secret);
    const cookie = `tc_admin=${encodeURIComponent(token)}`;

    for (const taskId of ['TC-259', 'TC-999', 'tc-255']) {
      const response = await route.GET(request(taskId, cookie), context(taskId));
      const body = await response.json();

      expect(response.status).toBe(404);
      expect(body).toEqual({ error: 'Research intake marketing review not found.' });
      expect(JSON.stringify(body)).not.toContain(taskId);
      expect(response.headers.get('cache-control')).toBe(PRIVATE_CACHE);
      expect(response.headers.get('vary')).toBe('Cookie, Authorization');
      expect(response.headers.get('access-control-allow-origin')).toBeNull();
    }
  });

  it('exposes only GET and contains no permissive CORS contract', () => {
    const route = loadRoute();
    expect(route).not.toBeNull();
    if (!route) return;

    expect(route).not.toHaveProperty('POST');
    expect(route).not.toHaveProperty('PUT');
    expect(route).not.toHaveProperty('PATCH');
    expect(route).not.toHaveProperty('DELETE');
    expect(readFileSync(ROUTE_PATH, 'utf8')).not.toMatch(/Access-Control-Allow-Origin/i);
  });
});
