import { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Modal,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ParentGroupCard } from '@/components/community/ParentGroupCard';
import { CreateGroupForm, CreateGroupFormData } from '@/components/community/CreateGroupForm';
import { CarpoolOfferCard } from '@/components/community/CarpoolOfferCard';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import type { ParentGroup, CarpoolOffer } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { communityService } from '@/services/community-service';
import { scaleFont } from '@/utils/scale';
import { createLogger } from '@/utils/logger';

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

  const handleJoinGroup = async (group: ParentGroup) => {
    try {
      await communityService.joinGroup(group.id, parentId, parentName);
      loadData();
    } catch (error) {
      logger.error('Failed to join group:', error);
    }
  };

  const handleGroupPress = (group: ParentGroup) => {
    router.push({
      pathname: '/community/[groupId]',
      params: { groupId: group.id },
    });
  };

  const handleCarpoolPress = () => {
    router.push('/carpool');
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
      <View style={[styles.emptyIcon, { backgroundColor: `${palette.tint}15` }]}>
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
              <View style={[styles.quickActionIcon, { backgroundColor: `${palette.tint}15` }]}>
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
          <Ionicons name="add" size={24} color="#FFFFFF" />
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
    fontSize: scaleFont(24),
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    gap: 6,
    paddingVertical: Spacing.sm,
    marginBottom: -1,
  },
  tabLabel: {
    fontSize: scaleFont(13),
    fontWeight: '600',
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
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: scaleFont(15),
    lineHeight: scaleFont(22),
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
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionContent: {
    flex: 1,
    gap: 2,
  },
  quickActionSubtext: {
    fontSize: scaleFont(13),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    fontSize: scaleFont(16),
  },
  seeAllLink: {
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
  noCarpoolsMessage: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  noCarpoolsText: {
    fontSize: scaleFont(14),
    textAlign: 'center',
  },
  discoverHint: {
    fontSize: scaleFont(13),
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
    gap: 6,
  },
  joinButtonText: {
    fontWeight: '600',
    fontSize: scaleFont(14),
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
    fontSize: scaleFont(20),
  },
});
