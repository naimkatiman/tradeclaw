import { Navbar } from "./components/navbar";
import { ABHero } from "../components/landing/ab-hero";
import { HowItWorks } from "../components/landing/how-it-works";
import { FAQAccordion } from "../components/landing/faq-accordion";
import { SiteFooter } from "../components/landing/site-footer";
import { LiveDemoEmbed } from "../components/landing/live-demo-embed";
import { LiveHeroSignals } from "../components/landing/live-hero-signals";
import { AccuracyStatsBar } from "./components/accuracy-stats-bar";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <ABHero />
        <LiveHeroSignals />
        <div className="max-w-5xl mx-auto px-4 py-4">
          <AccuracyStatsBar inline />
        </div>
        <LiveDemoEmbed />
        <HowItWorks />
        <FAQAccordion />
      </main>
      <SiteFooter />
    </>
  );
}
