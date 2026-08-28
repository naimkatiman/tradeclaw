'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import type { Locale, Translations } from '../../lib/translations';
import { LocaleSwitcher } from './locale-switcher';

const STEP_CODES = [
  '/track-record → /methodology',
  '/screener → /backtest',
  'docker compose up -d',
];

export function LocalizedLanding({ t, locale }: { t: Translations; locale: Locale }) {
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const handleFaqToggle = useCallback((index: number) => {
    setFaqOpen((current) => current === index ? null : index);
  }, []);

  return (
    <>
      <section className="relative flex min-h-[90dvh] items-center overflow-hidden px-5 pb-20 pt-28 sm:px-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div className="relative mx-auto grid w-full max-w-6xl items-end gap-12 lg:grid-cols-[1fr_22rem]">
          <div>
            <LocaleSwitcher current={locale} />
            <p className="mt-10 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-400">
              {t.hero.badge}
            </p>
            <h1 className="mt-5 max-w-4xl text-5xl font-bold leading-[0.96] tracking-[-0.045em] text-white sm:text-7xl lg:text-8xl">
              {t.hero.headline}{' '}
              <span className="text-emerald-400">{t.hero.headlineAccent}</span>{' '}
              {t.hero.headlineSuffix}
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">
              {t.hero.subheadline}
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/track-record"
                className="inline-flex min-h-12 items-center justify-center rounded-sm bg-white px-6 text-sm font-semibold text-black transition-colors hover:bg-emerald-100"
              >
                {t.hero.ctaPrimary} →
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex min-h-12 items-center justify-center rounded-sm border border-white/20 px-6 text-sm font-semibold text-white transition-colors hover:border-white/50"
              >
                {t.hero.ctaSecondary}
              </Link>
            </div>
          </div>

          <aside className="border-l-2 border-red-400 pl-5 text-start">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-red-400">
              {t.hero.signalFeed}
            </p>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              {t.socialProof.stats[0]?.description}
            </p>
          </aside>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-white/10 bg-[#090a0c] px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
            {t.howItWorks.badge}
          </p>
          <div className="mt-4 grid gap-5 lg:grid-cols-[1fr_1fr] lg:items-end">
            <h2 className="text-4xl font-bold tracking-[-0.04em] text-white sm:text-5xl">
              {t.howItWorks.title}<span className="text-emerald-400">{t.howItWorks.titleAccent}</span>
            </h2>
            <p className="max-w-xl text-sm leading-6 text-zinc-400 lg:justify-self-end">
              {t.howItWorks.subtitle}
            </p>
          </div>

          <ol className="mt-14 grid border border-white/10 md:grid-cols-3">
            {t.howItWorks.steps.map((step, index) => (
              <li key={step.title} className="flex min-h-72 flex-col border-b border-white/10 p-6 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
                <span className="font-mono text-xs text-emerald-400">0{index + 1}</span>
                <h3 className="mt-9 text-xl font-semibold text-white">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-500">{step.description}</p>
                <code dir="ltr" className="mt-auto block rounded-sm border border-white/10 bg-black/30 px-3 py-2 text-start text-[11px] text-zinc-400">
                  {STEP_CODES[index]}
                </code>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-[#050505] px-5 py-24 sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">{t.faq.badge}</p>
            <h2 className="mt-4 text-4xl font-bold tracking-[-0.04em] text-white">
              {t.faq.title}<span className="text-emerald-400">{t.faq.titleAccent}</span>
            </h2>
          </div>
          <div className="divide-y divide-white/10 border-y border-white/10">
            {t.faq.items.map((faq, index) => {
              const isOpen = faqOpen === index;
              return (
                <div key={faq.question}>
                  <button
                    type="button"
                    className="flex min-h-16 w-full items-center justify-between gap-4 py-4 text-start text-sm font-semibold text-white"
                    onClick={() => handleFaqToggle(index)}
                    aria-expanded={isOpen}
                  >
                    {faq.question}
                    <span aria-hidden="true" className="font-mono text-emerald-400">{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen ? <p className="pb-5 text-sm leading-6 text-zinc-500">{faq.answer}</p> : null}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="deploy" className="border-t border-white/10 bg-[#090a0c] px-5 py-24 sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400">{t.deploy.badge}</p>
            <h2 className="mt-4 text-4xl font-bold tracking-[-0.04em] text-white sm:text-5xl">
              {t.deploy.title} <span className="text-emerald-400">{t.deploy.titleAccent}</span>
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-6 text-zinc-400">{t.deploy.subtitle}</p>
            <p className="mt-4 text-xs leading-5 text-zinc-600">{t.deploy.requirement}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/start" className="rounded-sm bg-white px-4 py-3 text-sm font-semibold text-black">Docker Compose</Link>
              <a href="https://github.com/naimkatiman/tradeclaw" target="_blank" rel="noopener noreferrer" className="rounded-sm border border-white/20 px-4 py-3 text-sm font-semibold text-white">GitHub ↗</a>
            </div>
          </div>
          <div dir="ltr" className="overflow-hidden rounded-sm border border-white/10 bg-black/40 text-start font-mono text-xs">
            <div className="border-b border-white/10 px-4 py-3 text-zinc-600">docker-compose.yml</div>
            <div className="space-y-2 p-5 text-zinc-400">
              <p><span className="text-emerald-400">$</span> git clone https://github.com/naimkatiman/tradeclaw.git</p>
              <p><span className="text-emerald-400">$</span> cd tradeclaw</p>
              <p><span className="text-emerald-400">$</span> cp .env.example .env</p>
              <p><span className="text-emerald-400">$</span> docker compose up -d</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
