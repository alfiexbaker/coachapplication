import { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import type { ReactNode } from 'react';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import {
  VideoPlayer,
  NoVideoPlaceholder,
  DrillInfoHeader,
  DrillCoachNotes,
  DrillInstructions,
  DrillFeedbackCard,
  DrillCompletionSection,
} from '@/components/drills';
import { DrillDetailHeader } from '@/components/drills/drill-detail-header';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { Spacing } from '@/constants/theme';
import type { AssignedDrill } from '@/constants/types';
import { useScreen } from '@/hooks/use-screen';
import { err, ok, serviceError } from '@/types/result';
import { drillService } from '@/services/drill-service';
import { createLogger } from '@/utils/logger';
import { uiFeedback } from '@/services/ui-feedback';

const logger = createLogger('DrillDetailScreen');

export default function DrillDetailScreen() {
  const { colors: palette } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const { id } = useLocalSearchParams<{ id: string }>();

  const [completing, setCompleting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [showFeedbackInput, setShowFeedbackInput] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return ok<AssignedDrill | null>(null);
    try {
      const data = await drillService.getAssignmentById(id);
      return ok(data);
    } catch (loadError) {
      logger.error('Failed to load assignment', loadError);
      return err(serviceError('UNKNOWN', 'Failed to load drill assignment.', loadError));
    }
  }, [id]);

  const {
    data: assignment,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
  } = useScreen<AssignedDrill | null>({
    load: loadData,
    deps: [id],
    isEmpty: (value) => value === null || value.drill === undefined,
    refetchOnFocus: true,
  });

  const handleComplete = useCallback(async () => {
    if (!assignment) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setCompleting(true);
    try {
      await drillService.completeDrill(assignment.id, feedback.trim() || undefined);
      retry();
      setShowFeedbackInput(false);
      setFeedback('');
      uiFeedback.alert(
        'Drill Completed!',
        'Great work on completing this drill. Keep up the momentum!',
        [{ text: 'OK' }],
      );
    } catch (error) {
      logger.error('Failed to complete drill:', error);
      uiFeedback.alert('Error', 'Failed to mark drill as complete. Please try again.');
    } finally {
      setCompleting(false);
    }
  }, [assignment, feedback, retry]);

  const handleUncomplete = useCallback(async () => {
    if (!assignment) return;
    uiFeedback.alert('Mark as Incomplete?', 'This will move the drill back to your pending list.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark Incomplete',
        onPress: async () => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          try {
            await drillService.uncompleteDrill(assignment.id);
            retry();
          } catch (error) {
            logger.error('Failed to uncomplete drill:', error);
          }
        },
      },
    ]);
  }, [assignment, retry]);
  const renderShell = (content: ReactNode) => (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      {content}
    </SafeAreaView>
  );

  if (status === 'loading') {
    return renderShell(<LoadingState variant="detail" />);
  }

  if (status === 'error') {
    return renderShell(
      <ErrorState
        message={error?.message ?? 'Failed to load drill assignment.'}
        onRetry={retry}
      />,
    );
  }

  if (status === 'empty' || !assignment || !assignment.drill) {
    return renderShell(
      <View style={styles.notFoundContainer}>
        <EmptyState
          icon="alert-circle-outline"
          title="Drill not found"
          message="This assignment may have been removed."
          actionLabel="Go back"
          onPressAction={() => router.back()}
        />
      </View>,
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

  return renderShell(
    <>
      <DrillDetailHeader
        colors={palette}
        isCompleted={assignment.isCompleted}
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
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

        {assignment.notes && (
          <Animated.View entering={FadeInDown.delay(200).springify()}>
            <DrillCoachNotes notes={assignment.notes} coachName={assignment.assignedBy} />
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(250).springify()}>
          <DrillInstructions description={drill.description} equipment={drill.equipment} />
        </Animated.View>

        {assignment.isCompleted && assignment.athleteFeedback && (
          <Animated.View entering={FadeInDown.delay(350).springify()}>
            <DrillFeedbackCard feedback={assignment.athleteFeedback} />
          </Animated.View>
        )}

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
    </>,
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['3xl'],
  },
  notFoundContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
});
