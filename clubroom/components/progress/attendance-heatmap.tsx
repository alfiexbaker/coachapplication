import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface AttendanceHeatmapProps {
  dates: string[];
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export const AttendanceHeatmap = memo(function AttendanceHeatmap({ dates }: AttendanceHeatmapProps) {
  const { colors } = useTheme();

  const cells = useMemo(() => {
    const countsByDate = dates.reduce<Record<string, number>>((acc, dateString) => {
      const parsed = new Date(dateString);
      if (Number.isNaN(parsed.getTime())) {
        return acc;
      }
      const key = toDateKey(parsed);
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - 41);

    return Array.from({ length: 42 }).map((_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      const count = countsByDate[toDateKey(day)] ?? 0;
      return {
        key: `${day.toISOString()}_${index}`,
        count,
      };
    });
  }, [dates]);

  const attendedDays = useMemo(
    () => cells.reduce((total, cell) => total + (cell.count > 0 ? 1 : 0), 0),
    [cells],
  );

  return (
    <SurfaceCard style={styles.card}>
      <Column gap="xs">
        <ThemedText style={styles.title}>Attendance Heatmap</ThemedText>
        <ThemedText style={[styles.subtitle, { color: colors.muted }]}>
          Last 6 weeks · {attendedDays} active day{attendedDays === 1 ? '' : 's'}
        </ThemedText>

        <Row wrap gap="xxs" style={styles.grid}>
          {cells.map((cell) => {
            const tone =
              cell.count >= 2
                ? withAlpha(colors.tint, 0.86)
                : cell.count === 1
                  ? withAlpha(colors.tint, 0.46)
                  : withAlpha(colors.border, 0.3);

            return (
              <View
                key={cell.key}
                style={[
                  styles.cell,
                  {
                    backgroundColor: tone,
                    borderColor: withAlpha(colors.border, 0.4),
                  },
                ]}
              />
            );
          })}
        </Row>

        <Row align="center" gap="xs">
          <ThemedText style={[styles.legendText, { color: colors.muted }]}>Low</ThemedText>
          <View style={[styles.legendSwatch, { backgroundColor: withAlpha(colors.border, 0.3) }]} />
          <View style={[styles.legendSwatch, { backgroundColor: withAlpha(colors.tint, 0.46) }]} />
          <View style={[styles.legendSwatch, { backgroundColor: withAlpha(colors.tint, 0.86) }]} />
          <ThemedText style={[styles.legendText, { color: colors.muted }]}>High</ThemedText>
        </Row>
      </Column>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  card: {
    gap: Spacing.sm,
  },
  title: {
    ...Typography.subheading,
    fontWeight: '700',
  },
  subtitle: {
    ...Typography.caption,
  },
  grid: {
    maxWidth: 7 * 18 + 6 * 4,
  },
  cell: {
    width: 18,
    height: 18,
    borderRadius: Radii.xs,
    borderWidth: 1,
  },
  legendSwatch: {
    width: 16,
    height: 16,
    borderRadius: Radii.xs,
  },
  legendText: {
    ...Typography.caption,
  },
});
