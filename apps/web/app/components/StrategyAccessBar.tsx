'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getStoredKey, verifyKey } from '@/lib/license-client';

export default function StrategyAccessBar() {
  const [unlocked, setUnlocked] = useState<string[] | null>(null);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    const key = getStoredKey();
    setHasKey(!!key);
    if (!key) {
      setUnlocked([]);
      return;
    }
    void verifyKey(key).then((res) => {
      if (res.valid) {
        setUnlocked(res.unlockedStrategies ?? []);
      } else {
        setUnlocked([]);
      }
    });
  }, []);

  if (unlocked === null) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded border border-neutral-800 bg-neutral-900 p-3 text-xs">
      <span className="text-neutral-400">Access:</span>
      <span className="rounded bg-neutral-800 px-2 py-0.5 text-neutral-300">
        classic (free)
      </span>
      {unlocked.map((s) => (
        <span
          key={s}
          className="rounded bg-emerald-900/60 px-2 py-0.5 text-emerald-300"
        >
          {s}
        </span>
      ))}
      <Link
        href="/unlock"
        className="ml-auto text-emerald-400 underline"
      >
        {hasKey ? 'Manage key' : 'Unlock premium →'}
      </Link>
    </div>
  );
}
