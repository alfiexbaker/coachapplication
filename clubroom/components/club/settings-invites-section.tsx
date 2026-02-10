import React, { memo } from 'react';
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
import { Row } from '@/components/primitives';

interface SettingsInvitesSectionProps {
  inviteCodes: InviteCodeItem[];
  colors: ThemeColors;
  onCopy: (code: string) => void;
  onShare: (code: string, role: string) => void;
  onGenerate: (role: ClubRole) => void;
}

export const SettingsInvitesSection = memo(function SettingsInvitesSection({
  inviteCodes, colors, onCopy, onShare, onGenerate,
}: SettingsInvitesSectionProps) {
  return (
    <Animated.View entering={FadeInDown.springify()}>
      <SurfaceCard style={styles.card}>
        <ThemedText type="defaultSemiBold" style={Typography.heading}>Invite Codes</ThemedText>
        <ThemedText style={[Typography.small, { color: colors.muted, marginTop: Spacing.micro }]}>Share codes to invite coaches and members</ThemedText>

        {inviteCodes.map((invite) => (
          <Row key={invite.code} style={[styles.inviteRow, { borderColor: colors.border }]}>
            <View style={{ flex: 1, gap: Spacing.xs }}>
              <ThemedText type="defaultSemiBold" style={[Typography.subheading, { fontFamily: 'monospace' }]}>{invite.code}</ThemedText>
              <Row gap="sm" align="center">
                <View style={[styles.roleBadge, { backgroundColor: withAlpha(clubService.getRoleColor(invite.role), 0.12) }]}>
                  <ThemedText style={[Typography.caption, { color: clubService.getRoleColor(invite.role) }]}>{clubService.formatRole(invite.role)}</ThemedText>
                </View>
                <ThemedText style={[Typography.caption, { color: colors.muted }]}>{invite.remainingUses} uses left</ThemedText>
              </Row>
            </View>
            <Row gap="xs">
              <Clickable style={[styles.iconBtn, { backgroundColor: withAlpha(colors.tint, 0.06) }]} onPress={() => onCopy(invite.code)}>
                <Ionicons name="copy-outline" size={18} color={colors.tint} />
              </Clickable>
              <Clickable accessibilityLabel="Share invite link" style={[styles.iconBtn, { backgroundColor: withAlpha(colors.tint, 0.06) }]} onPress={() => onShare(invite.code, invite.role)}>
                <Ionicons name="share-outline" size={18} color={colors.tint} />
              </Clickable>
            </Row>
          </Row>
        ))}

        <Row gap="sm">
          {(['COACH', 'MEMBER'] as ClubRole[]).map((role) => (
            <Clickable key={role} style={[styles.genBtn, { flex: 1, borderColor: colors.border }]} onPress={() => onGenerate(role)}>
              <Ionicons name="add" size={18} color={colors.tint} />
              <ThemedText style={{ color: colors.tint, fontWeight: '600' }}>{role === 'COACH' ? 'Coach' : 'Member'} Invite</ThemedText>
            </Clickable>
          ))}
        </Row>
      </SurfaceCard>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: { gap: Spacing.md },
  inviteRow: { alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md, borderRadius: Radii.md, borderWidth: 1 },
  roleBadge: { paddingHorizontal: Spacing.sm, paddingVertical: Spacing.micro, borderRadius: Radii.sm },
  iconBtn: { width: 44, height: 44, borderRadius: Radii.xl, alignItems: 'center', justifyContent: 'center' },
  genBtn: { alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, paddingVertical: Spacing.sm, borderRadius: Radii.md, borderWidth: 1 },
});
