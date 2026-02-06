import { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Modal,
  ViewStyle,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { Ionicons } from '@expo/vector-icons';

import { ParentGroupCard } from '@/components/community/ParentGroupCard';
import { CreateGroupForm, CreateGroupFormData } from '@/components/community/CreateGroupForm';
import { CarpoolOfferCard } from '@/components/community/CarpoolOfferCard';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Typography, Radii , withAlpha } from '@/constants/theme';
import type { ParentGroup, CarpoolOffer } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { communityService } from '@/services/community-service';
import { onTyped, ServiceEvents } from '@/services/event-bus';
import { scaleFont } from '@/utils/scale';
import { createLogger } from '@/utils/logger';
import type { GroupMemberRole } from '@/constants/types';

const logger = createLogger('CommunityHubScreen');

type TabType = 'groups' | 'carpools' | 'discover';

export default function CommunityHubScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const parentId = currentUser?.id ?? 'parent1';
  const parentName = currentUser?.fullName ?? currentUser?.name ?? 'Parent';

  const [activeTab, setActiveTab] = useState<TabType>('groups');
  const [myGroups, setMyGroups] = useState<ParentGroup[]>([]);
  const [publicGroups, setPublicGroups] = useState<ParentGroup[]>([]);
  const [carpoolOffers, setCarpoolOffers] = useState<CarpoolOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingGroup, setCreatingGroup] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [groups, publicG, carpools] = await Promise.all([
        communityService.getParentGroups(parentId),
        communityService.getPublicGroups(),
        communityService.getAvailableCarpoolOffers(parentId),
      ]);

      setMyGroups(groups);
      // Filter out groups user is already a member of
      const discoverable = publicG.filter(
        (pg) => !groups.some((g) => g.id === pg.id)
      );
      setPublicGroups(discoverable);
      setCarpoolOffers(carpools);
    } catch (error) {
      logger.error('Failed to load community data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [parentId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // React to community group events so the list updates when a member
  // joins a group or a role changes (e.g. promoted to moderator).
  useEffect(() => {
    const unsubMemberJoined = onTyped(ServiceEvents.GROUP_MEMBER_JOINED, () => {
      loadData();
    });
    const unsubRoleChanged = onTyped(ServiceEvents.GROUP_MEMBER_ROLE_CHANGED, () => {
      loadData();
    });
    return () => {
      unsubMemberJoined();
      unsubRoleChanged();
    };
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCreateGroup = async (data: CreateGroupFormData) => {
    setCreatingGroup(true);
    try {
      await communityService.createGroup({
        name: data.name,
        description: data.description,
        type: data.type,
        memberIds: [],
        memberNames: [],
        creatorId: parentId,
        creatorName: parentName,
        isPublic: data.isPublic,
      });
      setShowCreateModal(false);
      loadData();
    } catch (error) {
      logger.error('Failed to create group:', error);
    } finally {
      setCreatingGroup(false);
    }
  };

  const isCoachUser = currentUser?.role === 'COACH';

  const handleJoinGroup = async (group: ParentGroup) => {
    try {
      const result = await communityService.joinGroup(group.id, parentId, parentName, { isCoach: isCoachUser });
      if (!result.success) {
        Alert.alert('Could not join', result.error.message);
        return;
      }
      await loadData();
    } catch (error) {
      logger.error('Failed to join group:', error);
      Alert.alert('Error', 'Failed to join group. Please try again.');
    }
  };

  const handleGroupPress = (group: ParentGroup) => {
    router.push(Routes.communityGroup(group.id));
  };

  const handleCarpoolPress = () => {
    router.push(Routes.CARPOOL);
  };

  const tabs: { key: TabType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'groups', label: 'My Groups', icon: 'chatbubbles-outline' },
    { key: 'carpools', label: 'Carpools', icon: 'car-outline' },
    { key: 'discover', label: 'Discover', icon: 'compass-outline' },
  ];

  const renderEmptyState = (
    icon: keyof typeof Ionicons.glyphMap,
    title: string,
    message: string,
    action?: { label: string; onPress: () => void }
  ) => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
        <Ionicons name={icon} size={48} color={palette.tint} />
      </View>
      <ThemedText type="subtitle" style={styles.emptyTitle}>
        {title}
      </ThemedText>
      <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
        {message}
      </ThemedText>
      {action && (
        <Button onPress={action.onPress} style={styles.emptyButton}>
          {action.label}
        </Button>
      )}
    </View>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ThemedText style={{ color: palette.muted }}>Loading...</ThemedText>
        </View>
      );
    }

    switch (activeTab) {
      case 'groups':
        if (myGroups.length === 0) {
          return renderEmptyState(
            'chatbubbles-outline',
            'No Groups Yet',
            'Join or create a group to connect with other parents.',
            { label: 'Create Group', onPress: () => setShowCreateModal(true) }
          );
        }
        return (
          <View style={styles.listContainer}>
            {myGroups.map((group) => (
              <ParentGroupCard
                key={group.id}
                group={group}
                onPress={() => handleGroupPress(group)}
              />
            ))}
          </View>
        );

      case 'carpools':
        return (
          <View style={styles.listContainer}>
            {/* Quick action card */}
            <SurfaceCard style={styles.quickActionCard} onPress={handleCarpoolPress}>
              <View style={[styles.quickActionIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                <Ionicons name="add-circle-outline" size={28} color={palette.tint} />
              </View>
              <View style={styles.quickActionContent}>
                <ThemedText type="defaultSemiBold">Offer or Find a Ride</ThemedText>
                <ThemedText style={[styles.quickActionSubtext, { color: palette.muted }]}>
                  Create a carpool offer or find available rides
                </ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={22} color={palette.muted} />
            </SurfaceCard>

            {/* Available carpools */}
            {carpoolOffers.length > 0 ? (
              <>
                <View style={styles.sectionHeader}>
                  <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
                    Available Rides
                  </ThemedText>
                  <Clickable onPress={handleCarpoolPress}>
                    <ThemedText style={[styles.seeAllLink, { color: palette.tint }]}>
                      See all
                    </ThemedText>
                  </Clickable>
                </View>
                {carpoolOffers.slice(0, 3).map((offer) => (
                  <CarpoolOfferCard
                    key={offer.id}
                    offer={offer}
                    currentUserId={parentId}
                    compact
                    onPress={handleCarpoolPress}
                  />
                ))}
              </>
            ) : (
              <View style={styles.noCarpoolsMessage}>
                <Ionicons name="car-outline" size={32} color={palette.muted} />
                <ThemedText style={[styles.noCarpoolsText, { color: palette.muted }]}>
                  No carpool offers available right now
                </ThemedText>
              </View>
            )}
          </View>
        );

      case 'discover':
        if (publicGroups.length === 0) {
          return renderEmptyState(
            'compass-outline',
            'No Groups to Discover',
            'All public groups have been joined. Create your own group!',
            { label: 'Create Group', onPress: () => setShowCreateModal(true) }
          );
        }
        return (
          <View style={styles.listContainer}>
            <ThemedText style={[styles.discoverHint, { color: palette.muted }]}>
              Public groups you can join
            </ThemedText>
            {publicGroups.map((group) => (
              <SurfaceCard key={group.id} style={styles.discoverCard}>
                <ParentGroupCard group={group} compact />
                <Button
                  variant="secondary"
                  onPress={() => handleJoinGroup(group)}
                  style={styles.joinButton}
                >
                  <View style={styles.joinButtonContent}>
                    <Ionicons name="add" size={18} color={palette.text} />
                    <ThemedText style={styles.joinButtonText}>Join</ThemedText>
                  </View>
                </Button>
              </SurfaceCard>
            ))}
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Clickable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <ThemedText type="title" style={styles.headerTitle}>
            Community
          </ThemedText>
        </View>
        <Clickable
          onPress={() => setShowCreateModal(true)}
          style={[styles.addButton, { backgroundColor: palette.tint }]}
        >
          <Ionicons name="add" size={24} color={Colors.light.onPrimary} />
        </Clickable>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsContainer, { borderBottomColor: palette.border }]}>
        {tabs.map((tab) => (
          <Clickable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[
              styles.tab,
              activeTab === tab.key ? {
                borderBottomColor: palette.tint,
                borderBottomWidth: 2,
              } : undefined,
            ].filter(Boolean) as ViewStyle[]}
          >
            <Ionicons
              name={tab.icon}
              size={20}
              color={activeTab === tab.key ? palette.tint : palette.muted}
            />
            <ThemedText
              style={[
                styles.tabLabel,
                { color: activeTab === tab.key ? palette.tint : palette.muted },
              ]}
            >
              {tab.label}
            </ThemedText>
          </Clickable>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderContent()}
      </ScrollView>

      {/* Create Group Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: palette.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: palette.border }]}>
            <ThemedText type="title" style={styles.modalTitle}>
              Create Group
            </ThemedText>
            <Clickable onPress={() => setShowCreateModal(false)}>
              <Ionicons name="close" size={24} color={palette.text} />
            </Clickable>
          </View>
          <CreateGroupForm
            onSubmit={handleCreateGroup}
            onCancel={() => setShowCreateModal(false)}
            loading={creatingGroup}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerTitle: {
    ...Typography.display, fontSize: scaleFont(Typography.display.fontSize),
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: Radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: Spacing.lg,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xxs,
    paddingVertical: Spacing.sm,
    marginBottom: -1,
  },
  tabLabel: {
    ...Typography.smallSemiBold, fontSize: scaleFont(Typography.smallSemiBold.fontSize),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  listContainer: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: Radii['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    ...Typography.body, fontSize: scaleFont(Typography.body.fontSize),
  },
  emptyButton: {
    marginTop: Spacing.sm,
  },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionContent: {
    flex: 1,
    gap: Spacing.micro,
  },
  quickActionSubtext: {
    ...Typography.small, fontSize: scaleFont(Typography.small.fontSize),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    ...Typography.subheading, fontSize: scaleFont(Typography.subheading.fontSize),
  },
  seeAllLink: {
    ...Typography.bodySmallSemiBold, fontSize: scaleFont(Typography.bodySmallSemiBold.fontSize),
  },
  noCarpoolsMessage: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  noCarpoolsText: {
    ...Typography.bodySmall, fontSize: scaleFont(Typography.bodySmall.fontSize),
    textAlign: 'center',
  },
  discoverHint: {
    ...Typography.small, fontSize: scaleFont(Typography.small.fontSize),
    marginBottom: Spacing.sm,
  },
  discoverCard: {
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  joinButton: {
    marginTop: Spacing.xs,
  },
  joinButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  joinButtonText: {
    ...Typography.bodySmallSemiBold, fontSize: scaleFont(Typography.bodySmallSemiBold.fontSize),
  },

  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    ...Typography.title, fontSize: scaleFont(Typography.title.fontSize),
  },
});
