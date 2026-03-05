import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, View, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { QuickRateCard } from '@/components/session/quick-rate-card';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useQuickRate } from '@/hooks/use-quick-rate';
import type { QuickRateAthlete } from '@/hooks/use-quick-rate';
import { progressSkillsService } from '@/services/progress/progress-skills-service';
import { progressFeedbackService } from '@/services/progress/progress-feedback-service';
import { LoadingState } from '@/components/ui/screen-states';
import { useToast } from '@/components/ui/toast';
import { createLogger } from '@/utils/logger';
import { uiFeedback } from '@/services/ui-feedback';

const logger = createLogger('QuickRateModal');

interface QuickRateModalProps {
  visible: boolean;
  athlete: QuickRateAthlete | null;
  sessionId: string;
  coachId: string;
  coachName: string;
  onClose: () => void;
  onSaved: () => void;
}

export const QuickRateModal = memo(function QuickRateModal({
  visible,
  athlete,
  sessionId,
  coachId,
  coachName,
  onClose,
  onSaved,
}: QuickRateModalProps) {
  const { colors } = useTheme();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [showBadgePicker, setShowBadgePicker] = useState(false);

  const athletes = athlete ? [athlete] : [];

  const quickRate = useQuickRate({
    athletes,
    sessionId,
    coachId,
  });

  const currentRating = athlete ? quickRate.ratingsByAthleteId[athlete.athleteId] : undefined;
  const initialRatingJsonRef = useRef<string | null>(null);
  const currentRatingJson = useMemo(
    () => (currentRating ? JSON.stringify(currentRating) : null),
    [currentRating],
  );

  useEffect(() => {
    if (!visible) {
      initialRatingJsonRef.current = null;
      return;
    }
    if (!quickRate.isPrefilling && currentRatingJson !== null && initialRatingJsonRef.current === null) {
      initialRatingJsonRef.current = currentRatingJson;
    }
  }, [visible, quickRate.isPrefilling, currentRatingJson]);

  const hasUnsavedChanges =
    !quickRate.isPrefilling &&
    currentRatingJson !== null &&
    initialRatingJsonRef.current !== null &&
    currentRatingJson !== initialRatingJsonRef.current;

  const handlePositionChange = useCallback(
    (position: import('@/types/progress-types').PositionRole) => {
      if (!athlete) return;
      quickRate.updatePosition(athlete.athleteId, position);
    },
    [athlete, quickRate.updatePosition],
  );

  const handleSkillChange = useCallback(
    (skill: import('@/types/progress-types').FootballSkill, value: number) => {
      if (!athlete) return;
      quickRate.updateSkillRating(athlete.athleteId, skill, value);
    },
    [athlete, quickRate.updateSkillRating],
  );

  const handleEffortChange = useCallback(
    (value: number) => {
      if (!athlete) return;
      quickRate.updateEffort(athlete.athleteId, value);
    },
    [athlete, quickRate.updateEffort],
  );

  const handleSave = useCallback(async () => {
    if (!athlete || !currentRating) return;

    if (!currentRating.positionPlayed) {
      showToast('Please select a position', 'error');
      return;
    }

    setSaving(true);
    try {
      const skillResult = await progressSkillsService.updateFromPositionRate(
        athlete.athleteId,
        sessionId,
        coachId,
        currentRating.positionPlayed,
        currentRating.positionSkillRatings ?? [],
      );

      if (!skillResult.success) {
        showToast(skillResult.error.message || 'Failed to save skill ratings', 'error');
        setSaving(false);
        return;
      }

      const feedbackResult = await progressFeedbackService.createFeedbackFromQuickRate(
        currentRating,
        coachName,
        athlete.athleteName,
      );

      if (!feedbackResult.success) {
        showToast(feedbackResult.error.message || 'Failed to save feedback', 'error');
        setSaving(false);
        return;
      }

      showToast('Rating saved', 'success');
      onSaved();
      Keyboard.dismiss();
      onClose();
    } catch (error) {
      logger.error('Failed to save quick rate from group roster', { error });
      showToast('Failed to save rating', 'error');
    } finally {
      setSaving(false);
    }
  }, [athlete, currentRating, sessionId, coachId, coachName, onSaved, onClose, showToast]);

  const closeNow = useCallback(() => {
    if (saving) return;
    Keyboard.dismiss();
    onClose();
  }, [onClose, saving]);

  const handleClose = useCallback(() => {
    if (saving) return;
    if (!hasUnsavedChanges) {
      closeNow();
      return;
    }
    uiFeedback.alert('Discard Ratings?', 'You have unsaved ratings. Are you sure you want to close?', [
      { text: 'Keep Editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: closeNow },
    ]);
  }, [saving, hasUnsavedChanges, closeNow]);

  if (!athlete) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <Row style={[styles.header, { borderBottomColor: colors.border }]}>
          <Clickable
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Close skill rating"
            disabled={saving}
            accessibilityState={{ disabled: saving }}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </Clickable>
          <View style={styles.headerCenter}>
            <ThemedText type="defaultSemiBold" style={Typography.heading}>
              {saving ? 'Saving rating...' : 'Rate Skills'}
            </ThemedText>
          </View>
          <Clickable
            onPress={handleSave}
            accessibilityRole="button"
            accessibilityLabel="Save skill ratings"
            disabled={saving || quickRate.isPrefilling}
          >
            <ThemedText
              style={[
                Typography.bodySemiBold,
                { color: saving ? colors.muted : colors.tint },
              ]}
            >
              {saving ? 'Saving…' : 'Save'}
            </ThemedText>
          </Clickable>
        </Row>

        {quickRate.isPrefilling || !currentRating ? (
          <LoadingState variant="form" />
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <QuickRateCard
              athleteName={athlete.athleteName}
              rating={currentRating}
              onPositionChange={handlePositionChange}
              onSkillChange={handleSkillChange}
              onEffortChange={handleEffortChange}
              onBadgePress={() => setShowBadgePicker(!showBadgePicker)}
            />
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  scrollContent: { padding: Spacing.lg },
});
