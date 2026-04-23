/**
 * Groups Screen
 *
 * Secondary hub for private coordination groups.
 * All state/logic lives in useCommunityHub.
 */

import { StyleSheet, ScrollView, RefreshControl, Modal, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { CreateGroupForm } from '@/components/community/CreateGroupForm';
import { CommunityTabContent } from '@/components/community/community-tab-content';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import {
  ErrorState,
  EmptyState,
  SubmitProgressState,
} from '@/components/ui/screen-states';
import { useCommunityHub } from '@/hooks/use-community-hub';
import { scaleFont } from '@/utils/scale';
import { Skeleton, SkeletonCircle, SkeletonCluster, SkeletonPill, SkeletonText } from '@/components/ui/skeleton';
import { SurfaceCard } from '@/components/primitives/surface-card';

function CommunityHubSkeleton() {
  return (
    <SkeletonCluster gap={Spacing.sm} style={styles.loadingState} accessibilityLabel="Loading groups">
      <SurfaceCard style={styles.loadingIntroCard}>
        <Skeleton width="32%" height={16} accessibilityLabel="Loading groups heading" />
        <SkeletonText
          lines={2}
          widths={['100%', '82%']}
          accessibilityLabel="Loading groups intro"
        />
      </SurfaceCard>
      {Array.from({ length: 3 }).map((_, index) => (
        <SurfaceCard key={index} style={styles.loadingGroupCard}>
          <Row align="center" gap="sm">
            <SkeletonCircle size={48} accessibilityLabel={`Loading group avatar ${index + 1}`} />
            <View style={styles.loadingGroupCopy}>
              <Skeleton width="44%" height={16} accessibilityLabel={`Loading group name ${index + 1}`} />
              <SkeletonText
                lines={2}
                widths={['72%', '56%']}
                accessibilityLabel={`Loading group meta ${index + 1}`}
              />
            </View>
            <SkeletonPill width={64} accessibilityLabel={`Loading group action ${index + 1}`} />
          </Row>
        </SurfaceCard>
      ))}
    </SkeletonCluster>
  );
}

export default function CommunityHubScreen() {
  const { colors: palette } = useTheme();
  const c = useCommunityHub();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      {/* Header */}
      <Row style={styles.header}>
        <Row style={styles.headerLeft}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title" style={styles.headerTitle}>
            Groups
          </ThemedText>
        </Row>
        <Clickable
          accessibilityLabel="Create private group"
          onPress={() => c.setShowCreateModal(true)}
          style={[styles.addButton, { backgroundColor: palette.tint }]}
        >
          <Ionicons name="add" size={24} color={palette.onPrimary} />
        </Clickable>
      </Row>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={c.refreshing} onRefresh={c.onRefresh} />}
      >
        {c.showLoadingState ? (
          <CommunityHubSkeleton />
        ) : c.status === 'error' ? (
          <ErrorState message={c.error?.message || 'Failed to load groups.'} onRetry={c.retry} />
        ) : c.status === 'empty' ? (
          <>
            {c.isPending ? (
              <SubmitProgressState label="Refreshing groups" style={styles.pendingState} />
            ) : null}
            <EmptyState
              icon="chatbubbles-outline"
              title="No groups yet"
              message="Private squad, club, and session groups appear here when they are relevant. Create one only when you need a focused coordination thread."
              actionLabel="Create Group"
              onPressAction={() => c.setShowCreateModal(true)}
            />
          </>
        ) : (
          <>
            {c.isPending ? (
              <SubmitProgressState label="Refreshing groups" style={styles.pendingState} />
            ) : null}
            <CommunityTabContent
              loading={false}
              myGroups={c.myGroups}
              onCreateGroup={() => c.setShowCreateModal(true)}
              onGroupPress={c.handleGroupPress}
            />
          </>
        )}
      </ScrollView>

      {/* Create Group Modal */}
      <Modal
        visible={c.showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => c.setShowCreateModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: palette.background }]}>
          <Row style={[styles.modalHeader, { borderBottomColor: palette.border }]}>
            <ThemedText type="title" style={styles.modalTitle}>
              Create Private Group
            </ThemedText>
            <Clickable onPress={() => c.setShowCreateModal(false)}>
              <Ionicons name="close" size={24} color={palette.text} />
            </Clickable>
          </Row>
          <CreateGroupForm
            onSubmit={c.handleCreateGroup}
            onCancel={() => c.setShowCreateModal(false)}
            loading={c.creatingGroup}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerLeft: { alignItems: 'center', gap: Spacing.md },
  headerTitle: { ...Typography.display, fontSize: scaleFont(Typography.display.fontSize) },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  loadingState: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  loadingIntroCard: {
    gap: Spacing.sm,
  },
  loadingGroupCard: {
    gap: Spacing.sm,
  },
  loadingGroupCopy: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.xs,
  },
  pendingState: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
  },
  modalContainer: { flex: 1 },
  modalHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: { ...Typography.title, fontSize: scaleFont(Typography.title.fontSize) },
});
