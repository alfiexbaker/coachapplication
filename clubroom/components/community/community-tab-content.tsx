import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ParentGroupCard } from '@/components/community/ParentGroupCard';
import { CarpoolOfferCard } from '@/components/community/CarpoolOfferCard';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { scaleFont } from '@/utils/scale';
import type { ParentGroup, CarpoolOffer } from '@/constants/types';
import type { TabType } from '@/hooks/use-community-hub';
import { Row } from '@/components/primitives';

interface CommunityTabContentProps {
  tab: TabType;
  loading: boolean;
  myGroups: ParentGroup[];
  publicGroups: ParentGroup[];
  carpoolOffers: CarpoolOffer[];
  parentId: string;
  onCreateGroup: () => void;
  onGroupPress: (group: ParentGroup) => void;
  onJoinGroup: (group: ParentGroup) => void;
  onCarpoolPress: () => void;
}

const EmptyState = ({ icon, title, message, action }: {
  icon: keyof typeof Ionicons.glyphMap; title: string; message: string;
  action?: { label: string; onPress: () => void };
}) => {
  const { colors: palette } = useTheme();
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
        <Ionicons name={icon} size={48} color={palette.tint} />
      </View>
      <ThemedText type="subtitle" style={styles.emptyTitle}>{title}</ThemedText>
      <ThemedText style={[styles.emptyText, { color: palette.muted }]}>{message}</ThemedText>
      {action && <Button onPress={action.onPress} style={styles.emptyButton}>{action.label}</Button>}
    </View>
  );
};

export const CommunityTabContent = memo(function CommunityTabContent({
  tab, loading, myGroups, publicGroups, carpoolOffers, parentId,
  onCreateGroup, onGroupPress, onJoinGroup, onCarpoolPress,
}: CommunityTabContentProps) {
  const { colors: palette } = useTheme();

  if (loading) {
    return <View style={styles.loadingContainer}><ThemedText style={{ color: palette.muted }}>Loading...</ThemedText></View>;
  }

  if (tab === 'groups') {
    if (myGroups.length === 0) {
      return <EmptyState icon="chatbubbles-outline" title="No Groups Yet" message="Join or create a group to connect with other parents." action={{ label: 'Create Group', onPress: onCreateGroup }} />;
    }
    return (
      <View style={styles.listContainer}>
        {myGroups.map((group) => <ParentGroupCard key={group.id} group={group} onPress={() => onGroupPress(group)} />)}
      </View>
    );
  }

  if (tab === 'carpools') {
    return (
      <View style={styles.listContainer}>
        <SurfaceCard style={styles.quickActionCard} onPress={onCarpoolPress}>
          <View style={[styles.quickActionIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
            <Ionicons name="add-circle-outline" size={28} color={palette.tint} />
          </View>
          <View style={styles.quickActionContent}>
            <ThemedText type="defaultSemiBold">Offer or Find a Ride</ThemedText>
            <ThemedText style={[styles.quickActionSubtext, { color: palette.muted }]}>Create a carpool offer or find available rides</ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={22} color={palette.muted} />
        </SurfaceCard>
        {carpoolOffers.length > 0 ? (
          <>
            <Row style={styles.sectionHeader}>
              <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Available Rides</ThemedText>
              <Clickable onPress={onCarpoolPress}><ThemedText style={[styles.seeAllLink, { color: palette.tint }]}>See all</ThemedText></Clickable>
            </Row>
            {carpoolOffers.slice(0, 3).map((offer) => (
              <CarpoolOfferCard key={offer.id} offer={offer} currentUserId={parentId} compact onPress={onCarpoolPress} />
            ))}
          </>
        ) : (
          <View style={styles.noCarpoolsMessage}>
            <Ionicons name="car-outline" size={32} color={palette.muted} />
            <ThemedText style={[styles.noCarpoolsText, { color: palette.muted }]}>No carpool offers available right now</ThemedText>
          </View>
        )}
      </View>
    );
  }

  // discover tab
  if (publicGroups.length === 0) {
    return <EmptyState icon="compass-outline" title="No Groups to Discover" message="All public groups have been joined. Create your own group!" action={{ label: 'Create Group', onPress: onCreateGroup }} />;
  }
  return (
    <View style={styles.listContainer}>
      <ThemedText style={[styles.discoverHint, { color: palette.muted }]}>Public groups you can join</ThemedText>
      {publicGroups.map((group) => (
        <SurfaceCard key={group.id} style={styles.discoverCard}>
          <ParentGroupCard group={group} compact />
          <Button variant="secondary" onPress={() => onJoinGroup(group)} style={styles.joinButton}>
            <Row style={styles.joinButtonContent}>
              <Ionicons name="add" size={18} color={palette.text} />
              <ThemedText style={styles.joinButtonText}>Join</ThemedText>
            </Row>
          </Button>
        </SurfaceCard>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  listContainer: { padding: Spacing.lg, gap: Spacing.sm },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['3xl'] },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['3xl'], paddingHorizontal: Spacing.lg, gap: Spacing.md },
  emptyIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm },
  emptyTitle: { textAlign: 'center' },
  emptyText: { textAlign: 'center', ...Typography.body, fontSize: scaleFont(Typography.body.fontSize) },
  emptyButton: { marginTop: Spacing.sm },
  quickActionCard: { alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  quickActionIcon: { width: 52, height: 52, borderRadius: Radii['2xl'], alignItems: 'center', justifyContent: 'center' },
  quickActionContent: { flex: 1, gap: Spacing.micro },
  quickActionSubtext: { ...Typography.small, fontSize: scaleFont(Typography.small.fontSize) },
  sectionHeader: { alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm, marginBottom: Spacing.xs },
  sectionTitle: { ...Typography.subheading, fontSize: scaleFont(Typography.subheading.fontSize) },
  seeAllLink: { ...Typography.bodySmallSemiBold, fontSize: scaleFont(Typography.bodySmallSemiBold.fontSize) },
  noCarpoolsMessage: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  noCarpoolsText: { ...Typography.bodySmall, fontSize: scaleFont(Typography.bodySmall.fontSize), textAlign: 'center' },
  discoverHint: { ...Typography.small, fontSize: scaleFont(Typography.small.fontSize), marginBottom: Spacing.sm },
  discoverCard: { marginBottom: Spacing.sm, gap: Spacing.sm },
  joinButton: { marginTop: Spacing.xs },
  joinButtonContent: { alignItems: 'center', gap: Spacing.xxs },
  joinButtonText: { ...Typography.bodySmallSemiBold, fontSize: scaleFont(Typography.bodySmallSemiBold.fontSize) },
});
