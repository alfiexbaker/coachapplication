/**
 * Account ID helpers used to keep mock and real-data identifiers compatible.
 * Normalization strips separators so IDs like "coach1" and "coach-1" match.
 */

export function normalizeAccountId(id: string): string {
  return id.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function accountIdsMatch(left: string, right: string): boolean {
  return normalizeAccountId(left) === normalizeAccountId(right);
}

export function accountIdInAliases(candidate: string, aliases: readonly string[]): boolean {
  const normalizedCandidate = normalizeAccountId(candidate);
  return aliases.some((alias) => normalizeAccountId(alias) === normalizedCandidate);
}
