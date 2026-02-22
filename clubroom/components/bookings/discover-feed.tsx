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
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { SessionDetailModal } from '@/components/sessions/session-detail-modal';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useChildContext } from '@/hooks/use-child-context';
import { useBookingsDiscover } from '@/hooks/use-bookings-discover';
import type { SessionOffering } from '@/constants/types';
import { useState } from 'react';

interface DiscoverFeedProps {
  /** externally controlled — not used here but needed for refresh coordination */
}

export const DiscoverFeed = memo(function DiscoverFeed(_props: DiscoverFeedProps) {
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
    handleGroupSessionPress,
    handleFindCoachPress,
  } = useBookingsDiscover();

  const [selectedOffering, setSelectedOffering] = useState<SessionOffering | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const handleOfferingPress = useCallback((offering: SessionOffering) => {
    setSelectedOffering(offering);
    setShowDetailModal(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setShowDetailModal(false);
    setSelectedOffering(null);
  }, []);

  const handleModalUpdate = useCallback(() => {
    onRefresh();
  }, [onRefresh]);

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

  // --- Loading ---
  if (loading) {
    return <LoadingState variant="list" />;
  }

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
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.tint}
          />
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
          {/* 1. Action Required — Pending Invites */}
          <PendingInvitesSection
            invites={pendingInvites}
            onAccept={handleAcceptInvite}
            onDecline={handleDeclineInvite}
          />

          {/* 2. This Week */}
          <ThisWeekSection
            offerings={thisWeekOfferings}
            onOfferingPress={handleOfferingPress}
          />

          {/* 3. Your Coaches */}
          <YourCoachesSection
            coaches={familiarCoaches}
            onCoachPress={handleCoachPress}
            onFindCoachPress={handleFindCoachPress}
          />

          {/* 4. Club Training */}
          <ClubTrainingSection
            sessions={clubSessions}
            onSessionPress={handleGroupSessionPress}
          />

          {/* 5. Open Sessions */}
          <OpenSessionsSection
            offerings={openSessions}
            onOfferingPress={handleOfferingPress}
          />
        </Column>
      </ScrollView>

      <SessionDetailModal
        visible={showDetailModal}
        offering={selectedOffering}
        onClose={handleModalClose}
        onUpdate={handleModalUpdate}
      />
    </>
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
});
