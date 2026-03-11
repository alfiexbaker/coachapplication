import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { EmptyState } from '@/components/ui/screen-states';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { isCoach, isAdmin } from '@/utils/user-helpers';

interface ManageAction {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  colorKey: 'tint' | 'success' | 'warning' | 'error' | 'accent' | 'icon';
  route: Href;
}

export default function ManageScreen() {
  const { currentUser } = useAuth();
  const { colors } = useTheme();

  const hasCoachAccess = isCoach(currentUser) || isAdmin(currentUser);

  const actions: ManageAction[] = [
    {
      id: 'booking-console',
      title: 'Staffing Console',
      description: 'Assign, reassign, and monitor club-owned sessions from one operations surface.',
      icon: 'layers-outline',
      colorKey: 'warning',
      route: Routes.MANAGE_BOOKINGS,
    },
    {
      id: 'head-coach-oversight',
      title: 'Head Coach Oversight',
      description: 'Review completion health, athlete watchlists, and delivery standards in one scoped view.',
      icon: 'shield-checkmark-outline',
      colorKey: 'success',
      route: Routes.MANAGE_HEAD_COACH,
    },
    {
      id: 'new',
      title: 'Create New Session',
      description: 'Build a fresh session flow with schedule, pricing, and invite steps.',
      icon: 'sparkles-outline',
      colorKey: 'tint',
      route: Routes.sessionsCreateIntent({ intent: 'new', source: 'club_manage' }),
    },
    {
      id: 'existing',
      title: 'Invite to Existing Session',
      description: 'Quick-add athletes into already published upcoming sessions.',
      icon: 'paper-plane-outline',
      colorKey: 'success',
      route: Routes.sessionsCreateIntent({ intent: 'existing', source: 'club_manage' }),
    },
    {
      id: 'club-hub',
      title: 'Club Hub & Admin',
      description: 'Single club surface for feed, settings, branding, invites, and member ops.',
      icon: 'shield-outline',
      colorKey: 'accent',
      route: Routes.CLUB_HUB,
    },
    {
      id: 'invites',
      title: 'Invite Inbox',
      description: 'Track pending invites, counters, and responses.',
      icon: 'mail-open-outline',
      colorKey: 'warning',
      route: Routes.SESSION_INVITES,
    },
    {
      id: 'earnings-reconciler',
      title: 'Earnings Reconciler',
      description: 'Reconcile session payments: owed, paid, and written-off.',
      icon: 'wallet-outline',
      colorKey: 'tint',
      route: Routes.EARNINGS,
    },
  ];

  if (!hasCoachAccess) {
    return (
      <PageContainer
        header={<PageHeader title="Manage" subtitle="Coach operations" showBack />}
        horizontalSpacing={0}
      >
        <EmptyState
          icon="lock-closed-outline"
          title="Coach access only"
          message="Manage tools are available on coach accounts."
          actionLabel="Go back"
          onPressAction={() => router.back()}
        />
      </PageContainer>
    );
  }

    return (
      <PageContainer
        header={
          <PageHeader title="Manage" subtitle="Club operations and session controls" showBack />
        }
      >
      {actions.map((action) => {
        const color = colors[action.colorKey];
        return (
          <Clickable
            key={action.id}
            onPress={() => router.push(action.route)}
            style={[
              styles.actionCard,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
            accessibilityRole="button"
            accessibilityLabel={action.title}
          >
            <Row gap="sm" align="center">
              <View style={[styles.actionIcon, { backgroundColor: withAlpha(color, 0.12) }]}>
                <Ionicons name={action.icon} size={18} color={color} />
              </View>
              <View style={styles.actionText}>
                <ThemedText style={styles.actionTitle}>{action.title}</ThemedText>
                <ThemedText style={[styles.actionDescription, { color: colors.muted }]}>
                  {action.description}
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Row>
          </Clickable>
        );
      })}

      <SurfaceCard style={[styles.hintCard, { borderColor: colors.border }]}>
        <ThemedText style={styles.hintTitle}>Coach workflow</ThemedText>
        <ThemedText style={[styles.hintText, { color: colors.muted }]}>
          Start with Staffing Console for allocation, Head Coach Oversight for standards and follow-up,
          or jump straight into Create / Invite for individual coach flows.
        </ThemedText>
      </SurfaceCard>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  actionCard: {
    borderWidth: 1,
    borderRadius: Radii.lg,
    padding: Spacing.md,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    flex: 1,
    gap: Spacing.micro,
  },
  actionTitle: {
    ...Typography.bodySemiBold,
  },
  actionDescription: {
    ...Typography.caption,
    lineHeight: 16,
  },
  hintCard: {
    marginTop: Spacing.xs,
    borderWidth: 1,
  },
  hintTitle: {
    ...Typography.smallSemiBold,
  },
  hintText: {
    ...Typography.caption,
    marginTop: Spacing.xxs,
  },
});
