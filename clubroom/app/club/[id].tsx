import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { ClubHeader } from '@/components/club/ClubHeader';
import { FeedPost } from '@/components/club/FeedPost';
import { MembersPanel } from '@/components/club/MembersPanel';
import { ClubDetailStats } from '@/components/club/club-detail-stats';
import { EventCard } from '@/components/event/event-card';
import { RemovalConfirmationModal } from '@/components/roster/removal-confirmation-modal';
import { Row } from '@/components/primitives/row';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { useClubDetail, CLUB_FEED_FILTERS } from '@/hooks/use-club-detail';
import type { MemberRemovalReason } from '@/services/club-service';

export default function ClubDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const {
    club, membership, feed, feedFilter, setFeedFilter,
    sessions, squads, invites, upcomingEvents, refreshing,
    members, showMembersSection, selectedMemberForRemoval,
    showMemberRemovalModal, isRemovingMember,
    canManagePosts, canCreatePosts, canRemoveMembers, filterCounts,
    onRefresh, handlePinToggle, handleRemoveMember,
    handleConfirmMemberRemoval, handleLeaveClub,
    handleCloseMemberRemovalModal, handleToggleMembersSection, handleUpdatePhotos,
  } = useClubDetail(id);

  if (!club) {
    return (
      <>
        <Stack.Screen options={{ title: 'Club' }} />
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.notFound}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.muted} />
            <ThemedText style={{ color: colors.muted, textAlign: 'center' }}>Club not found</ThemedText>
            <Clickable style={[styles.backBtn, { backgroundColor: colors.tint }]} onPress={() => router.back()}>
              <ThemedText style={{ color: colors.onPrimary, fontWeight: '600' }}>Go Back</ThemedText>
            </Clickable>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: club.name, headerBackTitle: 'Feed' }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: Spacing.xl * 2 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} colors={[colors.tint]} />}
        >
          {membership && (
            <View style={{ padding: Spacing.md }}>
              <ClubHeader club={club} membership={membership} onLeave={handleLeaveClub} onUpdatePhotos={handleUpdatePhotos} />
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
            <MembersPanel members={members} canRemoveMembers={canRemoveMembers} onRemoveMember={handleRemoveMember} clubId={id} />
          )}

          {upcomingEvents.length > 0 && (
            <View style={styles.eventsSection}>
              <Row justify="space-between" align="center" style={{ marginBottom: Spacing.xs }}>
                <Row gap="xs" align="center">
                  <Ionicons name="calendar" size={20} color={colors.tint} />
                  <ThemedText type="defaultSemiBold" style={Typography.subheading}>Upcoming Events</ThemedText>
                </Row>
                <Clickable onPress={() => router.push(Routes.EVENTS)} hitSlop={10}>
                  <ThemedText style={[Typography.bodySmallSemiBold, { color: colors.tint }]}>See All</ThemedText>
                </Clickable>
              </Row>
              {upcomingEvents.slice(0, 2).map((event) => (
                <EventCard key={event.id} event={event} compact onPress={() => router.push(Routes.event(event.id))} />
              ))}
            </View>
          )}

          {canCreatePosts && (
            <Row gap="sm" style={{ paddingHorizontal: Spacing.md, paddingTop: Spacing.md }}>
              <Clickable style={[styles.actionBtn, { backgroundColor: colors.tint, flex: 1 }]} onPress={() => router.push(Routes.MODAL_CREATE_CLUB_POST)}>
                <Row align="center" justify="center" gap="xs">
                  <Ionicons name="create-outline" size={18} color={colors.onPrimary} />
                  <ThemedText style={[Typography.smallSemiBold, { color: colors.onPrimary }]}>New Post</ThemedText>
                </Row>
              </Clickable>
              {canManagePosts && (
                <Clickable style={[styles.actionBtn, { backgroundColor: colors.success, flex: 1 }]} onPress={() => router.push(Routes.EVENTS_CREATE)}>
                  <Row align="center" justify="center" gap="xs">
                    <Ionicons name="calendar-outline" size={18} color={colors.onPrimary} />
                    <ThemedText style={[Typography.smallSemiBold, { color: colors.onPrimary }]}>Create Event</ThemedText>
                  </Row>
                </Clickable>
              )}
            </Row>
          )}

          {/* Feed filter tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: Spacing.md }} contentContainerStyle={{ paddingHorizontal: Spacing.md, gap: Spacing.xs }}>
            {CLUB_FEED_FILTERS.map((filter) => (
              <Clickable
                key={filter.key}
                style={[styles.filterTab, { borderColor: feedFilter === filter.key ? colors.tint : colors.border }, feedFilter === filter.key && { backgroundColor: withAlpha(colors.tint, 0.09) }]}
                onPress={() => setFeedFilter(filter.key)}
              >
                <Row align="center" gap="xs">
                  <Ionicons name={filter.icon as keyof typeof Ionicons.glyphMap} size={16} color={feedFilter === filter.key ? colors.tint : colors.muted} />
                  <ThemedText style={[Typography.smallSemiBold, { color: feedFilter === filter.key ? colors.tint : colors.muted }]}>{filter.label}</ThemedText>
                  {(filterCounts[filter.key] ?? 0) > 0 && (
                    <View style={[styles.filterCount, { backgroundColor: feedFilter === filter.key ? colors.tint : colors.muted }]}>
                      <ThemedText style={[Typography.caption, { color: colors.onPrimary }]}>{filterCounts[filter.key]}</ThemedText>
                    </View>
                  )}
                </Row>
              </Clickable>
            ))}
          </ScrollView>

          {/* Feed */}
          <View style={{ padding: Spacing.md, gap: Spacing.md }}>
            {feed.length > 0 ? (
              feed.map((post) => <FeedPost key={post.id} post={post} canPin={canManagePosts} onPinToggle={handlePinToggle} />)
            ) : (
              <View style={styles.emptyFeed}>
                <Ionicons name="newspaper-outline" size={48} color={colors.muted} />
                <ThemedText style={{ color: colors.muted, textAlign: 'center' }}>
                  {feedFilter === 'all' ? 'No posts yet. Be the first to share!' : `No ${feedFilter} posts yet.`}
                </ThemedText>
              </View>
            )}
          </View>
        </ScrollView>
      </View>

      <RemovalConfirmationModal
        visible={showMemberRemovalModal}
        onClose={handleCloseMemberRemovalModal}
        onConfirm={(reason, customReason) => handleConfirmMemberRemoval(reason as MemberRemovalReason, customReason)}
        type="member"
        name={selectedMemberForRemoval?.userName || ''}
        isLoading={isRemovingMember}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl },
  backBtn: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, borderRadius: Radii.md, marginTop: Spacing.sm },
  eventsSection: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, gap: Spacing.sm },
  actionBtn: { paddingVertical: Spacing.sm, borderRadius: Radii.md },
  filterTab: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radii.pill, borderWidth: 1 },
  filterCount: { paddingHorizontal: Spacing.xxs, paddingVertical: Spacing.micro, borderRadius: Radii.md, minWidth: 20, alignItems: 'center' },
  emptyFeed: { alignItems: 'center', padding: Spacing.xl, gap: Spacing.md },
});
