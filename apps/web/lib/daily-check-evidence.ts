import fs from 'fs';
import path from 'path';
import { computeEquityCurve } from '../app/api/signals/equity/route';
import { MAX_EVIDENCE_AGE_DAYS } from './cost-adjusted-edge-gate';
import {
  isLiveRecordStale,
  snapshotFromStudyFile,
  type PublishedRecord,
} from './daily-check';
import { getResolvedSlice } from './signal-slice';

const STUDIES = [
  {
    id: 'study-daily-momentum',
    title: 'Daily momentum study',
    file: 'daily-momentum-validation-BTCUSD-D1-f4.json',
  },
  {
    id: 'study-carry',
    title: 'Carry study',
    file: 'carry-validation-10majors-f4.json',
  },
] as const;

function findRepoRoot(start = process.cwd()): string {
  let dir = start;
  for (let i = 0; i < 5; i += 1) {
    if (fs.existsSync(path.join(dir, 'docs', 'research', 'experiments', 'REGISTRY.md'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return start;
}

function unavailableLive(id: string, title: string, source: string, unit: string, basis: string, updateBoundary: string): PublishedRecord {
  return {
    id,
    title,
    value: null,
    unit,
    modeledCostBasis: basis,
    sampleCount: null,
    source,
    observedAt: null,
    updateBoundary,
    stale: false,
  };
}

function loadStudyRecords(root = findRepoRoot()): PublishedRecord[] {
  return STUDIES.map((study) => {
    const absolute = path.join(root, 'docs', 'research', 'experiments', study.file);
    try {
      const parsed = JSON.parse(fs.readFileSync(absolute, 'utf8')) as unknown;
      return snapshotFromStudyFile(study.id, study.title, study.file, parsed);
    } catch {
      return snapshotFromStudyFile(study.id, study.title, study.file, null);
    }
  });
}

async function loadLiveRecords(now: number): Promise<PublishedRecord[]> {
  const slice = await getResolvedSlice({ scope: 'pro' });
  const { summary } = computeEquityCurve(slice.resolved);
  const latest = slice.scopedRecords.reduce((max, row) => Math.max(max, row.timestamp), 0);
  const observedAt = latest > 0 ? new Date(latest).toISOString() : null;
  const stale = isLiveRecordStale(latest > 0 ? latest : null, now, MAX_EVIDENCE_AGE_DAYS);
  const basis = summary.avgCostR == null
    ? 'Modeled fee and slippage per sized trade'
    : `Modeled fee and slippage, average ${summary.avgCostR} R per sized trade`;

  return [
    {
      id: 'cost-adjusted-record',
      title: 'Cost-adjusted signal record',
      value: summary.netExpectancyR,
      unit: 'R',
      modeledCostBasis: basis,
      sampleCount: summary.sizedTrades,
      source: '/api/signals/equity?summaryOnly=1&scope=pro',
      observedAt,
      updateBoundary: 'Next counted 24-hour outcome on the cost-adjusted record',
      stale,
    },
    {
      id: 'prospective-ledger',
      title: 'Prospective observation ledger',
      value: slice.scopedRecords.length,
      unit: 'observations',
      modeledCostBasis: 'No modeled cost is applied to this count',
      sampleCount: slice.resolved.length,
      source: '/api/signals/history?scope=pro',
      observedAt,
      updateBoundary: 'Next stored observation or counted 24-hour resolution',
      stale,
    },
  ];
}

export async function loadPublishedRecords(now = Date.now()): Promise<PublishedRecord[]> {
  const studies = loadStudyRecords();
  try {
    const live = await loadLiveRecords(now);
    return [...live, ...studies];
  } catch {
    return [
      unavailableLive(
        'cost-adjusted-record',
        'Cost-adjusted signal record',
        '/api/signals/equity?summaryOnly=1&scope=pro',
        'R',
        'Modeled fee and slippage per sized trade',
        'Next counted 24-hour outcome on the cost-adjusted record',
      ),
      unavailableLive(
        'prospective-ledger',
        'Prospective observation ledger',
        '/api/signals/history?scope=pro',
        'observations',
        'No modeled cost is applied to this count',
        'Next stored observation or counted 24-hour resolution',
      ),
      ...studies,
    ];
  }
}
