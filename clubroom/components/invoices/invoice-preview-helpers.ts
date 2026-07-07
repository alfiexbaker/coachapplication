export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

const INTERNAL_IDENTIFIER_PATTERN = /\b[a-z]{2,10}_[A-Za-z0-9-]{6,}\b/i;

export function formatInvoicePartyName(value: string | undefined, fallback: string): string {
  const label = value?.trim();

  if (!label || INTERNAL_IDENTIFIER_PATTERN.test(label)) {
    return fallback;
  }

  return label;
}
