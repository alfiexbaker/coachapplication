type LocalDateTimeParts = {
  date: string;
  time: string;
};

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  const cached = formatterCache.get(timeZone);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat('en-GB-u-ca-gregory-nu-latn', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  formatterCache.set(timeZone, formatter);
  return formatter;
}

function partsForInstant(instant: Date, timeZone: string): Record<string, string> {
  return Object.fromEntries(
    formatterFor(timeZone)
      .formatToParts(instant)
      .filter((part) => ['year', 'month', 'day', 'hour', 'minute', 'second'].includes(part.type))
      .map((part) => [part.type, part.value]),
  );
}

function parseLocalDateTime(
  date: string,
  time: string,
): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  naiveUtcMs: number;
} | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!dateMatch || !timeMatch) {
    return null;
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const naiveUtcMs = Date.UTC(year, month - 1, day, hour, minute);
  const roundTrip = new Date(naiveUtcMs);
  if (
    roundTrip.getUTCFullYear() !== year ||
    roundTrip.getUTCMonth() !== month - 1 ||
    roundTrip.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day, hour, minute, naiveUtcMs };
}

function offsetMinutesAt(instant: Date, timeZone: string): number {
  const parts = partsForInstant(instant, timeZone);
  const representedUtcMs = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return Math.round((representedUtcMs - instant.getTime()) / 60_000);
}

export function isSupportedTimeZone(timeZone: string): boolean {
  try {
    formatterFor(timeZone).format(new Date(0));
    return true;
  } catch {
    formatterCache.delete(timeZone);
    return false;
  }
}

export function formatInstantInTimeZone(instant: Date, timeZone: string): LocalDateTimeParts {
  const parts = partsForInstant(instant, timeZone);
  if (!parts.year || !parts.month || !parts.day || !parts.hour || !parts.minute) {
    throw new RangeError('Unable to format the instant in the requested time zone');
  }
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

export function localDateTimeToUtc(date: string, time: string, timeZone: string): Date | null {
  const local = parseLocalDateTime(date, time);
  if (!local || !isSupportedTimeZone(timeZone)) {
    return null;
  }

  const offsets = new Set<number>();
  for (const hoursFromNaive of [-48, -24, 0, 24, 48]) {
    offsets.add(offsetMinutesAt(new Date(local.naiveUtcMs + hoursFromNaive * 3_600_000), timeZone));
  }

  const matches = [...offsets]
    .map((offsetMinutes) => new Date(local.naiveUtcMs - offsetMinutes * 60_000))
    .filter((candidate) => {
      const parts = formatInstantInTimeZone(candidate, timeZone);
      return parts.date === date && parts.time === time;
    })
    .sort((left, right) => left.getTime() - right.getTime());

  // During a fall-back overlap, choose the first occurrence consistently.
  return matches[0] ?? null;
}
