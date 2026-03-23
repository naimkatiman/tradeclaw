import { HeroSection } from "./components/hero";
import { ProblemSection } from "./components/problem";
import { FeaturesSection } from "./components/features";
import { HowItWorksSection } from "./components/how-it-works";
import { ComparisonSection } from "./components/comparison";
import { TechStackSection } from "./components/tech-stack";
import { CommunitySection } from "./components/community";
import { CTASection } from "./components/cta";
import { Navbar } from "./components/navbar";
import { Footer } from "./components/footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <ProblemSection />
        <FeaturesSection />
        <HowItWorksSection />
        <ComparisonSection />
        <TechStackSection />
        <CommunitySection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
