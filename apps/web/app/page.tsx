import { Navbar } from "./components/navbar";
import { AnimatedHero } from "../components/landing/animated-hero";
import { SocialProof } from "../components/landing/social-proof";
import { ComparisonTable } from "../components/landing/comparison-table";
import { HowItWorks } from "../components/landing/how-it-works";
import { AssetsShowcase } from "../components/landing/assets-showcase";
import { FAQAccordion } from "../components/landing/faq-accordion";
import { DeploySection } from "../components/landing/deploy-section";
import { SiteFooter } from "../components/landing/site-footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <AnimatedHero />
        <SocialProof />
        <HowItWorks />
        <ComparisonTable />
        <AssetsShowcase />
        <FAQAccordion />
        <DeploySection />
      </main>
      <SiteFooter />
    </>
  );
}
