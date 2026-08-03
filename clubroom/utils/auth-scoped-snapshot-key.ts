export function buildAuthScopedSnapshotKey(
  userId: string | null | undefined,
  ...scope: Array<string | null | undefined>
): string | null {
  const normalizedUserId = userId?.trim();
  if (!normalizedUserId) {
    return null;
  }

  return JSON.stringify([normalizedUserId, ...scope.map((value) => value ?? '')]);
}
