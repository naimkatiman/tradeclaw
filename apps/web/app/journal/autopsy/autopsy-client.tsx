'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Activity, Target, LogOut, Shield, Brain,
  Lightbulb, RefreshCw, Award,
} from 'lucide-react';

interface SectionRating {
  rating: number;
  notes: string;
}

interface PsychologySection {
  notes: string;
}

interface TradeAutopsy {
  tradeId: string;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  sections: {
    setup: SectionRating;
    entry: SectionRating;
    exit: SectionRating;
    riskManagement: SectionRating;
    psychology: PsychologySection;
  };
  keyLessons: string[];
  repeatability: 'high' | 'medium' | 'low';
  summary: string;
}

const GRADE_COLORS: Record<string, string> = {
  A: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  B: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  C: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  D: 'bg-orange-500/15 text-orange-400 border-orange-500/25',
  F: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
};

const REPEATABILITY_COLORS: Record<string, string> = {
  high: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  low: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

export default function AutopsyClient() {
  const searchParams = useSearchParams();
  const tradeId = searchParams.get('tradeId');

  const [autopsy, setAutopsy] = useState<TradeAutopsy | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tradeId) { setLoading(false); return; }
    fetch(`/api/journal/autopsy?tradeId=${tradeId}`)
      .then(r => r.json())
      .then(data => { setAutopsy(data.autopsy ?? null); })
      .catch(() => setError('Failed to load autopsy'))
      .finally(() => setLoading(false));
  }, [tradeId]);

  async function handleGenerate() {
    if (!tradeId) return;
    setGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/journal/autopsy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tradeId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? 'Failed to generate autopsy');
        return;
      }
      const data = await res.json();
      setAutopsy(data.autopsy);
    } catch {
      setError('Failed to generate autopsy');
    } finally {
      setGenerating(false);
    }
  }

  if (!tradeId) {
    return (
      <div className="min-h-[100dvh] bg-[#050505] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/40 text-sm mb-4">No trade selected</p>
          <Link href="/journal" className="text-emerald-400 text-sm hover:underline">Back to Journal</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#050505] text-white pb-20">
      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#050505]/90 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/journal" className="flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Trade Autopsy
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-16 text-white/40 text-sm">Loading...</div>
        ) : !autopsy ? (
          <div className="text-center py-20 border border-dashed border-white/[0.06] rounded-xl">
            <Activity className="w-8 h-8 text-white/20 mx-auto mb-3" />
            <p className="text-sm text-white/40 mb-1">No autopsy generated yet</p>
            <p className="text-xs text-white/30 mb-6">Generate an AI analysis of this trade</p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 rounded-lg hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
              {generating ? 'Analyzing...' : 'Generate Autopsy'}
            </button>
            {error && <p className="text-rose-400 text-xs mt-3">{error}</p>}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Grade + Summary header */}
            <div className="flex items-start gap-4 p-5 bg-white/[0.02] border border-white/[0.06] rounded-xl">
              <div className={`flex-shrink-0 w-14 h-14 flex items-center justify-center rounded-xl border text-2xl font-bold ${GRADE_COLORS[autopsy.grade]}`}>
                {autopsy.grade}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/80 leading-relaxed">{autopsy.summary}</p>
                <div className="flex items-center gap-3 mt-3">
                  <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border ${REPEATABILITY_COLORS[autopsy.repeatability]}`}>
                    <Award className="w-3 h-3" />
                    {autopsy.repeatability} repeatability
                  </span>
                </div>
              </div>
            </div>

            {/* Section cards */}
            <div className="grid gap-3">
              <SectionCard
                icon={<Target className="w-4 h-4" />}
                title="Setup"
                rating={autopsy.sections.setup.rating}
                notes={autopsy.sections.setup.notes}
              />
              <SectionCard
                icon={<Activity className="w-4 h-4" />}
                title="Entry"
                rating={autopsy.sections.entry.rating}
                notes={autopsy.sections.entry.notes}
              />
              <SectionCard
                icon={<LogOut className="w-4 h-4" />}
                title="Exit"
                rating={autopsy.sections.exit.rating}
                notes={autopsy.sections.exit.notes}
              />
              <SectionCard
                icon={<Shield className="w-4 h-4" />}
                title="Risk Management"
                rating={autopsy.sections.riskManagement.rating}
                notes={autopsy.sections.riskManagement.notes}
              />
              <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60">Psychology</h3>
                </div>
                <p className="text-sm text-white/70 leading-relaxed">{autopsy.sections.psychology.notes}</p>
              </div>
            </div>

            {/* Key Lessons */}
            <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60">Key Lessons</h3>
              </div>
              <ul className="space-y-2">
                {autopsy.keyLessons.map((lesson, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                    <span className="text-emerald-400 font-mono text-xs mt-0.5">{i + 1}.</span>
                    {lesson}
                  </li>
                ))}
              </ul>
            </div>

            {/* Regenerate */}
            <div className="flex justify-center pt-2">
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="inline-flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
                Regenerate Analysis
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionCard({ icon, title, rating, notes }: { icon: React.ReactNode; title: string; rating: number; notes: string }) {
  const ratingColor = rating >= 4 ? 'bg-emerald-400' : rating >= 3 ? 'bg-amber-400' : 'bg-rose-400';

  return (
    <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400">{icon}</span>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/60">{title}</h3>
        </div>
        <span className="text-xs font-mono text-white/40">{rating}/5</span>
      </div>
      {/* Rating bar */}
      <div className="flex gap-1 mb-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i < rating ? ratingColor : 'bg-white/[0.06]'}`}
          />
        ))}
      </div>
      <p className="text-sm text-white/70 leading-relaxed">{notes}</p>
    </div>
  );
}
