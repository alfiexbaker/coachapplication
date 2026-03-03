import { memo, useCallback, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { PageHeader } from '@/components/primitives/page-header';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { BookingsList } from '@/components/bookings/BookingsList';
import { PendingInvitesSection } from '@/components/bookings/pending-invites-section';
import { SessionDetailModal } from '@/components/sessions/session-detail-modal';
import { DiscoverFeed } from '@/components/bookings/discover-feed';
import { NotificationBell } from '@/components/ui/notification-bell';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useBookings } from '@/hooks/use-bookings';

type BookingsTab = 'sessions' | 'discover';

export default function BookingsScreen() {
  const { colors: palette } = useTheme();
  const [activeTab, setActiveTab] = useState<BookingsTab>('sessions');
  const {
    displayItems,
    pendingInvitesList,
    isCoachUser,
    userRole,
    loading,
    error,
    refreshing,
    timeFilter,
    showDetailModal,
    selectedOffering,
    setTimeFilter,
    handleCreateSessionPress,
    handleCreateDirectPress,
    handleCreateGroupPress,
    handleFindCoachPress,
    handleOfferingPress,
    handleModalClose,
    handleModalUpdate,
    onRefresh,
    retry,
    handleAcceptInvite,
    handleDeclineInvite,
  } = useBookings();

  const headerRightAction = isCoachUser ? <NotificationBell size={20} /> : undefined;
  const isNonCoach = !isCoachUser;

  // ─── Loading ───────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <PageHeader
          title="Sessions"
          subtitle={isCoachUser ? 'Manage your sessions' : 'Your upcoming sessions'}
          rightAction={headerRightAction}
        />
        {isNonCoach && (
          <SegmentControl activeTab={activeTab} onTabChange={setActiveTab} />
        )}
        <LoadingState variant="list" />
      </SafeAreaView>
    );
  }

  // ─── Error ─────────────────────────────────────────────────────
  if (error) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <PageHeader
          title="Sessions"
          subtitle={isCoachUser ? 'Manage your sessions' : 'Your upcoming sessions'}
          rightAction={headerRightAction}
        />
        {isNonCoach && (
          <SegmentControl activeTab={activeTab} onTabChange={setActiveTab} />
        )}
        <ErrorState message={error} onRetry={retry} />
      </SafeAreaView>
    );
  }

  // ─── Discover tab (non-coach only) ────────────────────────────
  if (isNonCoach && activeTab === 'discover') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <PageHeader
          title="Sessions"
          subtitle="Find your next session"
          rightAction={headerRightAction}
        />
        <SegmentControl activeTab={activeTab} onTabChange={setActiveTab} />
        <DiscoverFeed />
      </SafeAreaView>
    );
  }

  // ─── Empty (My Sessions tab) ──────────────────────────────────
  if (displayItems.length === 0 && pendingInvitesList.length === 0) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['top', 'bottom']}
      >
        <PageHeader
          title="Sessions"
          subtitle={isCoachUser ? 'Manage your sessions' : 'Your upcoming sessions'}
          rightAction={headerRightAction}
        />
        {isNonCoach && (
          <SegmentControl activeTab={activeTab} onTabChange={setActiveTab} />
        )}
        {isCoachUser && (
          <CreatePills onDirectPress={handleCreateDirectPress} onGroupPress={handleCreateGroupPress} />
        )}
        <EmptyState
          icon="calendar-outline"
          title="No bookings yet"
          message={
            isCoachUser
              ? 'Your upcoming sessions will appear here once athletes book with you.'
              : 'Find a coach and book your first session to get started.'
          }
          actionLabel={isCoachUser ? 'Create Session' : 'Find a Coach'}
          onPressAction={isCoachUser ? handleCreateSessionPress : handleFindCoachPress}
        />
      </SafeAreaView>
    );
  }

  // ─── Success (My Sessions tab) ────────────────────────────────
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <PageHeader
        title="Sessions"
        subtitle={isCoachUser ? 'Manage your sessions' : 'Your upcoming sessions'}
        rightAction={headerRightAction}
      />

      {isNonCoach && (
        <SegmentControl activeTab={activeTab} onTabChange={setActiveTab} />
      )}

      {isCoachUser && (
        <CreatePills onDirectPress={handleCreateDirectPress} onGroupPress={handleCreateGroupPress} />
      )}

      {isNonCoach && (
        <PendingInvitesSection
          invites={pendingInvitesList}
          onAccept={handleAcceptInvite}
          onDecline={handleDeclineInvite}
        />
      )}

      <BookingsList
        items={displayItems}
        timeFilter={timeFilter}
        onTimeFilterChange={setTimeFilter}
        userRole={userRole}
        onOfferingPress={handleOfferingPress}
        onFindCoachPress={handleFindCoachPress}
        onCreateSessionPress={handleCreateSessionPress}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />

      <SessionDetailModal
        visible={showDetailModal}
        offering={selectedOffering}
        onClose={handleModalClose}
        onUpdate={handleModalUpdate}
      />
    </SafeAreaView>
  );
}

// ─── Segment Control ──────────────────────────────────────────────

const SegmentControl = memo(function SegmentControl({
  activeTab,
  onTabChange,
}: {
  activeTab: BookingsTab;
  onTabChange: (tab: BookingsTab) => void;
}) {
  const { colors: palette } = useTheme();

  const handlePress = useCallback(
    (tab: BookingsTab) => {
      if (tab === activeTab) return;
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      onTabChange(tab);
    },
    [activeTab, onTabChange],
  );

  return (
    <Row gap="xs" style={styles.segmentRow}>
      <Clickable
        onPress={() => handlePress('sessions')}
        accessibilityRole="tab"
        accessibilityLabel="My Sessions"
        accessibilityState={{ selected: activeTab === 'sessions' }}
        style={[
          styles.segment,
          activeTab === 'sessions'
            ? { backgroundColor: palette.tint }
            : { backgroundColor: withAlpha(palette.tint, 0.08) },
        ]}
      >
        <ThemedText
          style={[
            styles.segmentText,
            { color: activeTab === 'sessions' ? palette.onPrimary : palette.tint },
          ]}
        >
          My Sessions
        </ThemedText>
      </Clickable>
      <Clickable
        onPress={() => handlePress('discover')}
        accessibilityRole="tab"
        accessibilityLabel="Discover"
        accessibilityState={{ selected: activeTab === 'discover' }}
        style={[
          styles.segment,
          activeTab === 'discover'
            ? { backgroundColor: palette.tint }
            : { backgroundColor: withAlpha(palette.tint, 0.08) },
        ]}
      >
        <ThemedText
          style={[
            styles.segmentText,
            { color: activeTab === 'discover' ? palette.onPrimary : palette.tint },
          ]}
        >
          Discover
        </ThemedText>
      </Clickable>
    </Row>
  );
});

// ─── Create Pills (Coach only) ───────────────────────────────────

const CreatePills = memo(function CreatePills({
  onDirectPress,
  onGroupPress,
}: {
  onDirectPress: () => void;
  onGroupPress: () => void;
}) {
  const { colors: palette } = useTheme();
  return (
    <Row gap="xs" style={styles.pillRow}>
      <Clickable
        onPress={onDirectPress}
        accessibilityLabel="Create direct session"
        style={[styles.pill, { backgroundColor: withAlpha(palette.tint, 0.09) }]}
      >
        <Row align="center" justify="center" gap="xs">
          <Ionicons name="person-outline" size={16} color={palette.tint} />
          <ThemedText style={[styles.pillText, { color: palette.tint }]}>Direct</ThemedText>
        </Row>
      </Clickable>
      <Clickable
        onPress={onGroupPress}
        accessibilityLabel="Create group session"
        style={[styles.pill, { backgroundColor: withAlpha(palette.tint, 0.09) }]}
      >
        <Row align="center" justify="center" gap="xs">
          <Ionicons name="people-outline" size={16} color={palette.tint} />
          <ThemedText style={[styles.pillText, { color: palette.tint }]}>Group</ThemedText>
        </Row>
      </Clickable>
    </Row>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  segmentRow: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.pill,
  },
  segmentText: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
  pillRow: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  pill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.pill,
  },
  pillText: {
    ...Typography.bodySmall,
    fontWeight: '600',
  },
});
