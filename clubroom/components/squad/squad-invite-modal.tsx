/**
 * SquadInviteModal — Composition root for squad invite flow.
 * Sub-components: SquadSelectStep, SquadPreviewStep, SquadConfirmStep
 * Hook: useSquadInviteModal
 */
import { View, StyleSheet, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

import {
  useSquadInviteModal,
  type InviteType,
  type SquadSessionProps,
  type SquadMatchProps,
  type SquadEventProps,
  type SquadInviteStep,
} from '@/hooks/use-squad-invite-modal';
import { SquadSelectStep } from './squad-select-step';
import { SquadPreviewStep } from './squad-preview-step';
import { SquadConfirmStep } from './squad-confirm-step';

interface SquadInviteModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (result: { squadInviteId: string; successful: number; failed: number }) => void;
  clubId: string;
  inviteType: InviteType;
  targetId: string;
  targetTitle: string;
  sessionProps?: SquadSessionProps;
  matchProps?: SquadMatchProps;
  eventProps?: SquadEventProps;
  preSelectedSquadIds?: string[];
  multiSelect?: boolean;
}

const STEPS: SquadInviteStep[] = ['squads', 'preview', 'confirm'];

export function SquadInviteModal({
  visible,
  onClose,
  onSuccess,
  clubId,
  inviteType,
  targetId,
  targetTitle,
  sessionProps,
  matchProps,
  eventProps,
  preSelectedSquadIds = [],
  multiSelect = true,
}: SquadInviteModalProps) {
  const { colors: palette } = useTheme();
  const inv = useSquadInviteModal({
    visible,
    onClose,
    onSuccess,
    clubId,
    inviteType,
    targetId,
    targetTitle,
    sessionProps,
    matchProps,
    eventProps,
    preSelectedSquadIds,
    multiSelect,
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        {/* Header */}
        <Row
          align="center"
          justify="between"
          style={[styles.header, { borderBottomColor: palette.border }]}
        >
          <Clickable
            onPress={inv.handlePrevStep}
            accessibilityLabel={inv.step === 'squads' ? 'Close' : 'Back'}
          >
            <Ionicons
              name={inv.step === 'squads' ? 'close' : 'arrow-back'}
              size={24}
              color={palette.text}
            />
          </Clickable>
          <ThemedText type="subtitle">
            Invite Squad{multiSelect && inv.selectedSquadIds.length > 1 ? 's' : ''}
          </ThemedText>
          <View style={{ width: 24 }} />
        </Row>

        {/* Step Indicator */}
        <Row align="center" justify="center" style={styles.stepIndicator}>
          {STEPS.map((s, index) => (
            <Row key={s} align="center">
              <View
                style={[
                  styles.stepDot,
                  {
                    backgroundColor:
                      STEPS.indexOf(inv.step) >= index ? palette.tint : palette.border,
                  },
                ]}
              >
                {STEPS.indexOf(inv.step) > index && (
                  <Ionicons name="checkmark" size={12} color={palette.onPrimary} />
                )}
              </View>
              {index < 2 && (
                <View
                  style={[
                    styles.stepLine,
                    {
                      backgroundColor:
                        STEPS.indexOf(inv.step) > index ? palette.tint : palette.border,
                    },
                  ]}
                />
              )}
            </Row>
          ))}
        </Row>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {inv.step === 'squads' && (
            <SquadSelectStep
              inviteType={inviteType}
              multiSelect={multiSelect}
              squads={inv.squads}
              selectedSquadIds={inv.selectedSquadIds}
              loading={inv.loading}
              onToggleSquad={inv.toggleSquad}
            />
          )}
          {inv.step === 'preview' && (
            <SquadPreviewStep
              preview={inv.preview}
              excludedMemberIds={inv.excludedMemberIds}
              totalMembers={inv.totalMembers}
              totalParents={inv.totalParents}
              onToggleMemberExclusion={inv.toggleMemberExclusion}
            />
          )}
          {inv.step === 'confirm' && (
            <SquadConfirmStep
              inviteType={inviteType}
              targetTitle={targetTitle}
              preview={inv.preview}
              totalMembers={inv.totalMembers}
              totalParents={inv.totalParents}
              sessionProps={sessionProps}
            />
          )}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: palette.border }]}>
          {inv.step === 'confirm' ? (
            <Clickable
              onPress={inv.handleSendInvites}
              disabled={inv.sending}
              accessibilityLabel={inv.sending ? 'Sending invites' : 'Send invites'}
              style={[
                styles.primaryBtn,
                { backgroundColor: palette.tint, opacity: inv.sending ? 0.6 : 1 },
              ]}
            >
              <Row align="center" justify="center" gap="sm">
                <Ionicons name="paper-plane" size={18} color={palette.onPrimary} />
                <ThemedText style={{ color: palette.onPrimary, fontWeight: '700' }}>
                  {inv.sending
                    ? 'Sending...'
                    : `Send ${inv.totalParents} Invite${inv.totalParents !== 1 ? 's' : ''}`}
                </ThemedText>
              </Row>
            </Clickable>
          ) : (
            <Clickable
              onPress={inv.handleNextStep}
              disabled={!inv.canProceed() || inv.loading}
              accessibilityLabel={inv.step === 'squads' ? 'Preview members' : 'Continue'}
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: palette.tint,
                  opacity: inv.canProceed() && !inv.loading ? 1 : 0.5,
                },
              ]}
            >
              <Row align="center" justify="center" gap="sm">
                <ThemedText style={{ color: palette.onPrimary, fontWeight: '700' }}>
                  {inv.step === 'squads' ? 'Preview Members' : 'Continue'}
                </ThemedText>
                <Ionicons name="arrow-forward" size={18} color={palette.onPrimary} />
              </Row>
            </Clickable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1 },
  stepIndicator: { paddingVertical: Spacing.md },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: { width: 60, height: 2, marginHorizontal: Spacing.xxs },
  content: { padding: Spacing.lg, paddingBottom: Spacing['2xl'] },
  footer: { padding: Spacing.lg, borderTopWidth: 1 },
  primaryBtn: { paddingVertical: Spacing.md, borderRadius: Radii.md, minHeight: 52 },
});
