import type { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

async function getPublishedProjects(): Promise<{ slug: string; country_code: string; updated_at?: string }[]> {
  try {
    const { data } = await supabase
      .from('projects')
      .select('slug, country_code, updated_at')
      .in('status', ['approved', 'active', 'published'])
      .order('updated_at', { ascending: false })
      .limit(500);
    return (data || []) as { slug: string; country_code: string; updated_at?: string }[];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://eloinvestor.com';
  const now = new Date();
  const countries = ['om'];
  const languages = ['ar', 'en'];
  const staticRoutes = ['', '/opportunities', '/login', '/register', '/packages', '/about', '/privacy', '/terms', '/map'];

  const staticPages: MetadataRoute.Sitemap = countries.flatMap((country) =>
    languages.flatMap((lang) =>
      staticRoutes.map((route) => ({
        url: `${baseUrl}/${country}/${lang}${route}`,
        lastModified: now,
        changeFrequency: (route === '' ? 'daily' : 'weekly') as 'daily' | 'weekly',
        priority: route === '' ? 1 : 0.8,
      }))
    )
  );

  const projects = await getPublishedProjects();
  const projectPages: MetadataRoute.Sitemap = projects.flatMap((project) => {
    const countryCode = project.country_code || 'om';
    const lastMod = project.updated_at ? new Date(project.updated_at) : now;
    const slug = encodeURIComponent(project.slug);
    return languages.map((lang) => ({
      url: `${baseUrl}/${countryCode}/${lang}/project/${slug}`,
      lastModified: lastMod,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  });

  return [...staticPages, ...projectPages];
}
