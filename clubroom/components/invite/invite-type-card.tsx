/**
 * InviteTypeCard — Shows the invite type (Open/Closed/Squad Only)
 * with description, invite players action, and squad access badges.
 */

import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row, Column } from '@/components/primitives';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import type { SessionInviteType } from '@/constants/types';

interface InviteTypeCardProps {
  inviteType: SessionInviteType;
  squadIds?: string[];
  isOwner: boolean;
  colors: ThemeColors;
  onInvitePlayers?: () => void;
  delay?: number;
}

function getTypeConfig(
  inviteType: SessionInviteType,
  colors: ThemeColors,
): { label: string; icon: string; bg: string; textColor: string; description: string } {
  switch (inviteType) {
    case 'OPEN':
      return {
        label: 'Open Session',
        icon: 'globe-outline',
        bg: withAlpha(colors.success, 0.09),
        textColor: colors.success,
        description: 'This session is visible to all parents when browsing.',
      };
    case 'CLOSED':
      return {
        label: 'Invite Only',
        icon: 'lock-closed-outline',
        bg: withAlpha(colors.warning, 0.09),
        textColor: colors.warning,
        description: 'Only explicitly invited parents can view and book.',
      };
    case 'SQUAD_ONLY':
      return {
        label: 'Squad Only',
        icon: 'people-outline',
        bg: withAlpha(colors.info, 0.09),
        textColor: colors.info,
        description: 'Only squad members can view and book this session.',
      };
  }
}

export const InviteTypeCard = memo(function InviteTypeCard({
  inviteType,
  squadIds,
  isOwner,
  colors,
  onInvitePlayers,
  delay = 175,
}: InviteTypeCardProps) {
  const currentType = inviteType || 'OPEN';
  const cfg = getTypeConfig(currentType, colors);

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <SurfaceCard style={styles.card}>
        <Row gap="md" align="flex-start">
          <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon as keyof typeof Ionicons.glyphMap} size={18} color={cfg.textColor} />
          </View>
          <Column gap="micro" style={styles.content}>
            <ThemedText style={{ color: colors.muted, ...Typography.caption }}>Invite Type</ThemedText>
            <ThemedText type="defaultSemiBold" style={{ color: cfg.textColor }}>
              {cfg.label}
            </ThemedText>
            <ThemedText style={{ color: colors.muted, ...Typography.small, marginTop: Spacing.micro }}>
              {cfg.description}
            </ThemedText>
          </Column>
        </Row>

        {/* Invite Players action for CLOSED type - coach only */}
        {currentType === 'CLOSED' && isOwner && onInvitePlayers && (
          <Clickable
            onPress={onInvitePlayers}
            accessibilityLabel="Invite players"
            style={[styles.invitePlayersButton, { backgroundColor: colors.tint }]}
          >
            <Row gap="xs" align="center" justify="center">
              <Ionicons name="person-add-outline" size={16} color={colors.onPrimary} />
              <ThemedText style={{ color: colors.onPrimary, ...Typography.bodySmallSemiBold }}>
                Invite Players
              </ThemedText>
            </Row>
          </Clickable>
        )}

        {/* Squad info for SQUAD_ONLY type */}
        {currentType === 'SQUAD_ONLY' && squadIds && squadIds.length > 0 && (
          <Column style={styles.squadSection}>
            <ThemedText style={{ color: colors.muted, ...Typography.caption, marginBottom: Spacing.xxs }}>
              Squad Access
            </ThemedText>
            {squadIds.map((squadId) => (
              <Row
                key={squadId}
                gap="xs"
                align="center"
                style={[styles.squadBadge, { backgroundColor: withAlpha(colors.info, 0.06) }]}
              >
                <Ionicons name="people" size={14} color={colors.info} />
                <ThemedText style={{ color: colors.info, ...Typography.small }}>
                  {squadId}
                </ThemedText>
              </Row>
            ))}
          </Column>
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
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  invitePlayersButton: {
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    marginTop: Spacing.xs,
    minHeight: 44,
  },
  squadSection: {
    marginTop: Spacing.xs,
  },
  squadBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
    marginBottom: Spacing.xxs,
  },
});
