import { memo, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { FamilyAccount } from '@/constants/types';
import { uiFeedback } from '@/services/ui-feedback';

interface SharingPendingInvitesProps {
  invites: NonNullable<FamilyAccount['pendingInvites']>;
  onCancel: (inviteId: string, email: string) => void;
}

export const SharingPendingInvites = memo(function SharingPendingInvites({
  invites,
  onCancel,
}: SharingPendingInvitesProps) {
  const { colors } = useTheme();

  const handleCancel = useCallback((inviteId: string, email: string) => {
    uiFeedback.alert(
      'Cancel Invite',
      `Cancel the pending invite to ${email}? They will no longer be able to accept.`,
      [
        { text: 'Back', style: 'cancel' },
        {
          text: 'Cancel Invite',
          style: 'destructive',
          onPress: () => onCancel(inviteId, email),
        },
      ],
    );
  }, [onCancel]);

  if (invites.length === 0) return null;

  return (
    <SurfaceCard style={styles.section}>
      <Row gap="sm" align="center">
        <Ionicons name="mail-outline" size={20} color={colors.warning} />
        <ThemedText type="subtitle">Pending Invitations</ThemedText>
      </Row>

      {invites.map((invite) => (
        <Row key={invite.id} align="center" style={[styles.card, { borderColor: colors.border }]}>
          <Column flex>
            <ThemedText type="defaultSemiBold">
              {invite.inviteeName || invite.inviteeEmail}
            </ThemedText>
            <ThemedText
              style={[Typography.caption, { color: colors.muted, marginTop: Spacing.micro }]}
            >
              {invite.relationship} • Expires {new Date(invite.expiresAt).toLocaleDateString()}
            </ThemedText>
          </Column>
          <Clickable
            style={[styles.cancelBtn, { borderColor: colors.error }]}
            onPress={() => handleCancel(invite.id, invite.inviteeEmail)}
            accessibilityLabel={`Cancel invite for ${invite.inviteeEmail}`}
            accessibilityRole="button"
          >
            <ThemedText style={[Typography.smallSemiBold, { color: colors.error }]}>
              Cancel
            </ThemedText>
          </Clickable>
        </Row>
      ))}
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  section: { padding: Spacing.md, gap: Spacing.md },
  card: { padding: Spacing.sm, borderRadius: Radii.sm, borderWidth: 1 },
  cancelBtn: {
    paddingHorizontal: Spacing.xs + Spacing.xxs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
    borderWidth: 1,
  },
});
