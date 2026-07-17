import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SWRegister } from "./components/sw-register";
import { MobileNav } from "./components/mobile-nav";
import { MarketingChromeGate } from "./components/marketing-chrome-gate";
import { PWAInstallPrompt } from "./components/pwa-install";
import { DemoBanner } from "./components/demo-banner";
import { ThemeProvider } from "./components/theme-provider";
import { LocaleProvider } from "./components/locale-provider";
import { SiteFooter } from "./components/site-footer";
import { MilestoneCelebrationModal } from "../components/milestone-modal";
import { FeatureUnlockBanner } from "../components/feature-unlock-banner";
import { OnboardingChecklist } from "../components/onboarding";
import { StarProgressBar } from "../components/star-progress-bar";
import { AnalyticsProvider } from "../components/AnalyticsProvider";
import { PostHogPageView } from "../components/PostHogPageView";
import { GlobalClawBackdrop } from "../components/background/global-claw-backdrop";
import { Suspense } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Geist provides both the editorial display voice and compact product UI.
const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "TradeClaw",
    applicationCategory: "FinanceApplication",
    operatingSystem: "All",
    description:
      "MIT-licensed trading-signal software for forex, crypto, and metals. Self-host with Docker and review the supporting evidence before use.",
    url: "https://tradeclaw.win",
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "TradeClaw",
    url: "https://github.com/naimkatiman/tradeclaw",
  },
];

export const metadata: Metadata = {
  metadataBase: new URL("https://tradeclaw.win"),
  title: "TradeClaw — Open-Source AI Trading Signals",
  description:
    "MIT-licensed trading-signal software for forex, crypto, and metals. Self-host with Docker and review the supporting evidence before use.",
  keywords: [
    "trading signals",
    "open source",
    "self-hosted",
    "AI trading",
    "forex signals",
    "crypto signals",
    "algorithmic trading",
    "technical analysis",
    "open source trading bot",
    "AI trading signals github",
    "self-hosted trading platform",
    "forex bot open source",
    "crypto trading signals open source",
    "algorithmic trading open source",
  ],
  openGraph: {
    title: "TradeClaw — Open-Source Trading Transparency",
    description:
      "Inspect TradeClaw signal records and the evidence behind them. MIT-licensed software with a documented self-hosting path.",
    url: "https://tradeclaw.win",
    siteName: "TradeClaw",
    type: "website",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "TradeClaw — Open-Source AI Trading Signals",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TradeClaw — Open-Source AI Trading Signals",
    description:
      "MIT-licensed trading-signal software for forex, crypto, and metals, with source and self-hosting instructions on GitHub.",
    images: ["/api/og"],
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/apple-icon', sizes: '180x180', type: 'image/png' }],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "TradeClaw",
    statusBarStyle: "black-translucent",
    startupImage: "/apple-icon",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "TradeClaw",
  },
  alternates: {
    languages: {
      "en": "https://tradeclaw.win",
      "es": "https://tradeclaw.win/es",
      "zh-CN": "https://tradeclaw.win/zh",
      "x-default": "https://tradeclaw.win",
    },
    types: {
      'application/rss+xml': [{ url: '/feed.xml', title: 'TradeClaw Signal Archive (RSS)' }],
      'application/atom+xml': [{ url: '/atom.xml', title: 'TradeClaw Signal Archive (Atom)' }],
      'application/feed+json': [{ url: '/feed.json', title: 'TradeClaw Signal Archive (JSON Feed)' }],
    },
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f7f8" },
    { media: "(prefers-color-scheme: dark)", color: "#030506" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
        <AnalyticsProvider>
          <Suspense fallback={null}>
            <PostHogPageView />
          </Suspense>
          <ThemeProvider>
            <LocaleProvider>
              <GlobalClawBackdrop />
              <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
              />
              <SWRegister />
              <div className="site-content-layer flex min-h-full flex-1 flex-col">
                {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && <DemoBanner />}
                <div className="flex-1 pb-16 md:pb-0">
                  {children}
                </div>
                <SiteFooter />
              </div>
              {/* Product chrome and floating widgets stay off layer-1
                  marketing routes (DESIGN.md Layering). */}
              <MarketingChromeGate>
                <MobileNav />
                <PWAInstallPrompt />
                <MilestoneCelebrationModal />
                <FeatureUnlockBanner />
                <OnboardingChecklist />
                <StarProgressBar />
              </MarketingChromeGate>
            </LocaleProvider>
          </ThemeProvider>
        </AnalyticsProvider>
      </body>
    </html>
  );
}
