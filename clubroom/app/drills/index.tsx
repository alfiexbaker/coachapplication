import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { DrillList } from '@/components/drills';
import { DrillStatsCard } from '@/components/drills/drill-stats-card';
import { DrillTabFilter } from '@/components/drills/drill-tab-filter';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Spacing, Typography } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { useDrillsScreen } from '@/hooks/use-drills-screen';
import { scaleFont } from '@/utils/scale';

export default function DrillsDashboardScreen() {
  const { colors } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const {
    stats, loading, status, error, refreshing, onRefresh, retry, activeTab, filteredAssignments,
    handleAssignmentPress, handleComplete, handleTabChange,
  } = useDrillsScreen();

  if (status === 'loading') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <Row align="center" justify="space-between" style={styles.header}>
          <Row gap="md" align="center">
            <Clickable onPress={() => router.back()} hitSlop={8}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </Clickable>
            <ThemedText type="title" style={styles.headerTitle}>My Drills</ThemedText>
          </Row>
        </Row>
        <LoadingState variant="list" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <Row align="center" justify="space-between" style={styles.header}>
          <Row gap="md" align="center">
            <Clickable onPress={() => router.back()} hitSlop={8}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </Clickable>
            <ThemedText type="title" style={styles.headerTitle}>My Drills</ThemedText>
          </Row>
        </Row>
        <ErrorState message={error?.message ?? 'Failed to load drills.'} onRetry={retry} />
      </SafeAreaView>
    );
  }

  if (status === 'empty') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <Row align="center" justify="space-between" style={styles.header}>
          <Row gap="md" align="center">
            <Clickable onPress={() => router.back()} hitSlop={8}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </Clickable>
            <ThemedText type="title" style={styles.headerTitle}>My Drills</ThemedText>
          </Row>
        </Row>
        <ScrollView
          contentContainerStyle={styles.emptyContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <EmptyState
            icon="fitness-outline"
            title="No drills assigned"
            message="Ask your coach to assign drills, then pull down to refresh."
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <Row align="center" justify="space-between" style={styles.header}>
        <Row gap="md" align="center">
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Clickable>
          <ThemedText type="title" style={styles.headerTitle}>My Drills</ThemedText>
        </Row>
      </Row>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {stats && <DrillStatsCard stats={stats} colors={colors} />}

        <DrillTabFilter activeTab={activeTab} stats={stats} colors={colors} onTabChange={handleTabChange} />

        <View style={styles.listSection}>
          <DrillList
            assignments={filteredAssignments}
            onAssignmentPress={handleAssignmentPress}
            onAssignmentComplete={handleComplete}
            loading={loading}
            emptyMessage={activeTab === 'pending' ? 'No pending drills' : activeTab === 'completed' ? 'No completed drills yet' : 'No drills assigned'}
            emptyDescription={activeTab === 'pending' ? "Great job! You've completed all your drills." : activeTab === 'completed' ? 'Complete some drills to see them here.' : 'Ask your coach to assign some drills.'}
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
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  emptyContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  listSection: { flex: 1 },
});
