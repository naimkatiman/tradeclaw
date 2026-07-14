import { Navbar } from "./components/navbar";
import { ProofHero } from "../components/landing/proof-hero";
import { ExploreStrip } from "../components/landing/explore-strip";

export const revalidate = 60;

/**
 * Layer 1 (DESIGN.md Layering): one idea, one action, zero interruptions.
 * The finding is the page — the Cost Field scene is the imagery, the ledger
 * is the proof, and the ExploreStrip is the single doorway to everything
 * deeper. Product density and floating chrome live on layer-2 routes.
 */
export default function Home() {
  return (
    <>
      <Navbar variant="minimal" />
      <main className="pt-20 sm:pt-24 lg:pt-28">
        <div className="relative isolate overflow-hidden">
          <ProofHero />
        </div>
        <ExploreStrip />
      </main>
    </>
  );
}
