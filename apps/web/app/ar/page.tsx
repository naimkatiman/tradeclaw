import type { Metadata } from "next";
import { Navbar } from "../components/navbar";
import { SiteFooter } from "../../components/landing/site-footer";
import { LocalizedLanding } from "../../components/landing/localized-landing";
import { getTranslations } from "../../lib/translations";

const t = getTranslations("ar");

export const metadata: Metadata = {
  title: t.meta.title,
  description: t.meta.description,
  keywords: t.meta.keywords,
  openGraph: {
    title: t.meta.ogTitle,
    description: t.meta.ogDescription,
    url: "https://tradeclaw.com/ar",
    siteName: "TradeClaw",
    type: "website",
    locale: "ar",
    images: [{ url: "/api/og", width: 1200, height: 630, alt: t.meta.title }],
  },
  twitter: {
    card: "summary_large_image",
    title: t.meta.title,
    description: t.meta.description,
    images: ["/api/og"],
  },
  alternates: {
    languages: {
      "en": "https://tradeclaw.com",
      "es": "https://tradeclaw.com/es",
      "zh-CN": "https://tradeclaw.com/zh",
      "ms": "https://tradeclaw.com/ms",
      "ar": "https://tradeclaw.com/ar",
      "x-default": "https://tradeclaw.com",
    },
  },
};

export default function ArabicPage() {
  return (
    <>
      <Navbar />
      <main lang="ar" dir="rtl">
        <LocalizedLanding t={t} locale="ar" />
      </main>
      <SiteFooter />
    </>
  );
}
