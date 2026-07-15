import { NextRequest } from 'next/server';
import { GET, POST } from './route';

describe('/api/signals/record mutation auth', () => {
  const originalSecret = process.env.CRON_SECRET;

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalSecret;
  });

  it('does not mutate through GET', async () => {
    const response = await GET();
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('POST');
  });

  it('rejects an unauthenticated POST', async () => {
    process.env.CRON_SECRET = 'test-secret';
    const request = new NextRequest('http://localhost/api/signals/record', {
      method: 'POST',
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('fails closed when cron auth is not configured', async () => {
    delete process.env.CRON_SECRET;
    const request = new NextRequest('http://localhost/api/signals/record', {
      method: 'POST',
    });

    const response = await POST(request);
    expect(response.status).toBe(503);
  });
});
