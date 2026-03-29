import type { Metadata } from "next";
import { Navbar } from "../components/navbar";
import { SiteFooter } from "../../components/landing/site-footer";
import { LocalizedLanding } from "../../components/landing/localized-landing";
import { getTranslations } from "../../lib/translations";

const t = getTranslations("es");

export const metadata: Metadata = {
  title: t.meta.title,
  description: t.meta.description,
  keywords: t.meta.keywords,
  openGraph: {
    title: t.meta.ogTitle,
    description: t.meta.ogDescription,
    url: "https://tradeclaw.com/es",
    siteName: "TradeClaw",
    type: "website",
    locale: "es_ES",
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
      "x-default": "https://tradeclaw.com",
    },
  },
};

export default function SpanishPage() {
  return (
    <>
      <Navbar />
      <main lang="es">
        <LocalizedLanding t={t} locale="es" />
      </main>
      <SiteFooter />
    </>
  );
}
