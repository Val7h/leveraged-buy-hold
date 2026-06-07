import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://lbh-system.onrender.com";
  const lastModified = new Date();

  return [
    { url: baseUrl, lastModified, priority: 1.0, changeFrequency: "weekly" },
    { url: `${baseUrl}/login`, lastModified, priority: 0.8, changeFrequency: "monthly" },
    { url: `${baseUrl}/pricing`, lastModified, priority: 0.9, changeFrequency: "monthly" },
    // TODO(gerente/juridico): apos revisao de texto pelo Dr. Ricardo, incluir
    // /termos, /privacidade, /lgpd, /disclaimer no sitemap. As paginas ja existem
    // com robots: index=true e podem ser indexadas naturalmente, mas a inclusao
    // explicita no sitemap aguarda chancela do consultor legal.
  ];
}
