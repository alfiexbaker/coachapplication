import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Routes } from '@/navigation/routes';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { ClubHeader } from '@/components/club/ClubHeader';
import { FeedPost } from '@/components/club/FeedPost';
import { MembersPanel } from '@/components/club/MembersPanel';
import { ClubDetailStats } from '@/components/club/club-detail-stats';
import { EventCard } from '@/components/event/event-card';
import { RemovalConfirmationModal } from '@/components/roster/removal-confirmation-modal';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/screen-states';
import { Row } from '@/components/primitives/row';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useClubDetail, CLUB_FEED_FILTERS } from '@/hooks/use-club-detail';
import { useRequiredParam } from '@/hooks/use-required-param';
import type { MemberRemovalReason } from '@/services/club-service';

export default function ClubDetailScreen() {
  const idParam = useRequiredParam('id');
  const id = idParam.valid ? idParam.value : '';
  const { colors } = useTheme();
  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(Routes.CLUB_HUB);
  };
  const {
    loading,
    club,
    membership,
    feed,
    feedFilter,
    setFeedFilter,
    sessions,
    squads,
    invites,
    upcomingEvents,
    refreshing,
    members,
    showMembersSection,
    selectedMemberForRemoval,
    showMemberRemovalModal,
    isRemovingMember,
    canManagePosts,
    canCreatePosts,
    canRemoveMembers,
    filterCounts,
    onRefresh,
    handlePinToggle,
    handleLikePost,
    handleCommentPost,
    handleSharePost,
    handleRemoveMember,
    handleConfirmMemberRemoval,
    handleLeaveClub,
    handleCloseMemberRemovalModal,
    handleToggleMembersSection,
    handleUpdatePhotos,
  } = useClubDetail(id);

  if (!idParam.valid) {
    return (
      <>
        <Stack.Screen options={{ title: 'Club', headerShown: false }} />
        <SafeAreaView
          style={[styles.container, { backgroundColor: colors.background }]}
          edges={['top', 'bottom']}
        >
          <ErrorState message="Invalid club link." onRetry={handleBackPress} />
        </SafeAreaView>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Club', headerShown: false }} />
        <SafeAreaView
          style={[styles.container, { backgroundColor: colors.background }]}
          edges={['top', 'bottom']}
        >
          <Row align="center" style={[styles.topBar, { borderBottomColor: colors.border }]}>
            <Clickable onPress={handleBackPress} hitSlop={10} accessibilityLabel="Go back">
              <Ionicons name="arrow-back" size={22} color={colors.foreground} />
            </Clickable>
            <ThemedText
              type="defaultSemiBold"
              numberOfLines={1}
              style={[styles.topBarTitle, { color: colors.foreground }]}
            >
              Club
            </ThemedText>
            <View style={styles.topBarSpacer} />
          </Row>
          <LoadingState variant="list" />
        </SafeAreaView>
      </>
    );
  }

  if (!club) {
    return (
      <>
        <Stack.Screen options={{ title: 'Club', headerShown: false }} />
        <SafeAreaView
          style={[styles.container, { backgroundColor: colors.background }]}
          edges={['top', 'bottom']}
        >
          <Row align="center" style={[styles.topBar, { borderBottomColor: colors.border }]}>
            <Clickable onPress={handleBackPress} hitSlop={10} accessibilityLabel="Go back">
              <Ionicons name="arrow-back" size={22} color={colors.foreground} />
            </Clickable>
            <ThemedText
              type="defaultSemiBold"
              numberOfLines={1}
              style={[styles.topBarTitle, { color: colors.foreground }]}
            >
              Club
            </ThemedText>
            <View style={styles.topBarSpacer} />
          </Row>
          <EmptyState
            icon="business-outline"
            title="Club not found"
            message="This club could not be loaded."
            actionLabel="Go Back"
            onPressAction={handleBackPress}
          />
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: club.name, headerShown: false }} />
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <Row align="center" style={[styles.topBar, { borderBottomColor: colors.border }]}>
          <Clickable onPress={handleBackPress} hitSlop={10} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </Clickable>
          <ThemedText
            type="defaultSemiBold"
            numberOfLines={1}
            style={[styles.topBarTitle, { color: colors.foreground }]}
          >
            {club.name}
          </ThemedText>
          <View style={styles.topBarSpacer} />
        </Row>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: Spacing.xl * 2 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.tint}
              colors={[colors.tint]}
            />
          }
        >
          {membership && (
            <View style={{ padding: Spacing.md }}>
              <ClubHeader
                club={club}
                membership={membership}
                onLeave={handleLeaveClub}
                onUpdatePhotos={handleUpdatePhotos}
              />
            </View>
          )}

          <ClubDetailStats
            memberCount={members.length || club.memberCount}
            squadCount={squads.length}
            sessionCount={sessions.length}
            inviteCount={invites.length}
            canExpand={canRemoveMembers}
            isExpanded={showMembersSection}
            onToggleMembers={handleToggleMembersSection}
            colors={colors}
          />

          {showMembersSection && canRemoveMembers && (
            <MembersPanel
              members={members}
              canRemoveMembers={canRemoveMembers}
              onRemoveMember={handleRemoveMember}
              clubId={id}
            />
          )}

          {upcomingEvents.length > 0 && (
            <View style={styles.eventsSection}>
              <Row justify="space-between" align="center" style={{ marginBottom: Spacing.xs }}>
                <Row gap="xs" align="center">
                  <Ionicons name="calendar" size={20} color={colors.tint} />
                  <ThemedText type="defaultSemiBold" style={Typography.subheading}>
                    Upcoming Events
                  </ThemedText>
                </Row>
                <Clickable onPress={() => router.push(Routes.EVENTS)} hitSlop={10}>
                  <ThemedText style={[Typography.bodySmallSemiBold, { color: colors.tint }]}>
                    See All
                  </ThemedText>
                </Clickable>
              </Row>
              {upcomingEvents.slice(0, 2).map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  compact
                  onPress={() => router.push(Routes.event(event.id))}
                />
              ))}
            </View>
          )}

          {canCreatePosts && (
            <Row gap="sm" style={{ paddingHorizontal: Spacing.md, paddingTop: Spacing.md }}>
              <Clickable
                style={[styles.actionBtn, { backgroundColor: colors.tint, flex: 1 }]}
                onPress={() => router.push(Routes.modalCreateClubPost({ clubId: id }))}
              >
                <Row align="center" justify="center" gap="xs">
                  <Ionicons name="create-outline" size={18} color={colors.onPrimary} />
                  <ThemedText style={[Typography.smallSemiBold, { color: colors.onPrimary }]}>
                    New Post
                  </ThemedText>
                </Row>
              </Clickable>
              {canManagePosts && (
                <Clickable
                  style={[styles.actionBtn, { backgroundColor: colors.success, flex: 1 }]}
                  onPress={() => router.push(Routes.EVENTS_CREATE)}
                >
                  <Row align="center" justify="center" gap="xs">
                    <Ionicons name="calendar-outline" size={18} color={colors.onPrimary} />
                    <ThemedText style={[Typography.smallSemiBold, { color: colors.onPrimary }]}>
                      Create Event
                    </ThemedText>
                  </Row>
                </Clickable>
              )}
            </Row>
          )}

          {/* Feed filter tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: Spacing.md }}
            contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: Spacing.xs }}
          >
            {CLUB_FEED_FILTERS.map((filter) => (
              <Clickable
                key={filter.key}
                style={[
                  styles.filterTab,
                  { borderColor: feedFilter === filter.key ? colors.tint : colors.border },
                  feedFilter === filter.key && { backgroundColor: withAlpha(colors.tint, 0.09) },
                ]}
                onPress={() => setFeedFilter(filter.key)}
              >
                <Row align="center" gap="xs">
                  <Ionicons
                    name={filter.icon as keyof typeof Ionicons.glyphMap}
                    size={16}
                    color={feedFilter === filter.key ? colors.tint : colors.muted}
                  />
                  <ThemedText
                    style={[
                      Typography.smallSemiBold,
                      { color: feedFilter === filter.key ? colors.tint : colors.muted },
                    ]}
                  >
                    {filter.label}
                  </ThemedText>
                  {(filterCounts[filter.key] ?? 0) > 0 && (
                    <View
                      style={[
                        styles.filterCount,
                        { backgroundColor: feedFilter === filter.key ? colors.tint : colors.muted },
                      ]}
                    >
                      <ThemedText style={[Typography.caption, { color: colors.onPrimary }]}>
                        {filterCounts[filter.key]}
                      </ThemedText>
                    </View>
                  )}
                </Row>
              </Clickable>
            ))}
          </ScrollView>

          {/* Feed */}
          <View style={{ padding: Spacing.md, gap: Spacing.md }}>
            {feed.length > 0 ? (
              feed.map((post) => (
                <FeedPost
                  key={post.id}
                  post={post}
                  canPin={canManagePosts}
                  onPinToggle={handlePinToggle}
                  onLike={handleLikePost}
                  onComment={handleCommentPost}
                  onShare={handleSharePost}
                />
              ))
            ) : (
              <View style={styles.emptyFeed}>
                <Ionicons name="newspaper-outline" size={48} color={colors.muted} />
                <ThemedText style={{ color: colors.muted, textAlign: 'center' }}>
                  {feedFilter === 'all'
                    ? 'No posts yet. Be the first to share!'
                    : `No ${feedFilter} posts yet.`}
                </ThemedText>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      <RemovalConfirmationModal
        visible={showMemberRemovalModal}
        onClose={handleCloseMemberRemovalModal}
        onConfirm={(reason, customReason) =>
          handleConfirmMemberRemoval(reason as MemberRemovalReason, customReason)
        }
        type="member"
        name={selectedMemberForRemoval?.userName || ''}
        isLoading={isRemovingMember}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    minHeight: 56,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
  },
  topBarTitle: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  topBarSpacer: {
    width: 22,
  },
  eventsSection: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, gap: Spacing.sm },
  actionBtn: { paddingVertical: Spacing.sm, borderRadius: Radii.md },
  filterTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.pill,
    borderWidth: 1,
  },
  filterCount: {
    paddingHorizontal: Spacing.xxs,
    paddingVertical: Spacing.micro,
    borderRadius: Radii.md,
    minWidth: 20,
    alignItems: 'center',
  },
  emptyFeed: { alignItems: 'center', padding: Spacing.xl, gap: Spacing.md },
});
