export const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const HOURS = Array.from({ length: 13 }, (_, i) => i + 7);

export const formatHourLabel = (hour: number): string => {
  if (hour === 12) return '12p';
  if (hour > 12) return `${hour - 12}p`;
  return `${hour}a`;
};
