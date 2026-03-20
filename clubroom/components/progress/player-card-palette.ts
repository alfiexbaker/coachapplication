import { withAlpha } from '@/constants/theme';

const LIGHT_TEXT = '#F8FAFC';
const DARK_TEXT = '#0F172A';

interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface PlayerCardPalette {
  text: string;
  softText: string;
  badgeBackground: string;
  avatarBackground: string;
  avatarBorder: string;
  statPanelBackground: string;
  statPanelBorder: string;
  statSeparator: string;
  tileBackground: string;
  infoBackground: string;
  streakBackground: string;
  frameBorder: string;
  overlay: string;
  mediaOverlayStrong: string;
  mediaOverlaySoft: string;
  innerBorder: string;
  sheen: string;
}

function hexToRgb(hex: string): Rgb | null {
  const normalized = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null;
  }

  const value = parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbToHex({ r, g, b }: Rgb): string {
  const toHex = (value: number) => value.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mixHex(base: string, mix: string, amount: number): string {
  const baseRgb = hexToRgb(base);
  const mixRgb = hexToRgb(mix);
  if (!baseRgb || !mixRgb) {
    return base;
  }

  const blend = (left: number, right: number) => Math.round(left + (right - left) * amount);
  return rgbToHex({
    r: blend(baseRgb.r, mixRgb.r),
    g: blend(baseRgb.g, mixRgb.g),
    b: blend(baseRgb.b, mixRgb.b),
  });
}

function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return 0;
  }

  const normalize = (channel: number) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * normalize(rgb.r) + 0.7152 * normalize(rgb.g) + 0.0722 * normalize(rgb.b);
}

function contrastRatio(left: string, right: string): number {
  const lighter = Math.max(relativeLuminance(left), relativeLuminance(right));
  const darker = Math.min(relativeLuminance(left), relativeLuminance(right));
  return (lighter + 0.05) / (darker + 0.05);
}

function averageGradient(gradient: [string, string]): string {
  return mixHex(gradient[0], gradient[1], 0.5);
}

function pickReadableText(background: string): string {
  const lightContrast = contrastRatio(LIGHT_TEXT, background);
  const darkContrast = contrastRatio(DARK_TEXT, background);
  return lightContrast >= darkContrast ? LIGHT_TEXT : DARK_TEXT;
}

export function buildPlayerCardPalette({
  gradient,
  accent,
  overlay,
}: {
  gradient: [string, string];
  accent: string;
  overlay: string;
}): PlayerCardPalette {
  const base = averageGradient(gradient);
  const blendedBackground = mixHex(base, overlay, 0.56);
  const text = pickReadableText(blendedBackground);
  const isLightText = text === LIGHT_TEXT;
  const glassMix = isLightText ? '#FFFFFF' : '#0F172A';

  return {
    text,
    softText: withAlpha(text, isLightText ? 0.86 : 0.76),
    badgeBackground: withAlpha(accent, isLightText ? 0.2 : 0.14),
    avatarBackground: withAlpha(glassMix, isLightText ? 0.12 : 0.08),
    avatarBorder: withAlpha(accent, isLightText ? 0.42 : 0.3),
    statPanelBackground: withAlpha(glassMix, isLightText ? 0.14 : 0.08),
    statPanelBorder: withAlpha(accent, isLightText ? 0.24 : 0.18),
    statSeparator: withAlpha(text, isLightText ? 0.22 : 0.16),
    tileBackground: withAlpha(glassMix, isLightText ? 0.14 : 0.08),
    infoBackground: withAlpha(glassMix, isLightText ? 0.1 : 0.06),
    streakBackground: withAlpha(accent, isLightText ? 0.16 : 0.12),
    frameBorder: withAlpha(accent, isLightText ? 0.24 : 0.16),
    overlay: withAlpha(overlay, isLightText ? 0.72 : 0.16),
    mediaOverlayStrong: withAlpha(overlay, isLightText ? 0.82 : 0.22),
    mediaOverlaySoft: withAlpha(overlay, isLightText ? 0.32 : 0.08),
    innerBorder: withAlpha(glassMix, isLightText ? 0.12 : 0.08),
    sheen: withAlpha('#FFFFFF', isLightText ? 0.24 : 0.12),
  };
}

export function getPlayerCardTextContrast({
  gradient,
  overlay,
}: {
  gradient: [string, string];
  overlay: string;
}): number {
  const background = mixHex(averageGradient(gradient), overlay, 0.56);
  return contrastRatio(pickReadableText(background), background);
}
