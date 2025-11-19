const DEFAULT_SITE_URL = 'https://cricinfobuzz.n123movie.xyz';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, '');

export const buildCanonicalUrl = (rawPath?: string): string => {
  const normalizedPath = rawPath && rawPath.length > 0 ? rawPath : '/';
  const pathname = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
  return pathname === '/' ? SITE_URL : `${SITE_URL}${pathname}`;
};


