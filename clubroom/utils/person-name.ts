const GENERIC_PERSON_PLACEHOLDERS = new Set([
  'athlete',
  'coach',
  'parent',
  'guardian',
  'user',
  'guest user',
  'club staff',
]);

export function isGenericPersonPlaceholder(value: string | null | undefined): boolean {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  if (GENERIC_PERSON_PLACEHOLDERS.has(normalized)) {
    return true;
  }
  return /^(?:athlete|coach|parent|guardian|user)\s+\d+$/i.test(normalized);
}

export function resolveNonGenericPersonName(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || isGenericPersonPlaceholder(trimmed)) {
    return undefined;
  }
  return trimmed;
}

export function resolveUserProfileName(
  user: { fullName?: string | null; name?: string | null } | null | undefined,
): string | undefined {
  return resolveNonGenericPersonName(user?.fullName) ?? resolveNonGenericPersonName(user?.name);
}
