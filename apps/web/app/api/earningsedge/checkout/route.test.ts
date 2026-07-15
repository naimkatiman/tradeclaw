import { POST } from './route';

describe('POST /api/earningsedge/checkout', () => {
  it('does not charge before entitlement delivery is implemented', async () => {
    const response = await POST();
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ checkoutEnabled: false });
  });
});
