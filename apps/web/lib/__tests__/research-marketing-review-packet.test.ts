import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildResearchIntakeAdminOverviewPayload,
  buildResearchIntakeAdminReviewItemPayload,
  buildResearchIntakeAdminReviewPayload,
} from '../research-intake-admin';
import { buildResearchIntakeAdminEvidenceCsv } from '../research-intake-admin-evidence-csv';
import {
  buildResearchIntakeCsv,
  buildResearchIntakeEvidenceCsv,
} from '../research-intake-csv';
import { buildResearchMarketingReviewCsv } from '../research-marketing-review-csv';
import {
  buildResearchIntakePublicEvidenceIndexPayload,
  buildResearchIntakePublicOverviewPayload,
} from '../research-intake-public';

const BEFORE_FIRST = '2026-08-29T04:55:26.999Z';
const AT_FIRST = '2026-08-29T04:55:27.000Z';
const BEFORE_LAST = '2026-08-29T12:47:50.999Z';
const AUDIT_AT = '2026-08-29T15:59:59.999Z';
const REPO_ROOT = resolve(__dirname, '../../../..');
const PACKET_MODULE_PATH = resolve(
  REPO_ROOT,
  'apps/web/lib/research-marketing-review-packet.ts',
);
const PACKET_ROUTE_PATH = resolve(
  REPO_ROOT,
  'apps/web/app/api/admin/research-intake/review/[taskId]/packet.md/route.ts',
);

type PacketBuilder = (
  taskId: string,
  at?: Date | string | number,
) => string | null;

function packetBuilder(): PacketBuilder | undefined {
  if (!existsSync(PACKET_MODULE_PATH)) return undefined;
  const packetExports = jest.requireActual('../research-marketing-review-packet') as {
    buildResearchMarketingReviewPacket?: PacketBuilder;
  };
  return packetExports.buildResearchMarketingReviewPacket;
}

describe('protected exact Markdown marketing-review packet', () => {
  it('formats only canonical observation-visible review items', () => {
    const builder = packetBuilder();
    expect(typeof builder).toBe('function');
    if (!builder) return;

    expect(builder('TC-255', BEFORE_FIRST)).toBeNull();
    expect(builder('TC-259', BEFORE_LAST)).toBeNull();
    expect(builder('missing', AUDIT_AT)).toBeNull();
    expect(builder('tc-255', AUDIT_AT)).toBeNull();
    expect(builder(' TC-255', AUDIT_AT)).toBeNull();

    const atOpen = builder('TC-255', AT_FIRST);
    expect(atOpen).toContain('# TradeClaw marketing review packet: TC-255');
    expect(atOpen).toContain('- Queue position: 1 of 1');
    expect(atOpen).not.toContain('TC-257');

    const atAudit = builder('TC-255', AUDIT_AT);
    expect(atAudit).toContain('- Queue position: 1 of 4');
    expect(atAudit).toContain(`- Observed at: ${AUDIT_AT}`);
  });

  it('separates provenance, evidence, draft copy, checks, and false authority', () => {
    const builder = packetBuilder();
    expect(typeof builder).toBe('function');
    if (!builder) return;

    const packet = builder('TC-255', AUDIT_AT);
    expect(packet).not.toBeNull();
    if (!packet) return;

    expect(packet).toMatch(/^# TradeClaw marketing review packet: TC-255\n\n/);
    expect(packet).toContain(
      '> Human review required. This read-only packet does not approve publication, posting, promotion, trading, allocation, broadcast, broker activity, or execution.',
    );
    expect(packet).toContain('## Review queue and provenance');
    expect(packet).toContain('- Availability basis: pre-loop-closure');
    expect(packet).toContain('- Research cycle: none (pre-loop closure)');
    expect(packet).toContain('- Receipt: none (pre-loop closure)');
    expect(packet).toContain('## Candidate and evidence');
    expect(packet).toContain('- Evidence state: Modeled historical fail (`modeled-historical-fail`)');
    expect(packet).toContain('- Performance gates evaluated: Yes');
    expect(packet).toMatch(/- Decision: .*failed after modeled costs/i);
    expect(packet).toContain('## Draft under review (not approved)');
    expect(packet).toContain('### A high-turnover Bitcoin trend idea failed after realistic costs');
    expect(packet).toContain('BTC gross +69.43% became net -99.21%');
    expect(packet).toContain('## Evidence files and links');
    expect(packet).toContain('- Exact review JSON: `/api/admin/research-intake/review/TC-255`');
    expect(packet).toContain(
      '- This Markdown packet: `/api/admin/research-intake/review/TC-255/packet.md`',
    );
    expect(packet).toContain('## Required manual checks');
    expect(packet).toContain('Compare every numeric claim with the result and artifact files.');
    expect(packet).toContain('## Publication and trading authority');
    expect(packet).toContain('- Publication approved: No');
    expect(packet).toContain('- Draft publish approved: No');
    expect(packet).toContain('- Automatic publication: No');
    expect(packet).toContain('- Automatic posting: No');
    expect(packet).toContain('- Trading approved: No');
    expect(packet).toContain('- Automatic trading: No');
    expect(packet).toContain('- External actions: none');
    expect(packet).not.toMatch(/Publication approved: Yes|Trading approved: Yes/);
    expect(packet.endsWith('\n')).toBe(true);
    expect(builder('TC-255', AUDIT_AT)).toBe(packet);
  });

  it('links one packet from protected review projections only', () => {
    const overview = buildResearchIntakeAdminOverviewPayload(AUDIT_AT);
    const queue = buildResearchIntakeAdminReviewPayload(AUDIT_AT);
    const exact = buildResearchIntakeAdminReviewItemPayload('TC-255', AUDIT_AT);

    expect(overview.marketingReview.nextReview?.links.reviewPacket).toBe(
      '/api/admin/research-intake/review/TC-255/packet.md',
    );
    expect(queue.queue.items.map((item) => item.links.reviewPacket)).toEqual([
      '/api/admin/research-intake/review/TC-255/packet.md',
      '/api/admin/research-intake/review/TC-257/packet.md',
      '/api/admin/research-intake/review/TC-258/packet.md',
      '/api/admin/research-intake/review/TC-259/packet.md',
    ]);
    expect(exact?.reviewItem.links.reviewPacket).toBe(
      '/api/admin/research-intake/review/TC-255/packet.md',
    );
    expect(JSON.stringify(buildResearchIntakePublicOverviewPayload())).not.toContain(
      'reviewPacket',
    );
    expect(JSON.stringify(buildResearchIntakePublicEvidenceIndexPayload())).not.toContain(
      'reviewPacket',
    );
  });

  it('defines a private auth-first GET-only route while preserving CSV and docs boundaries', () => {
    expect(existsSync(PACKET_ROUTE_PATH)).toBe(true);
    if (existsSync(PACKET_ROUTE_PATH)) {
      const route = readFileSync(PACKET_ROUTE_PATH, 'utf8');
      const authCall = route.indexOf('const denied = await assertAdminApi');
      const paramsRead = route.indexOf('await params');
      const clockRead = route.indexOf('new Date()');
      const builderCall = route.lastIndexOf('buildResearchMarketingReviewPacket');

      expect(authCall).toBeGreaterThan(-1);
      expect(paramsRead).toBeGreaterThan(authCall);
      expect(clockRead).toBeGreaterThan(paramsRead);
      expect(builderCall).toBeGreaterThan(clockRead);
      expect(route).toContain("export const runtime = 'nodejs'");
      expect(route).toContain("export const dynamic = 'force-dynamic'");
      expect(route).toContain('private, no-store, max-age=0');
      expect(route).toContain("Vary', 'Cookie, Authorization");
      expect(route).toContain('text/markdown; charset=utf-8');
      expect(route).not.toMatch(/Access-Control-Allow-Origin/i);
      expect(route).not.toMatch(/export async function (?:POST|PUT|PATCH|DELETE)/);
    }

    expect(Buffer.byteLength(buildResearchIntakeCsv(), 'utf8')).toBe(37_314);
    expect(Buffer.byteLength(buildResearchIntakeEvidenceCsv(), 'utf8')).toBe(8_557);
    expect(Buffer.byteLength(
      buildResearchIntakeAdminEvidenceCsv('2026-08-29T18:00:40.000Z'),
      'utf8',
    )).toBe(19_151);
    expect(Buffer.byteLength(
      buildResearchMarketingReviewCsv('2026-08-29T14:59:59.999Z'),
      'utf8',
    )).toBe(7_094);

    const readme = readFileSync(resolve(REPO_ROOT, 'README.md'), 'utf8');
    const api = readme.slice(readme.indexOf('## API'), readme.indexOf('## Notifications'));
    expect(api).toMatch(/Markdown review packet/i);
    expect(api).toMatch(/human review.*does not approve publication/i);
  });
});
