import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { activeObjectives } from '@/constants/mock-data';

export default function ObjectivesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['bottom']}>
      <FlatList
        data={activeObjectives}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <ThemedView style={styles.header}>
            <ThemedText type="subtitle" style={styles.subtitle}>
              Track your football development goals and progress
            </ThemedText>
          </ThemedView>
        }
        renderItem={({ item }) => (
          <SurfaceCard style={styles.objectiveCard}>
            <View style={styles.objectiveHeader}>
              <View style={[styles.iconCircle, { backgroundColor: palette.tint + '20' }]}>
                <Ionicons name="football" size={24} color={palette.tint} />
              </View>
              <View style={styles.objectiveInfo}>
                <ThemedText type="subtitle">{item.objective}</ThemedText>
                <ThemedText style={styles.coachText}>with {item.coachName}</ThemedText>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <ThemedText style={styles.progressLabel}>Progress</ThemedText>
                <ThemedText style={styles.progressPercent}>{item.progress}%</ThemedText>
              </View>
              <View style={[styles.progressBar, { backgroundColor: palette.border }]}>
                <View
                  style={[
                    styles.progressFill,
                    { backgroundColor: palette.tint, width: `${item.progress}%` },
                  ]}
                />
              </View>
            </View>

            {/* Stats */}
            <View style={styles.stats}>
              <View style={styles.stat}>
                <Ionicons name="checkmark-circle" size={16} color={palette.tint} />
                <ThemedText style={styles.statText}>{item.sessionsCompleted} sessions</ThemedText>
              </View>
              <View style={styles.stat}>
                <Ionicons name="calendar-outline" size={16} color={palette.muted} />
                <ThemedText style={styles.statText}>Started {item.startDate}</ThemedText>
              </View>
            </View>
          </SurfaceCard>
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: palette.border }]}>
              <Ionicons name="football-outline" size={48} color={palette.muted} />
            </View>
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              No active objectives
            </ThemedText>
            <ThemedText style={styles.emptyDescription}>
              Set goals with your coach during sessions to track your progress
            </ThemedText>
          </View>
        }
      />

      {/* Add Objective Button */}
      <View style={[styles.footer, { backgroundColor: palette.background, borderTopColor: palette.border }]}>
        <Pressable
          onPress={() => alert('Add objective - coming soon!')}
          style={({ pressed }) => [
            styles.addButton,
            { backgroundColor: palette.tint },
            pressed && { opacity: 0.8 },
          ]}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
          <ThemedText style={styles.addButtonText} lightColor="#FFFFFF" darkColor="#000000">
            Add New Objective
          </ThemedText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.6,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  objectiveCard: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  objectiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  objectiveInfo: {
    flex: 1,
    gap: 4,
  },
  coachText: {
    fontSize: 14,
    opacity: 0.6,
  },
  progressSection: {
    gap: Spacing.xs,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.6,
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressBar: {
    height: 8,
    borderRadius: Radii.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radii.pill,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statText: {
    fontSize: 12,
    opacity: 0.6,
  },
  emptyState: {
    paddingVertical: Spacing.xl * 2,
    alignItems: 'center',
    gap: Spacing.md,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyDescription: {
    textAlign: 'center',
    opacity: 0.6,
    fontSize: 14,
    paddingHorizontal: Spacing.xl,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
