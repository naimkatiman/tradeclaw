import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import {
  RESEARCH_MARKETING_REVIEW_EVIDENCE_TASK_IDS,
  getResearchMarketingReviewEvidenceIntegrity,
  isResearchMarketingReviewEvidenceTaskId,
} from '../../apps/web/lib/research-marketing-review-integrity';

export interface ResearchMarketingReviewEvidenceFileVerification {
  role: 'preregistration' | 'result' | 'artifact';
  path: string;
  ok: boolean;
  expectedNormalizedBytes: number;
  actualNormalizedBytes: number | null;
  expectedSha256: string;
  actualSha256: string | null;
  error: string | null;
}

export interface ResearchMarketingReviewEvidenceTaskVerification {
  taskId: string;
  ok: boolean;
  expectedManifestSha256: string;
  actualManifestSha256: string | null;
  files: ResearchMarketingReviewEvidenceFileVerification[];
}

export interface ResearchMarketingReviewEvidenceVerificationReport {
  schemaVersion: 1;
  ok: boolean;
  scope: 'repository-evidence-bytes-only';
  requestedTaskIds: string[];
  tasks: ResearchMarketingReviewEvidenceTaskVerification[];
  controls: {
    recordsReviewCompletion: false;
    grantsPublicationAuthority: false;
    grantsTradingAuthority: false;
  };
}

export interface VerifyResearchMarketingReviewEvidenceOptions {
  root?: string;
  taskIds?: readonly string[];
  readText?: (absolutePath: string, repositoryPath: string) => Promise<string>;
}

export const RESEARCH_MARKETING_REVIEW_EVIDENCE_VERIFIER_CONTROLS =
  Object.freeze({
    recordsReviewCompletion: false,
    grantsPublicationAuthority: false,
    grantsTradingAuthority: false,
  } as const);

function fail(message: string): never {
  throw new Error(`Research review evidence verification failed: ${message}`);
}

function normalizeTaskIds(taskIds: readonly string[] | undefined): string[] {
  const selected = taskIds === undefined
    ? [...RESEARCH_MARKETING_REVIEW_EVIDENCE_TASK_IDS]
    : [...taskIds];
  if (selected.length === 0) fail('at least one review task is required');

  const seen = new Set<string>();
  for (const taskId of selected) {
    if (!isResearchMarketingReviewEvidenceTaskId(taskId)) {
      fail(`unknown review task ${JSON.stringify(taskId)}`);
    }
    if (seen.has(taskId)) fail(`duplicate review task ${JSON.stringify(taskId)}`);
    seen.add(taskId);
  }
  return selected;
}

export function parseResearchMarketingReviewEvidenceArgs(
  args: readonly string[],
): readonly string[] {
  if (args.length === 0) return [...RESEARCH_MARKETING_REVIEW_EVIDENCE_TASK_IDS];

  let taskId: string | null = null;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument !== '--task') {
      fail(`unexpected argument ${JSON.stringify(argument)}`);
    }
    if (taskId !== null) fail('--task may be provided at most once');

    const value = args[index + 1];
    if (!value || value.startsWith('-')) fail('--task requires a task ID');
    if (!isResearchMarketingReviewEvidenceTaskId(value)) {
      fail(`unknown review task ${JSON.stringify(value)}`);
    }
    taskId = value;
    index += 1;
  }

  return taskId === null
    ? [...RESEARCH_MARKETING_REVIEW_EVIDENCE_TASK_IDS]
    : [taskId];
}

function repositoryFilePath(root: string, repositoryPath: string): string {
  const absoluteRoot = resolve(root);
  const absolutePath = resolve(absoluteRoot, ...repositoryPath.split('/'));
  const relativePath = relative(absoluteRoot, absolutePath);
  if (
    relativePath.length === 0 ||
    relativePath === '..' ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath)
  ) {
    fail(`evidence path escapes repository root: ${repositoryPath}`);
  }
  return absolutePath;
}

function sha256(value: Buffer | string): string {
  return createHash('sha256').update(value).digest('hex');
}

function normalizeUtf8Lf(value: string): Buffer {
  return Buffer.from(value.replace(/\r\n?/g, '\n'), 'utf8');
}

function canonicalManifest(
  files: readonly ResearchMarketingReviewEvidenceFileVerification[],
): string | null {
  if (
    files.some(
      (file) =>
        file.actualNormalizedBytes === null || file.actualSha256 === null,
    )
  ) {
    return null;
  }

  return `${files
    .map((file) =>
      [
        file.role,
        file.path,
        file.actualNormalizedBytes,
        file.actualSha256,
      ].join('\t'),
    )
    .join('\n')}\n`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function verifyResearchMarketingReviewEvidence(
  options: VerifyResearchMarketingReviewEvidenceOptions = {},
): Promise<ResearchMarketingReviewEvidenceVerificationReport> {
  const root = resolve(options.root ?? process.cwd());
  const taskIds = normalizeTaskIds(options.taskIds);
  const readText = options.readText ?? (async (absolutePath: string) =>
    readFile(absolutePath, 'utf8'));
  const tasks: ResearchMarketingReviewEvidenceTaskVerification[] = [];

  for (const taskId of taskIds) {
    if (!isResearchMarketingReviewEvidenceTaskId(taskId)) {
      fail(`unknown review task ${JSON.stringify(taskId)}`);
    }
    const integrity = getResearchMarketingReviewEvidenceIntegrity(taskId);
    const files: ResearchMarketingReviewEvidenceFileVerification[] = [];

    for (const expected of integrity.files) {
      const absolutePath = repositoryFilePath(root, expected.path);
      try {
        const normalized = normalizeUtf8Lf(
          await readText(absolutePath, expected.path),
        );
        const actualSha256 = sha256(normalized);
        const actualNormalizedBytes = normalized.byteLength;
        files.push({
          role: expected.role,
          path: expected.path,
          ok:
            actualNormalizedBytes === expected.normalizedBytes &&
            actualSha256 === expected.sha256,
          expectedNormalizedBytes: expected.normalizedBytes,
          actualNormalizedBytes,
          expectedSha256: expected.sha256,
          actualSha256,
          error: null,
        });
      } catch (error) {
        files.push({
          role: expected.role,
          path: expected.path,
          ok: false,
          expectedNormalizedBytes: expected.normalizedBytes,
          actualNormalizedBytes: null,
          expectedSha256: expected.sha256,
          actualSha256: null,
          error: errorMessage(error),
        });
      }
    }

    const manifest = canonicalManifest(files);
    const actualManifestSha256 = manifest === null ? null : sha256(manifest);
    tasks.push({
      taskId,
      ok:
        files.every((file) => file.ok) &&
        actualManifestSha256 === integrity.manifestSha256,
      expectedManifestSha256: integrity.manifestSha256,
      actualManifestSha256,
      files,
    });
  }

  return {
    schemaVersion: 1,
    ok: tasks.every((task) => task.ok),
    scope: 'repository-evidence-bytes-only',
    requestedTaskIds: taskIds,
    tasks,
    controls: RESEARCH_MARKETING_REVIEW_EVIDENCE_VERIFIER_CONTROLS,
  };
}
