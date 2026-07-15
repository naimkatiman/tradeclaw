import { GET, POST } from './route';

describe('/api/exchanges', () => {
  it('reports generic connections as unavailable without a fallback catalog', async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      available: false,
      status: 'not-implemented',
      exchanges: [],
      total: 0,
      nativeExecution: {
        venue: 'Binance USD-M Futures',
        defaultMode: 'disabled',
      },
    });
    expect(body).not.toHaveProperty('ccxtSupported');
  });

  it('rejects connection attempts without processing credentials', async () => {
    const response = await POST();
    const body = await response.json();

    expect(response.status).toBe(501);
    expect(body).toEqual({
      available: false,
      success: false,
      code: 'EXCHANGE_CONNECTION_NOT_IMPLEMENTED',
      error: 'Generic exchange connections are not implemented. Credentials were not processed or stored.',
    });
    expect(body).not.toHaveProperty('balance');
    expect(body).not.toHaveProperty('latencyMs');
  });
});
