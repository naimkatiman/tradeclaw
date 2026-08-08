import { MetadataRoute } from "next";
import { POSTS } from "./blog/posts";
import { getLanguageAlternates, SUPPORTED_LOCALES } from "../lib/translations";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://tradeclaw.win";
  const blogIndexLastModified = POSTS.reduce<Date>((latest, post) => {
    const d = new Date(post.date);
    return d > latest ? d : latest;
  }, new Date(0));
  const languageAlternates = getLanguageAlternates(base);
  const localizedLandingEntries: MetadataRoute.Sitemap = SUPPORTED_LOCALES
    .filter(({ href }) => href !== "/")
    .map(({ href }) => ({
      url: `${base}${href}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.9,
      alternates: { languages: languageAlternates },
    }));

  // The sitemap is the story we tell search engines, and it has to be the same
  // story the homepage tells: a free, open-source track record showing that
  // short-term signals lose after costs.
  //
  // Everything else the app serves -- widgets, embeds, integration pages,
  // growth-era landing pages, operator surfaces -- stays reachable and stays
  // working. It just stops being advertised. Someone arriving from search should
  // land on the evidence, not on a page that predates the pivot.
  //
  // Adding a URL here is a claim that the page carries the thesis. If it does
  // not, leave it out; sitemap-routes.test.ts pins the set.
  return [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1, alternates: { languages: languageAlternates } },
    ...localizedLandingEntries,

    // The evidence.
    { url: `${base}/track-record`, lastModified: new Date(), changeFrequency: "daily", priority: 0.95 },
    { url: `${base}/research`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/methodology`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/why-long-term`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/open-data`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/calibration`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.85 },

    // The product that produces the evidence.
    { url: `${base}/today`, lastModified: new Date(), changeFrequency: "daily", priority: 0.85 },
    { url: `${base}/dashboard`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.8 },
    { url: `${base}/screener`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/backtest`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/compare`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/demo`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },

    // Reading material.
    { url: `${base}/blog`, lastModified: blogIndexLastModified, changeFrequency: "weekly", priority: 0.6 },
    ...POSTS.map((post) => ({
      url: `${base}/blog/${post.slug}`,
      lastModified: new Date(post.date),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),

    // Running it yourself, and the promises we make.
    { url: `${base}/start`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/docs`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/docs/api`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/how-it-works`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/faq`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/glossary`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/data-freshness`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/security`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/roadmap`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/contributors`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/terms`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/privacy`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
  ];
}
