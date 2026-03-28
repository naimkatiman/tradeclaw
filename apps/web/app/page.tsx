import Link from "next/link";
import { Navbar } from "./components/navbar";
import { ABHero } from "../components/landing/ab-hero";
import { SocialProof } from "../components/landing/social-proof";
import { StarsBadge } from "../components/landing/stars-badge";
import { ComparisonTable } from "../components/landing/comparison-table";
import { HowItWorks } from "../components/landing/how-it-works";
import { AssetsShowcase } from "../components/landing/assets-showcase";
import { FAQAccordion } from "../components/landing/faq-accordion";
import { DeploySection } from "../components/landing/deploy-section";
import { SiteFooter } from "../components/landing/site-footer";
import { LiveDemoSection } from "../components/landing/live-demo-section";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <ABHero />
        <div className="flex justify-center pb-4">
          <StarsBadge />
        </div>
        <LiveDemoSection />
        <SocialProof />
        <HowItWorks />
        <ComparisonTable />
        <div className="flex justify-center pb-8 -mt-4">
          <Link
            href="/compare"
            className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors inline-flex items-center gap-1.5"
          >
            See full comparison
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
        <AssetsShowcase />
        <div className="flex justify-center pb-8 -mt-4">
          <Link
            href="/heatmap"
            className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors inline-flex items-center gap-1.5"
          >
            View Heatmap
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
        <FAQAccordion />
        <DeploySection />
      </main>
      <SiteFooter />
    </>
  );
}
