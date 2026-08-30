import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
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
import { buildResearchMarketingReviewHandoff } from '../research-marketing-review-handoff';
import { buildResearchMarketingReviewPacket } from '../research-marketing-review-packet';
import {
  buildResearchIntakePublicEvidenceIndexPayload,
  buildResearchIntakePublicOverviewPayload,
} from '../research-intake-public';

const AUDIT_AT = '2026-08-29T15:59:59.999Z';
const REPO_ROOT = resolve(__dirname, '../../../..');
const TASK_IDS = ['TC-255', 'TC-257', 'TC-258', 'TC-259'] as const;

interface EvidenceFileFingerprint {
  role: 'preregistration' | 'result' | 'artifact';
  path: string;
  normalizedBytes: number;
  sha256: string;
}

interface EvidenceIntegrity {
  schemaVersion: 2;
  status: 'repository-evidence-pinned';
  algorithm: 'sha256';
  normalization: 'utf8-lf';
  manifestCanonicalization: 'role-tab-path-tab-normalizedBytes-tab-sha256-lf-v1';
  manifestSha256: string;
  files: readonly EvidenceFileFingerprint[];
}

function exactIntegrity(taskId: string): {
  integrity: EvidenceIntegrity;
  templateIntegrity: EvidenceIntegrity;
  paths: {
    preregistrationPath: string;
    resultPath: string;
    artifactPath: string;
  };
} | null {
  const exact = buildResearchIntakeAdminReviewItemPayload(taskId, AUDIT_AT) as
    | {
        claimVerification: {
          evidenceIntegrity?: EvidenceIntegrity;
          files: {
            preregistrationPath: string;
            resultPath: string;
            artifactPath: string;
          };
        };
        reviewHandoffTemplate: { evidenceIntegrity?: EvidenceIntegrity };
      }
    | null;
  if (!exact?.claimVerification.evidenceIntegrity) return null;
  if (!exact.reviewHandoffTemplate.evidenceIntegrity) return null;
  return {
    integrity: exact.claimVerification.evidenceIntegrity,
    templateIntegrity: exact.reviewHandoffTemplate.evidenceIntegrity,
    paths: exact.claimVerification.files,
  };
}

function normalizedRepositoryFile(path: string): Buffer {
  const value = readFileSync(resolve(REPO_ROOT, path), 'utf8').replace(/\r\n?/g, '\n');
  return Buffer.from(value, 'utf8');
}

function canonicalManifest(files: readonly EvidenceFileFingerprint[]): string {
  return `${files
    .map((file) => [file.role, file.path, file.normalizedBytes, file.sha256].join('\t'))
    .join('\n')}\n`;
}

describe('protected exact-review evidence integrity manifest', () => {
  it.each(TASK_IDS)('pins %s to independently verified repository evidence bytes', (taskId) => {
    const exact = exactIntegrity(taskId);
    expect(exact).not.toBeNull();
    if (!exact) return;

    const { integrity, paths, templateIntegrity } = exact;
    expect(integrity).toMatchObject({
      schemaVersion: 2,
      status: 'repository-evidence-pinned',
      algorithm: 'sha256',
      normalization: 'utf8-lf',
      manifestCanonicalization:
        'role-tab-path-tab-normalizedBytes-tab-sha256-lf-v1',
    });
    expect(integrity.files.map((file) => [file.role, file.path])).toEqual([
      ['preregistration', paths.preregistrationPath],
      ['result', paths.resultPath],
      ['artifact', paths.artifactPath],
    ]);
    expect(integrity.manifestSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(Object.isFrozen(integrity)).toBe(true);
    expect(Object.isFrozen(integrity.files)).toBe(true);
    expect(templateIntegrity).toBe(integrity);

    for (const file of integrity.files) {
      const normalized = normalizedRepositoryFile(file.path);
      expect(Object.isFrozen(file)).toBe(true);
      expect(file.normalizedBytes).toBe(normalized.byteLength);
      expect(file.sha256).toBe(
        createHash('sha256').update(normalized).digest('hex'),
      );
    }

    expect(integrity.manifestSha256).toBe(
      createHash('sha256')
        .update(canonicalManifest(integrity.files))
        .digest('hex'),
    );
  });

  it.each(TASK_IDS)('reuses the exact %s manifest in the packet and YAML handoff', (taskId) => {
    const exact = exactIntegrity(taskId);
    const packet = buildResearchMarketingReviewPacket(taskId, AUDIT_AT);
    const handoff = buildResearchMarketingReviewHandoff(taskId, AUDIT_AT);
    expect(exact).not.toBeNull();
    if (!exact || !packet || !handoff) return;

    const parsed = parse(handoff) as { evidenceIntegrity?: EvidenceIntegrity };
    expect(parsed.evidenceIntegrity).toEqual(exact.integrity);
    expect(packet).toContain('## Evidence file integrity (verify before review)');
    expect(packet).toContain(exact.integrity.manifestSha256);
    expect(packet).toContain('UTF-8 text normalized to LF');
    for (const file of exact.integrity.files) {
      expect(packet).toContain(file.path);
      expect(packet).toContain(file.sha256);
      expect(packet).toContain(file.normalizedBytes.toLocaleString('en-US'));
    }
  });

  it('keeps integrity manifests off queue, compact, public, and CSV surfaces', () => {
    const excludedJson = [
      buildResearchIntakeAdminReviewPayload(AUDIT_AT),
      buildResearchIntakeAdminOverviewPayload(AUDIT_AT),
      buildResearchIntakePublicOverviewPayload(),
      buildResearchIntakePublicEvidenceIndexPayload(),
    ].map((value) => JSON.stringify(value));
    const excludedCsv = [
      buildResearchIntakeCsv(),
      buildResearchIntakeEvidenceCsv(),
      buildResearchIntakeAdminEvidenceCsv(AUDIT_AT),
      buildResearchMarketingReviewCsv(AUDIT_AT),
    ];
    expect(
      [...excludedJson, ...excludedCsv].every(
        (body) => !body.includes('evidenceIntegrity'),
      ),
    ).toBe(true);
  });
});
