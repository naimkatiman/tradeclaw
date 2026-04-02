'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Star,
  Users,
  Database,
  Repeat,
  Smartphone,
  Sparkles,
  X,
  Check,
  ExternalLink,
  Share2,
  ChevronRight,
} from 'lucide-react';

/* ── Types ── */
interface MilestoneStats {
  stars: number;
  feature: string;
  description: string;
  pledgeCount: number;
}

interface PledgerEntry {
  id: string;
  name: string;
  email: string;
  milestoneStars: number;
  createdAt: string;
}

interface PledgeAPIResponse {
  pledges: PledgerEntry[];
  stats: MilestoneStats[];
  totalPledges: number;
}

/* ── Constants ── */
const MILESTONE_ICONS: Record<number, typeof Star> = {
  100: Database,
  250: Repeat,
  500: Smartphone,
  1000: Sparkles,
};

const MILESTONE_COLORS: Record<number, { bg: string; border: string; text: string; bar: string }> = {
  100: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', bar: 'bg-emerald-500' },
  250: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', bar: 'bg-purple-500' },
  500: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', bar: 'bg-amber-500' },
  1000: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400', bar: 'bg-rose-500' },
};

export default function PledgeClient() {
  const [currentStars, setCurrentStars] = useState(0);
  const [stats, setStats] = useState<MilestoneStats[]>([]);
  const [pledgers, setPledgers] = useState<PledgerEntry[]>([]);
  const [totalPledges, setTotalPledges] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<number>(100);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [starsRes, pledgesRes] = await Promise.all([
        fetch('/api/github-stars'),
        fetch('/api/pledges'),
      ]);
      if (starsRes.ok) {
        const starsData = await starsRes.json();
        setCurrentStars(starsData.stars ?? 0);
      }
      if (pledgesRes.ok) {
        const pledgesData: PledgeAPIResponse = await pledgesRes.json();
        setStats(pledgesData.stats);
        setPledgers(pledgesData.pledges);
        setTotalPledges(pledgesData.totalPledges);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openModal = (milestone: number) => {
    setSelectedMilestone(milestone);
    setFormName('');
    setFormEmail('');
    setFormError('');
    setSubmitted(false);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    setFormError('');
    if (!formName.trim()) { setFormError('Please enter your name.'); return; }
    if (!formEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEmail)) { setFormError('Please enter a valid email.'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/pledges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName.trim(), email: formEmail.trim(), milestoneStars: selectedMilestone }),
      });
      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error || 'Something went wrong');
        return;
      }
      setSubmitted(true);
      // Refresh data
      fetchData();
    } catch {
      setFormError('Network error — please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const tweetText = `I just pledged my support for @TradeClaw to hit their star milestones! 🌟\n\nFeatures like PostgreSQL, mobile app, and AI copilot unlock as stars grow.\n\nPledge yours → https://tradeclaw.win/pledge\n\n#TradeClaw #OpenSource #Trading`;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      {/* Hero */}
      <section className="relative pt-28 pb-16 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-6">
            <Star className="w-3.5 h-3.5" />
            Stars-for-Features Pledge
          </div>

          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Pledge Your Support,{' '}
            <span className="text-emerald-400">Unlock Features</span>
          </h1>
          <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto mb-8">
            Every GitHub star brings TradeClaw closer to the next milestone. Pledge your support for the features you want most — and help us get there faster.
          </p>

          {/* Star counter */}
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
            <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
            <span className="text-3xl font-bold tabular-nums">{currentStars.toLocaleString()}</span>
            <span className="text-[var(--text-secondary)] text-sm">/ 1,000 stars</span>
          </div>

          {/* Overall progress */}
          <div className="max-w-md mx-auto mt-4">
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-1000"
                style={{ width: `${Math.min(100, (currentStars / 1000) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1.5">{Math.round((currentStars / 1000) * 100)}% to 1,000 stars</p>
          </div>
        </div>
      </section>

      {/* Milestone cards */}
      <section className="max-w-5xl mx-auto px-4 mb-16">
        <h2 className="text-2xl font-bold text-center mb-8">Feature Milestones</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {stats.map((milestone) => {
            const Icon = MILESTONE_ICONS[milestone.stars] || Star;
            const colors = MILESTONE_COLORS[milestone.stars] || MILESTONE_COLORS[100];
            const progress = Math.min(100, (currentStars / milestone.stars) * 100);
            const unlocked = currentStars >= milestone.stars;

            return (
              <div
                key={milestone.stars}
                className={`relative rounded-2xl border p-6 transition-all duration-300 ${
                  unlocked
                    ? `${colors.bg} ${colors.border} ring-1 ring-emerald-500/20`
                    : 'bg-[var(--bg-card)] border-[var(--border)] hover:border-white/10'
                }`}
              >
                {/* Stars badge */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${colors.text}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${colors.text}`}>{milestone.stars} ⭐</span>
                        {unlocked && (
                          <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">Unlocked</span>
                        )}
                      </div>
                      <h3 className="text-lg font-bold mt-0.5">{milestone.feature}</h3>
                    </div>
                  </div>

                  {/* Pledge count badge */}
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 text-xs text-[var(--text-secondary)]">
                    <Users className="w-3 h-3" />
                    {milestone.pledgeCount}
                  </div>
                </div>

                <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
                  {milestone.description}
                </p>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-1">
                    <span>{currentStars} / {milestone.stars} stars</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${colors.bar} transition-all duration-1000`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Pledge button */}
                <button
                  onClick={() => openModal(milestone.stars)}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    colors.bg
                  } ${colors.border} border ${colors.text} hover:brightness-125 active:scale-[0.98]`}
                >
                  <Star className="w-4 h-4" />
                  Pledge your support
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Pledger wall */}
      <section className="max-w-4xl mx-auto px-4 mb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Recent Pledgers</h2>
          <span className="text-sm text-[var(--text-secondary)]">{totalPledges} total pledges</span>
        </div>

        {pledgers.length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)]">
            <Users className="w-8 h-8 text-[var(--text-secondary)] mx-auto mb-3" />
            <p className="text-[var(--text-secondary)]">Be the first to pledge!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pledgers.map((p) => {
              const colors = MILESTONE_COLORS[p.milestoneStars] || MILESTONE_COLORS[100];
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]"
                >
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-full ${colors.bg} flex items-center justify-center text-sm font-bold ${colors.text} shrink-0`}>
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold truncate">{p.name}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                        {p.milestoneStars}⭐
                      </span>
                    </div>
                    <span className="text-xs text-[var(--text-secondary)] block truncate">{p.email}</span>
                  </div>
                  <span className="text-[10px] text-[var(--text-secondary)] shrink-0">
                    {new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Share + CTA */}
      <section className="max-w-2xl mx-auto px-4 mb-16 text-center">
        <h2 className="text-2xl font-bold mb-4">Help Us Reach 1,000 Stars</h2>
        <p className="text-[var(--text-secondary)] mb-6 text-sm">
          Share the pledge page and star the repo — every star brings these features closer to reality.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1DA1F2]/10 border border-[#1DA1F2]/20 text-[#1DA1F2] text-sm font-semibold hover:bg-[#1DA1F2]/20 transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Share on X
          </a>
          <a
            href="https://github.com/naimkatiman/tradeclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/90 text-black text-sm font-semibold hover:bg-white transition-colors"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            Star on GitHub
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </section>

      {/* Pledge modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !submitting && setModalOpen(false)}
          />
          {/* Modal */}
          <div className="relative w-full max-w-md rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] p-6 shadow-2xl">
            {/* Close */}
            <button
              onClick={() => !submitting && setModalOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[var(--text-secondary)] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {submitted ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                  <Check className="w-7 h-7 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">Pledge Received!</h3>
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                  Thanks for pledging your support for the {selectedMilestone}-star milestone. Now help us get there — star the repo!
                </p>
                <div className="flex gap-3 justify-center">
                  <a
                    href="https://github.com/naimkatiman/tradeclaw"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/90 text-black text-sm font-semibold hover:bg-white transition-colors"
                  >
                    <Star className="w-4 h-4" />
                    Star on GitHub
                  </a>
                  <button
                    onClick={() => setModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl bg-white/5 text-sm font-semibold hover:bg-white/10 transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-6">
                  {(() => {
                    const colors = MILESTONE_COLORS[selectedMilestone] || MILESTONE_COLORS[100];
                    const Icon = MILESTONE_ICONS[selectedMilestone] || Star;
                    return (
                      <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${colors.text}`} />
                      </div>
                    );
                  })()}
                  <div>
                    <h3 className="text-lg font-bold">Pledge for {selectedMilestone} ⭐</h3>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {stats.find(s => s.stars === selectedMilestone)?.feature}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Your Name</label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Alex Chen"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-[var(--border)] text-sm placeholder:text-white/20 focus:outline-none focus:border-emerald-500/40 transition-colors"
                      disabled={submitting}
                      maxLength={100}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Email</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="alex@example.com"
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-[var(--border)] text-sm placeholder:text-white/20 focus:outline-none focus:border-emerald-500/40 transition-colors"
                      disabled={submitting}
                    />
                    <p className="text-[10px] text-[var(--text-secondary)] mt-1">Your email is masked in the pledge wall (a***@gmail.com).</p>
                  </div>

                  {formError && (
                    <p className="text-xs text-rose-400 bg-rose-500/10 px-3 py-2 rounded-lg">{formError}</p>
                  )}

                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 active:scale-[0.98]"
                  >
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Star className="w-4 h-4" />
                        Submit Pledge
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
