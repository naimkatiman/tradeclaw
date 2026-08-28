import type { MetadataRoute } from 'next';
import { getLanguageAlternates, SUPPORTED_LOCALES } from '../lib/translations';

const BASE = 'https://tradeclaw.win';

const PUBLIC_ROUTES = [
  { path: '/track-record', changeFrequency: 'daily', priority: 0.95 },
  { path: '/track-record/study', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/track-record/alpha', changeFrequency: 'daily', priority: 0.9 },
  { path: '/research', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/methodology', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/open-data', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/why-long-term', changeFrequency: 'monthly', priority: 0.75 },
  { path: '/dashboard', changeFrequency: 'daily', priority: 0.85 },
  { path: '/screener', changeFrequency: 'daily', priority: 0.8 },
  { path: '/backtest', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/start', changeFrequency: 'monthly', priority: 0.8 },
  { path: '/docs', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/docs/installation', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/docs/self-hosting', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/docs/api', changeFrequency: 'weekly', priority: 0.65 },
  { path: '/api-docs', changeFrequency: 'weekly', priority: 0.65 },
  { path: '/security', changeFrequency: 'monthly', priority: 0.55 },
  { path: '/data-freshness', changeFrequency: 'monthly', priority: 0.55 },
  { path: '/terms', changeFrequency: 'monthly', priority: 0.35 },
  { path: '/privacy', changeFrequency: 'monthly', priority: 0.35 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const languageAlternates = getLanguageAlternates(BASE);
  const localizedLandingEntries: MetadataRoute.Sitemap = SUPPORTED_LOCALES
    .filter(({ href }) => href !== '/')
    .map(({ href }) => ({
      url: `${BASE}${href}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
      alternates: { languages: languageAlternates },
    }));

  return [
    {
      url: BASE,
      changeFrequency: 'weekly',
      priority: 1,
      alternates: { languages: languageAlternates },
    },
    ...PUBLIC_ROUTES.map(({ path, ...metadata }) => ({
      url: `${BASE}${path}`,
      ...metadata,
    })),
    ...localizedLandingEntries,
  ];
}
