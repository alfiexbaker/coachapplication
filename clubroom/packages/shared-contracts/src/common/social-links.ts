export const SOCIAL_LINK_PLATFORMS = [
  'instagram',
  'twitter',
  'facebook',
  'linkedin',
  'youtube',
  'tiktok',
  'website',
] as const;

export type SocialLinkPlatform = (typeof SOCIAL_LINK_PLATFORMS)[number];

const PLATFORM_DOMAINS: Partial<Record<SocialLinkPlatform, readonly string[]>> = {
  instagram: ['instagram.com'],
  twitter: ['twitter.com', 'x.com'],
  facebook: ['facebook.com'],
  linkedin: ['linkedin.com'],
  youtube: ['youtube.com', 'youtu.be'],
  tiktok: ['tiktok.com'],
};

const PLATFORM_LABELS: Record<SocialLinkPlatform, string> = {
  instagram: 'Instagram',
  twitter: 'X / Twitter',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  website: 'Website',
};

export function normalizeSocialLinkInput(platform: SocialLinkPlatform, raw: string): string {
  const value = raw.trim();
  if (!value) return '';
  if (platform !== 'website' && value.startsWith('@')) {
    const handle = value.slice(1);
    const domain = PLATFORM_DOMAINS[platform]?.[0];
    return domain ? `https://${domain}/${handle}` : value;
  }
  if (/^[a-z][a-z\d+.-]*:/i.test(value)) return value;
  return `https://${value}`;
}

export function validateSocialLinkInput(
  platform: SocialLinkPlatform,
  raw: string | null | undefined,
): string | null {
  const value = raw?.trim() ?? '';
  if (!value) return null;

  let parsed: URL;
  try {
    parsed = new URL(normalizeSocialLinkInput(platform, value));
  } catch {
    return 'Enter a valid URL';
  }
  if (!/^https?:$/.test(parsed.protocol)) return 'Enter a valid URL';

  const domains = PLATFORM_DOMAINS[platform];
  const hostname = parsed.hostname.toLowerCase();
  if (
    domains &&
    !domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))
  ) {
    const article = PLATFORM_LABELS[platform] === 'Instagram' ? 'an' : 'a';
    return `Use ${article} ${PLATFORM_LABELS[platform]} URL`;
  }
  return null;
}

export function firstSocialLinksError(
  links: Partial<Record<SocialLinkPlatform, string | null | undefined>>,
): string | null {
  for (const platform of SOCIAL_LINK_PLATFORMS) {
    const error = validateSocialLinkInput(platform, links[platform]);
    if (error) return error;
  }
  return null;
}
