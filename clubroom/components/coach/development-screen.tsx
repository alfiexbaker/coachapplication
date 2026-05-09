/**
 * CoachDevelopmentScreen — Composition root.
 * Shows quick actions, sessions needing completion, attention athletes, recent sessions, badges shortcut.
 */
import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { NotificationBell } from '@/components/ui/notification-bell';
import { DemoWalkthroughCard } from '@/components/ui/demo-walkthrough-card';
import { ErrorState, LoadingState } from '@/components/ui/screen-states';
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
    status,
    error,
    refreshing,
    onRefresh,
    retry,
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

  const header = (
    <PageHeader
      title="Development"
      subtitle="Track your athletes' progress"
      rightAction={<NotificationBell size={20} />}
    />
  );

  if (loading) {
    return (
      <PageContainer gap={Spacing.md} header={header}>
        <LoadingState variant="hero" />
      </PageContainer>
    );
  }

  if (status === 'error') {
    return (
      <PageContainer gap={Spacing.md} header={header}>
        <ErrorState
          title="Development unavailable"
          message={error?.message ?? 'Unable to load development.'}
          error={error ?? undefined}
          onRetry={retry}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      gap={Spacing.md}
      header={header}
      refreshing={refreshing}
      onRefresh={onRefresh}
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
