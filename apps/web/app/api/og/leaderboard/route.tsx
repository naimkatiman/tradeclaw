import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
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
        {/* Ambient glow */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "400px",
            height: "400px",
            background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)",
            borderRadius: "50%",
            display: "flex",
          }}
        />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
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
          <span style={{ color: "#fff", fontSize: "24px", fontWeight: 700 }}>
            Trade<span style={{ color: "#10b981" }}>Claw</span>
          </span>
        </div>

        <div style={{ color: "#fff", fontSize: "42px", fontWeight: 800, lineHeight: 1.1, marginBottom: "8px", display: "flex" }}>
          Signal Performance Leaderboard
        </div>
        <div style={{ color: "#52525b", fontSize: "18px", marginBottom: "40px", display: "flex" }}>
          AI signal accuracy tracked across forex, crypto &amp; commodities
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: "20px", marginBottom: "32px" }}>
          {[
            { label: "ASSETS TRACKED", value: "10+", color: "#fff" },
            { label: "HIT RATE", value: "~65%", color: "#10b981" },
            { label: "TIMEFRAMES", value: "4h & 24h", color: "#fff" },
            { label: "OPEN SOURCE", value: "FREE", color: "#eab308" },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "16px",
                padding: "20px 28px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                flex: 1,
              }}
            >
              <span style={{ color: "#52525b", fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" as const }}>
                {s.label}
              </span>
              <span style={{ color: s.color, fontSize: "28px", fontWeight: 800, fontFamily: "monospace" }}>
                {s.value}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
          <span style={{ color: "#3f3f46", fontSize: "14px" }}>
            tradeclaw.com/leaderboard
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "#3f3f46", fontSize: "14px" }}>⭐ Star on GitHub</span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
