/**
 * Goal Details Screen
 *
 * Displays detailed information about a goal including progress,
 * milestones, and actions. Supports editing, completing, and deleting goals.
 * Shows celebration animation when a goal is completed.
 */

import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { MilestoneList } from '@/components/goals';
import { GoalHeroSection } from '@/components/goals/goal-hero-section';
import { GoalMetaCard } from '@/components/goals/goal-meta-card';
import { GoalActionsSection } from '@/components/goals/goal-actions-section';
import { GoalCelebrationModal } from '@/components/goals/goal-celebration-modal';
import { Spacing, Typography } from '@/constants/theme';
import { scaleFont } from '@/utils/scale';
import { useTheme } from '@/hooks/useTheme';
import { useGoalDetail } from '@/hooks/use-goal-detail';

export default function GoalDetailScreen() {
  const { colors } = useTheme();
  const {
    goal, loading, refreshing, showCelebration,
    confettiRef, celebrationStyle, isOwner,
    handleRefresh, handleToggleMilestone, handleAddMilestone,
    handleDeleteMilestone, handleStatusChange, handleDelete,
  } = useGoalDetail();

  if (loading || !goal) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <Row gap="md" align="center" style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Clickable>
        </Row>
        <View style={styles.loadingContainer}>
          <ThemedText style={{ color: colors.muted }}>{loading ? 'Loading goal...' : 'Goal not found'}</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Row align="center" justify="space-between" style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Clickable>
        {isOwner && (
          <Row gap="md" align="center">
            <Clickable onPress={() => router.push(Routes.GOALS_CREATE)} hitSlop={8}>
              <Ionicons name="pencil-outline" size={22} color={colors.text} />
            </Clickable>
            <Clickable accessibilityLabel="Delete goal" onPress={handleDelete} hitSlop={8}>
              <Ionicons name="trash-outline" size={22} color={colors.error} />
            </Clickable>
          </Row>
        )}
      </Row>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <GoalHeroSection goal={goal} />
        <GoalMetaCard goal={goal} />

        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.section}>
          <ThemedText type="subtitle" style={{ marginBottom: Spacing.sm }}>Milestones</ThemedText>
          <SurfaceCard style={{ padding: Spacing.md }}>
            <MilestoneList
              milestones={goal.milestones}
              onToggleMilestone={isOwner ? handleToggleMilestone : undefined}
              onDeleteMilestone={isOwner ? handleDeleteMilestone : undefined}
              onAddMilestone={isOwner ? handleAddMilestone : undefined}
              editable={isOwner && goal.status === 'ACTIVE'}
              showAddInput={isOwner && goal.status === 'ACTIVE'}
            />
          </SurfaceCard>
        </Animated.View>

        {isOwner && <GoalActionsSection status={goal.status} onStatusChange={handleStatusChange} />}

        <View style={[styles.createdInfo, { borderTopColor: colors.border }]}>
          <ThemedText style={[styles.createdText, { color: colors.muted }]}>
            Created by {goal.createdBy.toLowerCase()} on{' '}
            {new Date(goal.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </ThemedText>
        </View>
      </ScrollView>

      <GoalCelebrationModal
        visible={showCelebration}
        title={goal.title}
        confettiRef={confettiRef}
        celebrationStyle={celebrationStyle}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  section: { marginBottom: Spacing.md },
  createdInfo: { paddingTop: Spacing.md, borderTopWidth: 1, marginTop: Spacing.md },
  createdText: { ...Typography.caption, fontSize: scaleFont(Typography.caption.fontSize), textAlign: 'center' },
});
