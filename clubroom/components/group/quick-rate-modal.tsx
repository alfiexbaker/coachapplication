import React, { memo, useCallback, useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
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
import { createLogger } from '@/utils/logger';

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
  const [saving, setSaving] = useState(false);
  const [showBadgePicker, setShowBadgePicker] = useState(false);

  const athletes = athlete ? [athlete] : [];

  const quickRate = useQuickRate({
    athletes,
    sessionId,
    coachId,
  });

  const currentRating = athlete ? quickRate.ratingsByAthleteId[athlete.athleteId] : undefined;

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

    setSaving(true);
    try {
      await progressSkillsService.updateFromPositionRate(
        athlete.athleteId,
        sessionId,
        coachId,
        currentRating.positionPlayed,
        currentRating.positionSkillRatings ?? [],
      );

      await progressFeedbackService.createFeedbackFromQuickRate(
        currentRating,
        coachName,
        athlete.athleteName,
      );

      onSaved();
      onClose();
    } catch (error) {
      logger.error('Failed to save quick rate from group roster', { error });
    } finally {
      setSaving(false);
    }
  }, [athlete, currentRating, sessionId, coachId, coachName, onSaved, onClose]);

  if (!athlete) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <Row style={[styles.header, { borderBottomColor: colors.border }]}>
          <Clickable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close skill rating"
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </Clickable>
          <View style={styles.headerCenter}>
            <ThemedText type="defaultSemiBold" style={Typography.heading}>
              Rate Skills
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
