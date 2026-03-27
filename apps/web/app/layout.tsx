import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SWRegister } from "./components/sw-register";
import { MobileNav } from "./components/mobile-nav";
import { PWAInstallPrompt } from "./components/pwa-install";

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
    url: "https://tradeclaw.com",
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "TradeClaw",
    url: "https://github.com/naimkatiman/tradeclaw",
  },
];

export const metadata: Metadata = {
  metadataBase: new URL("https://tradeclaw.com"),
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
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#050505] text-white grain-overlay">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <SWRegister />
        <div className="flex-1 pb-16 md:pb-0">
          {children}
        </div>
        <MobileNav />
        <PWAInstallPrompt />
      </body>
    </html>
  );
}
