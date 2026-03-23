/**
 * CoachDevelopmentScreen — Composition root.
 * Shows quick actions, sessions needing completion, attention athletes, recent sessions, badges shortcut.
 */
import { ThemedText } from '@/components/themed-text';
import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { NotificationBell } from '@/components/ui/notification-bell';
import { DemoWalkthroughCard } from '@/components/ui/demo-walkthrough-card';
import { Spacing } from '@/constants/theme';
import { useDemoWalkthroughVisibility } from '@/hooks/use-demo-walkthrough-visibility';
import { router } from 'expo-router';

import { useCoachDevelopment } from '@/hooks/use-coach-development';
import { buildPrimaryDemoWalkthrough } from '@/utils/demo-walkthrough';
import {
  QuickActions,
  CompletionCard,
  AttentionSection,
  RecentSessionsSection,
} from './development-sections';

export function CoachDevelopmentScreen() {
  const {
    currentUser,
    loading,
    awaitingCompletion,
    attentionAthletes,
    recentSessions,
    athleteDirectory,
    logger,
  } = useCoachDevelopment();
  const walkthrough = buildPrimaryDemoWalkthrough({ user: currentUser });
  const { walkthrough: visibleWalkthrough, dismissWalkthrough } = useDemoWalkthroughVisibility(
    currentUser?.id,
    walkthrough,
  );

  if (!currentUser) return null;

  if (loading) {
    return (
      <PageContainer>
        <ThemedText>Loading...</ThemedText>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      gap={Spacing.md}
      header={
        <PageHeader
          title="Development"
          subtitle="Track your athletes' progress"
          rightAction={<NotificationBell size={20} />}
        />
      }
    >
      {visibleWalkthrough ? (
        <DemoWalkthroughCard
          walkthrough={visibleWalkthrough}
          onPressStep={(step) => router.push(step.route)}
          onDismiss={dismissWalkthrough}
        />
      ) : null}
      <QuickActions />
      <CompletionCard bookings={awaitingCompletion} />
      <AttentionSection athletes={attentionAthletes} logger={logger} />
      <RecentSessionsSection
        sessions={recentSessions}
        athleteDirectory={athleteDirectory}
        logger={logger}
      />
    </PageContainer>
  );
}
