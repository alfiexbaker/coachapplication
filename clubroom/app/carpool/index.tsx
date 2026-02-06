import { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { CarpoolOfferCard } from '@/components/community/CarpoolOfferCard';
import { createLogger } from '@/utils/logger';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { DateTimeField } from '@/components/ui/primitives';
import { Colors, Spacing, Radii, Typography , withAlpha } from '@/constants/theme';
import type { CarpoolOffer } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { communityService, CreateCarpoolOfferParams, RequestCarpoolSeatParams } from '@/services/community-service';
import { scaleFont } from '@/utils/scale';

const logger = createLogger('CarpoolScreen');

type TabType = 'available' | 'my-offers' | 'my-rides';

interface CreateOfferFormState {
  sessionName: string;
  sessionDate: string;
  seatsAvailable: string;
  pickupLocation: string;
  pickupTime: string;
  returnOffered: boolean;
  returnTime: string;
  notes: string;
}

const initialFormState: CreateOfferFormState = {
  sessionName: '',
  sessionDate: '',
  seatsAvailable: '2',
  pickupLocation: '',
  pickupTime: '',
  returnOffered: false,
  returnTime: '',
  notes: '',
};

export default function CarpoolScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const parentId = currentUser?.id ?? 'parent1';
  const parentName = currentUser?.fullName ?? currentUser?.name ?? 'Parent';

  const [activeTab, setActiveTab] = useState<TabType>('available');
  const [availableOffers, setAvailableOffers] = useState<CarpoolOffer[]>([]);
  const [myOffers, setMyOffers] = useState<CarpoolOffer[]>([]);
  const [myRides, setMyRides] = useState<CarpoolOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateOfferFormState>(initialFormState);
  const [creating, setCreating] = useState(false);

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<CarpoolOffer | null>(null);
  const [requestSeats, setRequestSeats] = useState('1');
  const [requestMessage, setRequestMessage] = useState('');
  const [requesting, setRequesting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [available, offers] = await Promise.all([
        communityService.getAvailableCarpoolOffers(parentId),
        communityService.getParentCarpoolOffers(parentId),
      ]);

      setAvailableOffers(available);
      setMyOffers(offers);

      // Find rides where user has an accepted request
      const allOffers = await communityService.getAvailableCarpoolOffers('');
      const rides = allOffers.filter(
        (o) =>
          o.parentId !== parentId &&
          o.requests.some((r) => r.parentId === parentId && r.status === 'ACCEPTED')
      );
      setMyRides(rides);
    } catch (_error) {
      logger.error('Failed to load carpool data', _error);
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

  const handleCreateOffer = async () => {
    if (!createForm.sessionName || !createForm.sessionDate || !createForm.pickupLocation || !createForm.pickupTime) {
      Alert.alert('Missing Information', 'Please fill in all required fields.');
      return;
    }

    setCreating(true);
    try {
      const params: CreateCarpoolOfferParams = {
        parentId,
        parentName,
        sessionId: `session_${Date.now()}`,
        sessionName: createForm.sessionName,
        sessionDate: createForm.sessionDate,
        seatsAvailable: parseInt(createForm.seatsAvailable, 10) || 2,
        pickupLocation: createForm.pickupLocation,
        pickupTime: createForm.pickupTime,
        returnOffered: createForm.returnOffered,
        returnTime: createForm.returnOffered ? createForm.returnTime : undefined,
        notes: createForm.notes || undefined,
      };

      await communityService.createCarpoolOffer(params);
      setShowCreateModal(false);
      setCreateForm(initialFormState);
      loadData();
      Alert.alert('Success', 'Your carpool offer has been created!');
    } catch {
      Alert.alert('Error', 'Failed to create carpool offer. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleRequestSeat = (offer: CarpoolOffer) => {
    setSelectedOffer(offer);
    setRequestSeats('1');
    setRequestMessage('');
    setShowRequestModal(true);
  };

  const handleSubmitRequest = async () => {
    if (!selectedOffer) return;

    const seatsNum = parseInt(requestSeats, 10);
    if (isNaN(seatsNum) || seatsNum < 1) {
      Alert.alert('Invalid Seats', 'Please enter a valid number of seats.');
      return;
    }

    setRequesting(true);
    try {
      const params: RequestCarpoolSeatParams = {
        offerId: selectedOffer.id,
        parentId,
        parentName,
        childNames: ['Child'], // In real app, would select from children list
        seatsRequested: seatsNum,
        message: requestMessage || undefined,
      };

      const seatResult = await communityService.requestCarpoolSeat(params);
      if (!seatResult.success) {
        Alert.alert('Error', seatResult.error.message);
        return;
      }
      setShowRequestModal(false);
      loadData();
      Alert.alert('Success', 'Your seat request has been sent!');
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setRequesting(false);
    }
  };

  const handleManageRequests = (offer: CarpoolOffer) => {
    const pendingRequests = offer.requests.filter((r) => r.status === 'PENDING');

    if (pendingRequests.length === 0) {
      Alert.alert('No Pending Requests', 'There are no pending seat requests.');
      return;
    }

    Alert.alert(
      'Manage Requests',
      `You have ${pendingRequests.length} pending request(s).`,
      [
        ...pendingRequests.slice(0, 3).map((req) => ({
          text: `${req.parentName} (${req.seatsRequested} seat${req.seatsRequested > 1 ? 's' : ''})`,
          onPress: () => handleRespondToRequest(offer.id, req.id, req.parentName),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  };

  const handleRespondToRequest = (offerId: string, requestId: string, requesterName: string) => {
    Alert.alert(
      `Request from ${requesterName}`,
      'What would you like to do?',
      [
        {
          text: 'Accept',
          onPress: async () => {
            try {
              const acceptResult = await communityService.acceptCarpoolRequest(offerId, requestId);
              if (!acceptResult.success) {
                Alert.alert('Error', acceptResult.error.message);
                return;
              }
              loadData();
              Alert.alert('Success', 'Request accepted!');
            } catch (error) {
              Alert.alert('Error', (error as Error).message);
            }
          },
        },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              const declineResult = await communityService.declineCarpoolRequest(offerId, requestId);
              if (!declineResult.success) {
                Alert.alert('Error', declineResult.error.message);
                return;
              }
              loadData();
              Alert.alert('Declined', 'Request has been declined.');
            } catch (error) {
              Alert.alert('Error', (error as Error).message);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleCancelOffer = (offer: CarpoolOffer) => {
    Alert.alert(
      'Cancel Offer',
      'Are you sure you want to cancel this carpool offer?',
      [
        { text: 'Keep Offer', style: 'cancel' },
        {
          text: 'Cancel Offer',
          style: 'destructive',
          onPress: async () => {
            try {
              const cancelResult = await communityService.cancelCarpoolOffer(offer.id, parentId);
              if (!cancelResult.success) {
                Alert.alert('Error', cancelResult.error.message);
                return;
              }
              loadData();
            } catch (error) {
              Alert.alert('Error', (error as Error).message);
            }
          },
        },
      ]
    );
  };

  const tabs: { key: TabType; label: string; count?: number }[] = [
    { key: 'available', label: 'Available', count: availableOffers.length },
    { key: 'my-offers', label: 'My Offers', count: myOffers.filter((o) => o.status === 'ACTIVE').length },
    { key: 'my-rides', label: 'My Rides', count: myRides.length },
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
      case 'available':
        if (availableOffers.length === 0) {
          return renderEmptyState(
            'car-outline',
            'No Rides Available',
            'There are no carpool offers at the moment. Check back later or offer a ride!',
            { label: 'Offer a Ride', onPress: () => setShowCreateModal(true) }
          );
        }
        return (
          <View style={styles.listContainer}>
            {availableOffers.map((offer) => (
              <CarpoolOfferCard
                key={offer.id}
                offer={offer}
                currentUserId={parentId}
                onRequestSeat={() => handleRequestSeat(offer)}
              />
            ))}
          </View>
        );

      case 'my-offers':
        if (myOffers.length === 0) {
          return renderEmptyState(
            'add-circle-outline',
            'No Offers Yet',
            'Create a carpool offer to help other parents get their kids to training.',
            { label: 'Create Offer', onPress: () => setShowCreateModal(true) }
          );
        }
        return (
          <View style={styles.listContainer}>
            {myOffers.map((offer) => (
              <View key={offer.id}>
                <CarpoolOfferCard
                  offer={offer}
                  currentUserId={parentId}
                  onManageRequests={() => handleManageRequests(offer)}
                />
                {offer.status === 'ACTIVE' && (
                  <Clickable
                    onPress={() => handleCancelOffer(offer)}
                    style={styles.cancelLink}
                  >
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
        if (myRides.length === 0) {
          return renderEmptyState(
            'ticket-outline',
            'No Confirmed Rides',
            'Request a seat on an available carpool to get started.',
            { label: 'Find a Ride', onPress: () => setActiveTab('available') }
          );
        }
        return (
          <View style={styles.listContainer}>
            {myRides.map((offer) => (
              <CarpoolOfferCard
                key={offer.id}
                offer={offer}
                currentUserId={parentId}
              />
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
            Carpool
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
              activeTab === tab.key && {
                borderBottomColor: palette.tint,
                borderBottomWidth: 2,
              },
            ].filter(Boolean) as ViewStyle[]}
          >
            <ThemedText
              style={[
                styles.tabLabel,
                { color: activeTab === tab.key ? palette.tint : palette.muted },
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
                      activeTab === tab.key ? palette.tint : palette.surfaceSecondary,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.tabBadgeText,
                    { color: activeTab === tab.key ? Colors.light.onPrimary : palette.muted },
                  ]}
                >
                  {tab.count}
                </ThemedText>
              </View>
            )}
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

      {/* Create Offer Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: palette.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: palette.border }]}>
            <ThemedText type="title" style={styles.modalTitle}>
              Offer a Ride
            </ThemedText>
            <Clickable onPress={() => setShowCreateModal(false)}>
              <Ionicons name="close" size={24} color={palette.text} />
            </Clickable>
          </View>
          <KeyboardAvoidingView
            style={styles.modalContent}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              contentContainerStyle={styles.formContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.formSection}>
                <ThemedText type="defaultSemiBold" style={styles.label}>
                  Session Name *
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
                  ]}
                  placeholder="e.g., Saturday Training"
                  placeholderTextColor={palette.muted}
                  value={createForm.sessionName}
                  onChangeText={(v) => setCreateForm({ ...createForm, sessionName: v })}
                />
              </View>

              <View style={styles.formSection}>
                <ThemedText type="defaultSemiBold" style={styles.label}>
                  Date *
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
                  ]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={palette.muted}
                  value={createForm.sessionDate}
                  onChangeText={(v) => setCreateForm({ ...createForm, sessionDate: v })}
                />
              </View>

              <View style={styles.formSection}>
                <ThemedText type="defaultSemiBold" style={styles.label}>
                  Available Seats *
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
                  ]}
                  placeholder="2"
                  placeholderTextColor={palette.muted}
                  value={createForm.seatsAvailable}
                  onChangeText={(v) => setCreateForm({ ...createForm, seatsAvailable: v })}
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.formSection}>
                <ThemedText type="defaultSemiBold" style={styles.label}>
                  Pickup Location *
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
                  ]}
                  placeholder="e.g., High Street Car Park"
                  placeholderTextColor={palette.muted}
                  value={createForm.pickupLocation}
                  onChangeText={(v) => setCreateForm({ ...createForm, pickupLocation: v })}
                />
              </View>

              <View style={styles.formSection}>
                <DateTimeField
                  mode="time"
                  label="Pickup Time *"
                  value={createForm.pickupTime}
                  onChange={(v) => setCreateForm({ ...createForm, pickupTime: v })}
                />
              </View>

              <View style={styles.formSection}>
                <Clickable
                  style={[
                    styles.toggleRow,
                    {
                      backgroundColor: createForm.returnOffered ? withAlpha(palette.tint, 0.09) : palette.surface,
                      borderColor: createForm.returnOffered ? palette.tint : palette.border,
                    },
                  ]}
                  onPress={() =>
                    setCreateForm({ ...createForm, returnOffered: !createForm.returnOffered })
                  }
                >
                  <Ionicons
                    name={createForm.returnOffered ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={createForm.returnOffered ? palette.tint : palette.muted}
                  />
                  <ThemedText style={styles.toggleLabel}>Offering return trip</ThemedText>
                </Clickable>
              </View>

              {createForm.returnOffered && (
                <View style={styles.formSection}>
                  <ThemedText type="defaultSemiBold" style={styles.label}>
                    Return Time
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.input,
                      { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
                    ]}
                    placeholder="e.g., 12:00"
                    placeholderTextColor={palette.muted}
                    value={createForm.returnTime}
                    onChangeText={(v) => setCreateForm({ ...createForm, returnTime: v })}
                  />
                </View>
              )}

              <View style={styles.formSection}>
                <ThemedText type="defaultSemiBold" style={styles.label}>
                  Notes (optional)
                </ThemedText>
                <TextInput
                  style={[
                    styles.textArea,
                    { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
                  ]}
                  placeholder="Any additional info for parents..."
                  placeholderTextColor={palette.muted}
                  value={createForm.notes}
                  onChangeText={(v) => setCreateForm({ ...createForm, notes: v })}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            <View style={[styles.modalActions, { borderTopColor: palette.border }]}>
              <Button
                variant="outline"
                onPress={() => setShowCreateModal(false)}
                style={styles.modalButton}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button
                onPress={handleCreateOffer}
                style={styles.modalButton}
                disabled={creating}
              >
                {creating ? 'Creating...' : 'Create Offer'}
              </Button>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Request Seat Modal */}
      <Modal
        visible={showRequestModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRequestModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: palette.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: palette.border }]}>
            <ThemedText type="title" style={styles.modalTitle}>
              Request a Seat
            </ThemedText>
            <Clickable onPress={() => setShowRequestModal(false)}>
              <Ionicons name="close" size={24} color={palette.text} />
            </Clickable>
          </View>
          <KeyboardAvoidingView
            style={styles.modalContent}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              contentContainerStyle={styles.formContent}
              showsVerticalScrollIndicator={false}
            >
              {selectedOffer && (
                <SurfaceCard style={styles.offerSummary}>
                  <ThemedText type="defaultSemiBold">{selectedOffer.sessionName}</ThemedText>
                  <ThemedText style={{ color: palette.muted }}>
                    {selectedOffer.sessionDate} at {selectedOffer.pickupTime}
                  </ThemedText>
                  <ThemedText style={{ color: palette.muted }}>
                    From: {selectedOffer.pickupLocation}
                  </ThemedText>
                </SurfaceCard>
              )}

              <View style={styles.formSection}>
                <ThemedText type="defaultSemiBold" style={styles.label}>
                  Number of Seats
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
                  ]}
                  placeholder="1"
                  placeholderTextColor={palette.muted}
                  value={requestSeats}
                  onChangeText={setRequestSeats}
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.formSection}>
                <ThemedText type="defaultSemiBold" style={styles.label}>
                  Message (optional)
                </ThemedText>
                <TextInput
                  style={[
                    styles.textArea,
                    { backgroundColor: palette.surface, borderColor: palette.border, color: palette.text },
                  ]}
                  placeholder="Add a note to the driver..."
                  placeholderTextColor={palette.muted}
                  value={requestMessage}
                  onChangeText={setRequestMessage}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

            <View style={[styles.modalActions, { borderTopColor: palette.border }]}>
              <Button
                variant="outline"
                onPress={() => setShowRequestModal(false)}
                style={styles.modalButton}
                disabled={requesting}
              >
                Cancel
              </Button>
              <Button
                onPress={handleSubmitRequest}
                style={styles.modalButton}
                disabled={requesting}
              >
                {requesting ? 'Sending...' : 'Send Request'}
              </Button>
            </View>
          </KeyboardAvoidingView>
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
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxs,
  },
  tabBadgeText: {
    ...Typography.caption, fontSize: scaleFont(Typography.caption.fontSize),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  listContainer: {
    padding: Spacing.lg,
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
    lineHeight: scaleFont(22),
  },
  emptyButton: {
    marginTop: Spacing.sm,
  },
  cancelLink: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  cancelLinkText: {
    ...Typography.smallSemiBold, fontSize: scaleFont(Typography.smallSemiBold.fontSize),
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
  modalContent: {
    flex: 1,
  },
  formContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  formSection: {
    gap: Spacing.xs,
  },
  label: {
    ...Typography.bodySmall, fontSize: scaleFont(Typography.bodySmall.fontSize),
    marginBottom: Spacing.xxs,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    ...Typography.subheading, fontSize: scaleFont(Typography.subheading.fontSize),
  },
  textArea: {
    minHeight: 80,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.subheading, fontSize: scaleFont(Typography.subheading.fontSize),
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
  },
  toggleLabel: {
    ...Typography.body, fontSize: scaleFont(Typography.body.fontSize),
  },
  offerSummary: {
    gap: Spacing.xxs,
    marginBottom: Spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    padding: Spacing.lg,
    gap: Spacing.sm,
    borderTopWidth: 1,
  },
  modalButton: {
    flex: 1,
  },
});
