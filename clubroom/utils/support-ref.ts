export function formatSupportRef(id?: string | null): string {
  const compact = (id ?? '').replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase();
  return compact ? `CR-${compact}` : 'Unavailable';
}
