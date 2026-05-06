/**
 * DiscoverFeed — Main composition for the Discover tab within the Bookings screen.
 *
 * Scrollable feed with curated sections: invites, this week, your coaches,
 * club training, open sessions, and recommended coaches.
 */

import { memo, useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Column } from '@/components/primitives/column';
import { Row } from '@/components/primitives/row';
import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { PendingInvitesSection } from '@/components/bookings/pending-invites-section';
import {
  ThisWeekSection,
  YourCoachesSection,
  ClubTrainingSection,
  OpenSessionsSection,
} from './discover-sections';
import { ChildSwitcher, type SwitcherChild } from '@/components/family/child-switcher';
import { ErrorState, EmptyState, SectionSkeleton } from '@/components/ui/screen-states';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
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
        message="Open the map to search trusted nearby coaches and start a booking path."
        actionLabel="Open Map"
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
      <MapDiscoveryHero onPress={handleFindCoachPress} />

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

const MapDiscoveryHero = memo(function MapDiscoveryHero({ onPress }: { onPress: () => void }) {
  const { colors: palette } = useTheme();

  return (
    <SurfaceCard
      style={[
        styles.mapHero,
        {
          backgroundColor: withAlpha(palette.tint, 0.08),
          borderColor: withAlpha(palette.tint, 0.22),
        },
      ]}
      tactile={false}
    >
      <Row align="center" gap="sm">
        <View style={[styles.mapHeroIcon, { backgroundColor: palette.tint }]}>
          <Ionicons name="map" size={22} color={palette.onPrimary} />
        </View>
        <Column flex gap="micro">
          <ThemedText style={styles.mapHeroTitle}>Map-first coach search</ThemedText>
          <ThemedText style={[styles.mapHeroCopy, { color: palette.muted }]}>
            Find nearby coaches, inspect fit, then book straight from the map.
          </ThemedText>
        </Column>
        <Clickable
          onPress={onPress}
          style={[styles.mapHeroButton, { backgroundColor: palette.tint }]}
          accessibilityLabel="Open Discover Map"
        >
          <ThemedText style={[styles.mapHeroButtonText, { color: palette.onPrimary }]}>
            Map
          </ThemedText>
        </Clickable>
      </Row>
    </SurfaceCard>
  );
});

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.sm,
  },
  mapHero: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    padding: Spacing.sm,
    borderWidth: 1,
  },
  mapHeroIcon: {
    width: 44,
    height: 44,
    borderRadius: Radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapHeroTitle: {
    ...Typography.bodySemiBold,
  },
  mapHeroCopy: {
    ...Typography.caption,
  },
  mapHeroButton: {
    minHeight: 38,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapHeroButtonText: {
    ...Typography.smallSemiBold,
    fontWeight: '700',
  },
  childSwitcher: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  sectionShell: {
    paddingHorizontal: Spacing.md,
  },
});
