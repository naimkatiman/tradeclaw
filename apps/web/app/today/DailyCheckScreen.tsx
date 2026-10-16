'use client';

import { useEffect, useRef, useState } from 'react';
import {
  buildDailyCheck,
  DAILY_FOLLOWS_COOKIE,
  DAILY_PREVIOUS_COOKIE,
  observationFromRecords,
  serializeFollowList,
  setFollow,
  syncShownCheck,
  type CheckStorage,
  type DailyCheckResult,
  type PreviousObservation,
  type PublishedRecord,
} from '../../lib/daily-check';

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

function browserStorage(): CheckStorage {
  return {
    get(name) {
      return window.localStorage.getItem(name);
    },
    set(name, value) {
      window.localStorage.setItem(name, value);
      writeCookie(name, value);
    },
  };
}

export function DailyCheckScreen({
  records,
  previous,
  initialResult,
}: {
  records: PublishedRecord[];
  previous: PreviousObservation | null;
  initialResult: DailyCheckResult;
}) {
  const [result, setResult] = useState(initialResult);
  const [finished, setFinished] = useState(false);
  const comparedAgainst = useRef<PreviousObservation | null>(previous);
  const ignoreStored = useRef(false);

  useEffect(() => {
    const storage = browserStorage();
    const synced = syncShownCheck({
      records,
      serverPrevious: previous,
      follows: initialResult.followedIds,
      storage,
      now: new Date().toISOString(),
      ignoreStored: ignoreStored.current,
      status: records.length === 0 ? 'empty' : 'ready',
    });
    ignoreStored.current = false;
    comparedAgainst.current = synced.previous;
    setResult(synced.result);
    return () => {
      storage.set(DAILY_PREVIOUS_COOKIE, JSON.stringify(observationFromRecords(records, new Date().toISOString())));
      ignoreStored.current = true;
    };
  }, [initialResult.followedIds, previous, records]);

  function toggleFollow(id: string) {
    setResult((current) => {
      const row = current.rows.find((item) => item.id === id);
      const follows = setFollow(current.followedIds, id, row ? !row.followed : true);
      const followValue = serializeFollowList(follows);
      browserStorage().set(DAILY_FOLLOWS_COOKIE, followValue);
      return buildDailyCheck({
        records,
        previous: comparedAgainst.current,
        follows,
        status: records.length === 0 ? 'empty' : 'ready',
      });
    });
  }

  function finishCheck() {
    browserStorage().set(
      DAILY_PREVIOUS_COOKIE,
      JSON.stringify(observationFromRecords(records, new Date().toISOString())),
    );
    setFinished(true);
  }

  function showRecord(id: string) {
    document.getElementById(`daily-record-${id}`)?.scrollIntoView({ block: 'nearest' });
  }

  return (
    <main
      data-testid="daily-check"
      data-verdict={result.verdictClass}
      data-condition={result.condition}
      className="mx-auto w-full max-w-lg px-4 pb-16 pt-20 text-[var(--foreground)]"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
        Today&apos;s check
      </p>
      <p className="mt-3 text-sm text-[var(--text-secondary)]" data-testid="daily-condition">
        {result.conditionLabel}
      </p>
      <h1 className="mt-2 text-[1.65rem] font-semibold leading-tight tracking-[-0.03em]">
        {result.headline}
      </h1>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]" data-testid="daily-next-look">
        {result.nextLook}
      </p>

      <div className="mt-4">
        {result.nextAction.kind === 'retry' ? (
          <a href="/today" className="premium-button-primary" data-testid="daily-next-action">
            {result.nextAction.label}
          </a>
        ) : (
          <button
            type="button"
            className="premium-button-primary"
            data-testid="daily-next-action"
            disabled={result.nextAction.kind === 'wait'}
            onClick={finishCheck}
          >
            {result.nextAction.label}
          </button>
        )}
        {finished && (
          <p className="mt-3 text-sm" data-testid="daily-finished">
            Finished. {result.nextLook}
          </p>
        )}
      </div>

      {result.rows.length > 0 && (
        <nav className="mt-6 flex gap-2 overflow-x-auto" aria-label="Records in this check">
          {result.rows.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => showRecord(row.id)}
              className="shrink-0 rounded-sm border border-[var(--border)] px-3 py-2 text-left text-xs"
            >
              {row.title}
            </button>
          ))}
        </nav>
      )}

      <ul className="mt-4 divide-y divide-[var(--border)] border-y border-[var(--border)]">
        {result.rows.map((row) => (
          <li key={row.id} id={`daily-record-${row.id}`} className="py-4">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold">{row.title}</h2>
              <button
                type="button"
                aria-pressed={row.followed}
                onClick={() => toggleFollow(row.id)}
                className="shrink-0 rounded-sm border border-[var(--border-strong)] px-3 py-2 text-xs font-semibold"
              >
                {row.followed ? 'Following' : 'Follow'}
              </button>
            </div>
            <p className="mt-2 text-sm leading-6">{row.plain}</p>
            <dl className="mt-3 grid grid-cols-1 gap-2 text-xs leading-5 text-[var(--text-secondary)]">
              <div><dt className="inline">Sign: </dt><dd className="inline">{row.sign}</dd></div>
              <div><dt className="inline">Figure: </dt><dd className="inline font-mono text-[var(--foreground)]">{row.figure}</dd></div>
              <div><dt className="inline">Unit: </dt><dd className="inline">{row.unit}</dd></div>
              <div><dt className="inline">Change: </dt><dd className="inline font-mono">{row.deltaFigure}</dd></div>
              <div><dt className="inline">Modeled-cost basis: </dt><dd className="inline">{row.modeledCostBasis}</dd></div>
              <div><dt className="inline">Sample: </dt><dd className="inline">{row.sampleLabel}</dd></div>
              <div><dt className="inline">Source: </dt><dd className="inline">{row.source}</dd></div>
              <div><dt className="inline">Freshness: </dt><dd className="inline">{row.freshness}</dd></div>
            </dl>
          </li>
        ))}
      </ul>
    </main>
  );
}
