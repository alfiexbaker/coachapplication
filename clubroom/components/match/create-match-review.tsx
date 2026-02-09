import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { matchService } from '@/services/match-service';
import type { ThemeColors } from '@/hooks/useTheme';
import type { MatchType, ClubSquad } from '@/constants/types';

interface CreateMatchReviewProps {
  matchType: MatchType;
  opponent: string;
  isHome: boolean;
  venue: string;
  date: string;
  kickoffTime: string;
  meetTime: string;
  maxPlayers: string;
  notes: string;
  selectedSquad: ClubSquad | null;
  squadMemberCount: number;
  autoInvite: boolean;
  colors: ThemeColors;
}

export const CreateMatchReview = memo(function CreateMatchReview({
  matchType, opponent, isHome, venue, date, kickoffTime, meetTime, maxPlayers, notes,
  selectedSquad, squadMemberCount, autoInvite, colors,
}: CreateMatchReviewProps) {
  const typeColor = matchService.getMatchTypeColor(matchType);

  return (
    <View style={styles.stepContent}>
      <ThemedText type="defaultSemiBold" style={styles.stepTitle}>Review Match</ThemedText>

      <SurfaceCard style={styles.reviewCard}>
        <Row gap="sm">
          <View style={[styles.typeBadge, { backgroundColor: withAlpha(typeColor, 0.09) }]}>
            <ThemedText style={[styles.typeBadgeText, { color: typeColor }]}>{matchService.formatMatchType(matchType)}</ThemedText>
          </View>
          <View style={[styles.homeAwayBadge, { backgroundColor: colors.surface }]}>
            <Ionicons name={isHome ? 'home' : 'airplane'} size={12} color={colors.muted} />
            <ThemedText style={[Typography.caption, { color: colors.muted }]}>{isHome ? 'Home' : 'Away'}</ThemedText>
          </View>
        </Row>

        <ThemedText type="title" style={Typography.title}>{selectedSquad?.name || 'Team'} vs {opponent}</ThemedText>

        <View style={styles.details}>
          {[
            { icon: 'calendar', text: date || 'Date not set' },
            { icon: 'time', text: `Kickoff: ${kickoffTime || '--:--'}${meetTime ? ` (Meet: ${meetTime})` : ''}` },
            { icon: 'location', text: venue },
            { icon: 'people', text: `${selectedSquad?.name} (${squadMemberCount} players)` },
            { icon: 'person', text: `Squad size: ${maxPlayers}` },
          ].map(({ icon, text }) => (
            <Row key={icon} gap="sm" align="center">
              <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color={colors.tint} />
              <ThemedText>{text}</ThemedText>
            </Row>
          ))}
        </View>

        {notes ? (
          <View style={[styles.notesBox, { backgroundColor: colors.surface }]}>
            <ThemedText style={[Typography.caption, { color: colors.muted }]}>Notes:</ThemedText>
            <ThemedText style={Typography.bodySmall}>{notes}</ThemedText>
          </View>
        ) : null}

        {autoInvite && (
          <Row gap="sm" align="center" style={[styles.inviteInfo, { backgroundColor: withAlpha(colors.success, 0.06) }]}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <ThemedText style={{ color: colors.success }}>Invites will be sent to all squad members</ThemedText>
          </Row>
        )}
      </SurfaceCard>
    </View>
  );
});

const styles = StyleSheet.create({
  stepContent: { gap: Spacing.md },
  stepTitle: { ...Typography.heading, marginBottom: Spacing.sm },
  reviewCard: { gap: Spacing.md },
  typeBadge: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs, borderRadius: Radii.pill },
  typeBadgeText: { ...Typography.caption, textTransform: 'uppercase' },
  homeAwayBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xxs, borderRadius: Radii.pill },
  details: { gap: Spacing.sm },
  notesBox: { padding: Spacing.sm, borderRadius: Radii.sm, gap: Spacing.xxs },
  inviteInfo: { padding: Spacing.sm, borderRadius: Radii.sm },
});
