type DateInput = Date | string | number;

export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatInUserTimezone(
  value: DateInput,
  options: Intl.DateTimeFormatOptions,
  locale = 'en-GB',
): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString(locale, {
    ...options,
    timeZone: getUserTimezone(),
  });
}
