import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
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
  ],
  openGraph: {
    title: "TradeClaw — Stop Renting Your Trading Edge",
    description:
      "Open-source AI trading signals. Self-hosted. Free forever.",
    url: "https://tradeclaw.com",
    siteName: "TradeClaw",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TradeClaw — Open-Source AI Trading Signals",
    description:
      "Self-hosted AI trading signals for forex, crypto, and metals. Free forever.",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#0A0A0A] text-white">
        {children}
      </body>
    </html>
  );
}
