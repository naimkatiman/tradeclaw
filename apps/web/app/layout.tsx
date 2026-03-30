import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SWRegister } from "./components/sw-register";
import { MobileNav } from "./components/mobile-nav";
import { PWAInstallPrompt } from "./components/pwa-install";
import { DemoBanner } from "./components/demo-banner";
import { ThemeProvider } from "./components/theme-provider";
import { MilestoneCelebrationModal } from "../components/milestone-modal";
import { OnboardingChecklist } from "../components/onboarding";
import { StarProgressBar } from "../components/star-progress-bar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "TradeClaw",
    applicationCategory: "FinanceApplication",
    operatingSystem: "All",
    offers: {
      "@type": "Offer",
      price: 0,
      priceCurrency: "USD",
    },
    description:
      "Self-hosted AI trading signals for forex, crypto, and metals. Free forever. Deploy in 5 minutes with Docker.",
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
    "Self-hosted AI trading signals for forex, crypto, and metals. Free forever. Deploy in 5 minutes with Docker.",
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
    "crypto trading signals free",
    "algorithmic trading open source",
  ],
  openGraph: {
    title: "TradeClaw — Stop Renting Your Trading Edge",
    description:
      "Open-source AI trading signals for forex, crypto & metals. Self-hosted. Free forever. Deploy in 5 min with Docker.",
    url: "https://github.com/naimkatiman/tradeclaw",
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
      "Self-hosted AI trading signals for forex, crypto & metals. Free forever. Star on GitHub.",
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
  alternates: {
    languages: {
      "en": "https://tradeclaw.win",
      "es": "https://tradeclaw.win/es",
      "zh-CN": "https://tradeclaw.win/zh",
      "x-default": "https://tradeclaw.win",
    },
    types: {
      'application/rss+xml': [{ url: '/feed.xml', title: 'TradeClaw — Live AI Trading Signals (RSS)' }],
      'application/atom+xml': [{ url: '/atom.xml', title: 'TradeClaw — Live AI Trading Signals (Atom)' }],
      'application/feed+json': [{ url: '/feed.json', title: 'TradeClaw — Live AI Trading Signals (JSON Feed)' }],
    },
  },
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
      <body className="min-h-full flex flex-col grain-overlay" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
        <ThemeProvider>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
          <SWRegister />
          {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && <DemoBanner />}
          <div className="flex-1 pb-16 md:pb-0">
            {children}
          </div>
          <MobileNav />
          <PWAInstallPrompt />
          <MilestoneCelebrationModal />
          <OnboardingChecklist />
          <StarProgressBar />
        </ThemeProvider>
      </body>
    </html>
  );
}
