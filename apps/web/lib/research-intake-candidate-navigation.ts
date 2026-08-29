import { SYSTEMATIC_RESEARCH_INTAKE, type ResearchIntakeRecord } from './research-intake';

export type ResearchIntakeCandidateNavigationSurface = 'public' | 'admin';

export interface ResearchIntakeCandidateNavigationItem {
  id: string;
  title: string;
  position: number;
  href: string;
}

export interface ResearchIntakeCandidateNavigation {
  order: 'pinned-source-order';
  currentPosition: number;
  totalCandidates: number;
  catalogHref: string;
  selfHref: string;
  previous: ResearchIntakeCandidateNavigationItem | null;
  next: ResearchIntakeCandidateNavigationItem | null;
}

const CANDIDATE_BASE_PATHS = Object.freeze({
  public: '/api/research/intake',
  admin: '/api/admin/research-intake',
} as const satisfies Record<ResearchIntakeCandidateNavigationSurface, string>);

function candidateHref(basePath: string, candidateId: string): string {
  return `${basePath}/${encodeURIComponent(candidateId)}`;
}

function navigationItem(
  record: ResearchIntakeRecord | undefined,
  position: number,
  basePath: string,
): ResearchIntakeCandidateNavigationItem | null {
  if (!record) return null;
  return {
    id: record.id,
    title: record.title,
    position,
    href: candidateHref(basePath, record.id),
  };
}

export function buildResearchIntakeCandidateNavigation(
  candidateId: string,
  surface: ResearchIntakeCandidateNavigationSurface,
): ResearchIntakeCandidateNavigation | null {
  const currentIndex = SYSTEMATIC_RESEARCH_INTAKE.findIndex(
    (record) => record.id === candidateId,
  );
  if (currentIndex < 0) return null;

  const basePath = CANDIDATE_BASE_PATHS[surface];
  return {
    order: 'pinned-source-order',
    currentPosition: currentIndex + 1,
    totalCandidates: SYSTEMATIC_RESEARCH_INTAKE.length,
    catalogHref: basePath,
    selfHref: candidateHref(basePath, candidateId),
    previous: navigationItem(
      SYSTEMATIC_RESEARCH_INTAKE[currentIndex - 1],
      currentIndex,
      basePath,
    ),
    next: navigationItem(
      SYSTEMATIC_RESEARCH_INTAKE[currentIndex + 1],
      currentIndex + 2,
      basePath,
    ),
  };
}
