/**
 * CoachDevelopmentScreen — Composition root.
 * Shows quick actions, sessions needing completion, attention athletes, recent sessions, badges shortcut.
 */
import { ThemedText } from '@/components/themed-text';
import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { Spacing } from '@/constants/theme';

import { useCoachDevelopment } from '@/hooks/use-coach-development';
import {
  QuickActions,
  CompletionCard,
  AttentionSection,
  RecentSessionsSection,
  BadgesShortcut,
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
      header={<PageHeader title="Development" subtitle="Track your athletes' progress" />}
    >
      <QuickActions />
      <CompletionCard bookings={awaitingCompletion} />
      <AttentionSection athletes={attentionAthletes} logger={logger} />
      <RecentSessionsSection
        sessions={recentSessions}
        athleteDirectory={athleteDirectory}
        logger={logger}
      />
      <BadgesShortcut logger={logger} />
    </PageContainer>
  );
}
