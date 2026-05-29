import { useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';

import { Column } from '@/components/primitives/column';
import { Clickable } from '@/components/primitives/clickable';
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

export const AttendanceHeatmap = function AttendanceHeatmap({ dates }: AttendanceHeatmapProps) {
  const { colors } = useTheme();
  const [selectedCellKey, setSelectedCellKey] = useState<string | null>(null);

  const cells = (() => {
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
        dateKey: toDateKey(day),
        dateLabel: day.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
        count,
      };
    });
  })();

  const selectedCell = cells.find((cell) => cell.key === selectedCellKey) ?? null;
  const closeModal = () => setSelectedCellKey(null);

  const attendedDays = cells.reduce((total, cell) => total + (cell.count > 0 ? 1 : 0), 0);

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
              <Clickable
                key={cell.key}
                onPress={() => {
                  if (cell.count > 0) {
                    setSelectedCellKey(cell.key);
                  }
                }}
                disabled={cell.count === 0}
                accessibilityRole="button"
                accessibilityLabel={`${cell.dateLabel}: ${cell.count} session${cell.count === 1 ? '' : 's'}`}
                style={[
                  styles.cell,
                  {
                    backgroundColor: tone,
                    borderColor: withAlpha(colors.border, 0.4),
                    opacity: cell.count === 0 ? 1 : undefined,
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

      <Modal
        visible={Boolean(selectedCell)}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <Clickable style={[styles.modalBackdrop, { backgroundColor: withAlpha(colors.background, 0.86) }]} onPress={closeModal}>
          <SurfaceCard style={styles.modalCard}>
            <Column gap="xs">
              <ThemedText style={styles.title}>{selectedCell?.dateLabel ?? 'Attendance'}</ThemedText>
              <ThemedText style={[styles.subtitle, { color: colors.muted }]}>
                {selectedCell?.count ?? 0} session{(selectedCell?.count ?? 0) === 1 ? '' : 's'} attended
              </ThemedText>
              <ThemedText style={[styles.legendText, { color: colors.muted }]}>
                Detailed session drill-down is not available in this view yet.
              </ThemedText>
              <Clickable
                onPress={closeModal}
                style={[styles.closeChip, { borderColor: colors.border }]}
              >
                <ThemedText style={{ color: colors.text }}>Close</ThemedText>
              </Clickable>
            </Column>
          </SurfaceCard>
        </Clickable>
      </Modal>
    </SurfaceCard>
  );
};

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
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 320,
    padding: Spacing.md,
  },
  closeChip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.xs,
  },
});
