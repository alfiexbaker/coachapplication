export function buildLinearGradientUri(colors: string[], radius: number) {
  const stops = colors
    .map((color, index) => {
      const offset = (index / Math.max(colors.length - 1, 1)) * 100;
      return `<stop offset="${offset}%" stop-color="${color}" />`;
    })
    .join('');
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      ${stops}
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="100" height="100" rx="${radius}" ry="${radius}" fill="url(#grad)" />
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function lightenHex(hex: string, amount: number) {
  return mixHex(hex, '#ffffff', amount);
}

export function darkenHex(hex: string, amount: number) {
  return mixHex(hex, '#000000', amount);
}

function mixHex(base: string, mix: string, amount: number) {
  const baseRgb = hexToRgb(base);
  const mixRgb = hexToRgb(mix);
  if (!baseRgb || !mixRgb) {
    return base;
  }
  const blendChannel = (channelBase: number, channelMix: number) =>
    Math.round(channelBase + (channelMix - channelBase) * amount);
  const r = blendChannel(baseRgb.r, mixRgb.r);
  const g = blendChannel(baseRgb.g, mixRgb.g);
  const b = blendChannel(baseRgb.b, mixRgb.b);
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) {
    return null;
  }
  const bigint = parseInt(normalized, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
}

function toHex(value: number) {
  return value.toString(16).padStart(2, '0');
}
