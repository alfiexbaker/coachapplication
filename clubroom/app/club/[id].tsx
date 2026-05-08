import { FlatList, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Routes } from '@/navigation/routes';
import type { ReactNode } from 'react';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { ClubHeader } from '@/components/club/ClubHeader';
import { ClubActivitiesPanel } from '@/components/club/ClubActivitiesPanel';
import { FeedPost } from '@/components/club/FeedPost';
import { MembersPanel } from '@/components/club/MembersPanel';
import { ClubDetailStats } from '@/components/club/club-detail-stats';
import { RemovalConfirmationModal } from '@/components/roster/removal-confirmation-modal';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/screen-states';
import { Row } from '@/components/primitives/row';
import { Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useClubDetail, CLUB_FEED_FILTERS } from '@/hooks/use-club-detail';
import { useRequiredParam } from '@/hooks/use-required-param';
import type { ClubFeedPost } from '@/constants/types';
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
    router.replace(Routes.MY_CLUBS);
  };
  const {
    loading,
    club,
    membership,
    feed,
    feedFilter,
    setFeedFilter,
    clubActivities,
    squads,
    invites,
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
  const renderTopBar = (title: string) => (
    <Row align="center" style={[styles.topBar, { borderBottomColor: colors.border }]}>
      <Clickable onPress={handleBackPress} hitSlop={10} accessibilityLabel="Go back">
        <Ionicons name="arrow-back" size={22} color={colors.foreground} />
      </Clickable>
      <ThemedText
        type="defaultSemiBold"
        numberOfLines={1}
        style={[styles.topBarTitle, { color: colors.foreground }]}
      >
        {title}
      </ThemedText>
      <View style={styles.topBarSpacer} />
    </Row>
  );
  const renderShell = (stackTitle: string, content: ReactNode) => (
    <>
      <Stack.Screen options={{ title: stackTitle, headerShown: false }} />
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        {content}
      </SafeAreaView>
    </>
  );
  const activeFilterLabel =
    CLUB_FEED_FILTERS.find((filter) => filter.key === feedFilter)?.label.toLowerCase() ?? 'updates';
  const renderFeedPost = ({ item }: { item: ClubFeedPost }) => (
    <View style={styles.feedPostItem}>
      <FeedPost
        post={item}
        canPin={canManagePosts}
        onPinToggle={handlePinToggle}
        onLike={handleLikePost}
        onComment={handleCommentPost}
        onShare={handleSharePost}
      />
    </View>
  );
  const renderFeedHeader = () => (
    <>
      {membership && (
        <View style={styles.headerSection}>
          <ClubHeader
            club={club!}
            membership={membership}
            onLeave={handleLeaveClub}
            onUpdatePhotos={handleUpdatePhotos}
          />
        </View>
      )}

      <ClubDetailStats
        memberCount={members.length || club!.memberCount}
        squadCount={squads.length}
        activityCount={clubActivities.length}
        inviteCount={invites.length}
        canExpand={canRemoveMembers}
        isExpanded={showMembersSection}
        onToggleMembers={handleToggleMembersSection}
        colors={colors}
      />

      {canCreatePosts && (
        <Row gap="sm" style={styles.actionRow}>
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

      <View style={styles.updatesSection}>
        <ThemedText type="defaultSemiBold" style={styles.updatesTitle}>
          Updates
        </ThemedText>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterScrollContent}
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
    </>
  );
  const renderFeedFooter = () => (
    <>
      <ClubActivitiesPanel
        activities={clubActivities}
        isCoach={!!canManagePosts}
        clubId={id}
        maxItems={4}
        showCreateActions={false}
        viewAllHref={Routes.clubSchedule(id)}
      />

      {showMembersSection && canRemoveMembers && (
        <MembersPanel
          members={members}
          canRemoveMembers={canRemoveMembers}
          onRemoveMember={handleRemoveMember}
          clubId={id}
        />
      )}
    </>
  );
  const renderEmptyFeed = () => (
    <View style={styles.emptyFeed}>
      <Ionicons name="newspaper-outline" size={48} color={colors.muted} />
      <ThemedText style={{ color: colors.muted, textAlign: 'center' }}>
        {feedFilter === 'all' ? 'No updates yet.' : `No ${activeFilterLabel} updates.`}
      </ThemedText>
    </View>
  );

  if (!idParam.valid) {
    return renderShell('Club', <ErrorState message="Invalid club link." onRetry={handleBackPress} />);
  }

  if (loading) {
    return renderShell(
      'Club',
      <>
        {renderTopBar('Club')}
        <LoadingState variant="detail" />
      </>,
    );
  }

  if (!club) {
    return renderShell(
      'Club',
      <>
        {renderTopBar('Club')}
        <EmptyState
          icon="business-outline"
          title="Club not found"
          message="This club could not be loaded."
          actionLabel="Go Back"
          onPressAction={handleBackPress}
        />
      </>,
    );
  }

  return (
    <>
      {renderShell(
        club.name,
        <>
          {renderTopBar(club.name)}
          <FlatList
            data={feed}
            renderItem={renderFeedPost}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={renderFeedHeader}
            ListFooterComponent={renderFeedFooter}
            ListEmptyComponent={renderEmptyFeed}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.tint}
                colors={[colors.tint]}
              />
            }
          />
        </>,
      )}

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
  listContent: {
    paddingBottom: Spacing.xl * 2,
  },
  headerSection: {
    padding: Spacing.md,
  },
  actionBtn: { paddingVertical: Spacing.sm, borderRadius: Radii.md },
  actionRow: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  updatesSection: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  updatesTitle: {
    ...Typography.subheading,
  },
  filterScroll: {
    marginBottom: Spacing.sm,
  },
  filterScrollContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
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
  feedPostItem: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  emptyFeed: { alignItems: 'center', padding: Spacing.xl, gap: Spacing.md },
});
