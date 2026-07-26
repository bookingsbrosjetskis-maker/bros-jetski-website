import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const pages = ["", "/fleet", "/gallery", "/safety", "/reviews", "/about", "/corporate", "/gift-cards", "/contact", "/my-booking"];
  return pages.map((p) => ({
    url: `${base}${p}`,
    changeFrequency: p === "" || p === "/fleet" ? "weekly" : "monthly",
    priority: p === "" ? 1 : p === "/fleet" ? 0.9 : 0.6,
  }));
}
