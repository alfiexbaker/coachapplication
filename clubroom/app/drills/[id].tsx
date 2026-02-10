/**
 * Drill Detail Screen
 *
 * Shows full details of an assigned drill including video demonstration,
 * instructions, and completion controls. Delegates sections to extracted
 * sub-components under components/drills/.
 */

import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Row } from '@/components/primitives/row';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import {
  VideoPlayer,
  NoVideoPlaceholder,
  DrillInfoHeader,
  DrillCoachNotes,
  DrillInstructions,
  DrillFeedbackCard,
  DrillCompletionSection,
} from '@/components/drills';
import { Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import type { AssignedDrill } from '@/constants/types';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { drillService } from '@/services/drill-service';
import { scaleFont } from '@/utils/scale';
import { createLogger } from '@/utils/logger';

const logger = createLogger('DrillDetailScreen');

/**
 * Drill detail screen showing full assignment information and video.
 */
export default function DrillDetailScreen() {
  const { colors: palette } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const { id } = useLocalSearchParams<{ id: string }>();

  // State
  const [assignment, setAssignment] = useState<AssignedDrill | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const data = await drillService.getAssignmentById(id);
      setAssignment(data);
    } catch (error) {
      logger.error('Failed to load assignment:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleComplete = useCallback(async () => {
    if (!assignment) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setCompleting(true);
    try {
      await drillService.completeDrill(assignment.id, feedback.trim() || undefined);
      await loadData();
      setShowFeedbackInput(false);
      setFeedback('');
      Alert.alert('Drill Completed!', 'Great work on completing this drill. Keep up the momentum!', [{ text: 'OK' }]);
    } catch (error) {
      logger.error('Failed to complete drill:', error);
      Alert.alert('Error', 'Failed to mark drill as complete. Please try again.');
    } finally {
      setCompleting(false);
    }
  }, [assignment, feedback, loadData]);

  const handleUncomplete = useCallback(async () => {
    if (!assignment) return;
    Alert.alert('Mark as Incomplete?', 'This will move the drill back to your pending list.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark Incomplete',
        onPress: async () => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          try {
            await drillService.uncompleteDrill(assignment.id);
            await loadData();
          } catch (error) {
            logger.error('Failed to uncomplete drill:', error);
          }
        },
      },
    ]);
  }, [assignment, loadData]);

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ThemedText style={{ color: palette.muted }}>Loading drill...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  // Not found state
  if (!assignment || !assignment.drill) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <Row align="center" justify="space-between" style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
        </Row>
        <View style={styles.notFoundContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={palette.muted} />
          <ThemedText type="subtitle" style={{ marginTop: Spacing.md }}>
            Drill Not Found
          </ThemedText>
          <ThemedText style={{ color: palette.muted, marginTop: Spacing.xs }}>
            This drill may have been removed.
          </ThemedText>
          <Button onPress={() => router.back()} style={{ marginTop: Spacing.lg }}>
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const { drill } = assignment;
  const isOverdue = drillService.isOverdue(assignment);
  const isDueSoon = drillService.isDueSoon(assignment);
  const categoryInfo = drillService.getCategoryInfo(drill.category);

  const statusColor = assignment.isCompleted
    ? palette.success
    : isOverdue
      ? palette.error
      : isDueSoon
        ? palette.warning
        : palette.tint;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <Row align="center" justify="space-between" style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <Row align="center" gap="sm" style={styles.headerRight}>
          {assignment.isCompleted && (
            <Row align="center" gap="xxs" style={[styles.completedBadge, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
              <Ionicons name="checkmark-circle" size={16} color={palette.success} />
              <ThemedText style={[styles.completedBadgeText, { color: palette.success }]}>
                Completed
              </ThemedText>
            </Row>
          )}
        </Row>
      </Row>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Video Player */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          {drill.videoUrl ? (
            <VideoPlayer
              videoUrl={drill.videoUrl}
              thumbnailUrl={drill.thumbnailUrl}
              title={drill.title}
              duration={drill.duration}
              height={220}
            />
          ) : (
            <NoVideoPlaceholder message="No video demonstration" height={180} />
          )}
        </Animated.View>

        {/* Info Header: badges, title, due date, meta */}
        <Animated.View entering={FadeInDown.delay(150).springify()}>
          <DrillInfoHeader
            drill={drill}
            assignment={assignment}
            categoryInfo={categoryInfo}
            isOverdue={isOverdue}
            isDueSoon={isDueSoon}
            statusColor={statusColor}
            formattedDueDate={drillService.formatDueDate(assignment.dueDate)}
            formattedDuration={drillService.formatDuration(drill.duration)}
          />
        </Animated.View>

        {/* Coach Notes */}
        {assignment.notes && (
          <Animated.View entering={FadeInDown.delay(200).springify()}>
            <DrillCoachNotes notes={assignment.notes} coachName={assignment.assignedByName} />
          </Animated.View>
        )}

        {/* Instructions + Equipment */}
        <Animated.View entering={FadeInDown.delay(250).springify()}>
          <DrillInstructions description={drill.description} equipment={drill.equipment} />
        </Animated.View>

        {/* Athlete Feedback (if completed) */}
        {assignment.isCompleted && assignment.athleteFeedback && (
          <Animated.View entering={FadeInDown.delay(350).springify()}>
            <DrillFeedbackCard feedback={assignment.athleteFeedback} />
          </Animated.View>
        )}

        {/* Completion / Undo */}
        <Animated.View entering={FadeInUp.delay(400).springify()}>
          <DrillCompletionSection
            isCompleted={assignment.isCompleted}
            completing={completing}
            feedback={feedback}
            showFeedbackInput={showFeedbackInput}
            onFeedbackChange={setFeedback}
            onShowFeedbackInput={() => setShowFeedbackInput(true)}
            onComplete={handleComplete}
            onUncomplete={handleUncomplete}
          />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerRight: {},
  completedBadge: {
    paddingHorizontal: Spacing.xs + Spacing.xxs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  completedBadgeText: {
    ...Typography.smallSemiBold,
    fontSize: scaleFont(Typography.smallSemiBold.fontSize),
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
});
