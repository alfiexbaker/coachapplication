/**
 * SquadConfirmStep — Step 3: Confirm and send invites.
 */
import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { SquadInvitePreview } from '@/services/invite';
import type { InviteType, SquadSessionProps } from '@/hooks/use-squad-invite-modal';

interface SquadConfirmStepProps {
  inviteType: InviteType;
  targetTitle: string;
  preview: SquadInvitePreview[];
  totalMembers: number;
  totalParents: number;
  sessionProps?: SquadSessionProps;
}

function SquadConfirmStepInner({
  inviteType,
  targetTitle,
  preview,
  totalMembers,
  totalParents,
  sessionProps,
}: SquadConfirmStepProps) {
  const { colors: palette } = useTheme();

  return (
    <Animated.View entering={FadeInDown.springify()} style={styles.content}>
      <View style={styles.center}>
        <View style={[styles.icon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
          <Ionicons name="paper-plane" size={48} color={palette.tint} />
        </View>

        <ThemedText type="subtitle" style={styles.title}>
          Ready to Send?
        </ThemedText>

        <ThemedText style={[styles.text, { color: palette.muted }]}>
          {inviteType === 'SESSION' &&
            `${totalParents} parent${totalParents !== 1 ? 's' : ''} will receive session invites for ${totalMembers} athlete${totalMembers !== 1 ? 's' : ''}.`}
          {inviteType === 'MATCH' &&
            `${totalParents} parent${totalParents !== 1 ? 's' : ''} will receive availability requests for ${totalMembers} athlete${totalMembers !== 1 ? 's' : ''}.`}
          {inviteType === 'EVENT' &&
            `${totalParents} parent${totalParents !== 1 ? 's' : ''} will receive event invitations for ${totalMembers} athlete${totalMembers !== 1 ? 's' : ''}.`}
        </ThemedText>

        <SurfaceCard style={styles.summary}>
          <Row align="center" gap="sm">
            <Ionicons name="calendar-outline" size={18} color={palette.muted} />
            <ThemedText style={{ flex: 1 }}>{targetTitle}</ThemedText>
          </Row>
          <Row align="center" gap="sm">
            <Ionicons name="people-outline" size={18} color={palette.muted} />
            <ThemedText style={{ flex: 1 }}>
              {preview.map((p) => p.squadName).join(', ')}
            </ThemedText>
          </Row>
          {inviteType === 'SESSION' && sessionProps?.focus && (
            <Row align="center" gap="sm">
              <Ionicons name="football-outline" size={18} color={palette.muted} />
              <ThemedText style={{ flex: 1 }}>{sessionProps.focus}</ThemedText>
            </Row>
          )}
        </SurfaceCard>

        <ThemedText style={[styles.disclaimer, { color: palette.muted }]}>
          {inviteType === 'SESSION' && 'Parents will have 7 days to respond to the invite.'}
          {inviteType === 'MATCH' &&
            'Parents will be notified immediately and can update availability anytime.'}
          {inviteType === 'EVENT' && 'Parents will receive a notification with event details.'}
        </ThemedText>
      </View>
    </Animated.View>
  );
}

export const SquadConfirmStep = memo(SquadConfirmStepInner);

const styles = StyleSheet.create({
  content: { gap: Spacing.md },
  center: { alignItems: 'center', paddingVertical: Spacing.lg },
  icon: {
    width: 80,
    height: 80,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: { textAlign: 'center', marginBottom: Spacing.sm },
  text: { textAlign: 'center', marginBottom: Spacing.lg, paddingHorizontal: Spacing.lg },
  summary: { width: '100%', gap: Spacing.sm },
  disclaimer: {
    ...Typography.small,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
});
