import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildResearchIntakeAdminCandidatePayload,
  buildResearchIntakeAdminEvidenceIndexPayload,
  buildResearchIntakeAdminEvidencePayload,
  buildResearchIntakeAdminOverviewPayload,
  buildResearchIntakeAdminPayload,
  buildResearchIntakeAdminReviewPayload,
} from '../research-intake-admin';
import { buildResearchIntakeAdminEvidenceCsv } from '../research-intake-admin-evidence-csv';
import {
  buildResearchIntakeCsv,
  buildResearchIntakeEvidenceCsv,
} from '../research-intake-csv';
import {
  buildResearchIntakePublicEvidencePayload,
  buildResearchIntakePublicPayload,
} from '../research-intake-public';
import { getResearchLoopReceiptSnapshot } from '../research-loop-receipts';
import { buildResearchMarketingReviewCsv } from '../research-marketing-review-csv';

const ROOT = resolve(__dirname, '../../../..');
const TC267 = 'when-factor-timing-makes-sense';
const CURRENT_AT = '2026-08-30T12:37:56.924Z';

interface ReceiptGateView {
  status:
    | 'open-for-one-receipt'
    | 'wait-for-next-window'
    | 'blocked-by-conflict';
  receiptLimitPerWindow: 1;
  currentWindowReceiptCount: number;
  receiptSlotAvailableNow: boolean;
  nextAvailableAt: string | null;
  nextAvailableWindow: {
    id: string;
    startAt: string;
    endsAt: string;
    durationHours: 3;
  } | null;
  instruction: string;
  controls: {
    manualScreeningRequired: true;
    automaticCandidateSelection: false;
    automaticReceiptCreation: false;
    grantsPublicationAuthority: false;
    grantsTradingAuthority: false;
  };
}

function receiptGate(value: unknown): ReceiptGateView | undefined {
  return (value as { receiptGate?: ReceiptGateView }).receiptGate;
}

function fingerprint(value: unknown): { bytes: number; sha256: string } {
  const body = typeof value === 'string' ? value : JSON.stringify(value);
  return {
    bytes: Buffer.byteLength(body, 'utf8'),
    sha256: createHash('sha256').update(body).digest('hex'),
  };
}

describe('protected research receipt-slot gate', () => {
  it('makes an empty current window explicitly open for exactly one manual receipt', () => {
    const gate = receiptGate(
      getResearchLoopReceiptSnapshot('2026-08-29T15:00:00.000Z'),
    );

    expect(gate).toEqual({
      status: 'open-for-one-receipt',
      receiptLimitPerWindow: 1,
      currentWindowReceiptCount: 0,
      receiptSlotAvailableNow: true,
      nextAvailableAt: '2026-08-29T15:00:00.000Z',
      nextAvailableWindow: {
        id: '2026-08-29T15:00:00.000Z/PT3H',
        startAt: '2026-08-29T15:00:00.000Z',
        endsAt: '2026-08-29T18:00:00.000Z',
        durationHours: 3,
      },
      instruction:
        'One receipt slot is open in the current UTC window. Screen one candidate manually under the frozen cost-first policy; this projection does not create or select anything.',
      controls: {
        manualScreeningRequired: true,
        automaticCandidateSelection: false,
        automaticReceiptCreation: false,
        grantsPublicationAuthority: false,
        grantsTradingAuthority: false,
      },
    });
  });

  it('turns a completed window into an exact wait for the next UTC slot', () => {
    const gate = receiptGate(
      getResearchLoopReceiptSnapshot('2026-08-29T15:19:14.000Z'),
    );

    expect(gate).toEqual({
      status: 'wait-for-next-window',
      receiptLimitPerWindow: 1,
      currentWindowReceiptCount: 1,
      receiptSlotAvailableNow: false,
      nextAvailableAt: '2026-08-29T18:00:00.000Z',
      nextAvailableWindow: {
        id: '2026-08-29T18:00:00.000Z/PT3H',
        startAt: '2026-08-29T18:00:00.000Z',
        endsAt: '2026-08-29T21:00:00.000Z',
        durationHours: 3,
      },
      instruction:
        'The current UTC window already has its one receipt. Do not open another before 2026-08-29T18:00:00.000Z; the next slot belongs to 2026-08-29T18:00:00.000Z/PT3H.',
      controls: {
        manualScreeningRequired: true,
        automaticCandidateSelection: false,
        automaticReceiptCreation: false,
        grantsPublicationAuthority: false,
        grantsTradingAuthority: false,
      },
    });
  });

  it('fails closed on a conflicted window instead of promising an automatic rollover', () => {
    const gate = receiptGate(
      getResearchLoopReceiptSnapshot('2026-08-29T08:29:58.000Z'),
    );

    expect(gate).toEqual({
      status: 'blocked-by-conflict',
      receiptLimitPerWindow: 1,
      currentWindowReceiptCount: 2,
      receiptSlotAvailableNow: false,
      nextAvailableAt: null,
      nextAvailableWindow: null,
      instruction:
        'The current UTC window has conflicting receipts. Reconcile the receipt ledger; this projection promises no future receipt slot.',
      controls: {
        manualScreeningRequired: true,
        automaticCandidateSelection: false,
        automaticReceiptCreation: false,
        grantsPublicationAuthority: false,
        grantsTradingAuthority: false,
      },
    });
  });

  it('shares one observation-safe gate across protected research projections', () => {
    const projections = [
      buildResearchIntakeAdminOverviewPayload(CURRENT_AT),
      buildResearchIntakeAdminPayload(new URLSearchParams(), CURRENT_AT),
      buildResearchIntakeAdminEvidenceIndexPayload(CURRENT_AT),
      buildResearchIntakeAdminEvidencePayload(CURRENT_AT),
      buildResearchIntakeAdminCandidatePayload(TC267, CURRENT_AT),
      buildResearchIntakeAdminReviewPayload(CURRENT_AT),
    ];
    const gates = projections.map((projection) =>
      receiptGate(projection?.researchLoop),
    );

    expect(gates).toEqual(Array(gates.length).fill(gates[0]));
    expect(gates[0]).toMatchObject({
      status: 'wait-for-next-window',
      currentWindowReceiptCount: 1,
      receiptSlotAvailableNow: false,
      nextAvailableAt: '2026-08-30T15:00:00.000Z',
      nextAvailableWindow: {
        id: '2026-08-30T15:00:00.000Z/PT3H',
      },
      controls: {
        automaticCandidateSelection: false,
        automaticReceiptCreation: false,
        grantsPublicationAuthority: false,
        grantsTradingAuthority: false,
      },
    });
  });

  it('keeps public and CSV receipts byte-identical and documents the read-only gate', () => {
    expect({
      publicCatalog: fingerprint(buildResearchIntakePublicPayload()),
      publicEvidence: fingerprint(buildResearchIntakePublicEvidencePayload()),
      publicCatalogCsv: fingerprint(buildResearchIntakeCsv()),
      publicEvidenceCsv: fingerprint(buildResearchIntakeEvidenceCsv()),
      protectedEvidenceCsv: fingerprint(
        buildResearchIntakeAdminEvidenceCsv('2026-08-29T18:00:40.000Z'),
      ),
      protectedReviewCsv: fingerprint(
        buildResearchMarketingReviewCsv('2026-08-29T14:59:59.999Z'),
      ),
    }).toEqual({
      publicCatalog: {
        bytes: 129_071,
        sha256: 'a02bc48210d6c4c2ea8dfafaee6e9f4bd921b096874d073e21c697131648bf3a',
      },
      publicEvidence: {
        bytes: 74_641,
        sha256: 'c16406fedf9137f9f6b91adef80e398a1a7e69a3bb7a6497f6282763a8e4ada3',
      },
      publicCatalogCsv: {
        bytes: 37_418,
        sha256: '2b990e994ec88fbea657170a673702daa3cf208de01b0ca61e0a555d9dc0288f',
      },
      publicEvidenceCsv: {
        bytes: 9_138,
        sha256: 'e6cfe5fdaee58678f734ffbd8ea05e719d585eb4ae0477c054420f4dff53b941',
      },
      protectedEvidenceCsv: {
        bytes: 19_965,
        sha256: 'e641315a42b9f66768b3420619e77072474c6dc94392fb6bc9fd37af5aeac35f',
      },
      protectedReviewCsv: {
        bytes: 7_094,
        sha256: 'c007eb7245cf91c631e4291d3a9fe8f8e35c816395f1ae9642c7b7928a5efe4d',
      },
    });

    const readme = readFileSync(resolve(ROOT, 'README.md'), 'utf8');
    const loopPlan = readFileSync(
      resolve(ROOT, 'docs/plans/2026-08-29-three-hour-research-marketing-loop.md'),
      'utf8',
    );
    for (const document of [readme, loopPlan]) {
      expect(document).toMatch(/receiptGate/);
      expect(document).toMatch(/open-for-one-receipt/);
      expect(document).toMatch(/wait-for-next-window/);
      expect(document).toMatch(/blocked-by-conflict/);
      expect(document).toMatch(/does not create or\s+authorize a receipt/i);
    }
  });
});
