import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SessionOfferingCard } from '@/components/sessions/session-offering-card';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { Skeleton } from '@/components/ui/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { SessionOffering } from '@/constants/session-types';

export interface SessionTypeFilterOption {
  id: string;
  label: string;
  count: number;
}

interface SessionTypeSelectorProps {
  activeFilter: string;
  filters: SessionTypeFilterOption[];
  loading?: boolean;
  offerings: SessionOffering[];
  onChangeFilter: (id: string) => void;
  onResetFilter?: () => void;
  onSelect: (id: string) => void;
  selected?: string | null;
}

export function SessionTypeSelector({
  activeFilter,
  filters,
  loading,
  offerings,
  onChangeFilter,
  onResetFilter,
  onSelect,
  selected,
}: SessionTypeSelectorProps) {
  const { colors: palette } = useTheme();
  const activeFilterLabel =
    filters.find((filter) => filter.id === activeFilter)?.label ?? 'All Sessions';

  if (loading) {
    return (
      <View style={styles.catalog}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} width={110} height={38} radius={Radii.pill} />
          ))}
        </ScrollView>
        <View style={styles.list}>
          {Array.from({ length: 3 }).map((_, index) => (
            <SurfaceCard key={index} loading style={styles.loadingCard} tactile={false}>
              <View style={styles.loadingCardContent}>
                <Row align="center" gap="sm">
                  <Skeleton width={40} height={40} radius={Radii.full} />
                  <View style={styles.loadingCardCopy}>
                    <Skeleton width="58%" height={16} />
                    <Skeleton width="34%" height={12} />
                  </View>
                </Row>
                <Skeleton width="86%" height={12} />
                <Skeleton width="72%" height={12} />
              </View>
            </SurfaceCard>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.catalog}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScrollContent}
      >
        {filters.map((filter) => {
          const active = filter.id === activeFilter;
          return (
            <Clickable
              key={filter.id}
              onPress={() => onChangeFilter(filter.id)}
              style={[
                styles.filterChip,
                {
                  borderColor: active ? palette.tint : palette.border,
                  backgroundColor: active ? palette.tint : palette.surface,
                },
              ]}
              accessibilityLabel={`${filter.label}, ${filter.count} sessions`}
              accessibilityState={{ selected: active }}
            >
              <ThemedText
                style={[
                  styles.filterChipText,
                  { color: active ? palette.onPrimary : palette.text },
                ]}
              >
                {filter.label}
              </ThemedText>
              <View
                style={[
                  styles.filterCount,
                  {
                    backgroundColor: active
                      ? withAlpha(palette.onPrimary, 0.16)
                      : withAlpha(palette.muted, 0.18),
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.filterCountText,
                    { color: active ? palette.onPrimary : palette.muted },
                  ]}
                >
                  {filter.count}
                </ThemedText>
              </View>
            </Clickable>
          );
        })}
      </ScrollView>

      {offerings.length === 0 ? (
        <SurfaceCard style={styles.emptyCard} tactile={false}>
          <Row align="center" gap="sm" style={styles.emptyRow}>
            <View style={[styles.emptyIcon, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
              <Ionicons name="albums-outline" size={18} color={palette.tint} />
            </View>
            <View style={styles.emptyCopy}>
              <ThemedText type="defaultSemiBold">
                No {activeFilterLabel.toLowerCase()} live right now
              </ThemedText>
              <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
                Try another category or switch back to all sessions.
              </ThemedText>
            </View>
          </Row>
          {activeFilter !== 'all' && onResetFilter ? (
            <Clickable
              onPress={onResetFilter}
              style={[
                styles.resetChip,
                {
                  borderColor: withAlpha(palette.tint, 0.28),
                  backgroundColor: withAlpha(palette.tint, 0.05),
                },
              ]}
            >
              <Row align="center" justify="center" gap="xs">
                <Ionicons name="grid-outline" size={16} color={palette.tint} />
                <ThemedText style={[styles.resetChipText, { color: palette.tint }]}>
                  View all sessions
                </ThemedText>
              </Row>
            </Clickable>
          ) : null}
        </SurfaceCard>
      ) : (
        <View style={styles.list}>
          {offerings.map((offering) => (
            <SessionOfferingCard
              key={offering.id}
              offering={offering}
              onPress={() => onSelect(offering.id)}
              selected={selected === offering.id}
              selectionMode="select"
              showCapacity
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  catalog: {
    gap: Spacing.md,
  },
  filterScrollContent: {
    gap: Spacing.xs,
    paddingRight: Spacing.md,
    paddingVertical: Spacing.micro,
  },
  filterChip: {
    minHeight: 40,
    borderRadius: Radii.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: Spacing.xxs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  filterChipText: {
    ...Typography.bodySmallSemiBold,
  },
  filterCount: {
    minWidth: 24,
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterCountText: {
    ...Typography.caption,
    fontWeight: '700',
  },
  list: {
    gap: Spacing.sm,
  },
  loadingCard: {
    padding: Spacing.sm,
  },
  loadingCardContent: {
    gap: Spacing.sm,
  },
  loadingCardCopy: {
    flex: 1,
    gap: Spacing.xs,
  },
  emptyCard: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  emptyRow: {
    alignItems: 'flex-start',
  },
  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCopy: {
    flex: 1,
    gap: Spacing.xxs,
  },
  emptyText: {
    ...Typography.bodySmall,
  },
  resetChip: {
    minHeight: 42,
    borderRadius: Radii.button,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  resetChipText: {
    ...Typography.bodySmallSemiBold,
  },
});
