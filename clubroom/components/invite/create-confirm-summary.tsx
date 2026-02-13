/**
 * Confirm step summary sub-components — ExistingSummary and NewSessionSummary.
 *
 * Extracted from CreateConfirmStep to keep it within budget.
 */

import React, { memo } from 'react';
import { Ionicons } from '@expo/vector-icons';

import { Row } from '@/components/primitives';
import { ThemedText } from '@/components/themed-text';
import type { ThemeColors } from '@/hooks/useTheme';
import type {
  GroupSession,
  AvailabilitySlot,
  SessionTemplate,
  SessionInviteType,
} from '@/constants/types';

// ============================================================================
// SUMMARY ROW
// ============================================================================

interface SummaryRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  children: React.ReactNode;
}

export const SummaryRow = memo(function SummaryRow({ icon, color, children }: SummaryRowProps) {
  return (
    <Row gap="md" align="center">
      <Ionicons name={icon} size={18} color={color} />
      {children}
    </Row>
  );
});

// ============================================================================
// EXISTING SESSION SUMMARY
// ============================================================================

interface ExistingSummaryProps {
  session: GroupSession;
  colors: ThemeColors;
}

export const ExistingSummary = memo(function ExistingSummary({
  session,
  colors,
}: ExistingSummaryProps) {
  return (
    <>
      <SummaryRow icon="football-outline" color={colors.muted}>
        <ThemedText>{session.title}</ThemedText>
      </SummaryRow>
      {session.schedule[0] && (
        <SummaryRow icon="calendar-outline" color={colors.muted}>
          <ThemedText>
            {new Date(session.schedule[0].date).toLocaleDateString('en-GB', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            })}{' '}
            {session.schedule[0].startTime}-{session.schedule[0].endTime}
          </ThemedText>
        </SummaryRow>
      )}
      <SummaryRow icon="location-outline" color={colors.muted}>
        <ThemedText>{session.location}</ThemedText>
      </SummaryRow>
      <SummaryRow icon="pricetag-outline" color={colors.muted}>
        <ThemedText>
          {session.pricePerParticipant === 0
            ? 'Free'
            : `\u00A3${session.pricePerParticipant}`}
        </ThemedText>
      </SummaryRow>
    </>
  );
});

// ============================================================================
// NEW SESSION SUMMARY
// ============================================================================

interface NewSessionSummaryProps {
  selectedTemplate: SessionTemplate | null;
  sessionType: string;
  focus: string;
  sessionInviteType: SessionInviteType;
  selectedAvailabilitySlots: AvailabilitySlot[];
  price: string;
  colors: ThemeColors;
}

export const NewSessionSummary = memo(function NewSessionSummary({
  selectedTemplate,
  sessionType,
  focus,
  sessionInviteType,
  selectedAvailabilitySlots,
  price,
  colors,
}: NewSessionSummaryProps) {
  const inviteTypeLabel =
    sessionInviteType === 'OPEN'
      ? 'Open session'
      : sessionInviteType === 'CLOSED'
        ? 'Invite only (Closed)'
        : 'Squad members only';

  const inviteTypeIcon: keyof typeof Ionicons.glyphMap =
    sessionInviteType === 'OPEN'
      ? 'globe-outline'
      : sessionInviteType === 'CLOSED'
        ? 'lock-closed-outline'
        : 'people-outline';

  return (
    <>
      <SummaryRow icon="football-outline" color={colors.muted}>
        <ThemedText>
          {selectedTemplate?.name || sessionType} · {focus}
        </ThemedText>
      </SummaryRow>
      {selectedTemplate && (
        <SummaryRow icon="time-outline" color={colors.muted}>
          <ThemedText>{selectedTemplate.duration} minutes</ThemedText>
        </SummaryRow>
      )}
      <SummaryRow icon={inviteTypeIcon} color={colors.muted}>
        <ThemedText>{inviteTypeLabel}</ThemedText>
      </SummaryRow>
      {selectedAvailabilitySlots.length > 0 ? (
        selectedAvailabilitySlots.map((slot) => (
          <SummaryRow
            key={`${slot.date}_${slot.startTime}`}
            icon="calendar-outline"
            color={colors.muted}
          >
            <ThemedText>
              {new Date(slot.date + 'T00:00:00').toLocaleDateString('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}{' '}
              {slot.startTime} – {slot.endTime}
              {slot.location && ` · ${slot.location}`}
            </ThemedText>
          </SummaryRow>
        ))
      ) : (
        <SummaryRow icon="calendar-outline" color={colors.muted}>
          <ThemedText>Time slots proposed</ThemedText>
        </SummaryRow>
      )}
      <SummaryRow icon="pricetag-outline" color={colors.muted}>
        <ThemedText>
          {'\u00A3'}
          {price || selectedTemplate?.defaultPrice || '0'}/session
        </ThemedText>
      </SummaryRow>
    </>
  );
});
