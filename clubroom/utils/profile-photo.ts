const DEMO_IMAGE_HOST = 'cdn.clubroom.demo';

export function getUsableProfilePhotoUrl(uri: string | null | undefined): string | undefined {
  const value = uri?.trim();
  if (!value) return undefined;

  try {
    return new URL(value).hostname === DEMO_IMAGE_HOST ? undefined : value;
  } catch {
    return value.startsWith('http') ? undefined : value;
  }
}
