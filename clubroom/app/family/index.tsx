import { View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { Row } from '@/components/primitives/row';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

const FAMILY_ACTIONS = [
  {
    id: 'calendar',
    title: 'Family Calendar',
    description: 'See upcoming sessions, coach ownership, and weekly commitments.',
    icon: 'calendar-outline',
    route: Routes.FAMILY_CALENDAR,
  },
  {
    id: 'recurring',
    title: 'Recurring Plans',
    description: 'Manage repeat session routines and next booked sessions.',
    icon: 'repeat-outline',
    route: Routes.FAMILY_RECURRING,
  },
  {
    id: 'children',
    title: 'Children',
    description: 'Update profiles, medical context, emergency details, and progress links.',
    icon: 'people-outline',
    route: Routes.CHILDREN,
  },
  {
    id: 'sharing',
    title: 'Guardian Sharing',
    description: 'Invite guardians and keep family access controlled.',
    icon: 'shield-checkmark-outline',
    route: Routes.FAMILY_SHARING,
  },
] as const;

const FAMILY_HEADER = (
  <PageHeader
    title="Family"
    subtitle="Choose the family action you need"
    showBack
  />
);

export default function FamilyOverviewScreen() {
  const { colors: palette } = useTheme();
  const handleBookSession = () => router.push(Routes.BOOK_COACH);

  return (
    <PageContainer header={FAMILY_HEADER} gap={Spacing.md}>
      <Animated.View entering={FadeInDown.delay(50).springify()}>
        <SurfaceCard
          style={[
            styles.hero,
            {
              backgroundColor: withAlpha(palette.tint, 0.08),
              borderColor: withAlpha(palette.tint, 0.22),
            },
          ]}
          tactile={false}
        >
          <Row align="center" gap="sm">
            <View style={[styles.heroIcon, { backgroundColor: palette.tint }]}>
              <Ionicons name="calendar" size={22} color={palette.onPrimary} />
            </View>
            <View style={styles.heroCopy}>
              <ThemedText type="defaultSemiBold">Start with the live calendar</ThemedText>
              <ThemedText style={[Typography.bodySmall, { color: palette.muted }]}>
                Family work should lead to commitments, recurring routines, child trust details,
                or guardian access, not another summary dashboard.
              </ThemedText>
            </View>
          </Row>
        </SurfaceCard>
      </Animated.View>

      <View style={styles.actionGrid}>
        {FAMILY_ACTIONS.map((action, index) => (
          <Animated.View key={action.id} entering={FadeInDown.delay(100 + index * 45).springify()}>
            <SurfaceCard
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
          </Animated.View>
        ))}
      </View>

      <Animated.View entering={FadeInDown.delay(275).springify()}>
        <SurfaceCard style={styles.trustCard}>
          <Row align="center" gap="sm">
            <Ionicons name="shield-checkmark-outline" size={18} color={palette.info} />
            <ThemedText type="defaultSemiBold">Family trust</ThemedText>
          </Row>
          <ThemedText style={[Typography.bodySmall, { color: palette.muted }]}>
            Open any booking to see who handles support and coach changes. Child details stay
            limited to the assigned coach and supervising club staff only when they need to support
            delivery, safety, or a problem.
          </ThemedText>
        </SurfaceCard>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(325).springify()}>
        <Clickable
          onPress={handleBookSession}
          style={[styles.ctaButton, { backgroundColor: palette.tint }]}
        >
          <Row align="center" justify="center" gap="xs">
            <Ionicons name="add-circle" size={20} color={palette.onPrimary} />
            <ThemedText style={[Typography.subheading, { color: palette.onPrimary }]}>
              Book New Session
            </ThemedText>
          </Row>
        </Clickable>
      </Animated.View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  hero: { borderWidth: 1, padding: Spacing.md },
  heroIcon: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: { flex: 1, gap: Spacing.xxs },
  actionGrid: { gap: Spacing.sm },
  actionCard: { padding: Spacing.md },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCopy: { flex: 1, gap: Spacing.micro },
  trustCard: { gap: Spacing.sm, padding: Spacing.md },
  ctaButton: { paddingVertical: Spacing.md, borderRadius: Spacing.sm },
});
