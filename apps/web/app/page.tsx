import { Navbar } from "./components/navbar";
import { ABHero } from "../components/landing/ab-hero";
import { HowItWorks } from "../components/landing/how-it-works";
import { FAQAccordion } from "../components/landing/faq-accordion";
import { SiteFooter } from "../components/landing/site-footer";
import { LiveDemoEmbed } from "../components/landing/live-demo-embed";
import { LiveHeroSignals } from "../components/landing/live-hero-signals";
import { LiveActivityStrip } from "../components/landing/live-activity-strip";
import { ProofHero } from "../components/landing/proof-hero";
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
          <ABHero />
        </div>
        <LiveHeroSignals />
        <ProofHero />
        <LiveActivityStrip />
        <LiveDemoEmbed />
        <HowItWorks />
        <EmailCTA />
        <FAQAccordion />
      </main>
      <SiteFooter />
    </>
  );
}
