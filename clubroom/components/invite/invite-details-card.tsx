/**
 * InviteDetailsCard — Shows session type, focus, price, and notes.
 */

import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row, Column } from '@/components/primitives';
import { Spacing, Typography } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { SessionInvite } from '@/constants/types';

interface InviteDetailsCardProps {
  invite: SessionInvite;
  colors: ThemeColors;
  delay?: number;
}

function DetailRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: string;
  label: string;
  value: string;
  colors: ThemeColors;
}) {
  return (
    <Row gap="md" align="flex-start">
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color={colors.muted} />
      <Column gap="micro" style={styles.detailContent}>
        <ThemedText style={{ color: colors.muted, ...Typography.caption }}>{label}</ThemedText>
        <ThemedText>{value}</ThemedText>
      </Column>
    </Row>
  );
}

export const InviteDetailsCard = memo(function InviteDetailsCard({
  invite,
  colors,
  delay = 150,
}: InviteDetailsCardProps) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <SurfaceCard style={styles.card}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          Session Details
        </ThemedText>

        <DetailRow
          icon="football-outline"
          label="Type & Focus"
          value={`${invite.sessionType} - ${invite.focus}`}
          colors={colors}
        />

        {invite.price != null && invite.price > 0 && (
          <DetailRow
            icon="pricetag-outline"
            label="Price"
            value={`£${invite.price}`}
            colors={colors}
          />
        )}

        {invite.notes != null && invite.notes.length > 0 && (
          <DetailRow icon="chatbubble-outline" label="Notes" value={invite.notes} colors={colors} />
        )}
      </SurfaceCard>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  detailContent: {
    flex: 1,
  },
});
