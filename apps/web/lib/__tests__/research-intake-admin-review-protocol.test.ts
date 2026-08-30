import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as adminIntake from '../research-intake-admin';
import { buildResearchMarketingReviewPacket } from '../research-marketing-review-packet';

const AUDIT_AT = '2026-08-29T15:59:59.999Z';
const TASK_IDS = ['TC-255', 'TC-257', 'TC-258', 'TC-259'] as const;
const REPO_ROOT = resolve(__dirname, '../../../..');
const PACKET_SOURCE = resolve(
  REPO_ROOT,
  'apps/web/lib/research-marketing-review-packet.ts',
);

interface ReviewProtocolCheck {
  id: string;
  instruction: string;
  required: true;
}

interface ReviewProtocol {
  schemaVersion: 1;
  status: 'manual-review-required';
  completionTracking: 'not-recorded-by-this-read-only-api';
  mutationSupported: false;
  checks: readonly ReviewProtocolCheck[];
}

function reviewProtocol(taskId: string): ReviewProtocol | undefined {
  return (
    adminIntake.buildResearchIntakeAdminReviewItemPayload(taskId, AUDIT_AT) as
      | { reviewProtocol?: ReviewProtocol }
      | null
  )?.reviewProtocol;
}

function fingerprint(body: string): { bytes: number; sha256: string } {
  return {
    bytes: Buffer.byteLength(body, 'utf8'),
    sha256: createHash('sha256').update(body).digest('hex'),
  };
}

describe('protected exact-review protocol', () => {
  it('exposes one ordered, machine-readable manual checklist on exact review only', () => {
    const protocol = reviewProtocol('TC-255');

    expect(protocol).toEqual({
      schemaVersion: 1,
      status: 'manual-review-required',
      completionTracking: 'not-recorded-by-this-read-only-api',
      mutationSupported: false,
      checks: [
        {
          id: 'verify-numeric-claims',
          instruction: 'Compare every numeric claim with the result and artifact files.',
          required: true,
        },
        {
          id: 'preserve-evidence-framing',
          instruction: 'Preserve the evidence-state label, frozen verdict, and modeled-research framing.',
          required: true,
        },
        {
          id: 'reject-live-or-advice-framing',
          instruction: 'Do not present modeled results as live performance, financial advice, or trading authority.',
          required: true,
        },
        {
          id: 'require-separate-owner-decision',
          instruction: 'Record a separate explicit owner decision before any publication, posting, or promotion.',
          required: true,
        },
      ],
    });
    expect(Object.isFrozen(protocol)).toBe(true);
    expect(Object.isFrozen(protocol?.checks)).toBe(true);
    expect(protocol?.checks.every((check) => Object.isFrozen(check))).toBe(true);

    const queue = adminIntake.buildResearchIntakeAdminReviewPayload(AUDIT_AT);
    expect(queue.queue.items).toHaveLength(4);
    expect(JSON.stringify(queue)).not.toContain('reviewProtocol');
  });

  it('reuses the identical protocol for every observation-visible exact review', () => {
    const protocols = TASK_IDS.map(reviewProtocol);

    expect(protocols.every(Boolean)).toBe(true);
    expect(protocols.slice(1).every((protocol) => protocol === protocols[0])).toBe(true);
    expect(new Set(protocols[0]?.checks.map((check) => check.id)).size).toBe(4);
  });

  it('renders packet checks from the structured protocol while preserving queue bytes', () => {
    const protocol = reviewProtocol('TC-255');
    const packet = buildResearchMarketingReviewPacket('TC-255', AUDIT_AT);
    if (!packet) throw new Error('TC-255 packet fixture is missing');

    expect(protocol).toBeDefined();
    for (const check of protocol?.checks ?? []) {
      expect(packet).toContain(`- ${check.instruction}`);
    }

    const packetSource = readFileSync(PACKET_SOURCE, 'utf8');
    expect(packetSource).toContain('reviewProtocol.checks.map');
    expect(packetSource).not.toContain(
      "'- Compare every numeric claim with the result and artifact files.'",
    );
    expect({
      packet: fingerprint(packet),
      queue: fingerprint(JSON.stringify(
        adminIntake.buildResearchIntakeAdminReviewPayload(AUDIT_AT),
      )),
    }).toEqual({
      packet: {
        bytes: 11_609,
        sha256: 'd8e554f7799fbe6ee0e91463c24495cf5c9082e7e9af3e1124a181261cbb8fc8',
      },
      queue: {
        bytes: 33_374,
        sha256: 'aaf336a9c2616c130e19409b0069eb90d44af3dd0c95829e58a353b047e14ff8',
      },
    });
  });
});
