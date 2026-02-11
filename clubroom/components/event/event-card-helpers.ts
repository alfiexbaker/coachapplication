export function formatEventDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
