import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://lbh-system.onrender.com";
  const lastModified = new Date();

  return [
    { url: baseUrl, lastModified, priority: 1.0, changeFrequency: "weekly" },
    { url: `${baseUrl}/login`, lastModified, priority: 0.8, changeFrequency: "monthly" },
    { url: `${baseUrl}/pricing`, lastModified, priority: 0.9, changeFrequency: "monthly" },
  ];
}
