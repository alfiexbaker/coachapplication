const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function formatRosterNextSession(value: string): string {
  const dateOnly = DATE_ONLY.test(value);
  const date = new Date(dateOnly ? `${value}T12:00:00` : value);

  if (Number.isNaN(date.getTime())) return 'Date to be confirmed';

  const weekday = date.toLocaleDateString('en-GB', { weekday: 'short' });
  const dayAndMonth = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
  const dateLabel = `${weekday}, ${dayAndMonth}`;

  if (dateOnly) return `${dateLabel} · Time TBC`;

  return `${dateLabel} at ${date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}
