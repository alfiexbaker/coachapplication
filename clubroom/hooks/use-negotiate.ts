/**
 * Hook for the Negotiate screen.
 * Manages negotiation data loading, accept/reject actions, and modal state.
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { counterOfferService } from '@/services/counter-offer-service';
import { createLogger } from '@/utils/logger';
import type { NegotiationHistory, CounterOffer } from '@/constants/types';

const logger = createLogger('NegotiateScreen');

export function useNegotiate() {
  const { id } = useLocalSearchParams<{ id: string }>();
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
    if (!id) { setError('Booking ID not provided'); setIsLoading(false); return; }
    try {
      setError(null);
      const history = await counterOfferService.getNegotiationHistory(id);
      setNegotiation(history);
      if (history) {
        const pending = history.offers.find((offer) => offer.status === 'PENDING' && offer.proposerId !== currentUserId);
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

  useEffect(() => { loadData(); }, [loadData]);

  const handleRefresh = useCallback(async () => { setIsRefreshing(true); await loadData(); }, [loadData]);

  const handleAccept = useCallback(async (offerId: string) => {
    try {
      setIsProcessing(true);
      await counterOfferService.acceptCounterOffer(offerId);
      Alert.alert('Time Change Accepted', 'The booking has been updated with the new time. Both parties will be notified.', [{ text: 'OK', onPress: () => loadData() }]);
    } catch (err) {
      logger.error('Failed to accept offer', err);
      Alert.alert('Error', 'Failed to accept the proposal. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [loadData]);

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
      await counterOfferService.rejectCounterOffer({ offerId: offerToReject, reason: rejectReason.trim() || undefined });
      Alert.alert('Proposal Declined', 'The other party has been notified. They may propose an alternative time.', [{ text: 'OK', onPress: () => loadData() }]);
    } catch (err) {
      logger.error('Failed to reject offer', err);
      Alert.alert('Error', 'Failed to decline the proposal. Please try again.');
    } finally {
      setIsProcessing(false);
      setOfferToReject(null);
    }
  }, [offerToReject, rejectReason, loadData]);

  const handleRejectCancel = useCallback(() => setShowRejectModal(false), []);

  const handleNewProposal = useCallback(() => { router.push(Routes.bookingsCounter(id!)); }, [id]);

  const isResolved = negotiation?.status === 'RESOLVED';
  const canPropose = !isResolved && negotiation?.status !== 'CANCELLED';

  return {
    id, currentUserId, negotiation, pendingOffer,
    isLoading, isRefreshing, isProcessing, error,
    showRejectModal, rejectReason, setRejectReason,
    loadData, handleRefresh, handleAccept, handleRejectPress,
    handleRejectConfirm, handleRejectCancel, handleNewProposal,
    isResolved, canPropose,
  };
}
