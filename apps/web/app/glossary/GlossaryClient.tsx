"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Search, ExternalLink, BookOpen, Star, Share2 } from "lucide-react";
import {
  glossaryTerms,
  CATEGORIES,
  type GlossaryTerm,
} from "@/app/lib/glossary-data";
import { PageNavBar } from "../../components/PageNavBar";

type CategoryKey = GlossaryTerm["category"] | "all";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function CategoryBadge({ category }: { category: GlossaryTerm["category"] }) {
  const cat = CATEGORIES[category];
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${cat.color}`}
    >
      {cat.label}
    </span>
  );
}

function TermCard({ term }: { term: GlossaryTerm }) {
  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/glossary#${term.id}`
    : `/glossary#${term.id}`;

  const shareText = `Learn about ${term.fullName} and 49 other trading terms on TradeClaw`;

  return (
    <article
      id={term.id}
      className="group rounded-xl border border-zinc-800 bg-zinc-900/80 p-5 transition-all hover:border-zinc-700 hover:bg-zinc-900"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <h3 className="text-lg font-bold text-white">{term.term}</h3>
          <p className="text-sm text-zinc-400">{term.fullName}</p>
        </div>
        <CategoryBadge category={term.category} />
      </div>

      <p className="text-sm text-zinc-300 leading-relaxed mb-3">
        {term.definition}
      </p>

      {/* TradeClaw relevance */}
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 mb-3">
        <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
          TradeClaw Relevance
        </p>
        <p className="text-sm text-zinc-300 leading-relaxed">
          {term.tcRelevance}
        </p>
      </div>

      {/* Related terms + actions */}
      <div className="flex flex-wrap items-center gap-2">
        {term.relatedTerms.map((rt) => (
          <Link
            key={rt}
            href={`#${rt}`}
            className="inline-block rounded-md bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400 hover:text-emerald-400 hover:bg-zinc-700 transition-colors"
          >
            {rt}
          </Link>
        ))}

        <span className="flex-1" />

        {term.relatedPage && (
          <Link
            href={term.relatedPage}
            className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Explore
          </Link>
        )}

        <a
          href={`https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
          aria-label={`Share ${term.term} on X`}
        >
          <Share2 className="w-3 h-3" />
        </a>
      </div>
    </article>
  );
}

export default function GlossaryClient() {
  const [search, setSearch] = useState("");
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("all");

  const filtered = useMemo(() => {
    let results = glossaryTerms;

    if (search.trim()) {
      const q = search.toLowerCase();
      results = results.filter(
        (t) =>
          t.term.toLowerCase().includes(q) ||
          t.fullName.toLowerCase().includes(q) ||
          t.definition.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.includes(q))
      );
    }

    if (activeLetter) {
      results = results.filter((t) => t.letter === activeLetter);
    }

    if (activeCategory !== "all") {
      results = results.filter((t) => t.category === activeCategory);
    }

    return results;
  }, [search, activeLetter, activeCategory]);

  const grouped = useMemo(() => {
    const map = new Map<string, GlossaryTerm[]>();
    for (const t of filtered) {
      const arr = map.get(t.letter) || [];
      arr.push(t);
      map.set(t.letter, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const availableLetters = useMemo(
    () => new Set(glossaryTerms.map((t) => t.letter)),
    []
  );

  const handleLetterClick = useCallback(
    (letter: string) => {
      setActiveLetter((prev) => (prev === letter ? null : letter));
    },
    []
  );

  const clearFilters = useCallback(() => {
    setSearch("");
    setActiveLetter(null);
    setActiveCategory("all");
  }, []);

  const hasFilters = search || activeLetter || activeCategory !== "all";

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <PageNavBar />
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-zinc-800">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent" />
        <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm text-emerald-400 mb-6">
            <BookOpen className="w-4 h-4" />
            <span className="font-medium">50 Terms</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Trading{" "}
            <span className="text-emerald-400">Glossary</span>
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Every concept you need to master trading signals, risk management,
            and strategy development &mdash; explained with how TradeClaw puts
            each one to work.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search terms, definitions, or tags..."
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 pl-10 pr-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-colors"
          />
        </div>

        {/* Alphabet nav */}
        <div className="flex flex-wrap gap-1 mb-6" role="navigation" aria-label="Alphabet filter">
          {ALPHABET.map((letter) => {
            const isAvailable = availableLetters.has(letter);
            const isActive = activeLetter === letter;
            return (
              <button
                key={letter}
                onClick={() => isAvailable && handleLetterClick(letter)}
                disabled={!isAvailable}
                className={`w-8 h-8 rounded-md text-xs font-bold transition-all ${
                  isActive
                    ? "bg-emerald-500 text-white"
                    : isAvailable
                    ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
                    : "bg-zinc-900 text-zinc-700 cursor-not-allowed"
                }`}
                aria-label={`Filter by letter ${letter}`}
              >
                {letter}
              </button>
            );
          })}
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-2 mb-8" role="tablist" aria-label="Category filter">
          <button
            role="tab"
            aria-selected={activeCategory === "all"}
            onClick={() => setActiveCategory("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeCategory === "all"
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
            }`}
          >
            All ({glossaryTerms.length})
          </button>
          {(Object.entries(CATEGORIES) as [GlossaryTerm["category"], { label: string; color: string }][]).map(
            ([key, val]) => {
              const count = glossaryTerms.filter((t) => t.category === key).length;
              return (
                <button
                  key={key}
                  role="tab"
                  aria-selected={activeCategory === key}
                  onClick={() =>
                    setActiveCategory((prev) => (prev === key ? "all" : key))
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeCategory === key
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
                  }`}
                >
                  {val.label} ({count})
                </button>
              );
            }
          )}
        </div>

        {/* Active filter indicator */}
        {hasFilters && (
          <div className="flex items-center gap-2 mb-6">
            <span className="text-sm text-zinc-500">
              Showing {filtered.length} of {glossaryTerms.length} terms
            </span>
            <button
              onClick={clearFilters}
              className="text-xs text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* Term grid grouped by letter */}
        {grouped.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-zinc-500 text-lg mb-2">No terms found</p>
            <p className="text-zinc-600 text-sm">
              Try a different search or{" "}
              <button
                onClick={clearFilters}
                className="text-emerald-400 hover:underline"
              >
                clear filters
              </button>
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {grouped.map(([letter, terms]) => (
              <section key={letter}>
                <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur-sm pb-3 pt-2">
                  <h2 className="text-2xl font-bold text-emerald-400">
                    {letter}
                  </h2>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {terms.map((term) => (
                    <TermCard key={term.id} term={term} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* GitHub CTA */}
        <section className="mt-16 mb-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
          <Star className="w-8 h-8 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">
            Built in the Open
          </h2>
          <p className="text-zinc-400 text-sm mb-6 max-w-md mx-auto">
            TradeClaw is 100% open source. Star us on GitHub to support free
            trading tools for everyone.
          </p>
          <a
            href="https://github.com/naimkatiman/TradeClaw"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors"
          >
            <Star className="w-4 h-4" />
            Star on GitHub
          </a>
        </section>
      </div>
    </div>
  );
}
