import { Navbar } from "./components/navbar";
import { HowItWorks } from "../components/landing/how-it-works";
import { FAQAccordion } from "../components/landing/faq-accordion";
import { LiveDemoEmbed } from "../components/landing/live-demo-embed";
import { LiveHeroSignals } from "../components/landing/live-hero-signals";
import { LiveActivityStrip } from "../components/landing/live-activity-strip";
import { ProofHero } from "../components/landing/proof-hero";
import { EmailCTA } from "../components/landing/email-cta";

export const revalidate = 60;

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="pt-28">
        {/* Honesty proof first — the real, cost-adjusted result. The Cost
            Field scene IS the hero imagery; no decorative background layer. */}
        <div className="relative isolate overflow-hidden">
          <ProofHero />
        </div>

        {/* Transparency exhibit — the live engine output, explicitly NOT a
            profit claim. Sections below the fold carry the scroll-reveal
            system (pure CSS; static-visible without scroll-timeline support). */}
        <section className="reveal mx-auto mt-12 max-w-6xl px-4">
          <div className="mb-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 text-[12px] leading-relaxed text-amber-700 dark:text-amber-200/90">
            <strong className="font-semibold">Live engine output, recorded for transparency.</strong>{" "}
            This is what the engine emits in real time — it is not advice and not a
            profit claim. After real execution costs the engine has no net edge
            (see the cost-adjusted result above).
          </div>
          <LiveHeroSignals />
        </section>

        <div className="reveal">
          <LiveActivityStrip />
        </div>
        <div className="reveal">
          <LiveDemoEmbed />
        </div>
        <div className="reveal">
          <HowItWorks />
        </div>
        <div className="reveal">
          <EmailCTA />
        </div>
        <div className="reveal">
          <FAQAccordion />
        </div>
      </main>
    </>
  );
}
