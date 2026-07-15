import { GET } from './route';

describe('GET /api/security/audit', () => {
  it('does not self-certify an assessment or score', async () => {
    const response = await GET();
    const body = await response.json();

    expect(body.assessment).toMatchObject({
      status: 'not-performed',
      independent: false,
      overallScore: null,
      lastAssessedAt: null,
    });
    expect(body.owaspTop10.every((item: { status: string }) => item.status === 'not-assessed')).toBe(true);
    expect(JSON.stringify(body)).not.toMatch(/"status":"pass"|"critical":0|"grade":"A"/);
  });
});
