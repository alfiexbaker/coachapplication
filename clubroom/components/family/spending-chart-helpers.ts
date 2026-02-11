import type { ThemeColors } from '@/hooks/useTheme';

export function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('en-GB', { month: 'short' });
}

export function getTrendDisplay(
  trend: 'up' | 'down' | 'stable' | undefined,
  percent: number | undefined,
  palette: ThemeColors,
) {
  if (!trend || !percent) return null;
  const iconName = trend === 'up' ? 'trending-up' : trend === 'down' ? 'trending-down' : 'remove';
  const color = trend === 'up' ? palette.error : trend === 'down' ? palette.success : palette.muted;
  return { iconName, color, percent };
}
