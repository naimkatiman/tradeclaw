import { AuroraLayer } from "./AuroraLayer";
import { CandlestickGhosts } from "./CandlestickGhosts";
import { ContourLayer } from "./ContourLayer";
import { CrosshairScanline } from "./CrosshairScanline";
import { DotGridLayer } from "./DotGridLayer";

type BackgroundVariant = "hero" | "dashboard" | "track-record" | "minimal";

interface BackgroundDecorProps {
  variant: BackgroundVariant;
  className?: string;
}

export function BackgroundDecor({
  variant,
  className = "",
}: BackgroundDecorProps) {
  return (
    <div
      aria-hidden="true"
      className={`bg-decor-layer ${className}`}
    >
      {variant === "hero" && (
        <>
          <AuroraLayer intensity="soft" />
          <DotGridLayer size={28} />
          <CandlestickGhosts />
        </>
      )}
      {variant === "dashboard" && (
        <>
          <DotGridLayer size={32} opacity={0.9} />
          <CrosshairScanline />
        </>
      )}
      {variant === "track-record" && (
        <>
          <DotGridLayer size={40} opacity={0.6} />
          <ContourLayer />
        </>
      )}
      {variant === "minimal" && <AuroraLayer intensity="subtle" />}
    </div>
  );
}
