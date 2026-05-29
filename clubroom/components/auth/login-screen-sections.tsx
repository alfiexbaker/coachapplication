import { View, StyleSheet } from 'react-native';
import { Clickable } from '@/components/primitives/clickable';
import { Ionicons } from '@expo/vector-icons';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import type { ThemeColors } from '@/hooks/useTheme';
import { Row } from '@/components/primitives';

/* ---------- SignupCard ---------- */

export interface SignupCardProps {
  onPress: () => void;
  palette: ThemeColors;
}

export const SignupCard = function SignupCard({ onPress, palette }: SignupCardProps) {
  return (
    <Clickable
      style={[
        styles.actionCard,
        {
          backgroundColor: withAlpha(palette.tint, 0.06),
          borderColor: withAlpha(palette.tint, 0.15),
        },
      ]}
      onPress={onPress}
    >
      <Row style={styles.actionRow}>
        <View style={[styles.actionIcon, { backgroundColor: withAlpha(palette.tint, 0.14) }]}>
          <Ionicons name="person-add-outline" size={18} color={palette.tint} />
        </View>
        <View style={styles.actionCopy}>
          <ThemedText style={styles.actionTitle}>Create account</ThemedText>
          <ThemedText style={[styles.actionSubtitle, { color: palette.muted }]}>
            Start now.
          </ThemedText>
        </View>
        <Ionicons name="arrow-forward" size={18} color={palette.tint} />
      </Row>
    </Clickable>
  );
};

/* ---------- InviteCodeCard ---------- */

export interface InviteCodeCardProps {
  onPress: () => void;
  palette: ThemeColors;
}

export const InviteCodeCard = function InviteCodeCard({
  onPress,
  palette,
}: InviteCodeCardProps) {
  return (
    <Clickable
      style={[
        styles.actionCard,
        {
          backgroundColor: withAlpha(palette.text, 0.03),
          borderColor: withAlpha(palette.text, 0.12),
        },
      ]}
      onPress={onPress}
    >
      <Row style={styles.actionRow}>
        <View style={[styles.actionIcon, { backgroundColor: withAlpha(palette.accent, 0.1) }]}>
          <Ionicons name="key-outline" size={18} color={palette.accent} />
        </View>
        <View style={styles.actionCopy}>
          <ThemedText style={styles.actionTitle}>Use invite code</ThemedText>
          <ThemedText style={[styles.actionSubtitle, { color: palette.muted }]}>
            Join your squad.
          </ThemedText>
        </View>
        <Ionicons name="arrow-forward" size={18} color={palette.accent} />
      </Row>
    </Clickable>
  );
};

/* ---------- DemoAccountsCard ---------- */

export interface DemoAccountsCardProps {
  users: { username: string; password: string; role: string }[];
  palette: ThemeColors;
  onSelectUser?: (user: { username: string; password: string; role: string }) => void;
}

export const DemoAccountsCard = function DemoAccountsCard({
  users,
  palette,
  onSelectUser,
}: DemoAccountsCardProps) {
  return (
    <SurfaceCard
      style={[
        styles.credentialsCard,
        {
          backgroundColor: withAlpha(palette.surface, 0.85),
          borderColor: withAlpha(palette.text, 0.08),
        },
      ]}
    >
      <ThemedText style={styles.credentialsTitle}>Test credentials</ThemedText>
      <ThemedText style={[styles.credentialsSubtitle, { color: palette.muted }]}>
        Tap any row to autofill login.
      </ThemedText>
      {users.map((user, index, arr) => (
        <Clickable
          key={user.username}
          onPress={() => onSelectUser?.(user)}
          style={[
            styles.credentialsRow,
            {
              borderBottomColor: withAlpha(palette.text, 0.08),
              borderBottomWidth: index === arr.length - 1 ? 0 : StyleSheet.hairlineWidth,
            },
          ]}
        >
          <View style={[styles.roleBadge, { backgroundColor: withAlpha(palette.tint, 0.16) }]}>
            <ThemedText style={styles.roleBadgeText}>{user.role}</ThemedText>
          </View>
          <ThemedText style={[styles.credentialValue, { color: palette.text }]}>
            {user.username} / {user.password}
          </ThemedText>
          <Ionicons name="chevron-forward" size={14} color={palette.muted} />
        </Clickable>
      ))}
    </SurfaceCard>
  );
};

/* ---------- DemoRoleEntryCard ---------- */

export interface DemoRoleEntryCardProps {
  entry: {
    id: string;
    title: string;
    subtitle: string;
    description: string;
    username: string;
    password: string;
    roleLabel: string;
  };
  palette: ThemeColors;
  onPress: () => void;
}

export const DemoRoleEntryCard = function DemoRoleEntryCard({
  entry,
  palette,
  onPress,
}: DemoRoleEntryCardProps) {
  return (
    <Clickable
      onPress={onPress}
      style={[
        styles.roleEntryCard,
        {
          backgroundColor: withAlpha(palette.tint, 0.05),
          borderColor: withAlpha(palette.tint, 0.16),
        },
      ]}
    >
      <Row style={styles.roleEntryHeader}>
        <View style={[styles.roleBadge, { backgroundColor: withAlpha(palette.tint, 0.16) }]}>
          <ThemedText style={[styles.roleBadgeText, { color: palette.tint }]}>
            {entry.roleLabel}
          </ThemedText>
        </View>
        <Ionicons name="arrow-forward-circle-outline" size={20} color={palette.tint} />
      </Row>
      <View style={styles.roleEntryCopy}>
        <ThemedText style={styles.actionTitle}>{entry.title}</ThemedText>
        <ThemedText style={[styles.actionSubtitle, { color: palette.muted }]}>
          {entry.subtitle}
        </ThemedText>
        <ThemedText style={[styles.roleEntryBody, { color: palette.muted }]}>
          {entry.description}
        </ThemedText>
      </View>
    </Clickable>
  );
};

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  actionCard: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  actionRow: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCopy: {
    flex: 1,
    gap: Spacing.micro,
  },
  actionTitle: {
    ...Typography.bodySemiBold,
  },
  actionSubtitle: {
    ...Typography.small,
  },
  credentialsCard: {
    padding: Spacing.lg,
    borderRadius: Radii.lg,
    gap: Spacing.sm,
    borderWidth: 1,
  },
  credentialsTitle: {
    textAlign: 'left',
    ...Typography.bodySemiBold,
  },
  credentialsSubtitle: {
    ...Typography.small,
    marginTop: -Spacing.xs,
  },
  credentialsRow: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
    paddingTop: Spacing.xxs,
  },
  roleBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.pill,
  },
  roleBadgeText: { ...Typography.caption, textTransform: 'uppercase' },
  credentialValue: {
    fontFamily: 'monospace',
    flex: 1,
    ...Typography.smallSemiBold,
  },
  roleEntryCard: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  roleEntryHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleEntryCopy: {
    gap: Spacing.xxs,
  },
  roleEntryBody: {
    ...Typography.small,
  },
});
