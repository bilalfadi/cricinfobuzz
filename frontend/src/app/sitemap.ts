import type { MetadataRoute } from 'next';
import fs from 'fs';
import path from 'path';
import { SITE_URL } from '@/lib/site';

const EXTRACTED_FILES = [
  '_.json',
  '_cricket-news.json',
  '_cricket-series.json',
  '_cricket-match_live-scores.json',
  '_cricket-videos.json',
];

const STATIC_PATHS = [
  '/',
  '/cricket-news',
  '/cricket-match/live-scores',
  '/cricket-schedule/upcoming-series/international',
  '/cricket-scorecard-archives',
  '/cricket-series',
  '/cricket-team',
  '/cricket-videos',
  '/cricket-stats/icc-rankings/men/batting',
];

const MAX_LINKS = 500;

const normalizePath = (rawHref?: string | null): string | null => {
  if (!rawHref) return null;
  const href = rawHref.trim();
  if (!href || href === '#' || href.startsWith('javascript:')) return null;

  let candidate = href;
  try {
    if (href.startsWith('http')) {
      const url = new URL(href);
      candidate = `${url.pathname}${url.search || ''}`;
    }
  } catch {
    // Ignore URL parse errors and fallback to the original value
  }

  if (!candidate.startsWith('/')) {
    candidate = `/${candidate}`;
  }

  candidate = candidate
    .replace(/\/{2,}/g, '/')
    .replace(/\/$/, '') || '/';

  // Ignore assets or empty hash routes
  if (!candidate || candidate === '' || candidate === '/#' || candidate === '/#!') {
    return '/';
  }

  return candidate === '' ? '/' : candidate;
};

const collectLinksFromFile = (filePath: string): string[] => {
  if (!fs.existsSync(filePath)) return [];

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(raw);
    const links = Array.isArray(json?.links) ? json.links : [];

    return links
      .map((link: { href?: string }) => normalizePath(link?.href))
      .filter((value: string | null): value is string => Boolean(value));
  } catch (error) {
    console.warn(`⚠️ Failed to parse sitemap links from ${filePath}:`, error);
    return [];
  }
};

const buildEntries = (paths: string[]): MetadataRoute.Sitemap => {
  const now = new Date();

  return paths.map((pathname) => {
    const changefreq =
      pathname === '/' || pathname.startsWith('/live-cricket-scores')
        ? 'hourly'
        : 'daily';
    const priority =
      pathname === '/'
        ? 1
        : pathname.startsWith('/cricket-news') || pathname.startsWith('/cricket-match')
          ? 0.9
          : 0.7;

    return {
      url: `${SITE_URL}${pathname === '/' ? '' : pathname}`,
      lastModified: now,
      changefreq,
      priority,
    };
  });
};

export default function sitemap(): MetadataRoute.Sitemap {
  const uniquePaths = new Set<string>(STATIC_PATHS);

  const extractedDir = path.join(process.cwd(), '..', 'extracted');
  EXTRACTED_FILES.forEach((file) => {
    const filePath = path.join(extractedDir, file);
    collectLinksFromFile(filePath).forEach((link) => {
      if (uniquePaths.size < MAX_LINKS) {
        uniquePaths.add(link);
      }
    });
  });

  if (!uniquePaths.has('/')) {
    uniquePaths.add('/');
  }

  return buildEntries(Array.from(uniquePaths));
}


