/**
 * DiscoverFeed — Main composition for the Discover tab within the Bookings screen.
 *
 * Scrollable feed with curated sections: invites, this week, your coaches,
 * club training, open sessions, and recommended coaches.
 */

import { memo, useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { Column } from '@/components/primitives/column';
import { PendingInvitesSection } from '@/components/bookings/pending-invites-section';
import {
  ThisWeekSection,
  YourCoachesSection,
  ClubTrainingSection,
  OpenSessionsSection,
} from './discover-sections';
import { ChildSwitcher, type SwitcherChild } from '@/components/family/child-switcher';
import { ErrorState, EmptyState, SectionSkeleton } from '@/components/ui/screen-states';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useChildContext } from '@/hooks/use-child-context';
import { useBookingsDiscover } from '@/hooks/use-bookings-discover';

export const DiscoverFeed = memo(function DiscoverFeed() {
  const { colors: palette } = useTheme();
  const {
    children: contextChildren,
    activeChildId,
    setActiveChildId,
    isMultiChild,
    isParent,
  } = useChildContext();

  const {
    pendingInvites,
    thisWeekOfferings,
    familiarCoaches,
    clubSessions,
    openSessions,
    loading,
    error,
    refreshing,
    onRefresh,
    retry,
    handleAcceptInvite,
    handleDeclineInvite,
    handleCoachPress,
    handleOfferingPress,
    handleGroupSessionPress,
    handleFindCoachPress,
  } = useBookingsDiscover();

  const handleChildSelect = useCallback(
    (childId: string) => {
      // Toggle "All" if re-selecting the same child
      if (childId === activeChildId) {
        void setActiveChildId(null);
      } else {
        void setActiveChildId(childId);
      }
    },
    [activeChildId, setActiveChildId],
  );

  // --- Error ---
  if (error) {
    return <ErrorState message={error} onRetry={retry} />;
  }

  // --- Empty (all sections empty) ---
  const hasAnyContent =
    pendingInvites.length > 0 ||
    thisWeekOfferings.length > 0 ||
    familiarCoaches.length > 0 ||
    clubSessions.length > 0 ||
    openSessions.length > 0;

  if (!hasAnyContent) {
    return (
      <EmptyState
        icon="compass-outline"
        title="Nothing to discover yet"
        message="Sessions, coaches, and training opportunities will appear here as they become available."
        actionLabel="Find a Coach"
        onPressAction={handleFindCoachPress}
      />
    );
  }

  // --- Child switcher options ---
  const switcherOptions: SwitcherChild[] = isParent
    ? contextChildren.map((c) => ({
        id: c.id,
        name: c.name,
        initials: c.initials,
        colorCode: c.colorCode,
      }))
    : [];

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.tint} />
      }
    >
      {/* Child switcher */}
      {isParent && isMultiChild && (
        <View style={styles.childSwitcher}>
          <ChildSwitcher
            options={switcherOptions}
            selectedId={activeChildId ?? undefined}
            onSelect={handleChildSelect}
            activeChildId={activeChildId}
          />
        </View>
      )}

      <Column gap="md">
        {loading ? (
          <>
            <View style={styles.sectionShell}>
              <SectionSkeleton variant="list" titleWidth="34%" />
            </View>
            <View style={styles.sectionShell}>
              <SectionSkeleton variant="schedule" titleWidth="28%" />
            </View>
            <View style={styles.sectionShell}>
              <SectionSkeleton variant="card" titleWidth="30%" />
            </View>
            <View style={styles.sectionShell}>
              <SectionSkeleton variant="list" titleWidth="32%" />
            </View>
            <View style={styles.sectionShell}>
              <SectionSkeleton variant="schedule" titleWidth="30%" />
            </View>
          </>
        ) : (
          <>
            <PendingInvitesSection
              invites={pendingInvites}
              onAccept={handleAcceptInvite}
              onDecline={handleDeclineInvite}
            />

            <ThisWeekSection offerings={thisWeekOfferings} onOfferingPress={handleOfferingPress} />

            <YourCoachesSection
              coaches={familiarCoaches}
              onCoachPress={handleCoachPress}
              onFindCoachPress={handleFindCoachPress}
            />

            <ClubTrainingSection sessions={clubSessions} onSessionPress={handleGroupSessionPress} />

            <OpenSessionsSection offerings={openSessions} onOfferingPress={handleOfferingPress} />
          </>
        )}
      </Column>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: Spacing.xl,
  },
  childSwitcher: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  sectionShell: {
    paddingHorizontal: Spacing.md,
  },
});
