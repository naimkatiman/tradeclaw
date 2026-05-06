/**
 * withClient contract tests — verifies session-scoped state (advisory locks)
 * can survive across calls on a single held connection.
 *
 * The previous executor.ts pattern called `pg_try_advisory_lock` through
 * query() and `pg_advisory_unlock` through query() again. Each query() call
 * checks out a fresh pool client, runs one statement, and releases. Session
 * locks held on the first client leaked to idleTimeoutMillis. withClient
 * pins one client for the callback's lifetime so lock+work+unlock share a
 * session.
 */

jest.mock('pg', () => ({ Pool: jest.fn() }));

import type { PoolClient } from 'pg';

function makeFakeClient(): { client: PoolClient; release: jest.Mock; query: jest.Mock } {
  const release = jest.fn();
  const query = jest.fn().mockResolvedValue({ rows: [] });
  const client = { query, release } as unknown as PoolClient;
  return { client, release, query };
}

async function loadWithMockedPool(connect: jest.Mock): Promise<typeof import('../db-pool')> {
  // Re-grab Pool *after* resetModules so the mock matches the freshly
  // re-imported module graph that db-pool will see.
  const pg = await import('pg');
  (pg.Pool as unknown as jest.Mock).mockImplementation(() => ({ connect }));
  return await import('../db-pool');
}

describe('withClient', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.DATABASE_URL = 'postgresql://localhost/test';
  });

  it('connects a client, passes it to the callback, releases it once on success', async () => {
    const { client, release } = makeFakeClient();
    const connect = jest.fn().mockResolvedValue(client);
    const { withClient } = await loadWithMockedPool(connect);

    const result = await withClient(async (c) => {
      expect(c).toBe(client);
      return 'ok';
    });

    expect(result).toBe('ok');
    expect(connect).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('releases the client even when the callback throws', async () => {
    const { client, release } = makeFakeClient();
    const connect = jest.fn().mockResolvedValue(client);
    const { withClient } = await loadWithMockedPool(connect);

    await expect(
      withClient(async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(release).toHaveBeenCalledTimes(1);
  });

  it('runs lock acquire and unlock on the SAME client (session-scoped invariant)', async () => {
    // Hand out a distinct client object on each connect() so the test would
    // fail if withClient checked out a fresh client mid-callback. Tracks the
    // previous H6 fail-mode where pg_try_advisory_lock and pg_advisory_unlock
    // landed on different sessions.
    const c1 = makeFakeClient();
    const c2 = makeFakeClient();
    const connect = jest.fn().mockResolvedValueOnce(c1.client).mockResolvedValueOnce(c2.client);
    const { withClient } = await loadWithMockedPool(connect);

    await withClient(async (lockClient) => {
      await lockClient.query('SELECT pg_try_advisory_lock($1)', [42]);
      await lockClient.query('SELECT pg_advisory_unlock($1)', [42]);
    });

    expect(c1.query).toHaveBeenCalledTimes(2);
    expect(c2.query).toHaveBeenCalledTimes(0);
    expect(c1.release).toHaveBeenCalledTimes(1);
  });
});
