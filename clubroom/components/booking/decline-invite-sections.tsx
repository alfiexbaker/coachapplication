/**
 * Extracted sub-components for DeclineInvite.
 *
 * DECLINE_REASONS — reason options list.
 * InviteSummaryBanner — summary of the invite being declined.
 * ReasonRadioItem — individual reason radio row.
 * CounterOfferLink — link to suggest another time.
 * DeclineActionButtons — cancel + decline button row.
 */

import React, { memo } from 'react';
import { View } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';
import { styles } from './decline-invite-styles';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DeclineCategory = 'schedule_conflict' | 'too_far' | 'price' | 'child_unavailable' | 'other';

// ─── Constants ────────────────────────────────────────────────────────────────

export const DECLINE_REASONS: {
  id: DeclineCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: 'schedule_conflict', label: 'Schedule conflict', icon: 'calendar-outline' },
  { id: 'too_far', label: 'Too far away', icon: 'location-outline' },
  { id: 'price', label: 'Price too high', icon: 'cash-outline' },
  { id: 'child_unavailable', label: 'Child not available', icon: 'person-outline' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

// ─── InviteSummaryBanner ──────────────────────────────────────────────────────

interface InviteSummaryBannerProps {
  coachName: string;
  athleteDisplay: string;
  sessionType: string;
  slotCount: number;
  palette: ThemeColors;
}

export const InviteSummaryBanner = memo(function InviteSummaryBanner({
  coachName,
  athleteDisplay,
  sessionType,
  slotCount,
  palette,
}: InviteSummaryBannerProps) {
  return (
    <View style={[styles.inviteSummary, { backgroundColor: palette.background }]}>
      <ThemedText style={[styles.inviteSummaryText, { color: palette.text }]}>
        Coach {coachName} invited {athleteDisplay} to a{' '}
        {sessionType.toLowerCase()} session
      </ThemedText>
      {slotCount > 0 && (
        <ThemedText style={[styles.inviteSummaryMuted, { color: palette.muted }]}>
          {slotCount} proposed time{slotCount !== 1 ? 's' : ''}
        </ThemedText>
      )}
    </View>
  );
});

// ─── ReasonRadioItem ──────────────────────────────────────────────────────────

interface ReasonRadioItemProps {
  id: DeclineCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  isSelected: boolean;
  onPress: () => void;
  palette: ThemeColors;
}

export const ReasonRadioItem = memo(function ReasonRadioItem({
  id,
  label,
  icon,
  isSelected,
  onPress,
  palette,
}: ReasonRadioItemProps) {
  return (
    <Clickable
      style={[
        styles.reasonItem,
        { borderColor: palette.border, backgroundColor: palette.surface },
        isSelected ? { borderColor: palette.tint, backgroundColor: withAlpha(palette.tint, 0.03) } : undefined,
      ]}
      onPress={onPress}
    >
      <View
        style={[
          styles.radioOuter,
          { borderColor: palette.border },
          isSelected ? { borderColor: palette.tint } : undefined,
        ]}
      >
        {isSelected && <View style={[styles.radioInner, { backgroundColor: palette.tint }]} />}
      </View>
      <Ionicons
        name={icon}
        size={20}
        color={isSelected ? palette.tint : palette.muted}
      />
      <ThemedText
        style={[
          styles.reasonLabel,
          { color: palette.text },
          isSelected ? styles.reasonLabelSelected : undefined,
        ]}
      >
        {label}
      </ThemedText>
    </Clickable>
  );
});

// ─── CounterOfferLink ─────────────────────────────────────────────────────────

interface CounterOfferLinkProps {
  onPress: () => void;
  palette: ThemeColors;
}

export const CounterOfferLink = memo(function CounterOfferLink({
  onPress,
  palette,
}: CounterOfferLinkProps) {
  return (
    <Clickable
      style={[
        styles.counterOfferButton,
        { borderColor: palette.border },
      ]}
      onPress={onPress}
    >
      <Ionicons name="swap-horizontal-outline" size={18} color={palette.tint} />
      <ThemedText style={[styles.counterOfferText, { color: palette.tint }]}>
        Suggest another time
      </ThemedText>
      <Ionicons name="chevron-forward" size={16} color={palette.tint} />
    </Clickable>
  );
});

// ─── DeclineActionButtons ─────────────────────────────────────────────────────

interface DeclineActionButtonsProps {
  isSubmitting: boolean;
  onCancel: () => void;
  onDecline: () => void;
  palette: ThemeColors;
}

export const DeclineActionButtons = memo(function DeclineActionButtons({
  isSubmitting,
  onCancel,
  onDecline,
  palette,
}: DeclineActionButtonsProps) {
  return (
    <Row style={styles.buttonRow}>
      <Clickable
        style={[
          styles.cancelButton,
          { borderColor: palette.border },
        ]}
        onPress={onCancel}
      >
        <ThemedText style={[styles.cancelButtonText, { color: palette.text }]}>Cancel</ThemedText>
      </Clickable>

      <Clickable
        style={[
          styles.declineButton,
          { backgroundColor: palette.error },
          isSubmitting ? { backgroundColor: palette.border } : undefined,
        ]}
        onPress={onDecline}
        disabled={isSubmitting}
      >
        <ThemedText
          style={[
            styles.declineButtonText,
            { color: palette.surface },
            isSubmitting ? { color: palette.muted } : undefined,
          ]}
        >
          {isSubmitting ? 'Declining...' : 'Decline'}
        </ThemedText>
      </Clickable>
    </Row>
  );
});
