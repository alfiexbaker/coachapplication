/**
 * DeclineInvite - Decline Invitation Modal
 *
 * Bottom sheet modal for parents to decline a session invite with a reason.
 * Includes radio button reasons, optional note, and a link to counter-offer.
 *
 * Usage:
 *   <DeclineInvite
 *     visible={showDecline}
 *     onClose={() => setShowDecline(false)}
 *     invite={selectedInvite}
 *     onDecline={(reason) => handleDecline(reason)}
 *   />
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
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radii, Typography, Components } from '@/constants/theme';
import {
  ModalStyles,
  InputStyles,
} from '@/constants/styles';
import { ThemedText } from '@/components/themed-text';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DeclineInviteProps {
  visible: boolean;
  onClose: () => void;
  invite: {
    coachName: string;
    athleteNames: string[];
    proposedSlots: any[];
    sessionType: string;
  };
  onDecline: (reason: DeclineReason) => void;
  /** Optional: navigate to counter-offer flow */
  onCounterOffer?: () => void;
}

export interface DeclineReason {
  category: 'schedule_conflict' | 'too_far' | 'price' | 'child_unavailable' | 'other';
  note?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DECLINE_REASONS: {
  id: DeclineReason['category'];
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: 'schedule_conflict', label: 'Schedule conflict', icon: 'calendar-outline' },
  { id: 'too_far', label: 'Too far away', icon: 'location-outline' },
  { id: 'price', label: 'Price too high', icon: 'cash-outline' },
  { id: 'child_unavailable', label: 'Child not available', icon: 'person-outline' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DeclineInvite({
  visible,
  onClose,
  invite,
  onDecline,
  onCounterOffer,
}: DeclineInviteProps) {
  const [selectedReason, setSelectedReason] = useState<DeclineReason['category'] | null>(null);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const athleteDisplay = invite.athleteNames.length === 1
    ? invite.athleteNames[0]
    : invite.athleteNames.join(' & ');

  const handleDecline = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onDecline({
        category: selectedReason || 'other',
        note: note.trim() || undefined,
      });
      // Reset state
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
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={ModalStyles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />

        <View style={ModalStyles.container}>
          {/* Handle */}
          <View style={ModalStyles.handle} />

          {/* Header */}
          <View style={ModalStyles.header}>
            <ThemedText style={[ModalStyles.headerTitle, { color: Colors.light.text }]}>
              Decline this invite?
            </ThemedText>
            <Pressable onPress={handleClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={Colors.light.text} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Invite summary */}
            <View style={styles.inviteSummary}>
              <ThemedText style={styles.inviteSummaryText}>
                Coach {invite.coachName} invited {athleteDisplay} to a{' '}
                {invite.sessionType.toLowerCase()} session
              </ThemedText>
              {invite.proposedSlots.length > 0 && (
                <ThemedText style={styles.inviteSummaryMuted}>
                  {invite.proposedSlots.length} proposed time{invite.proposedSlots.length !== 1 ? 's' : ''}
                </ThemedText>
              )}
            </View>

            {/* Reason selection */}
            <ThemedText style={styles.sectionLabel}>Reason (optional):</ThemedText>
            <View style={styles.reasonList}>
              {DECLINE_REASONS.map((reason) => {
                const isSelected = selectedReason === reason.id;
                return (
                  <Pressable
                    key={reason.id}
                    style={[
                      styles.reasonItem,
                      isSelected ? styles.reasonItemSelected : undefined,
                    ]}
                    onPress={() =>
                      setSelectedReason(isSelected ? null : reason.id)
                    }
                  >
                    <View
                      style={[
                        styles.radioOuter,
                        isSelected ? styles.radioOuterSelected : undefined,
                      ]}
                    >
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                    <Ionicons
                      name={reason.icon}
                      size={20}
                      color={isSelected ? Colors.light.tint : Colors.light.muted}
                    />
                    <ThemedText
                      style={[
                        styles.reasonLabel,
                        isSelected ? styles.reasonLabelSelected : undefined,
                      ]}
                    >
                      {reason.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            {/* Optional note */}
            <TextInput
              style={[InputStyles.input, InputStyles.multiline, styles.noteInput]}
              placeholder="Add a note..."
              placeholderTextColor={Colors.light.muted}
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Counter-offer link */}
            {onCounterOffer && (
              <Pressable
                style={({ pressed }) => [
                  styles.counterOfferButton,
                  pressed && { opacity: 0.7 },
                ]}
                onPress={onCounterOffer}
              >
                <Ionicons name="swap-horizontal-outline" size={18} color={Colors.light.tint} />
                <ThemedText style={styles.counterOfferText}>Suggest another time</ThemedText>
                <Ionicons name="chevron-forward" size={16} color={Colors.light.tint} />
              </Pressable>
            )}

            {/* Action buttons */}
            <View style={styles.buttonRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.cancelButton,
                  pressed ? styles.buttonPressed : undefined,
                ]}
                onPress={handleClose}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.declineButton,
                  isSubmitting ? styles.declineButtonDisabled : undefined,
                  pressed && !isSubmitting ? styles.buttonPressed : undefined,
                ]}
                onPress={handleDecline}
                disabled={isSubmitting}
              >
                <ThemedText
                  style={[
                    styles.declineButtonText,
                    isSubmitting ? styles.declineButtonTextDisabled : undefined,
                  ]}
                >
                  {isSubmitting ? 'Declining...' : 'Decline'}
                </ThemedText>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  inviteSummary: {
    backgroundColor: Colors.light.background,
    padding: Spacing.sm,
    borderRadius: Radii.sm,
    marginBottom: Spacing.md,
    gap: Spacing.xs,
  },
  inviteSummaryText: {
    ...Typography.bodySemiBold,
    color: Colors.light.text,
  },
  inviteSummaryMuted: {
    ...Typography.small,
    color: Colors.light.muted,
  },
  sectionLabel: {
    ...Typography.caption,
    color: Colors.light.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  reasonList: {
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.surface,
  },
  reasonItemSelected: {
    borderColor: Colors.light.tint,
    backgroundColor: `${Colors.light.tint}08`,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.light.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: Colors.light.tint,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.light.tint,
  },
  reasonLabel: {
    ...Typography.body,
    color: Colors.light.text,
    flex: 1,
  },
  reasonLabelSelected: {
    fontWeight: '600',
  },
  noteInput: {
    marginBottom: Spacing.md,
    minHeight: 80,
  },
  counterOfferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    height: Components.button.height,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.md,
    borderRadius: Components.button.borderRadius,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: 'transparent',
  },
  counterOfferText: {
    ...Typography.bodySemiBold,
    color: Colors.light.tint,
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  cancelButton: {
    flex: 1,
    height: Components.button.height,
    borderRadius: Components.button.borderRadius,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  declineButton: {
    flex: 1,
    height: Components.button.height,
    borderRadius: Components.button.borderRadius,
    backgroundColor: Colors.light.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButtonDisabled: {
    backgroundColor: Colors.light.border,
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.surface,
  },
  declineButtonTextDisabled: {
    color: Colors.light.muted,
  },
  buttonPressed: {
    opacity: 0.85,
  },
});

export default DeclineInvite;
