import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { Navbar } from '../components/navbar';
import { DailyCheckScreen } from './DailyCheckScreen';
import { loadPublishedRecords } from '../../lib/daily-check-evidence';
import {
  buildDailyCheck,
  DAILY_FOLLOWS_COOKIE,
  DAILY_PREVIOUS_COOKIE,
  parseFollowList,
  parsePreviousObservation,
} from '../../lib/daily-check';

export const metadata: Metadata = {
  title: "Today's check — TradeClaw",
  description: 'What changed in the published cost-adjusted record since the last look on this device.',
};

export default async function TodayPage() {
  const jar = await cookies();
  const follows = parseFollowList(jar.get(DAILY_FOLLOWS_COOKIE)?.value);
  const previous = parsePreviousObservation(jar.get(DAILY_PREVIOUS_COOKIE)?.value);
  let records = [] as Awaited<ReturnType<typeof loadPublishedRecords>>;
  let status: 'ready' | 'empty' | 'error' = 'ready';
  try {
    records = await loadPublishedRecords();
    status = records.length === 0 ? 'empty' : 'ready';
  } catch {
    status = 'error';
    records = [];
  }
  const result = buildDailyCheck({ records, previous, follows, status });

  return (
    <>
      <Navbar variant="minimal" />
      <DailyCheckScreen records={records} previous={previous} initialResult={result} />
    </>
  );
}
