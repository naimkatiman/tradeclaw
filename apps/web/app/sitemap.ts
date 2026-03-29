import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://tradeclaw.win";
  return [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/dashboard`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/leaderboard`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/pricing`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/strategies`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/compare`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/es`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/zh`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/demo`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/backtest`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/blog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/blog/rsi-explained`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/blog/how-we-score-signals`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/blog/self-hosting-trading-tools`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/api-docs`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/docs`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/how-it-works`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/star`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/paper-trading`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/exchanges`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/screener`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/heatmap`, lastModified: new Date(), changeFrequency: "daily", priority: 0.6 },
  ];
}
