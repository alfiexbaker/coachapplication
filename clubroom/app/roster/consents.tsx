/**
 * Consent Dashboard Screen
 *
 * Quick view of athlete consent statuses with search, filters, and stat cards.
 * All state/logic in useConsents hook. StatCard kept inline (small).
 */

import { View, StyleSheet, FlatList, RefreshControl, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState } from '@/components/ui/screen-states';
import { ConsentCard } from '@/components/consent/ConsentCard';
import { ConsentFilter } from '@/components/consent/ConsentFilter';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useConsents } from '@/hooks/use-consents';
import { CONSENT_TYPE_LABELS } from '@/services/consent-service';
import { consentService } from '@/services/consent-service';
import type { AthleteConsent, ConsentType } from '@/constants/types';

function StatCard({ type, granted, denied, isActive, onPress }: {
  type: ConsentType; granted: number; denied: number; isActive: boolean; onPress: () => void;
}) {
  const { colors: palette } = useTheme();
  const total = granted + denied;
  const pct = total > 0 ? Math.round((granted / total) * 100) : 0;
  return (
    <Clickable onPress={onPress} style={[styles.statCard, {
      backgroundColor: isActive ? withAlpha(palette.tint, 0.06) : palette.surface,
      borderColor: isActive ? palette.tint : palette.border,
    }]}>
      <Row align="center" gap="xxs" style={styles.statHeader}>
        <Ionicons name={consentService.getConsentIcon(type) as keyof typeof Ionicons.glyphMap} size={18} color={isActive ? palette.tint : palette.muted} />
        <ThemedText style={[styles.statLabel, { color: isActive ? palette.tint : palette.muted }]} numberOfLines={1}>{CONSENT_TYPE_LABELS[type]}</ThemedText>
      </Row>
      <Row align="baseline" justify="space-between" style={styles.statNumbers}>
        <ThemedText style={[styles.statPct, { color: palette.success }]}>{pct}%</ThemedText>
        <ThemedText style={[styles.statDetail, { color: palette.muted }]}>{granted}/{total}</ThemedText>
      </Row>
    </Clickable>
  );
}

export default function ConsentsScreen() {
  const { colors: palette } = useTheme();
  const c = useConsents();

  const renderItem = ({ item, index }: { item: AthleteConsent; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 30).springify()}>
      <ConsentCard athleteConsent={item} onPress={() => router.push(Routes.rosterAthlete(item.athleteId))} />
    </Animated.View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <Row align="center" gap="md" style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}><Ionicons name="arrow-back" size={24} color={palette.text} /></Clickable>
        <View style={styles.headerTitle}>
          <ThemedText type="title">Consent Dashboard</ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>Quick view before posting content</ThemedText>
        </View>
      </Row>

      {c.summary && (
        <View style={styles.statsContainer}>
          {[c.consentTypes.slice(0, 2), c.consentTypes.slice(2)].map((row, i) => (
            <Row key={i} gap="xs" style={styles.statsRow}>
              {row.map((type) => {
                const stat = c.summary!.byType[type];
                return <StatCard key={type} type={type} granted={stat.granted} denied={stat.denied}
                  isActive={c.selectedType === type} onPress={() => c.handleStatCardPress(type)} />;
              })}
            </Row>
          ))}
        </View>
      )}

      <Row gap="sm" style={styles.searchSection}>
        <Row align="center" gap="xs" style={[styles.searchBar, { backgroundColor: palette.surface }]}>
          <Ionicons name="search" size={18} color={palette.muted} />
          <TextInput style={[styles.searchInput, { color: palette.text }]} placeholder="Search athletes..."
            placeholderTextColor={palette.muted} value={c.searchQuery} onChangeText={c.setSearchQuery} />
          {c.searchQuery.length > 0 && <Clickable accessibilityLabel="Clear search" onPress={c.clearSearch}><Ionicons name="close-circle" size={18} color={palette.muted} /></Clickable>}
        </Row>
        <Clickable onPress={c.toggleFilters} style={[styles.filterButton, {
          backgroundColor: c.activeFiltersCount > 0 ? palette.tint : palette.surface,
        }]}>
          <Ionicons name="options-outline" size={20} color={c.activeFiltersCount > 0 ? palette.onPrimary : palette.text} />
          {c.activeFiltersCount > 0 && (
            <View style={[styles.filterBadge, { backgroundColor: palette.surface }]}>
              <ThemedText style={[styles.filterBadgeText, { color: palette.text }]}>{c.activeFiltersCount}</ThemedText>
            </View>
          )}
        </Clickable>
      </Row>

      {c.showFilters && (
        <Animated.View entering={FadeInDown.springify()} style={styles.filtersContainer}>
          <ConsentFilter filters={c.filters} onFilterChange={c.handleFilterChange} />
        </Animated.View>
      )}

      {c.loading ? (
        <LoadingState variant="list" />
      ) : (
        <FlatList data={c.consents} keyExtractor={(item) => item.athleteId} renderItem={renderItem}
          contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={c.refreshing} onRefresh={c.onRefresh} tintColor={palette.tint} />}
          ListEmptyComponent={
            <EmptyState icon="shield-checkmark-outline" title="No athletes found"
              message={c.searchQuery || c.activeFiltersCount > 0 ? 'Try adjusting your search or filters' : 'No athletes in your roster have consent data yet.'}
              actionLabel={c.activeFiltersCount > 0 ? 'Clear Filters' : undefined}
              onPressAction={c.activeFiltersCount > 0 ? c.clearFilters : undefined} />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  headerTitle: { flex: 1 },
  subtitle: { ...Typography.small, marginTop: Spacing.micro },
  statsContainer: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md, gap: Spacing.xs },
  statsRow: {},
  statCard: { flex: 1, padding: Spacing.sm, borderRadius: Radii.md, borderWidth: 1, gap: Spacing.xs },
  statHeader: {},
  statLabel: { ...Typography.caption, flex: 1 },
  statNumbers: {},
  statPct: { ...Typography.heading },
  statDetail: { ...Typography.caption },
  searchSection: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  searchBar: { flex: 1, paddingHorizontal: Spacing.md, height: 44, borderRadius: Radii.md },
  searchInput: { flex: 1, ...Typography.body },
  filterButton: { width: 44, height: 44, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  filterBadge: { position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: Radii.sm, alignItems: 'center', justifyContent: 'center' },
  filterBadgeText: { ...Typography.micro },
  filtersContainer: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  listContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  separator: { height: Spacing.sm },
  loadingContainer: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  skeletonCard: { padding: Spacing.md, borderRadius: Radii.md, gap: Spacing.sm },
  skeletonHeader: {},
  skeletonInfo: { flex: 1, gap: Spacing.xs },
});
