'use client';

import { useState } from 'react';
import Link from 'next/link';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: null,
    description: 'Try it out',
    cta: 'Start for free',
    ctaHref: '/earningsedge/analyze',
    features: [
      '3 analyses total',
      'Bull/Bear case',
      'Key metrics vs. estimates',
      'Management tone',
      'Trade thesis',
    ],
    notIncluded: ['Unlimited analyses', 'Analysis history', 'PDF/CSV export'],
    highlight: false,
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 29,
    interval: 'month',
    description: 'For active traders',
    cta: 'Start Basic',
    features: [
      'Unlimited analyses',
      'Bull/Bear case',
      'Key metrics vs. estimates',
      'Management tone',
      'Trade thesis',
      'Email support',
    ],
    notIncluded: ['Analysis history', 'PDF/CSV export'],
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 49,
    interval: 'month',
    description: 'For serious traders',
    cta: 'Start Pro',
    features: [
      'Everything in Basic',
      'Analysis history (unlimited)',
      'Export to PDF / CSV',
      'Batch processing (coming soon)',
      'Priority support',
    ],
    notIncluded: [],
    highlight: true,
  },
];

export default function EarningsEdgePricing() {
  const [email, setEmail] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'pro' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCheckout(plan: 'basic' | 'pro') {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setSelectedPlan(plan);
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/earningsedge/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, plan }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Checkout failed. Please try again.');
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
      setSelectedPlan(null);
    }
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Simple pricing</h1>
        <p className="text-gray-400 text-lg">
          Start free. Upgrade when you need unlimited access.
        </p>
      </div>

      {/* Email input */}
      <div className="max-w-sm mx-auto mb-10">
        <label className="block text-sm text-gray-400 mb-2 text-center">
          Enter your email to subscribe
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full bg-white/5 border border-white/10 focus:border-green-400/50 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none"
        />
      </div>

      {error && (
        <div className="max-w-sm mx-auto mb-6 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-3 text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`rounded-2xl border p-6 flex flex-col ${
              plan.highlight
                ? 'border-green-400/40 bg-green-400/5 relative'
                : 'border-white/10 bg-white/5'
            }`}
          >
            {plan.highlight && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-black text-xs font-bold px-3 py-1 rounded-full">
                MOST POPULAR
              </div>
            )}

            <div className="mb-4">
              <div className="font-bold text-lg">{plan.name}</div>
              <div className="text-gray-400 text-sm">{plan.description}</div>
            </div>

            <div className="mb-6">
              {plan.price === 0 ? (
                <span className="text-3xl font-bold">Free</span>
              ) : (
                <div>
                  <span className="text-3xl font-bold">${plan.price}</span>
                  <span className="text-gray-400 text-sm ml-1">/{plan.interval}</span>
                </div>
              )}
            </div>

            <ul className="space-y-2 mb-6 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="text-sm text-gray-300 flex gap-2">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <span>{f}</span>
                </li>
              ))}
              {plan.notIncluded.map((f) => (
                <li key={f} className="text-sm text-gray-600 flex gap-2">
                  <span className="mt-0.5">✗</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            {plan.id === 'free' ? (
              <Link
                href={plan.ctaHref!}
                className="w-full text-center border border-white/20 hover:border-white/40 text-white font-semibold py-3 rounded-xl transition-colors block"
              >
                {plan.cta}
              </Link>
            ) : (
              <button
                onClick={() => handleCheckout(plan.id as 'basic' | 'pro')}
                disabled={loading && selectedPlan === plan.id}
                className={`w-full font-semibold py-3 rounded-xl transition-colors ${
                  plan.highlight
                    ? 'bg-green-500 hover:bg-green-400 text-black disabled:bg-gray-700 disabled:text-gray-500'
                    : 'border border-white/20 hover:border-white/40 text-white disabled:text-gray-600'
                }`}
              >
                {loading && selectedPlan === plan.id ? 'Redirecting...' : plan.cta}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-center mb-8">FAQ</h2>
        <div className="space-y-6">
          {[
            {
              q: 'Where do I get earnings call transcripts?',
              a: "You can find them on Seeking Alpha, the company's investor relations page, financialmodelingprep.com (free), or by searching '[company name] Q[X] [year] earnings transcript'.",
            },
            {
              q: 'How accurate is the AI analysis?',
              a: "EarningsEdge uses Claude, Anthropic's state-of-the-art AI. The analysis is based on what's in the transcript — accuracy depends on transcript quality. Always combine AI insights with your own research.",
            },
            {
              q: 'Can I cancel anytime?',
              a: "Yes. Cancel anytime from your Stripe billing portal. You'll keep access until the end of your billing period.",
            },
            {
              q: 'Is there a refund policy?',
              a: "We offer a 7-day refund if you're not satisfied. Email us at hello@tradeclaw.win.",
            },
          ].map((item) => (
            <div key={item.q} className="border-b border-white/10 pb-6">
              <div className="font-semibold mb-2">{item.q}</div>
              <div className="text-sm text-gray-400">{item.a}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
