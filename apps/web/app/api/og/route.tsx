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
              "radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)",
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
              background: "#10b981",
              boxShadow: "0 0 16px #10b981",
            }}
          />
          <span
            style={{
              fontSize: "16px",
              color: "#10b981",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              fontWeight: 500,
            }}
          >
            Open source · Free forever
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
            color: "#10b981",
            fontWeight: 500,
            marginBottom: "48px",
            letterSpacing: "-0.01em",
          }}
        >
          Open-Source AI Trading Signals
        </div>

        {/* Signal cards */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            marginBottom: "48px",
          }}
        >
          {/* BUY card */}
          <div
            style={{
              background: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(16,185,129,0.2)",
              borderRadius: "12px",
              padding: "16px 24px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              minWidth: "180px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: "16px",
                  fontFamily: "monospace",
                }}
              >
                XAU/USD
              </span>
              <span
                style={{
                  background: "rgba(16,185,129,0.15)",
                  color: "#10b981",
                  fontWeight: 800,
                  fontSize: "12px",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  letterSpacing: "0.08em",
                }}
              >
                BUY
              </span>
            </div>
            <div
              style={{
                color: "#10b981",
                fontSize: "24px",
                fontWeight: 700,
                fontFamily: "monospace",
              }}
            >
              87%
            </div>
            <div
              style={{
                color: "#6b7280",
                fontSize: "11px",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              Confidence
            </div>
          </div>

          {/* SELL card */}
          <div
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
              borderRadius: "12px",
              padding: "16px 24px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              minWidth: "180px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: "16px",
                  fontFamily: "monospace",
                }}
              >
                BTC/USD
              </span>
              <span
                style={{
                  background: "rgba(239,68,68,0.15)",
                  color: "#ef4444",
                  fontWeight: 800,
                  fontSize: "12px",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  letterSpacing: "0.08em",
                }}
              >
                SELL
              </span>
            </div>
            <div
              style={{
                color: "#ef4444",
                fontSize: "24px",
                fontWeight: 700,
                fontFamily: "monospace",
              }}
            >
              72%
            </div>
            <div
              style={{
                color: "#6b7280",
                fontSize: "11px",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              Confidence
            </div>
          </div>
        </div>

        {/* Tagline */}
        <div
          style={{
            display: "flex",
            gap: "24px",
            color: "#6b7280",
            fontSize: "16px",
            letterSpacing: "0.05em",
          }}
        >
          <span>Free</span>
          <span style={{ color: "#27272a" }}>·</span>
          <span>Self-Hosted</span>
          <span style={{ color: "#27272a" }}>·</span>
          <span>Deploy in 5 min</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
