type Jsonish = null | boolean | number | string | Jsonish[] | { [key: string]: Jsonish };

function normalizeLegacyDateString(value: string): string {
  const currentYear = new Date().getUTCFullYear();
  const yearShift = currentYear - 2024;
  if (yearShift === 0) {
    return value;
  }

  return value.replace(/(^|[^0-9])(2023|2024)(?=-)/g, (match, prefix, year) => {
    const shiftedYear = String(Number(year) + yearShift);
    return `${prefix}${shiftedYear}`;
  });
}

function normalizeValue<T extends Jsonish>(value: T): T {
  if (typeof value === 'string') {
    return normalizeLegacyDateString(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item)) as T;
  }

  if (value && typeof value === 'object') {
    const normalized: Record<string, Jsonish> = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      normalized[key] = normalizeValue(nestedValue);
    }
    return normalized as T;
  }

  return value;
}

export function normalizeLegacyMockDates<T>(value: T): T {
  return normalizeValue(value as Jsonish) as T;
}
