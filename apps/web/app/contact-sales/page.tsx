'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '../components/navbar';
import { Footer } from '../components/footer';

interface FormState {
  name: string;
  email: string;
  telegram: string;
  company: string;
  useCase: string;
  budget: string;
}

const EMPTY: FormState = {
  name: '',
  email: '',
  telegram: '',
  company: '',
  useCase: '',
  budget: '',
};

export default function ContactSalesPage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>(
    'idle',
  );
  const [error, setError] = useState<string | null>(null);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    setError(null);
    try {
      const res = await fetch('/api/contact-sales', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? 'Submission failed');
      }
      setStatus('success');
      setForm(EMPTY);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
      setStatus('error');
    }
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[var(--background)] pt-28 pb-24 px-4">
        <div className="mx-auto max-w-2xl">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
              Custom Tier
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-[var(--foreground)]">
              Let&apos;s build your edge.
            </h1>
            <p className="mt-4 text-[var(--text-secondary)]">
              Custom strategies, private brokers, white-label dashboards, and
              dedicated infra for funds, prop desks, and signal providers.
            </p>
          </div>

          {status === 'success' ? (
            <div className="mt-10 rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-8 text-center">
              <p className="text-lg font-semibold text-emerald-400">
                Thanks — we got it.
              </p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Our team will reach out within 1 business day.
              </p>
              <Link
                href="/pricing"
                className="mt-6 inline-block rounded-lg border border-[var(--border)] px-4 py-2 text-sm hover:border-[var(--glass-border-accent)]"
              >
                Back to pricing
              </Link>
            </div>
          ) : (
            <form
              onSubmit={onSubmit}
              className="mt-10 flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--glass-bg)] p-6"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name *">
                  <input
                    required
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Email *">
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(e) => update('email', e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Company / Fund">
                  <input
                    value={form.company}
                    onChange={(e) => update('company', e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Telegram @handle">
                  <input
                    value={form.telegram}
                    onChange={(e) => update('telegram', e.target.value)}
                    className={inputCls}
                    placeholder="@yourhandle"
                  />
                </Field>
              </div>

              <Field label="What do you need? *">
                <textarea
                  required
                  minLength={10}
                  rows={5}
                  value={form.useCase}
                  onChange={(e) => update('useCase', e.target.value)}
                  className={`${inputCls} resize-y`}
                  placeholder="Strategies, broker integrations, signal volume, deployment preferences…"
                />
              </Field>

              <Field label="Budget range (optional)">
                <select
                  value={form.budget}
                  onChange={(e) => update('budget', e.target.value)}
                  className={inputCls}
                >
                  <option value="">Prefer not to say</option>
                  <option value="<$500/mo">&lt; $500 / mo</option>
                  <option value="$500–$2k/mo">$500 – $2k / mo</option>
                  <option value="$2k–$10k/mo">$2k – $10k / mo</option>
                  <option value="$10k+/mo">$10k+ / mo</option>
                  <option value="one-time">One-time project</option>
                </select>
              </Field>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={status === 'submitting'}
                className="mt-2 rounded-lg bg-emerald-500 py-2.5 text-sm font-semibold text-black transition-all hover:bg-emerald-400 disabled:opacity-60"
              >
                {status === 'submitting' ? 'Sending…' : 'Request a quote'}
              </button>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

const inputCls =
  'w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-emerald-500/60';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
        {label}
      </span>
      {children}
    </label>
  );
}
