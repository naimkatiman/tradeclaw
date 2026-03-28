import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://tradeclaw.com";
  return [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/dashboard`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/leaderboard`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/pricing`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/strategies`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/compare`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/es`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/zh`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
  ];
}
