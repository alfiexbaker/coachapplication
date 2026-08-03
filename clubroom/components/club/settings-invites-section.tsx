import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { clubService } from '@/services/club-service';
import type { ThemeColors } from '@/hooks/useTheme';
import type { ClubRole } from '@/constants/types';
import type { InviteCodeItem } from '@/hooks/use-club-settings';
import { ORGANIZATION_ROLE_LABELS, getAssignableClubRoles } from '@/contracts/club-governance';

interface SettingsInvitesSectionProps {
  inviteCodes: InviteCodeItem[];
  colors: ThemeColors;
  viewerRole?: ClubRole;
  onCopy: (code: string) => void;
  onShare: (code: string, role: string) => void;
  onGenerate: (role: ClubRole) => void;
  onDelete: (code: string) => void;
}

export const SettingsInvitesSection = function SettingsInvitesSection({
  inviteCodes,
  colors,
  viewerRole,
  onCopy,
  onShare,
  onGenerate,
  onDelete,
}: SettingsInvitesSectionProps) {
  const inviteRoles = (
    viewerRole ? getAssignableClubRoles(viewerRole) : (['MEMBER'] as ClubRole[])
  ).filter((role) => role === 'MEMBER' || role === 'COACH' || role === 'ADMIN');

  return (
    <Animated.View entering={FadeInDown.springify()}>
      <SurfaceCard style={styles.card}>
        <ThemedText type="defaultSemiBold" style={Typography.heading}>
          Invite codes
        </ThemedText>
        <ThemedText style={[Typography.small, { color: colors.muted, marginTop: Spacing.micro }]}>
          Create and share club access codes.
        </ThemedText>

        {inviteCodes.map((invite) => {
          const roleLabel = clubService.formatRole(invite.role);
          return (
            <View key={invite.code} style={[styles.inviteRow, { borderColor: colors.border }]}>
              <ThemedText
                type="defaultSemiBold"
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                style={[styles.code, { color: colors.text }]}
              >
                {invite.code}
              </ThemedText>
              <Row gap="xs" align="center" wrap>
                <View
                  style={[
                    styles.roleBadge,
                    { backgroundColor: withAlpha(clubService.getRoleColor(invite.role), 0.12) },
                  ]}
                >
                  <ThemedText
                    style={[Typography.caption, { color: clubService.getRoleColor(invite.role) }]}
                  >
                    {roleLabel}
                  </ThemedText>
                </View>
                <ThemedText style={[Typography.caption, { color: colors.muted }]}>
                  {invite.remainingUses} uses left
                </ThemedText>
                {invite.isPrimary && (
                  <View
                    style={[styles.primaryBadge, { backgroundColor: withAlpha(colors.tint, 0.12) }]}
                  >
                    <ThemedText style={[Typography.micro, { color: colors.tint }]}>
                      Primary
                    </ThemedText>
                  </View>
                )}
              </Row>

              <Row gap="xs" style={styles.actionRow}>
                <Clickable
                  accessibilityLabel={`Copy ${roleLabel} invite code`}
                  style={[styles.actionButton, { backgroundColor: withAlpha(colors.tint, 0.06) }]}
                  onPress={() => onCopy(invite.code)}
                >
                  <Ionicons name="copy-outline" size={18} color={colors.tint} />
                  <ThemedText style={[Typography.caption, { color: colors.tint }]}>Copy</ThemedText>
                </Clickable>
                <Clickable
                  accessibilityLabel={`Share ${roleLabel} invite code`}
                  style={[styles.actionButton, { backgroundColor: withAlpha(colors.tint, 0.06) }]}
                  onPress={() => onShare(invite.code, invite.role)}
                >
                  <Ionicons name="share-outline" size={18} color={colors.tint} />
                  <ThemedText style={[Typography.caption, { color: colors.tint }]}>
                    Share
                  </ThemedText>
                </Clickable>
                <Clickable
                  accessibilityLabel={`Revoke ${roleLabel} invite code`}
                  style={[styles.actionButton, { backgroundColor: withAlpha(colors.error, 0.08) }]}
                  onPress={() => onDelete(invite.code)}
                >
                  <Ionicons name="remove-circle-outline" size={18} color={colors.error} />
                  <ThemedText style={[Typography.caption, { color: colors.error }]}>
                    Revoke
                  </ThemedText>
                </Clickable>
              </Row>
            </View>
          );
        })}

        <View style={styles.createActions}>
          {inviteRoles.map((role) => (
            <Clickable
              key={role}
              style={[styles.genBtn, { borderColor: colors.border }]}
              onPress={() => onGenerate(role)}
            >
              <Ionicons name="add" size={18} color={colors.tint} />
              <ThemedText style={[Typography.smallSemiBold, { color: colors.tint }]}>
                Create {ORGANIZATION_ROLE_LABELS[role].toLowerCase()} code
              </ThemedText>
            </Clickable>
          ))}
        </View>
      </SurfaceCard>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: { gap: Spacing.md },
  inviteRow: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  code: {
    ...Typography.subheading,
    fontFamily: 'monospace',
    letterSpacing: 0.8,
  },
  roleBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  primaryBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.sm,
  },
  actionRow: {
    width: '100%',
  },
  actionButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.micro,
  },
  createActions: {
    gap: Spacing.xs,
  },
  genBtn: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
});
