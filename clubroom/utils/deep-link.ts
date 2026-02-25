import { type Href } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { createLogger } from '@/utils/logger';

const logger = createLogger('DeepLink');

type RouterLike = {
  push: (href: Href) => void;
};

const LEGACY_REWRITES: { pattern: RegExp; replace: string }[] = [
  { pattern: /^\/booking\//, replace: '/bookings/' },
];

const ROUTE_ALIASES: Record<string, string> = {
  '/sessions/view': '/group-sessions',
  '/availability': Routes.AVAILABILITY as string,
};

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^(javascript|data):/i.test(trimmed)) return '';

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      return `${parsed.pathname}${parsed.search}`;
    } catch {
      return '';
    }
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    const withoutScheme = trimmed.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
    return `/${withoutScheme.replace(/^\/+/, '')}`;
  }

  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !trimmed.startsWith('/')) {
    const withoutScheme = trimmed.replace(/^[a-z][a-z0-9+.-]*:/i, '');
    return `/${withoutScheme.replace(/^\/+/, '')}`;
  }

  return trimmed;
}

function applyLegacyRewrites(path: string): string {
  let next = path;
  for (const rule of LEGACY_REWRITES) {
    if (rule.pattern.test(next)) {
      next = next.replace(rule.pattern, rule.replace);
    }
  }
  return next;
}

function applyRouteAliases(path: string): string {
  const alias = ROUTE_ALIASES[path];
  if (alias) {
    logger.info('Route alias used', { oldRoute: path, newRoute: alias });
  }
  return alias ?? path;
}

export function resolveDeepLink(raw: unknown): Href | null {
  if (typeof raw !== 'string') return null;

  let normalized = normalizeUrl(raw);
  if (!normalized) return null;

  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  normalized = applyLegacyRewrites(normalized);
  normalized = applyRouteAliases(normalized);

  const lower = normalized.toLowerCase();
  if (lower.startsWith('/javascript:') || lower.startsWith('/data:')) {
    return null;
  }

  let decodedPath = normalized;
  try {
    decodedPath = decodeURIComponent(normalized);
  } catch {
    return null;
  }

  if (decodedPath.includes('..')) {
    return null;
  }

  return normalized as Href;
}

export function navigateToDeepLink(router: RouterLike, raw: unknown): boolean {
  const href = resolveDeepLink(raw);
  if (!href) return false;
  router.push(href);
  return true;
}
