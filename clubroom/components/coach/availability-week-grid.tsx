import { View, StyleSheet, FlatList, Platform, type ListRenderItemInfo } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { AvailabilityTemplate, AvailabilityOverride } from '@/constants/types';
import { useTheme } from '@/hooks/useTheme';

import { GridLegend, DayColumnHeaders } from './availability-week-grid-sections';
import { DAYS_SHORT, HOURS, formatHourLabel } from './availability-week-grid-helpers';
import { Row } from '@/components/primitives';
import { DemoBanner } from '@/utils/demo-mode';
import { isDemoMode } from '@/utils/demo-mode-helpers';

// Re-export extracted components for backward compat
export { GridLegend, DayColumnHeaders } from './availability-week-grid-sections';
export type { GridLegendProps, DayColumnHeadersProps } from './availability-week-grid-sections';

const EMPTY_OVERRIDES: AvailabilityOverride[] = [];

interface AvailabilityWeekGridProps {
  templates: AvailabilityTemplate[];
  overrides?: AvailabilityOverride[];
  onSlotPress: (dayOfWeek: number, hour: number) => void;
  onSlotLongPress?: (template: AvailabilityTemplate) => void;
}

export function AvailabilityWeekGrid({
  templates,
  overrides = EMPTY_OVERRIDES,
  onSlotPress,
  onSlotLongPress,
}: AvailabilityWeekGridProps) {
  const { colors: palette } = useTheme();
  const demoMode = isDemoMode();
  const todayIndex = new Date().getDay();

  const slotLookup = (() => {
    const lookup = new Map<string, AvailabilityTemplate>();
    for (const t of templates) {
      const [startH] = t.startTime.split(':').map(Number);
      const [endH] = t.endTime.split(':').map(Number);
      for (let h = startH; h < endH; h++) {
        lookup.set(`${t.dayOfWeek}-${h}`, t);
      }
    }
    return lookup;
  })();

  const getSlotTemplate = (day: number, hour: number) => slotLookup.get(`${day}-${hour}`);

  const handlePress = (day: number, hour: number) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSlotPress(day, hour);
  };

  const handleLongPress = (day: number, hour: number) => {
    const template = getSlotTemplate(day, hour);
    if (template && onSlotLongPress) {
      if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onSlotLongPress(template);
    }
  };

  const dayCounts = (() => {
    const counts: number[] = [0, 0, 0, 0, 0, 0, 0];
    for (const t of templates) counts[t.dayOfWeek]++;
    return counts;
  })();
  const hourRows = getAvailabilityHourRows(
    HOURS,
    palette,
    getSlotTemplate,
    handlePress,
    handleLongPress,
  );

  return (
    <SurfaceCard style={styles.container}>
      {demoMode ? (
        <DemoBanner message="Weekly availability overview may be populated from demo/mock templates in this environment." />
      ) : null}
      <Row style={styles.headerRow}>
        <ThemedText type="defaultSemiBold">Weekly Overview</ThemedText>
        <GridLegend palette={palette} />
      </Row>

      <DayColumnHeaders todayIndex={todayIndex} dayCounts={dayCounts} palette={palette} />

      <FlatList
        data={hourRows}
        keyExtractor={keyAvailabilityHourRow}
        renderItem={renderAvailabilityHourRow}
        style={styles.gridScroll}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      />
    </SurfaceCard>
  );
}

interface AvailabilityCellItem {
  key: string;
  dayIndex: number;
  isAvailable: boolean;
  palette: ReturnType<typeof useTheme>['colors'];
  onPress: () => void;
  onLongPress: () => void;
}

interface AvailabilityHourRow {
  key: string;
  hour: number;
  muted: string;
  cells: AvailabilityCellItem[];
}

function getAvailabilityHourRows(
  hours: number[],
  palette: ReturnType<typeof useTheme>['colors'],
  getSlotTemplate: (day: number, hour: number) => AvailabilityTemplate | undefined,
  handlePress: (day: number, hour: number) => void,
  handleLongPress: (day: number, hour: number) => void,
): AvailabilityHourRow[] {
  return hours.map((hour) => ({
    key: String(hour),
    hour,
    muted: palette.muted,
    cells: DAYS_SHORT.map((_, dayIndex) => ({
      key: `${dayIndex}-${hour}`,
      dayIndex,
      isAvailable: !!getSlotTemplate(dayIndex, hour),
      palette,
      onPress: () => handlePress(dayIndex, hour),
      onLongPress: () => handleLongPress(dayIndex, hour),
    })),
  }));
}

function keyAvailabilityHourRow(item: AvailabilityHourRow) {
  return item.key;
}

function renderAvailabilityHourRow({ item }: ListRenderItemInfo<AvailabilityHourRow>) {
  return (
    <Row style={styles.gridRow}>
      <View style={styles.hourLabel}>
        <ThemedText style={[styles.hourText, { color: item.muted }]}>
          {formatHourLabel(item.hour)}
        </ThemedText>
      </View>
      {item.cells.map((cell) => (
        <Clickable
          key={cell.key}
          onPress={cell.onPress}
          onLongPress={cell.onLongPress}
          delayLongPress={500}
          style={[
            styles.gridCell,
            {
              backgroundColor: cell.isAvailable
                ? withAlpha(cell.palette.success, 0.15)
                : cell.palette.background,
              borderColor: cell.isAvailable
                ? withAlpha(cell.palette.success, 0.38)
                : cell.palette.border,
            },
          ]}
        >
          {cell.isAvailable && (
            <View style={[styles.cellIndicator, { backgroundColor: cell.palette.success }]} />
          )}
        </Clickable>
      ))}
    </Row>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.sm,
    gap: Spacing.xs,
  },
  headerRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  gridScroll: {
    maxHeight: 280,
  },
  gridRow: {
    alignItems: 'center',
    height: 28,
  },
  hourLabel: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hourText: {
    fontSize: Typography.micro.fontSize,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  gridCell: {
    flex: 1,
    height: 24,
    marginHorizontal: 1,
    marginVertical: 1,
    borderRadius: Radii.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellIndicator: {
    width: 5,
    height: 5,
    borderRadius: Radii.xs,
  },
});
