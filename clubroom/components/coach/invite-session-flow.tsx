/**
 * InviteSessionFlow — Composition root.
 * Multi-step modal: choose existing/new session → select athletes → confirm.
 */
import { View, StyleSheet, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useInviteSessionFlow } from '@/hooks/use-invite-session-flow';
import { InviteAthleteModal } from './invite-athlete-modal';
import type { Athlete } from '@/hooks/use-invite-athletes';
import { ChoiceStep, SessionListStep, ConfirmStep } from './invite-session-steps';
import { Row } from '@/components/primitives';

interface InviteSessionFlowProps {
  visible: boolean;
  onClose: () => void;
  athletes: Athlete[];
  coachId: string;
  onComplete?: (result: { sessionId: string; athleteIds: string[]; isNew: boolean }) => void;
}

export function InviteSessionFlow({
  visible,
  onClose,
  athletes,
  coachId,
  onComplete,
}: InviteSessionFlowProps) {
  const { colors: palette } = useTheme();
  const flow = useInviteSessionFlow({ visible, coachId, onClose, onComplete });
  const stepIndex = flow.step === 'choice' ? 1 : flow.step === 'select-session' ? 2 : 4;
  const totalSteps = 4;

  // Delegate to full-screen athlete picker for select-athletes step
  if (flow.step === 'select-athletes') {
    return (
      <InviteAthleteModal
        visible={visible}
        onClose={flow.handleClose}
        onSelect={flow.handleAthletesSelected}
        athletes={athletes.filter((a) => !(flow.selectedSession?.athleteIds || []).includes(a.id))}
        title={
          flow.isNewSession
            ? 'Select Athletes for New Session'
            : `Add to: ${flow.selectedSession?.title || 'Session'}`
        }
      />
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={flow.handleClose}>
      <View style={[styles.overlay, { backgroundColor: withAlpha(palette.text, 0.5) }]}>
        <View style={[styles.modal, { backgroundColor: palette.surface }]}>
          {/* Header */}
          <Row style={styles.header}>
            {flow.step !== 'choice' && (
              <Clickable
                accessibilityLabel="Go back"
                onPress={flow.handleBack}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={24} color={palette.text} />
              </Clickable>
            )}
            <ThemedText type="subtitle" style={styles.headerTitle}>
              {flow.step === 'choice' && 'Invite Athletes'}
              {flow.step === 'select-session' && 'Select Session'}
              {flow.step === 'confirm' && 'Confirm Invitation'}
            </ThemedText>
            <Clickable accessibilityLabel="Close" onPress={flow.handleClose}>
              <Ionicons name="close" size={24} color={palette.muted} />
            </Clickable>
          </Row>

          <ScrollView contentContainerStyle={styles.content}>
            <View
              style={[
                styles.stepIndicator,
                {
                  backgroundColor: withAlpha(palette.tint, 0.06),
                  borderColor: withAlpha(palette.tint, 0.18),
                },
              ]}
            >
              <Row align="center" justify="between">
                <ThemedText style={{ color: palette.tint }}>
                  Step {stepIndex} of {totalSteps}
                </ThemedText>
                <ThemedText style={{ color: palette.muted }}>
                  {flow.step === 'choice'
                    ? 'Choose'
                    : flow.step === 'select-session'
                      ? 'Session'
                      : 'Send'}
                </ThemedText>
              </Row>
              <View style={[styles.progressTrack, { backgroundColor: withAlpha(palette.border, 0.5) }]}>
                <View
                  style={[
                    styles.progressFill,
                    { backgroundColor: palette.tint, width: `${(stepIndex / totalSteps) * 100}%` },
                  ]}
                />
              </View>
            </View>
            {flow.step === 'choice' && <ChoiceStep onSelect={flow.handleChoiceSelect} />}
            {flow.step === 'select-session' && (
              <SessionListStep
                sessions={flow.upcomingSessions}
                onSelect={flow.handleSessionSelect}
                onCreateNew={() => flow.handleChoiceSelect('new')}
              />
            )}
            {flow.step === 'confirm' && flow.selectedSession && (
              <ConfirmStep
                session={flow.selectedSession}
                athletes={flow.selectedAthletes}
                onConfirm={flow.handleConfirm}
                onChangeAthletes={() => flow.handleBack()}
              />
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  modal: {
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    maxHeight: '90%',
    minHeight: '50%',
  },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: { marginRight: Spacing.sm },
  headerTitle: { flex: 1, textAlign: 'center' },
  content: { padding: Spacing.lg, paddingTop: 0 },
  stepIndicator: {
    borderWidth: 1,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  progressTrack: {
    height: 4,
    borderRadius: Radii.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: Radii.pill,
  },
});
