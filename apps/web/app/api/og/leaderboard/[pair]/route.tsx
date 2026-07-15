import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ pair: string }> },
) {
  const { pair } = await params;
  const symbol = pair.toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "#050505",
          display: "flex",
          flexDirection: "column",
          padding: "60px",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              background: "#10b981",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              color: "#050505",
              fontWeight: 800,
            }}
          >
            T
          </div>
          <span style={{ color: "#fff", fontSize: "22px", fontWeight: 700 }}>
            Trade<span style={{ color: "#10b981" }}>Claw</span>
          </span>
          <span style={{ color: "#52525b", fontSize: "14px", marginLeft: "8px" }}>Signal Outcome Table</span>
        </div>

        {/* Pair name */}
        <div style={{ display: "flex", alignItems: "baseline", gap: "16px", marginBottom: "40px" }}>
          <span style={{ color: "#fff", fontSize: "64px", fontWeight: 800, fontFamily: "monospace", letterSpacing: "-2px" }}>
            {symbol}
          </span>
          <span style={{ color: "#52525b", fontSize: "20px" }}>Recorded Outcome Summary</span>
        </div>

        {/* Stats grid */}
        <div style={{ display: "flex", gap: "20px", flex: 1 }}>
          {[
            { label: "4h HIT RATE", value: "—", color: "#10b981" },
            { label: "24h HIT RATE", value: "—", color: "#10b981" },
            { label: "AVG RULE SCORE", value: "—", color: "#fff" },
            { label: "RECORDED ROWS", value: "—", color: "#fff" },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "8px",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                flex: 1,
              }}
            >
              <span style={{ color: "#52525b", fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>
                {s.label}
              </span>
              <span style={{ color: s.color, fontSize: "36px", fontWeight: 800, fontFamily: "monospace" }}>
                {s.value}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "32px" }}>
          <span style={{ color: "#3f3f46", fontSize: "14px" }}>
            tradeclaw.win/leaderboard
          </span>
          <span style={{ color: "#3f3f46", fontSize: "14px" }}>Free &amp; Open Source</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
