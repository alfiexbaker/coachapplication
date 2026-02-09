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
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useDrillsScreen } from '@/hooks/use-drills-screen';
import { scaleFont } from '@/utils/scale';

export default function DrillsDashboardScreen() {
  const { colors } = useTheme();
  const {
    stats, loading, refreshing, activeTab, filteredAssignments,
    handleRefresh, handleAssignmentPress, handleComplete, handleTabChange,
  } = useDrillsScreen();

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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
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
  listSection: { flex: 1 },
});
