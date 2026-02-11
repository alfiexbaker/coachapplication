/**
 * DeclineInvite - Decline Invitation Modal
 *
 * Bottom sheet modal for parents to decline a session invite with a reason.
 * Includes radio button reasons, optional note, and a link to counter-offer.
 */

import React, { useState } from 'react';
import {
  View,
  Pressable,
  TextInput,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { createModalStyles, createInputStyles } from '@/constants/styles';
import { ThemedText } from '@/components/themed-text';
import {
  DECLINE_REASONS,
  InviteSummaryBanner,
  ReasonRadioItem,
  CounterOfferLink,
  DeclineActionButtons,
  type DeclineCategory,
} from './decline-invite-sections';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DeclineInviteProps {
  visible: boolean;
  onClose: () => void;
  invite: {
    coachName: string;
    athleteNames: string[];
    proposedSlots: { date: string; time: string }[];
    sessionType: string;
  };
  onDecline: (reason: DeclineReason) => void;
  onCounterOffer?: () => void;
}

export interface DeclineReason {
  category: DeclineCategory;
  note?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DeclineInvite({
  visible,
  onClose,
  invite,
  onDecline,
  onCounterOffer,
}: DeclineInviteProps) {
  const { colors } = useTheme();
  const ModalStyles = createModalStyles(colors);
  const InputStyles = createInputStyles(colors);

  const [selectedReason, setSelectedReason] = useState<DeclineCategory | null>(null);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const athleteDisplay =
    invite.athleteNames.length === 1 ? invite.athleteNames[0] : invite.athleteNames.join(' & ');

  const handleDecline = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onDecline({
        category: selectedReason || 'other',
        note: note.trim() || undefined,
      });
      setSelectedReason(null);
      setNote('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedReason(null);
    setNote('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={ModalStyles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />

        <View style={ModalStyles.container}>
          <View style={ModalStyles.handle} />

          <View style={ModalStyles.header}>
            <ThemedText style={[ModalStyles.headerTitle, { color: colors.text }]}>
              Decline this invite?
            </ThemedText>
            <Clickable accessibilityLabel="Close" onPress={handleClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Clickable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <InviteSummaryBanner
              coachName={invite.coachName}
              athleteDisplay={athleteDisplay}
              sessionType={invite.sessionType}
              slotCount={invite.proposedSlots.length}
              palette={colors}
            />

            <ThemedText style={[styles.sectionLabel, { color: colors.muted }]}>
              Reason (optional):
            </ThemedText>
            <View style={styles.reasonList}>
              {DECLINE_REASONS.map((reason) => (
                <ReasonRadioItem
                  key={reason.id}
                  id={reason.id}
                  label={reason.label}
                  icon={reason.icon}
                  isSelected={selectedReason === reason.id}
                  onPress={() => setSelectedReason(selectedReason === reason.id ? null : reason.id)}
                  palette={colors}
                />
              ))}
            </View>

            <TextInput
              style={[InputStyles.input, InputStyles.multiline, styles.noteInput]}
              placeholder="Add a note..."
              placeholderTextColor={colors.muted}
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {onCounterOffer && <CounterOfferLink onPress={onCounterOffer} palette={colors} />}

            <DeclineActionButtons
              isSubmitting={isSubmitting}
              onCancel={handleClose}
              onDecline={handleDecline}
              palette={colors}
            />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default DeclineInvite;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  sectionLabel: {
    ...Typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  reasonList: { gap: Spacing.xs, marginBottom: Spacing.md },
  noteInput: { marginBottom: Spacing.md, minHeight: 80 },
});
