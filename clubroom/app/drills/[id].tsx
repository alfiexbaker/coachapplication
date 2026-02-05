/**
 * Drill Detail Screen
 *
 * Shows full details of an assigned drill including video demonstration,
 * instructions, and completion controls.
 */

import { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { DifficultyBadge, VideoPlayer, NoVideoPlaceholder } from '@/components/drills';
import { Colors, Spacing, Radii } from '@/constants/theme';
import type { AssignedDrill } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { drillService } from '@/services/drill-service';
import { scaleFont } from '@/utils/scale';
import { createLogger } from '@/utils/logger';

const logger = createLogger('DrillDetailScreen');

/**
 * Drill detail screen showing full assignment information and video.
 */
export default function DrillDetailScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { id } = useLocalSearchParams<{ id: string }>();

  // State
  const [assignment, setAssignment] = useState<AssignedDrill | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);

  /**
   * Load assignment data
   */
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

  // Load on mount and focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  /**
   * Pull to refresh
   */
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  /**
   * Handle drill completion
   */
  const handleComplete = useCallback(async () => {
    if (!assignment) return;

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setCompleting(true);

    try {
      await drillService.completeDrill(assignment.id, feedback.trim() || undefined);
      await loadData();
      setShowFeedbackInput(false);
      setFeedback('');

      // Show success alert
      Alert.alert(
        'Drill Completed!',
        'Great work on completing this drill. Keep up the momentum!',
        [{ text: 'OK' }]
      );
    } catch (error) {
      logger.error('Failed to complete drill:', error);
      Alert.alert('Error', 'Failed to mark drill as complete. Please try again.');
    } finally {
      setCompleting(false);
    }
  }, [assignment, feedback, loadData]);

  /**
   * Handle uncomplete (undo completion)
   */
  const handleUncomplete = useCallback(async () => {
    if (!assignment) return;

    Alert.alert(
      'Mark as Incomplete?',
      'This will move the drill back to your pending list.',
      [
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
      ]
    );
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
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
        </View>
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

  // Determine status color
  const getStatusColor = () => {
    if (assignment.isCompleted) return palette.success;
    if (isOverdue) return palette.error;
    if (isDueSoon) return palette.warning;
    return palette.tint;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <View style={styles.headerRight}>
          {assignment.isCompleted && (
            <View style={[styles.completedBadge, { backgroundColor: `${palette.success}15` }]}>
              <Ionicons name="checkmark-circle" size={16} color={palette.success} />
              <ThemedText style={[styles.completedBadgeText, { color: palette.success }]}>
                Completed
              </ThemedText>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
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
            <NoVideoPlaceholder
              message="No video demonstration"
              height={180}
            />
          )}
        </Animated.View>

        {/* Main Content */}
        <Animated.View entering={FadeInDown.delay(150).springify()}>
          {/* Category and difficulty */}
          <View style={styles.badgeRow}>
            <View style={[styles.categoryBadge, { backgroundColor: `${categoryInfo.color}20` }]}>
              <Ionicons
                name={categoryInfo.icon as keyof typeof Ionicons.glyphMap}
                size={14}
                color={categoryInfo.color}
              />
              <ThemedText style={[styles.categoryText, { color: categoryInfo.color }]}>
                {categoryInfo.label}
              </ThemedText>
            </View>
            <DifficultyBadge difficulty={drill.difficulty} />
          </View>

          {/* Title */}
          <ThemedText type="title" style={styles.title}>
            {drill.title}
          </ThemedText>

          {/* Due date */}
          <View style={styles.dueDateRow}>
            <Ionicons
              name={assignment.isCompleted ? 'checkmark-circle' : 'calendar-outline'}
              size={18}
              color={getStatusColor()}
            />
            <ThemedText style={[styles.dueDateText, { color: getStatusColor() }]}>
              {assignment.isCompleted
                ? `Completed ${new Date(assignment.completedAt as string).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}`
                : isOverdue
                  ? `Overdue: ${drillService.formatDueDate(assignment.dueDate)}`
                  : `Due ${drillService.formatDueDate(assignment.dueDate)}`}
            </ThemedText>
          </View>

          {/* Meta info */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={16} color={palette.muted} />
              <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                {drillService.formatDuration(drill.duration)}
              </ThemedText>
            </View>
            {assignment.repetitions && assignment.repetitions > 1 && (
              <View style={styles.metaItem}>
                <Ionicons name="repeat" size={16} color={palette.muted} />
                <ThemedText style={[styles.metaText, { color: palette.muted }]}>
                  {assignment.repetitions} sets
                </ThemedText>
              </View>
            )}
            {assignment.priority === 1 && (
              <View style={[styles.priorityBadge, { backgroundColor: `${palette.error}15` }]}>
                <Ionicons name="alert-circle" size={14} color={palette.error} />
                <ThemedText style={[styles.priorityText, { color: palette.error }]}>
                  Priority
                </ThemedText>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Coach Notes */}
        {assignment.notes && (
          <Animated.View entering={FadeInDown.delay(200).springify()}>
            <SurfaceCard style={styles.notesCard}>
              <View style={styles.notesHeader}>
                <Ionicons name="chatbubble-outline" size={16} color={palette.tint} />
                <ThemedText type="defaultSemiBold" style={styles.notesTitle}>
                  Coach Notes
                </ThemedText>
              </View>
              <ThemedText style={[styles.notesText, { color: palette.text }]}>
                {assignment.notes}
              </ThemedText>
              {assignment.assignedByName && (
                <ThemedText style={[styles.coachName, { color: palette.muted }]}>
                  - {assignment.assignedByName}
                </ThemedText>
              )}
            </SurfaceCard>
          </Animated.View>
        )}

        {/* Instructions */}
        <Animated.View entering={FadeInDown.delay(250).springify()}>
          <SurfaceCard style={styles.instructionsCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text-outline" size={18} color={palette.tint} />
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                Instructions
              </ThemedText>
            </View>
            <ThemedText style={[styles.instructionsText, { color: palette.text }]}>
              {drill.description}
            </ThemedText>
          </SurfaceCard>
        </Animated.View>

        {/* Equipment */}
        {drill.equipment && drill.equipment.length > 0 && (
          <Animated.View entering={FadeInDown.delay(300).springify()}>
            <SurfaceCard style={styles.equipmentCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="football-outline" size={18} color={palette.tint} />
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                  Equipment Needed
                </ThemedText>
              </View>
              <View style={styles.equipmentList}>
                {drill.equipment.map((item, index) => (
                  <View key={index} style={styles.equipmentItem}>
                    <Ionicons name="checkmark" size={16} color={palette.success} />
                    <ThemedText style={styles.equipmentText}>{item}</ThemedText>
                  </View>
                ))}
              </View>
            </SurfaceCard>
          </Animated.View>
        )}

        {/* Athlete Feedback (if completed) */}
        {assignment.isCompleted && assignment.athleteFeedback && (
          <Animated.View entering={FadeInDown.delay(350).springify()}>
            <SurfaceCard style={styles.feedbackCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="chatbubbles-outline" size={18} color={palette.success} />
                <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                  Your Feedback
                </ThemedText>
              </View>
              <ThemedText style={[styles.feedbackText, { color: palette.text }]}>
                {assignment.athleteFeedback}
              </ThemedText>
            </SurfaceCard>
          </Animated.View>
        )}

        {/* Completion Section */}
        {!assignment.isCompleted && (
          <Animated.View entering={FadeInUp.delay(400).springify()} style={styles.completionSection}>
            {/* Feedback input (optional) */}
            {showFeedbackInput ? (
              <View style={styles.feedbackInputContainer}>
                <ThemedText style={[styles.feedbackLabel, { color: palette.muted }]}>
                  Add feedback (optional)
                </ThemedText>
                <TextInput
                  style={[
                    styles.feedbackInput,
                    { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
                  ]}
                  placeholder="How did it go? Any notes for your coach..."
                  placeholderTextColor={palette.muted}
                  value={feedback}
                  onChangeText={setFeedback}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            ) : (
              <Clickable
                onPress={() => setShowFeedbackInput(true)}
                style={styles.addFeedbackButton}
              >
                <Ionicons name="add-circle-outline" size={18} color={palette.tint} />
                <ThemedText style={[styles.addFeedbackText, { color: palette.tint }]}>
                  Add feedback with completion
                </ThemedText>
              </Clickable>
            )}

            <Button
              onPress={handleComplete}
              disabled={completing}
              style={styles.completeButton}
            >
              {completing ? 'Marking Complete...' : 'Mark as Complete'}
            </Button>
          </Animated.View>
        )}

        {/* Undo completion */}
        {assignment.isCompleted && (
          <Animated.View entering={FadeInUp.delay(400).springify()} style={styles.undoSection}>
            <Clickable onPress={handleUncomplete} style={styles.undoButton}>
              <Ionicons name="arrow-undo-outline" size={18} color={palette.muted} />
              <ThemedText style={[styles.undoText, { color: palette.muted }]}>
                Mark as incomplete
              </ThemedText>
            </Clickable>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.pill,
  },
  completedBadgeText: {
    fontSize: scaleFont(13),
    fontWeight: '600',
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
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.sm,
  },
  categoryText: {
    fontSize: scaleFont(12),
    fontWeight: '600',
  },
  title: {
    fontSize: scaleFont(24),
    fontWeight: '700',
    marginTop: Spacing.md,
    letterSpacing: -0.5,
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.sm,
  },
  dueDateText: {
    fontSize: scaleFont(15),
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: scaleFont(14),
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radii.sm,
  },
  priorityText: {
    fontSize: scaleFont(12),
    fontWeight: '600',
  },
  notesCard: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  notesTitle: {
    fontSize: scaleFont(14),
  },
  notesText: {
    fontSize: scaleFont(15),
    lineHeight: scaleFont(22),
    fontStyle: 'italic',
  },
  coachName: {
    fontSize: scaleFont(13),
    marginTop: Spacing.sm,
    textAlign: 'right',
  },
  instructionsCard: {
    marginTop: Spacing.md,
    padding: Spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: scaleFont(15),
  },
  instructionsText: {
    fontSize: scaleFont(15),
    lineHeight: scaleFont(24),
  },
  equipmentCard: {
    marginTop: Spacing.md,
    padding: Spacing.md,
  },
  equipmentList: {
    gap: Spacing.xs,
  },
  equipmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  equipmentText: {
    fontSize: scaleFont(14),
  },
  feedbackCard: {
    marginTop: Spacing.md,
    padding: Spacing.md,
  },
  feedbackText: {
    fontSize: scaleFont(15),
    lineHeight: scaleFont(22),
  },
  completionSection: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  feedbackInputContainer: {
    marginBottom: Spacing.md,
  },
  feedbackLabel: {
    fontSize: scaleFont(13),
    marginBottom: Spacing.xs,
  },
  feedbackInput: {
    height: 100,
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    fontSize: scaleFont(15),
  },
  addFeedbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.md,
    padding: Spacing.sm,
  },
  addFeedbackText: {
    fontSize: scaleFont(14),
    fontWeight: '500',
  },
  completeButton: {
    marginTop: Spacing.xs,
  },
  undoSection: {
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.sm,
  },
  undoText: {
    fontSize: scaleFont(14),
  },
});
