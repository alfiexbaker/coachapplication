import { memo } from 'react';
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

export const SignupCard = memo(function SignupCard({ onPress, palette }: SignupCardProps) {
  return (
    <Clickable style={[styles.signupCard, { backgroundColor: palette.tint }]} onPress={onPress}>
      <Row style={styles.signupCardContent}>
        <Ionicons name="person-add" size={24} color={palette.onPrimary} />
        <View style={styles.signupCardText}>
          <ThemedText style={[styles.signupTitle, { color: palette.onPrimary }]}>
            New to Clubroom?
          </ThemedText>
          <ThemedText style={[styles.signupSubtitle, { color: withAlpha(palette.onPrimary, 0.8) }]}>
            Create your free account
          </ThemedText>
        </View>
      </Row>
      <Ionicons name="arrow-forward" size={20} color={palette.onPrimary} />
    </Clickable>
  );
});

/* ---------- InviteCodeCard ---------- */

export interface InviteCodeCardProps {
  onPress: () => void;
  palette: ThemeColors;
}

export const InviteCodeCard = memo(function InviteCodeCard({
  onPress,
  palette,
}: InviteCodeCardProps) {
  return (
    <Clickable
      style={[styles.coachSignupCard, { backgroundColor: palette.card }]}
      onPress={onPress}
    >
      <ThemedText type="subtitle" style={styles.coachSignupTitle}>
        Have an invite code?
      </ThemedText>
      <ThemedText style={styles.coachSignupText}>Join your school or academy</ThemedText>
      <ThemedText style={[styles.coachSignupCTA, { color: palette.tint }]}>
        Use Invite Code →
      </ThemedText>
    </Clickable>
  );
});

/* ---------- DemoAccountsCard ---------- */

export interface DemoAccountsCardProps {
  users: { username: string; password: string; role: string }[];
  palette: ThemeColors;
}

export const DemoAccountsCard = memo(function DemoAccountsCard({
  users,
  palette,
}: DemoAccountsCardProps) {
  return (
    <SurfaceCard style={styles.credentialsCard}>
      <ThemedText type="subtitle" style={styles.credentialsTitle}>
        Preloaded accounts
      </ThemedText>
      {users.slice(0, 4).map((user) => (
        <Row key={user.username} style={styles.credentialsRow}>
          <View style={[styles.roleBadge, { backgroundColor: withAlpha(palette.tint, 0.15) }]}>
            <ThemedText style={styles.roleBadgeText}>{user.role}</ThemedText>
          </View>
          <ThemedText style={styles.credentialValue}>
            {user.username} / {user.password}
          </ThemedText>
        </Row>
      ))}
    </SurfaceCard>
  );
});

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  signupCard: {
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderRadius: Radii.lg,
  },
  signupCardContent: {
    alignItems: 'center',
    gap: Spacing.md,
  },
  signupCardText: {
    gap: Spacing.micro,
  },
  signupTitle: { ...Typography.subheading },
  signupSubtitle: { ...Typography.bodySmall },
  coachSignupCard: {
    padding: Spacing.lg,
    borderRadius: Radii.lg,
    gap: Spacing.xs,
  },
  coachSignupTitle: {
    textAlign: 'left',
  },
  coachSignupText: {
    opacity: 0.8,
  },
  coachSignupCTA: {
    fontWeight: '700',
    marginTop: Spacing.xs,
  },
  credentialsCard: {
    gap: Spacing.sm,
  },
  credentialsTitle: {
    textAlign: 'left',
  },
  credentialsRow: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  roleBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.pill,
    // backgroundColor applied inline via palette.tint
  },
  roleBadgeText: { ...Typography.caption, textTransform: 'uppercase' },
  credentialValue: {
    fontFamily: 'monospace',
  },
});
