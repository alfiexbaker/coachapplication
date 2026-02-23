/**
 * Badges Screen
 *
 * Coach badge management: award, view recent, see shared badges.
 * Links badges to sessions for context.
 */

import { StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { PageContainer } from '@/components/primitives/page-container';
import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { BadgeSessionSelector } from '@/components/badges/badge-session-selector';
import { BadgeListSection } from '@/components/badges/badge-list-section';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { useTheme } from '@/hooks/useTheme';
import { ok } from '@/types/result';
import { useDevBadges, BADGE_TABS } from '@/hooks/use-dev-badges';
import { LoadingState, ErrorState } from '@/components/ui/screen-states';

export default function BadgesScreen() {
  useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const { colors } = useTheme();
  const {
    loading,
    status,
    error,
    retry,
    activeTab,
    setActiveTab,
    sessionQuery,
    setSessionQuery,
    selectedSessionId,
    setSelectedSessionId,
    selectedSession,
    linkedAthlete,
    filteredSessions,
    visibleBadges,
  } = useDevBadges();

  if (loading) {
    return (
      <PageContainer
        gap={Spacing.md}
        header={
          <PageHeader
            title="Recognition"
            subtitle="Review and award recognition from sessions"
          />
        }
      >
        <LoadingState variant="list" />
      </PageContainer>
    );
  }

  if (status === 'error') {
    return (
      <PageContainer
        gap={Spacing.md}
        header={
          <PageHeader
            title="Recognition"
            subtitle="Review and award recognition from sessions"
          />
        }
      >
        <ErrorState
          message={error?.message ?? 'Failed to load badges workspace.'}
          onRetry={retry}
        />
      </PageContainer>
    );
  }

  return (
      <PageContainer
        gap={Spacing.md}
        header={
          <PageHeader
            title="Recognition"
            subtitle="Review and award recognition from sessions"
          />
        }
      >
        {/* Tabs */}
        <SurfaceCard style={styles.tabRow}>
          <Row gap="xs">
            {BADGE_TABS.map((tab) => {
              const isActive = tab.key === activeTab;
              return (
                <Clickable
                  key={tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  style={
                    [
                      styles.tabButton,
                      isActive
                        ? {
                            backgroundColor: withAlpha(colors.tint, 0.07),
                            borderColor: colors.tint,
                          }
                        : undefined,
                    ].filter(Boolean) as ViewStyle[]
                  }
                >
                  <Row gap="xs" align="center" justify="center">
                    <Ionicons
                      name={tab.icon as any}
                      size={16}
                      color={isActive ? colors.tint : colors.icon}
                    />
                    <ThemedText
                      type="defaultSemiBold"
                      style={[Typography.small, { color: isActive ? colors.tint : colors.icon }]}
                    >
                      {tab.label}
                    </ThemedText>
                  </Row>
                </Clickable>
              );
            })}
          </Row>
        </SurfaceCard>

        <BadgeSessionSelector
          sessionQuery={sessionQuery}
          onQueryChange={setSessionQuery}
          filteredSessions={filteredSessions}
          selectedSessionId={selectedSessionId}
          onSelectSession={setSelectedSessionId}
          linkedAthlete={linkedAthlete}
          selectedSession={selectedSession}
        />

        <BadgeListSection
          activeTab={activeTab}
          visibleBadges={visibleBadges}
          selectedSession={selectedSession}
          linkedAthlete={linkedAthlete}
        />
      </PageContainer>
  );
}

const styles = StyleSheet.create({
  tabRow: { padding: Spacing.xs },
  tabButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: Radii.md,
  },
});
