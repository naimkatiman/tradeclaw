import { Navbar } from "./components/navbar";
import { Hero } from "../components/landing/ab-hero";
import { HowItWorks } from "../components/landing/how-it-works";
import { FAQAccordion } from "../components/landing/faq-accordion";
import { LiveDemoEmbed } from "../components/landing/live-demo-embed";
import { LiveHeroSignals } from "../components/landing/live-hero-signals";
import { LiveActivityStrip } from "../components/landing/live-activity-strip";
import { ProofHero } from "../components/landing/proof-hero";
import { TelegramHero } from "../components/landing/telegram-hero";
import { EmailCTA } from "../components/landing/email-cta";
import { BackgroundDecor } from "../components/background/BackgroundDecor";

export const revalidate = 60;

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <div className="relative isolate overflow-hidden">
          <BackgroundDecor variant="hero" />
          <Hero />
        </div>

        {/* Honesty proof first — the real, cost-adjusted result. */}
        <ProofHero />

        {/* Transparency exhibit — the live engine output, explicitly NOT a
            profit claim. Demoted from its old hero position. */}
        <section className="mx-auto mt-12 max-w-6xl px-4">
          <div className="mb-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-4 py-3 text-[12px] leading-relaxed text-amber-200/90">
            <strong className="font-semibold">Live engine output, recorded for transparency.</strong>{" "}
            This is what the engine emits in real time — it is not advice and not a
            profit claim. After real execution costs the engine has no net edge
            (see the cost-adjusted result above).
          </div>
          <LiveHeroSignals />
        </section>

        <TelegramHero />
        <LiveActivityStrip />
        <LiveDemoEmbed />
        <HowItWorks />
        <EmailCTA />
        <FAQAccordion />
      </main>
    </>
  );
}
