import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { DrillList } from '@/components/drills';
import { DrillCategoryFilter } from '@/components/drills/drill-category-filter';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { useDrillLibrary, CATEGORIES } from '@/hooks/use-drill-library';
import { drillService } from '@/services/drill-service';
import { scaleFont } from '@/utils/scale';

export default function DrillLibraryScreen() {
  const { colors } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const {
    drills, filteredDrills, loading, refreshing, categoryFilter, searchQuery, categoryCounts,
    handleRefresh, handleDrillPress, handleCreateDrill, handleCategoryChange,
  } = useDrillLibrary();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <Row justify="space-between" align="center" style={styles.header}>
        <Row gap="md" align="center">
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Clickable>
          <ThemedText type="title" style={styles.headerTitle}>Drill Library</ThemedText>
        </Row>
        <Clickable accessibilityLabel="Create drill" onPress={handleCreateDrill} style={[styles.addButton, { backgroundColor: colors.tint }]}>
          <Ionicons name="add" size={24} color={colors.onPrimary} />
        </Clickable>
      </Row>

      {/* Search */}
      <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.searchContainer}>
        <Row gap="sm" align="center" style={[styles.searchInput, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.muted} />
          <ThemedText style={[styles.searchPlaceholder, { color: colors.muted }]} numberOfLines={1}>
            {searchQuery || 'Search drills...'}
          </ThemedText>
        </Row>
      </Animated.View>

      {/* Category Filter */}
      <DrillCategoryFilter
        colors={colors}
        categories={CATEGORIES}
        categoryFilter={categoryFilter}
        categoryCounts={categoryCounts}
        onCategoryChange={handleCategoryChange}
      />

      {/* Stats Summary */}
      <Animated.View entering={FadeInDown.delay(200).springify()}>
        <Row align="center" justify="space-around" style={[styles.statsRow, { backgroundColor: colors.surface }]}>
          <View style={styles.statItem}>
            <ThemedText type="defaultSemiBold" style={styles.statValue}>{drills.length}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: colors.muted }]}>Total Drills</ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <ThemedText type="defaultSemiBold" style={styles.statValue}>{drills.filter((d) => d.videoUrl).length}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: colors.muted }]}>With Video</ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <ThemedText type="defaultSemiBold" style={styles.statValue}>{drills.reduce((sum, d) => sum + (d.assignmentCount ?? 0), 0)}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: colors.muted }]}>Assignments</ThemedText>
          </View>
        </Row>
      </Animated.View>

      {/* Drill List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <View style={styles.listContainer}>
          <DrillList
            drills={filteredDrills}
            onDrillPress={handleDrillPress}
            loading={loading}
            showAssignmentCount
            emptyMessage={categoryFilter ? `No ${drillService.getCategoryInfo(categoryFilter).label.toLowerCase()} drills` : 'No drills yet'}
            emptyDescription={categoryFilter ? 'Create a drill in this category to get started.' : 'Build your drill library to assign homework to athletes.'}
            onEmptyAction={handleCreateDrill}
            emptyActionLabel="Create First Drill"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  headerTitle: { ...Typography.display, fontSize: scaleFont(Typography.display.fontSize) },
  addButton: { width: 40, height: 40, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  searchContainer: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  searchInput: { height: 44, paddingHorizontal: Spacing.md, borderRadius: Radii.md, borderWidth: 1 },
  searchPlaceholder: { flex: 1, ...Typography.body, fontSize: scaleFont(Typography.body.fontSize) },
  statsRow: { marginHorizontal: Spacing.lg, marginBottom: Spacing.md, padding: Spacing.md, borderRadius: Radii.md },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { ...Typography.title, fontSize: scaleFont(Typography.title.fontSize) },
  statLabel: { ...Typography.caption, fontSize: scaleFont(Typography.caption.fontSize), marginTop: Spacing.micro },
  statDivider: { width: 1, height: 28 },
  scrollContent: { paddingBottom: Spacing.xl },
  listContainer: { paddingHorizontal: Spacing.lg },
});
