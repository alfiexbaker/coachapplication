/**
 * ClubNoMembership — Shown when the user is not a member of any club.
 *
 * Displays JoinClubCard and a benefits card explaining why to join/create a club.
 * Different messaging for coaches vs parents/athletes.
 */

import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { JoinClubCard } from '@/components/club/JoinClubCard';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export interface ClubNoMembershipProps {
  isCoach: boolean;
  onJoin: (input: { code: string; role?: string }) => void;
}

const COACH_BENEFITS = [
  'Share updates and announcements with your community',
  'Organize squads and manage private sessions',
  'Post photos and celebrate achievements',
];

const PARENT_BENEFITS = [
  'Stay updated with club news and events',
  'Access exclusive sessions and content',
  'Connect with coaches and other families',
];

export const ClubNoMembership = function ClubNoMembership({
  isCoach,
  onJoin,
}: ClubNoMembershipProps) {
  const { colors } = useTheme();
  const benefits = isCoach ? COACH_BENEFITS : PARENT_BENEFITS;

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <JoinClubCard isCoach={isCoach} onJoin={onJoin} />

      <SurfaceCard style={styles.benefitsCard}>
        <ThemedText type="defaultSemiBold" style={{ marginBottom: Spacing.sm }}>
          {isCoach ? 'Why create a club?' : 'Why join a club?'}
        </ThemedText>
        <Column gap="sm">
          {benefits.map((text) => (
            <Row key={text} gap="sm" align="flex-start">
              <Ionicons name="checkmark-circle" size={18} color={colors.tint} />
              <ThemedText style={{ flex: 1 }}>{text}</ThemedText>
            </Row>
          ))}
        </Column>
      </SurfaceCard>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
    paddingBottom: Spacing.xl * 2,
  },
  benefitsCard: {
    gap: Spacing.xs,
  },
});
