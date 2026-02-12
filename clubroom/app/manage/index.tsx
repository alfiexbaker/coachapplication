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

  const isCoach = currentUser?.role === 'COACH' || currentUser?.role === 'ADMIN';

  const actions: ManageAction[] = [
    {
      id: 'session-launcher',
      title: 'Create or Invite Session',
      description: 'One place to book new sessions or add athletes to existing ones.',
      icon: 'flash-outline',
      colorKey: 'tint',
      route: Routes.SESSIONS_CREATE,
    },
    {
      id: 'existing',
      title: 'Invite to Existing Session',
      description: 'Add athletes into upcoming published sessions.',
      icon: 'paper-plane-outline',
      colorKey: 'success',
      route: Routes.sessionsCreateIntent({ intent: 'existing', source: 'club_manage' }),
    },
    {
      id: 'club-settings',
      title: 'Club Settings',
      description: 'Manage club details, invites, squads, and member operations.',
      icon: 'settings-outline',
      colorKey: 'icon',
      route: Routes.CLUB_SETTINGS,
    },
    {
      id: 'club-hub',
      title: 'Club Hub',
      description: 'Jump into the full club feed and operations center.',
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
  ];

  if (!isCoach) {
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
        <PageHeader
          title="Manage"
          subtitle="Club operations and session controls"
          showBack
        />
      }
    >
      {actions.map((action) => {
        const color = colors[action.colorKey];
        return (
          <Clickable
            key={action.id}
            onPress={() => router.push(action.route)}
            style={[styles.actionCard, { borderColor: colors.border, backgroundColor: colors.surface }]}
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
          Start from Create or Invite Session, then choose whether to book new or add to existing.
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
