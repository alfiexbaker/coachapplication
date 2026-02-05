import { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  ActivityIndicator,
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { CounterOfferCard } from '@/components/negotiate/CounterOfferCard';
import { NegotiationTimeline } from '@/components/negotiate/NegotiationTimeline';
import { Colors, Radii, Spacing, Typography } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { counterOfferService } from '@/services/counter-offer-service';
import { createLogger } from '@/utils/logger';
import type { NegotiationHistory, CounterOffer } from '@/constants/types';

const logger = createLogger('NegotiateScreen');

export default function NegotiateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const currentUserId = currentUser?.id || '';

  const [negotiation, setNegotiation] = useState<NegotiationHistory | null>(null);
  const [pendingOffer, setPendingOffer] = useState<CounterOffer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reject modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [offerToReject, setOfferToReject] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) {
      setError('Booking ID not provided');
      setIsLoading(false);
      return;
    }

    try {
      setError(null);

      // Load negotiation history
      const history = await counterOfferService.getNegotiationHistory(id);
      setNegotiation(history);

      // Find pending offer that requires action from current user
      if (history) {
        const pending = history.offers.find(
          (offer) =>
            offer.status === 'PENDING' &&
            offer.proposerId !== currentUserId
        );
        setPendingOffer(pending || null);
      }
    } catch (err) {
      logger.error('Failed to load data', err);
      setError('Failed to load negotiation details');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [id, currentUserId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
  };

  const handleAccept = async (offerId: string) => {
    try {
      setIsProcessing(true);
      await counterOfferService.acceptCounterOffer(offerId);

      Alert.alert(
        'Time Change Accepted',
        'The booking has been updated with the new time. Both parties will be notified.',
        [
          {
            text: 'OK',
            onPress: () => {
              loadData();
            },
          },
        ]
      );
    } catch (err) {
      logger.error('Failed to accept offer', err);
      Alert.alert('Error', 'Failed to accept the proposal. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectPress = (offerId: string) => {
    setOfferToReject(offerId);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleRejectConfirm = async () => {
    if (!offerToReject) return;

    try {
      setIsProcessing(true);
      setShowRejectModal(false);

      await counterOfferService.rejectCounterOffer({
        offerId: offerToReject,
        reason: rejectReason.trim() || undefined,
      });

      Alert.alert(
        'Proposal Declined',
        'The other party has been notified. They may propose an alternative time.',
        [
          {
            text: 'OK',
            onPress: () => {
              loadData();
            },
          },
        ]
      );
    } catch (err) {
      logger.error('Failed to reject offer', err);
      Alert.alert('Error', 'Failed to decline the proposal. Please try again.');
    } finally {
      setIsProcessing(false);
      setOfferToReject(null);
    }
  };

  const handleCounterPropose = () => {
    // Navigate to counter-offer screen
    router.push(`/bookings/${id}/counter`);
  };

  const handleNewProposal = () => {
    router.push(`/bookings/${id}/counter`);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: 'Negotiation',
            headerLeft: () => (
              <Clickable onPress={() => router.back()} style={styles.headerButton}>
                <Ionicons name="arrow-back" size={24} color={palette.text} />
              </Clickable>
            ),
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
          <ThemedText style={[styles.loadingText, { color: palette.muted }]}>
            Loading negotiation...
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: 'Error',
            headerLeft: () => (
              <Clickable onPress={() => router.back()} style={styles.headerButton}>
                <Ionicons name="arrow-back" size={24} color={palette.text} />
              </Clickable>
            ),
          }}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={palette.error} />
          <ThemedText type="defaultSemiBold" style={styles.errorTitle}>
            Unable to Load
          </ThemedText>
          <ThemedText style={[styles.errorText, { color: palette.muted }]}>
            {error}
          </ThemedText>
          <Clickable
            onPress={loadData}
            style={[styles.retryButton, { backgroundColor: palette.tint }]}
          >
            <ThemedText style={styles.retryText}>Try Again</ThemedText>
          </Clickable>
        </View>
      </SafeAreaView>
    );
  }

  // No negotiation exists yet
  if (!negotiation) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: 'Negotiation',
            headerLeft: () => (
              <Clickable onPress={() => router.back()} style={styles.headerButton}>
                <Ionicons name="arrow-back" size={24} color={palette.text} />
              </Clickable>
            ),
          }}
        />
        <View style={styles.emptyContainer}>
          <Ionicons name="swap-horizontal-outline" size={64} color={palette.muted} />
          <ThemedText type="defaultSemiBold" style={styles.emptyTitle}>
            No Negotiation Yet
          </ThemedText>
          <ThemedText style={[styles.emptyText, { color: palette.muted }]}>
            Need to change the booking time? Start a negotiation by proposing a new time.
          </ThemedText>
          <Button onPress={handleNewProposal} style={styles.proposalButton}>
            <View style={styles.proposalButtonContent}>
              <Ionicons name="time-outline" size={18} color="#FFFFFF" />
              <ThemedText style={styles.proposalButtonText}>
                Propose New Time
              </ThemedText>
            </View>
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const isResolved = negotiation.status === 'RESOLVED';
  const canPropose = !isResolved && negotiation.status !== 'CANCELLED';

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top']}
    >
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Negotiation',
          headerLeft: () => (
            <Clickable onPress={() => router.back()} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color={palette.text} />
            </Clickable>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={palette.tint}
          />
        }
      >
        {/* Booking summary */}
        <View style={[styles.bookingSummary, { backgroundColor: palette.surface }]}>
          <View style={styles.bookingHeader}>
            <Ionicons name="calendar-outline" size={20} color={palette.tint} />
            <View style={styles.bookingInfo}>
              <ThemedText type="defaultSemiBold">
                Session with {negotiation.coachName}
              </ThemedText>
              <ThemedText style={{ color: palette.muted }}>
                For {negotiation.athleteName}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Pending counter-offer (if any) */}
        {pendingOffer && (
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Action Required
            </ThemedText>
            <CounterOfferCard
              offer={pendingOffer}
              isActionable={true}
              onAccept={handleAccept}
              onReject={handleRejectPress}
              onCounterPropose={handleCounterPropose}
              isLoading={isProcessing}
            />
          </View>
        )}

        {/* Negotiation timeline */}
        <View style={[styles.section, styles.timelineSection]}>
          <NegotiationTimeline
            negotiation={negotiation}
            currentUserId={currentUserId}
          />
        </View>

        {/* Action button for new proposal */}
        {canPropose && !pendingOffer && (
          <View style={styles.actionSection}>
            <Button onPress={handleNewProposal}>
              <View style={styles.proposalButtonContent}>
                <Ionicons name="swap-horizontal" size={18} color="#FFFFFF" />
                <ThemedText style={styles.proposalButtonText}>
                  Propose Different Time
                </ThemedText>
              </View>
            </Button>
          </View>
        )}
      </ScrollView>

      {/* Reject Modal */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: palette.surface }]}>
            <ThemedText type="defaultSemiBold" style={styles.modalTitle}>
              Decline Proposal
            </ThemedText>
            <ThemedText style={[styles.modalSubtitle, { color: palette.muted }]}>
              Let them know why this time doesn&apos;t work (optional)
            </ThemedText>
            <TextInput
              style={[
                styles.modalInput,
                {
                  borderColor: palette.border,
                  color: palette.text,
                  backgroundColor: palette.background,
                },
              ]}
              placeholder="e.g., I have another commitment at that time"
              placeholderTextColor={palette.muted}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <View style={styles.modalButtons}>
              <Clickable
                onPress={() => setShowRejectModal(false)}
                style={[styles.modalCancelButton, { borderColor: palette.border }]}
              >
                <ThemedText>Cancel</ThemedText>
              </Clickable>
              <Clickable
                onPress={handleRejectConfirm}
                style={[styles.modalConfirmButton, { backgroundColor: palette.error }]}
              >
                <ThemedText style={styles.modalConfirmText}>Decline</ThemedText>
              </Clickable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    marginTop: Spacing.sm,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  errorTitle: {
    marginTop: Spacing.sm,
  },
  errorText: {
    textAlign: 'center',
  },
  retryButton: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  emptyTitle: {
    marginTop: Spacing.sm,
  },
  emptyText: {
    textAlign: 'center',
    maxWidth: 280,
  },
  proposalButton: {
    marginTop: Spacing.md,
  },
  proposalButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  proposalButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  headerButton: {
    padding: Spacing.xs,
  },
  bookingSummary: {
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
  bookingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  bookingInfo: {
    flex: 1,
    gap: 2,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  timelineSection: {
    marginTop: Spacing.sm,
  },
  actionSection: {
    marginTop: Spacing.md,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    padding: Spacing.lg,
    borderRadius: Radii.lg,
    gap: Spacing.sm,
  },
  modalTitle: {
    fontSize: 18,
  },
  modalSubtitle: {
    ...Typography.sm,
  },
  modalInput: {
    borderWidth: 1.5,
    borderRadius: Radii.md,
    padding: Spacing.md,
    fontSize: 15,
    minHeight: 80,
    marginTop: Spacing.xs,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  modalCancelButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
  },
  modalConfirmButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
