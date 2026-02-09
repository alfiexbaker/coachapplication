/**
 * BookingParticipantsCard — Group session participants list card.
 *
 * Shows participants with status badges, message buttons (for coaches),
 * and links to athlete development profiles.
 */

import React, { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface Participant {
  id: string;
  name: string;
  avatar: string;
  status: 'confirmed' | 'pending' | 'cancelled';
}

interface BookingParticipantsCardProps {
  participants: Participant[];
  currentParticipants?: number;
  maxParticipants?: number;
  coachId?: string;
  isCoach: boolean;
}

const statusColorKey = {
  confirmed: 'success',
  pending: 'warning',
  cancelled: 'error',
} as const;

export const BookingParticipantsCard = memo(function BookingParticipantsCard({
  participants,
  currentParticipants,
  maxParticipants,
  coachId,
  isCoach,
}: BookingParticipantsCardProps) {
  const { colors: palette } = useTheme();

  return (
    <SurfaceCard style={styles.card}>
      <Row gap="md" align="center" justify="between" style={styles.headerSpacing}>
        <ThemedText style={styles.cardTitle}>Participants</ThemedText>
        <ThemedText style={[styles.capacityBadge, { color: palette.tint }]}>
          {currentParticipants}/{maxParticipants} spots
        </ThemedText>
      </Row>
      <Column gap="sm">
        {participants.map((participant) => (
          <ParticipantRow
            key={participant.id}
            participant={participant}
            coachId={coachId}
            isCoach={isCoach}
          />
        ))}
      </Column>
    </SurfaceCard>
  );
});

// ============================================================================
// PARTICIPANT ROW
// ============================================================================

interface ParticipantRowProps {
  participant: Participant;
  coachId?: string;
  isCoach: boolean;
}

const ParticipantRow = memo(function ParticipantRow({ participant, coachId, isCoach }: ParticipantRowProps) {
  const { colors: palette } = useTheme();

  const colorKey = statusColorKey[participant.status];
  const statusColor = palette[colorKey];

  const handlePress = useCallback(() => {
    if (isCoach) {
      router.push(Routes.developmentAthlete(participant.id));
    }
  }, [isCoach, participant.id]);

  const handleMessage = useCallback(() => {
    router.push(Routes.messagesWith({ coachId, athleteId: participant.id }));
  }, [coachId, participant.id]);

  return (
    <Row
      gap="sm"
      align="center"
      justify="between"
      style={[styles.participantRow, { borderBottomColor: withAlpha(palette.border, 0.19) }]}
    >
      <Clickable
        onPress={handlePress}
        style={styles.participantInfo}
        disabled={!isCoach}
        accessibilityLabel={`${participant.name} - ${participant.status}`}
      >
        <View style={[styles.participantAvatar, { backgroundColor: withAlpha(palette.tint, 0.12) }]}>
          <ThemedText style={[styles.participantAvatarText, { color: palette.tint }]}>
            {participant.avatar}
          </ThemedText>
        </View>
        <Column gap="xxs" style={styles.flex1}>
          <Row gap="xxs" align="center">
            <ThemedText type="defaultSemiBold" style={isCoach && styles.clickableText}>
              {participant.name}
            </ThemedText>
            {isCoach && <Ionicons name="arrow-forward" size={14} color={palette.tint} />}
          </Row>
          <View style={[styles.participantStatus, { backgroundColor: withAlpha(statusColor, 0.12) }]}>
            <ThemedText style={[styles.participantStatusText, { color: statusColor }]}>
              {participant.status.charAt(0).toUpperCase() + participant.status.slice(1)}
            </ThemedText>
          </View>
        </Column>
      </Clickable>
      {isCoach && (
        <Clickable
          onPress={handleMessage}
          style={[styles.messageButton, { backgroundColor: withAlpha(palette.tint, 0.06) }]}
          accessibilityLabel={`Message ${participant.name}`}
        >
          <Ionicons name="chatbubble-outline" size={18} color={palette.tint} />
        </Clickable>
      )}
    </Row>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  card: { padding: Spacing.lg, gap: Spacing.md },
  cardTitle: { ...Typography.caption, textTransform: 'uppercase', letterSpacing: 0.5, opacity: 0.6, fontWeight: '600' },
  capacityBadge: { ...Typography.bodySmallSemiBold },
  headerSpacing: { marginBottom: Spacing.sm },
  participantRow: { paddingVertical: Spacing.sm, borderBottomWidth: 1 },
  participantInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  participantAvatar: { width: 40, height: 40, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  participantAvatarText: { ...Typography.heading },
  flex1: { flex: 1 },
  clickableText: { textDecorationLine: 'underline' },
  participantStatus: { alignSelf: 'flex-start', paddingHorizontal: Spacing.xs, paddingVertical: Spacing.micro, borderRadius: Radii.md },
  participantStatusText: { ...Typography.caption, textTransform: 'capitalize' },
  messageButton: { width: 44, height: 44, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
});
