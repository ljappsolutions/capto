import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";
import { docsFlat } from "@/lib/docs";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages: { path: string; priority: number; freq: "weekly" | "monthly" | "yearly" }[] = [
    { path: "", priority: 1, freq: "weekly" },
    ...docsFlat.map((d) => ({ path: d.href, priority: d.href === "/docs" ? 0.8 : 0.7, freq: "monthly" as const })),
    { path: "/privacy", priority: 0.3, freq: "yearly" },
  ];
  return pages.map((p) => ({
    url: `${siteConfig.url}${p.path}`,
    lastModified: now,
    changeFrequency: p.freq,
    priority: p.priority,
  }));
}
