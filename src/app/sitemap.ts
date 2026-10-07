import type { MetadataRoute } from "next";

const SITE_URL = "https://mood-lens-rho.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const routes = [
    { path: "", priority: 1.0, changeFrequency: "weekly" as const },
    { path: "/live", priority: 0.9, changeFrequency: "monthly" as const },
    { path: "/photo", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/video", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/text", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/voice", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/dashboard", priority: 0.7, changeFrequency: "monthly" as const },
  ];

  return routes.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
