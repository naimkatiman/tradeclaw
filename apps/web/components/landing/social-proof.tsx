"use client";

import { useEffect, useRef, useState } from "react";

interface Stat {
  label: string;
  target: number;
  suffix: string;
  prefix?: string;
  description: string;
}

const STATS: Stat[] = [
  {
    label: "GitHub Stars",
    target: 847,
    suffix: "+",
    description: "Developers starred the repo",
  },
  {
    label: "Signals Generated",
    target: 52000,
    suffix: "+",
    description: "AI signals produced to date",
  },
  {
    label: "Supported Assets",
    target: 12,
    suffix: "",
    description: "Forex, crypto & commodity pairs",
  },
  {
    label: "Active Instances",
    target: 430,
    suffix: "+",
    description: "Self-hosted deployments worldwide",
  },
];

function useCountUp(target: number, duration: number, triggered: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!triggered) return;
    let start = 0;
    const increment = target / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration, triggered]);

  return count;
}

function StatCard({ stat }: { stat: Stat }) {
  const ref = useRef<HTMLDivElement>(null);
  const [triggered, setTriggered] = useState(false);
  const count = useCountUp(stat.target, 1800, triggered);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTriggered(true);
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="glass-card rounded-2xl p-8 text-center flex flex-col items-center gap-2"
    >
<<<<<<< HEAD
      <div className="text-4xl font-bold tabular-nums tracking-tight text-white sm:text-5xl">
=======
      <div className="text-4xl font-bold tabular-nums tracking-tight text-[var(--foreground)] sm:text-5xl">
>>>>>>> origin/main
        {stat.prefix}
        {count >= 1000
          ? (count / 1000).toFixed(count >= 10000 ? 0 : 1) + "k"
          : count.toLocaleString()}
        <span className="text-emerald-400">{stat.suffix}</span>
      </div>
<<<<<<< HEAD
      <div className="text-sm font-semibold text-zinc-300">{stat.label}</div>
      <div className="text-xs text-zinc-600 max-w-[150px]">
=======
      <div className="text-sm font-semibold text-[var(--foreground)]">{stat.label}</div>
      <div className="text-xs text-[var(--text-secondary)] max-w-[150px]">
>>>>>>> origin/main
        {stat.description}
      </div>
    </div>
  );
}

export function SocialProof() {
  return (
<<<<<<< HEAD
    <section className="px-6 py-24 bg-[#050505]">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-14">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3.5 py-1.5 text-xs uppercase tracking-widest text-zinc-500">
            By the numbers
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-white">
=======
    <section className="px-6 py-24 bg-[var(--background)]">
      <div className="mx-auto max-w-5xl">
        <div className="text-center mb-14">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--glass-bg)] px-3.5 py-1.5 text-xs uppercase tracking-widest text-[var(--text-secondary)]">
            By the numbers
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-[var(--foreground)]">
>>>>>>> origin/main
            Trusted by traders{" "}
            <span className="text-emerald-400">worldwide</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {STATS.map((stat) => (
            <StatCard key={stat.label} stat={stat} />
          ))}
        </div>
      </div>
    </section>
  );
}
