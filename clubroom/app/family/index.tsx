import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/use-auth';
import { shouldLoadFamilyChildren } from '@/hooks/child-context-helpers';
import { EmptyState } from '@/components/ui/screen-states';

const FAMILY_ACTIONS = [
  {
    id: 'calendar',
    title: 'Family calendar',
    description: 'Sessions and commitments.',
    icon: 'calendar-outline',
    route: Routes.FAMILY_CALENDAR,
  },
  {
    id: 'recurring',
    title: 'Recurring bookings',
    description: 'Repeat and upcoming sessions.',
    icon: 'repeat-outline',
    route: Routes.FAMILY_RECURRING,
  },
  {
    id: 'children',
    title: 'Children',
    description: 'Profiles, medical details, contacts and progress.',
    icon: 'people-outline',
    route: Routes.CHILDREN,
  },
  {
    id: 'sharing',
    title: 'Guardian access',
    description: 'Invites and permissions.',
    icon: 'shield-checkmark-outline',
    route: Routes.FAMILY_SHARING,
  },
] as const;

const FAMILY_HEADER = (
  <PageHeader title="Family" showBack />
);

const handleBookSession = () => router.push(Routes.BOOK_COACH);

export default function FamilyOverviewScreen() {
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();

  if (!shouldLoadFamilyChildren(currentUser)) {
    return (
      <PageContainer header={FAMILY_HEADER}>
        <EmptyState
          icon="people-outline"
          title="Family unavailable"
          message="Family tools are available to linked guardians."
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer header={FAMILY_HEADER} gap={Spacing.md}>
      <View style={styles.actionGrid}>
        {FAMILY_ACTIONS.map((action) => (
          <SurfaceCard
            key={action.id}
            onPress={() => router.push(action.route)}
            style={styles.actionCard}
            accessibilityLabel={action.title}
          >
            <Row align="center" gap="sm">
              <View style={[styles.actionIcon, { backgroundColor: withAlpha(palette.tint, 0.1) }]}>
                <Ionicons name={action.icon} size={20} color={palette.tint} />
              </View>
              <View style={styles.actionCopy}>
                <ThemedText type="defaultSemiBold">{action.title}</ThemedText>
                <ThemedText style={[Typography.small, { color: palette.muted }]}>
                  {action.description}
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={palette.muted} />
            </Row>
          </SurfaceCard>
        ))}
      </View>

      <SurfaceCard style={styles.trustCard}>
        <Row align="center" gap="sm">
          <Ionicons name="shield-checkmark-outline" size={18} color={palette.info} />
          <ThemedText type="defaultSemiBold">Privacy</ThemedText>
        </Row>
        <ThemedText style={[Typography.bodySmall, { color: palette.muted }]}>
          Medical and emergency details are limited to assigned coaches and authorised club staff.
        </ThemedText>
      </SurfaceCard>

      <Clickable
        onPress={handleBookSession}
        style={[styles.ctaButton, { backgroundColor: palette.tint }]}
        accessibilityLabel="Book session"
      >
        <ThemedText style={[Typography.subheading, { color: palette.onPrimary }]}>
          Book session
        </ThemedText>
      </Clickable>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  actionGrid: { gap: Spacing.sm },
  actionCard: { padding: Spacing.sm },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCopy: { flex: 1, gap: Spacing.micro },
  trustCard: { gap: Spacing.sm, padding: Spacing.md },
  ctaButton: {
    paddingVertical: Spacing.md,
    borderRadius: Spacing.sm,
    alignItems: 'center',
  },
});
