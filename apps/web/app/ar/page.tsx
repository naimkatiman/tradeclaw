import type { Metadata } from "next";
import { Navbar } from "../components/navbar";
import { LocalizedLanding } from "../../components/landing/localized-landing";
import { getLanguageAlternates, getTranslations } from "../../lib/translations";

const t = getTranslations("ar");

export const metadata: Metadata = {
  title: t.meta.title,
  description: t.meta.description,
  keywords: t.meta.keywords,
  openGraph: {
    title: t.meta.ogTitle,
    description: t.meta.ogDescription,
    url: "https://tradeclaw.win/ar",
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
    languages: getLanguageAlternates(),
  },
};

export default function ArabicPage() {
  return (
    <>
      <Navbar variant="minimal" />
      <main lang="ar" dir="rtl">
        <LocalizedLanding t={t} locale="ar" />
      </main>
    </>
  );
}
