import type { Metadata } from "next";
import { Navbar } from "../components/navbar";
import { LocalizedLanding } from "../../components/landing/localized-landing";
import { getLanguageAlternates, getTranslations } from "../../lib/translations";

const t = getTranslations("zh");

export const metadata: Metadata = {
  title: t.meta.title,
  description: t.meta.description,
  keywords: t.meta.keywords,
  openGraph: {
    title: t.meta.ogTitle,
    description: t.meta.ogDescription,
    url: "https://tradeclaw.win/zh",
    siteName: "TradeClaw",
    type: "website",
    locale: "zh_CN",
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

export default function ChinesePage() {
  return (
    <>
      <Navbar variant="minimal" />
      <main lang="zh-CN">
        <LocalizedLanding t={t} locale="zh" />
      </main>
    </>
  );
}
