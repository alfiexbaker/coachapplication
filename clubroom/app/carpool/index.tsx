/**
 * Carpool Screen
 *
 * Browse available carpool offers, manage own offers, view confirmed rides.
 * All state/logic in useCarpool hook. Create + request modals extracted.
 */

import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { CarpoolOfferCard } from '@/components/community/CarpoolOfferCard';
import { CarpoolCreateModal } from '@/components/community/carpool-create-modal';
import { CarpoolRequestModal } from '@/components/community/carpool-request-modal';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { Row } from '@/components/primitives/row';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/screen-states';
import { useCarpool } from '@/hooks/use-carpool';
import { scaleFont } from '@/utils/scale';

export default function CarpoolScreen() {
  const { colors: palette } = useTheme();
  const c = useCarpool();

  const renderEmptyState = (
    icon: keyof typeof Ionicons.glyphMap,
    title: string,
    message: string,
    action?: { label: string; onPress: () => void },
  ) => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
        <Ionicons name={icon} size={48} color={palette.tint} />
      </View>
      <ThemedText type="subtitle" style={styles.emptyTitle}>
        {title}
      </ThemedText>
      <ThemedText style={[styles.emptyText, { color: palette.muted }]}>{message}</ThemedText>
      {action && (
        <Button onPress={action.onPress} style={styles.emptyButton}>
          {action.label}
        </Button>
      )}
    </View>
  );

  const renderTabContent = () => {
    switch (c.activeTab) {
      case 'available':
        if (c.availableOffers.length === 0)
          return renderEmptyState(
            'car-outline',
            'No Rides Available',
            'There are no carpool offers at the moment. Check back later or offer a ride!',
            { label: 'Offer a Ride', onPress: c.openCreateModal },
          );
        return (
          <View style={styles.listContainer}>
            {c.availableOffers.map((offer) => (
              <CarpoolOfferCard
                key={offer.id}
                offer={offer}
                currentUserId={c.parentId}
                onRequestSeat={() => c.handleRequestSeat(offer)}
              />
            ))}
          </View>
        );
      case 'my-offers':
        if (c.myOffers.length === 0)
          return renderEmptyState(
            'add-circle-outline',
            'No Offers Yet',
            'Create a carpool offer to help other parents get their kids to training.',
            { label: 'Create Offer', onPress: c.openCreateModal },
          );
        return (
          <View style={styles.listContainer}>
            {c.myOffers.map((offer) => (
              <View key={offer.id}>
                <CarpoolOfferCard
                  offer={offer}
                  currentUserId={c.parentId}
                  onManageRequests={() => c.handleManageRequests(offer)}
                />
                {offer.status === 'ACTIVE' && (
                  <Clickable onPress={() => c.handleCancelOffer(offer)} style={styles.cancelLink}>
                    <ThemedText style={[styles.cancelLinkText, { color: palette.error }]}>
                      Cancel this offer
                    </ThemedText>
                  </Clickable>
                )}
              </View>
            ))}
          </View>
        );
      case 'my-rides':
        if (c.myRides.length === 0)
          return renderEmptyState(
            'ticket-outline',
            'No Confirmed Rides',
            'Request a seat on an available carpool to get started.',
            { label: 'Find a Ride', onPress: () => c.setActiveTab('available') },
          );
        return (
          <View style={styles.listContainer}>
            {c.myRides.map((offer) => (
              <CarpoolOfferCard key={offer.id} offer={offer} currentUserId={c.parentId} />
            ))}
          </View>
        );
    }
  };

  let content: React.ReactNode;
  if (c.status === 'loading') {
    content = <LoadingState variant="list" />;
  } else if (c.status === 'error') {
    content = (
      <ErrorState message={c.error?.message || 'Failed to load carpool data.'} onRetry={c.retry} />
    );
  } else if (c.status === 'empty') {
    content = (
      <EmptyState
        icon="car-outline"
        title="No carpool activity yet"
        message="No available rides or offers were found. Create the first carpool offer to get started."
        actionLabel="Create Offer"
        onPressAction={c.openCreateModal}
      />
    );
  } else {
    content = renderTabContent();
  }

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
            Carpool
          </ThemedText>
        </Row>
        <Clickable
          accessibilityLabel="Create carpool offer"
          onPress={c.openCreateModal}
          style={[styles.addButton, { backgroundColor: palette.tint }]}
        >
          <Ionicons name="add" size={24} color={palette.onPrimary} />
        </Clickable>
      </Row>

      {/* Tabs */}
      <Row style={[styles.tabsContainer, { borderBottomColor: palette.border }]}>
        {c.tabs.map((tab) => (
          <Clickable
            key={tab.key}
            onPress={() => c.setActiveTab(tab.key)}
            style={
              [
                styles.tab,
                c.activeTab === tab.key && {
                  borderBottomColor: palette.tint,
                  borderBottomWidth: 2,
                },
              ].filter(Boolean) as ViewStyle[]
            }
          >
            <Row align="center" justify="center" gap="xxs">
              <ThemedText
                style={[
                  styles.tabLabel,
                  { color: c.activeTab === tab.key ? palette.tint : palette.muted },
                ]}
              >
                {tab.label}
              </ThemedText>
              {tab.count !== undefined && tab.count > 0 && (
                <View
                  style={[
                    styles.tabBadge,
                    {
                      backgroundColor:
                        c.activeTab === tab.key ? palette.tint : palette.surfaceSecondary,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.tabBadgeText,
                      { color: c.activeTab === tab.key ? palette.onPrimary : palette.muted },
                    ]}
                  >
                    {tab.count}
                  </ThemedText>
                </View>
              )}
            </Row>
          </Clickable>
        ))}
      </Row>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={c.refreshing} onRefresh={c.onRefresh} />}
      >
        {content}
      </ScrollView>

      <CarpoolCreateModal
        visible={c.showCreateModal}
        form={c.createForm}
        creating={c.creating}
        onChangeForm={c.setCreateForm}
        onSubmit={c.handleCreateOffer}
        onClose={c.closeCreateModal}
      />
      <CarpoolRequestModal
        visible={c.showRequestModal}
        offer={c.selectedOffer}
        seats={c.requestSeats}
        message={c.requestMessage}
        requesting={c.requesting}
        onChangeSeats={c.setRequestSeats}
        onChangeMessage={c.setRequestMessage}
        onSubmit={c.handleSubmitRequest}
        onClose={c.closeRequestModal}
      />
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
  tabsContainer: { borderBottomWidth: 1, paddingHorizontal: Spacing.lg },
  tab: { flex: 1, paddingVertical: Spacing.sm, marginBottom: -1 },
  tabLabel: { ...Typography.smallSemiBold, fontSize: scaleFont(Typography.smallSemiBold.fontSize) },
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxs,
  },
  tabBadgeText: { ...Typography.caption, fontSize: scaleFont(Typography.caption.fontSize) },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  listContainer: { padding: Spacing.lg },
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
    borderRadius: Radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyTitle: { textAlign: 'center' },
  emptyText: {
    textAlign: 'center',
    ...Typography.body,
    fontSize: scaleFont(Typography.body.fontSize),
    lineHeight: scaleFont(22),
  },
  emptyButton: { marginTop: Spacing.sm },
  cancelLink: { alignItems: 'center', paddingVertical: Spacing.sm, marginBottom: Spacing.md },
  cancelLinkText: {
    ...Typography.smallSemiBold,
    fontSize: scaleFont(Typography.smallSemiBold.fontSize),
  },
});
