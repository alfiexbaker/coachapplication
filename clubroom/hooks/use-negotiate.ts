/**
 * Hook for the Negotiate screen.
 * Manages negotiation data loading, accept/reject actions, and modal state.
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { counterOfferService } from '@/services/counter-offer-service';
import { ServiceEvents } from '@/services/event-bus';
import { createLogger } from '@/utils/logger';
import { err, ok, serviceError, validationError } from '@/types/result';
import type { NegotiationHistory, CounterOffer } from '@/constants/types';

const logger = createLogger('NegotiateScreen');

interface NegotiateScreenData {
  negotiation: NegotiationHistory | null;
  pendingOffer: CounterOffer | null;
}

export function useNegotiate() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useAuth();
  const currentUserId = currentUser?.id || '';

  const [isProcessing, setIsProcessing] = useState(false);

  // Reject modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [offerToReject, setOfferToReject] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) {
      return err(validationError('Booking ID not provided'));
    }

    try {
      const historyResult = await counterOfferService.getNegotiationHistory(id);
      if (!historyResult.success) {
        logger.error('Failed to load negotiation history', historyResult.error);
        return err(historyResult.error);
      }

      const history = historyResult.data;
      if (!history) {
        return ok({ negotiation: null, pendingOffer: null });
      }

      const pending = history.offers.find(
        (offer) => offer.status === 'PENDING' && offer.proposerId !== currentUserId,
      );

      return ok({ negotiation: history, pendingOffer: pending || null });
    } catch (loadError) {
      logger.error('Failed to load data', loadError);
      return err(serviceError('UNKNOWN', 'Failed to load negotiation details', loadError));
    }
  }, [id, currentUserId]);

  const {
    data,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
  } = useScreen<NegotiateScreenData>({
    load: loadData,
    deps: [id, currentUserId],
    events: [ServiceEvents.COUNTER_OFFER_CREATED, ServiceEvents.COUNTER_OFFER_ACCEPTED, ServiceEvents.COUNTER_OFFER_REJECTED],
    isEmpty: (payload) => payload.negotiation === null,
    refetchOnFocus: true,
  });

  const negotiation = data?.negotiation ?? null;
  const pendingOffer = data?.pendingOffer ?? null;

  const handleAccept = useCallback(async (offerId: string) => {
    try {
      setIsProcessing(true);
      const acceptResult = await counterOfferService.acceptCounterOffer(offerId);
      if (!acceptResult.success) {
        Alert.alert('Error', acceptResult.error.message || 'Failed to accept the proposal. Please try again.');
        return;
      }
      Alert.alert('Time Change Accepted', 'The booking has been updated with the new time. Both parties will be notified.', [{ text: 'OK', onPress: () => retry() }]);
    } catch (err) {
      logger.error('Failed to accept offer', err);
      Alert.alert('Error', 'Failed to accept the proposal. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [retry]);

  const handleRejectPress = useCallback((offerId: string) => {
    setOfferToReject(offerId);
    setRejectReason('');
    setShowRejectModal(true);
  }, []);

  const handleRejectConfirm = useCallback(async () => {
    if (!offerToReject) return;
    try {
      setIsProcessing(true);
      setShowRejectModal(false);
      const rejectResult = await counterOfferService.rejectCounterOffer({
        offerId: offerToReject,
        reason: rejectReason.trim() || undefined
      });
      if (!rejectResult.success) {
        Alert.alert('Error', rejectResult.error.message || 'Failed to decline the proposal. Please try again.');
        return;
      }
      Alert.alert('Proposal Declined', 'The other party has been notified. They may propose an alternative time.', [{ text: 'OK', onPress: () => retry() }]);
    } catch (err) {
      logger.error('Failed to reject offer', err);
      Alert.alert('Error', 'Failed to decline the proposal. Please try again.');
    } finally {
      setIsProcessing(false);
      setOfferToReject(null);
    }
  }, [offerToReject, rejectReason, retry]);

  const handleRejectCancel = useCallback(() => setShowRejectModal(false), []);

  const handleNewProposal = useCallback(() => { router.push(Routes.bookingsCounter(id!)); }, [id]);

  const isResolved = negotiation?.status === 'RESOLVED';
  const canPropose = !isResolved && negotiation?.status !== 'CANCELLED';

  return {
    id, currentUserId, negotiation, pendingOffer,
    isLoading: status === 'loading',
    isRefreshing: refreshing,
    isProcessing,
    error: error?.message ?? null,
    showRejectModal, rejectReason, setRejectReason,
    loadData: retry,
    handleRefresh: onRefresh,
    handleAccept, handleRejectPress,
    handleRejectConfirm, handleRejectCancel, handleNewProposal,
    isResolved, canPropose,
  };
}
