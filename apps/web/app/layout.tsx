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
import { AnalyticsProvider } from "../components/AnalyticsProvider";
import { PostHogPageView } from "../components/PostHogPageView";
import { EvidenceActionTracker } from "../components/EvidenceActionTracker";
import { Suspense } from "react";
import { getLanguageAlternates } from "../lib/translations";

const localeBootstrap = `
(() => {
  document.documentElement.dataset.tcJs = "true";
  window.setTimeout(() => document.documentElement.removeAttribute("data-tc-js"), 3000);
  try {
    const routeLocales = { "/": "en", "/es": "es", "/zh": "zh", "/ms": "ms", "/ar": "ar" };
    const supported = ["en", "es", "zh", "ms", "ar"];
    const normalizedPath = window.location.pathname.length > 1
      ? window.location.pathname.replace(/\\/+$/, "")
      : window.location.pathname;
    const cookieLocale = document.cookie
      .split("; ")
      .find((item) => item.startsWith("tc_locale="))
      ?.slice("tc_locale=".length);
    let stored = null;
    try { stored = window.localStorage.getItem("tc_locale"); } catch {}
    const persisted = supported.includes(stored)
      ? stored
      : supported.includes(cookieLocale)
        ? cookieLocale
        : null;
    const routeLocale = routeLocales[normalizedPath];
    const locale = routeLocale || persisted || "en";
    document.documentElement.lang = locale === "zh" ? "zh-CN" : locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  } catch {}
})();`;

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
      "Open trading research software for testing ideas, modeling costs, inspecting evidence, and reproducing results with Docker.",
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
  title: "TradeClaw — Open Trading Research Lab",
  description:
    "Test trading ideas, see where they fail after costs, inspect every result, and self-host the full evidence trail.",
  keywords: [
    "trading research",
    "strategy backtesting",
    "cost-adjusted track record",
    "open source",
    "self-hosted",
    "reproducible research",
    "market data",
  ],
  openGraph: {
    title: "TradeClaw — Open Trading Research Lab",
    description:
      "Test trading ideas, account for costs, inspect every result, and reproduce the evidence yourself.",
    url: "https://tradeclaw.win",
    siteName: "TradeClaw",
    type: "website",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "TradeClaw — Open Trading Research Lab",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TradeClaw — Open Trading Research Lab",
    description:
      "Test trading ideas, account for costs, inspect every result, and self-host the evidence trail.",
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
    languages: getLanguageAlternates(),
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
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
        <script dangerouslySetInnerHTML={{ __html: localeBootstrap }} />
        <AnalyticsProvider>
          <Suspense fallback={null}>
            <PostHogPageView />
            <EvidenceActionTracker />
          </Suspense>
          <ThemeProvider>
            <LocaleProvider>
              <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
              />
              <SWRegister />
              {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && <DemoBanner />}
              <div className="flex-1 pb-16 md:pb-0">
                {children}
              </div>
              <SiteFooter />
              {/* Product chrome and floating widgets stay off layer-1
                  marketing routes (DESIGN.md Layering). */}
              <MarketingChromeGate>
                <MobileNav />
                <PWAInstallPrompt />
              </MarketingChromeGate>
            </LocaleProvider>
          </ThemeProvider>
        </AnalyticsProvider>
      </body>
    </html>
  );
}
