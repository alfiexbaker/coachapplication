import { StyleSheet } from 'react-native';

import { Components, Fonts, Spacing, Typography } from '@/constants/theme';

/** Parse `YYYY-MM-DD` into a Date, fallback to today */
export function parseDateValue(value: string): Date {
  if (!value) return new Date();
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
}

/** Parse `HH:mm` into a Date (today with that time), fallback to now */
export function parseTimeValue(value: string): Date {
  if (!value) return new Date();
  const [h, m] = value.split(':').map(Number);
  if (h == null || m == null || isNaN(h) || isNaN(m)) return new Date();
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

/** Format Date -> `HH:mm` */
export function formatTimeString(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

/** Display-friendly en-GB date: `15 Jan 2026` */
export function displayDate(value: string): string {
  if (!value) return '';
  const d = parseDateValue(value);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Display-friendly 24hr time: `16:00` */
export function displayTime(value: string): string {
  if (!value) return '';
  return value;
}

export const styles = StyleSheet.create({
  container: {
    gap: Spacing.xxs,
  },
  label: {
    ...Typography.caption,
    fontWeight: '500',
    fontFamily: Fonts?.sans,
  },
  button: {
    height: Components.input.height,
    borderRadius: Components.input.borderRadius,
    paddingHorizontal: Components.input.paddingHorizontal,
    borderWidth: 1,
  },
  valueText: {
    fontSize: Typography.body.fontSize,
    lineHeight: Typography.body.lineHeight,
    fontFamily: Fonts?.sans,
    flex: 1,
  },
  helperBase: {
    ...Typography.caption,
    fontFamily: Fonts?.sans,
  },
  modalOverlay: {
    flex: 1,
  },
  modalSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 34,
  },
  modalHeader: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  modalButtonText: {
    ...Typography.body,
    fontWeight: '600',
    fontFamily: Fonts?.sans,
  },
});
