import { ImageResponse } from "next/og";

export const runtime = "edge";

// Neutral default OG card: wordmark + tagline only. The previous version
// rendered fabricated signal cards (XAU/USD BUY 87%, BTC/USD SELL 72%) as if
// live — that violated the honesty contract. No invented numbers here; the
// track-record OG route renders real stats from the database.
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "#030506",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Ambient glow */}
        <div
          style={{
            position: "absolute",
            top: "50px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(21,216,244,0.16) 0%, transparent 70%)",
          }}
        />

        {/* Logo mark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              background: "#15d8f4",
              boxShadow: "0 0 16px #15d8f4",
            }}
          />
          <span
            style={{
              fontSize: "16px",
              color: "#15d8f4",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              fontWeight: 500,
            }}
          >
            Open source · Self-hosted
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "88px",
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "-0.03em",
            lineHeight: 1,
            marginBottom: "16px",
          }}
        >
          TradeClaw
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: "32px",
            color: "#15d8f4",
            fontWeight: 500,
            marginBottom: "48px",
            letterSpacing: "-0.01em",
          }}
        >
          Trading signals you can audit
        </div>

        {/* Tagline */}
        <div
          style={{
            display: "flex",
            gap: "24px",
            color: "#8d9aa0",
            fontSize: "16px",
            letterSpacing: "0.05em",
          }}
        >
          <span>Every signal logged, graded, and published — wins and losses.</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
