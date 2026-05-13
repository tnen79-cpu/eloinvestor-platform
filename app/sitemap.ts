import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://eloinvestor.com';
  const now = new Date();
  const countries = ['om'];
  const languages = ['ar', 'en'];
  const routes = ['', '/opportunities', '/login', '/register', '/packages'];
  return countries.flatMap((country) => languages.flatMap((lang) => routes.map((route) => ({
    url: `${baseUrl}/${country}/${lang}${route}`,
    lastModified: now,
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1 : 0.8,
  }))));
}
