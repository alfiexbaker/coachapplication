import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

interface CreateSessionInviteStepProps {
  selectedSquadIds: string[];
  squadInviteSent: boolean;
  onInvitePress: () => void;
}

function CreateSessionInviteStepInner({
  selectedSquadIds,
  squadInviteSent,
  onInvitePress,
}: CreateSessionInviteStepProps) {
  const { colors: palette } = useTheme();

  return (
    <Animated.View entering={FadeInDown.springify()} style={styles.stepContent}>
      <View style={styles.inviteHeader}>
        <View style={[styles.successIcon, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
          <Ionicons name="checkmark-circle" size={48} color={palette.success} />
        </View>
        <ThemedText type="title" style={styles.stepTitle}>
          Session Created!
        </ThemedText>
        <ThemedText style={[styles.stepSubtitle, { color: palette.muted }]}>
          Would you like to invite your squad?
        </ThemedText>
      </View>

      {selectedSquadIds.length > 0 ? (
        <SurfaceCard style={styles.inviteCard}>
          <View style={styles.inviteCardHeader}>
            <Ionicons name="people" size={24} color={palette.tint} />
            <View style={{ flex: 1 }}>
              <ThemedText type="defaultSemiBold">Invite Squad Members</ThemedText>
              <ThemedText style={{ color: palette.muted, ...Typography.caption }}>
                Send session invites to all athletes in your linked squad
              </ThemedText>
            </View>
          </View>

          {squadInviteSent ? (
            <View style={[styles.inviteSentBadge, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
              <Ionicons name="checkmark-circle" size={18} color={palette.success} />
              <ThemedText style={[styles.inviteSentText, { color: palette.success }]}>
                Invites sent successfully!
              </ThemedText>
            </View>
          ) : (
            <Clickable
              onPress={onInvitePress}
              style={[styles.inviteButton, { backgroundColor: palette.tint }]}
            >
              <Ionicons name="paper-plane" size={18} color={palette.onPrimary} />
              <ThemedText style={[styles.inviteButtonText, { color: palette.onPrimary }]}>
                Invite Squad to Session
              </ThemedText>
            </Clickable>
          )}
        </SurfaceCard>
      ) : (
        <SurfaceCard style={styles.inviteCard}>
          <View style={styles.noSquadMessage}>
            <Ionicons name="information-circle-outline" size={24} color={palette.muted} />
            <ThemedText style={{ color: palette.muted, flex: 1 }}>
              No squad linked. You can still invite athletes individually from the session page.
            </ThemedText>
          </View>
        </SurfaceCard>
      )}

      <ThemedText style={[styles.inviteNote, { color: palette.muted }]}>
        You can also invite athletes later from the session details page.
      </ThemedText>
    </Animated.View>
  );
}

export const CreateSessionInviteStep = React.memo(CreateSessionInviteStepInner);

const styles = StyleSheet.create({
  stepContent: {
    gap: Spacing.lg,
  },
  stepTitle: {
    textAlign: 'center',
  },
  stepSubtitle: {
    textAlign: 'center',
    ...Typography.bodySmall,
    marginTop: -Spacing.sm,
  },
  inviteHeader: {
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: Radii['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  inviteCard: {
    gap: Spacing.md,
  },
  inviteCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
  },
  inviteButtonText: {
    ...Typography.bodySemiBold,
  },
  inviteSentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
  },
  inviteSentText: {
    ...Typography.bodySemiBold,
  },
  noSquadMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  inviteNote: {
    ...Typography.small,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
});
