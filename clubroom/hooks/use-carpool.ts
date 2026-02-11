/**
 * Hook for the Carpool screen.
 * Manages available offers, my offers, my rides, create/request flows.
 */

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { communityService, CreateCarpoolOfferParams, RequestCarpoolSeatParams } from '@/services/community-service';
import type { CarpoolOffer } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { getCarpoolRequestParentLabel } from '@/utils/carpool-display';

const logger = createLogger('CarpoolScreen');

export type CarpoolTab = 'available' | 'my-offers' | 'my-rides';

export interface CreateOfferFormState {
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

export function useCarpool() {
  const { currentUser } = useAuth();
  const parentId = currentUser?.id ?? 'parent1';
  const parentName = currentUser?.fullName ?? currentUser?.name ?? 'Parent';

  const [activeTab, setActiveTab] = useState<CarpoolTab>('available');
  const [availableOffers, setAvailableOffers] = useState<CarpoolOffer[]>([]);
  const [myOffers, setMyOffers] = useState<CarpoolOffer[]>([]);
  const [myRides, setMyRides] = useState<CarpoolOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<CreateOfferFormState>(initialFormState);
  const [creating, setCreating] = useState(false);

  // Request modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<CarpoolOffer | null>(null);
  const [requestSeats, setRequestSeats] = useState('1');
  const [requestMessage, setRequestMessage] = useState('');
  const [requesting, setRequesting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [availableResult, offersResult] = await Promise.all([
        communityService.getAvailableCarpoolOffers(parentId),
        communityService.getParentCarpoolOffers(parentId),
      ]);
      if (!availableResult.success) {
        Alert.alert('Error', availableResult.error.message);
        setAvailableOffers([]);
      } else {
        setAvailableOffers(availableResult.data);
      }
      if (!offersResult.success) {
        Alert.alert('Error', offersResult.error.message);
        setMyOffers([]);
      } else {
        setMyOffers(offersResult.data);
      }

      const allOffersResult = await communityService.getAvailableCarpoolOffers('');
      if (!allOffersResult.success) {
        Alert.alert('Error', allOffersResult.error.message);
        setMyRides([]);
        return;
      }

      const rides = allOffersResult.data.filter(
        (o) => o.parentId !== parentId && o.requests.some((r) => r.parentId === parentId && r.status === 'ACCEPTED'),
      );
      setMyRides(rides);
    } catch (_error) {
      logger.error('Failed to load carpool data', _error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [parentId]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleCreateOffer = useCallback(async () => {
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
  }, [createForm, parentId, parentName, loadData]);

  const handleRequestSeat = useCallback((offer: CarpoolOffer) => {
    setSelectedOffer(offer);
    setRequestSeats('1');
    setRequestMessage('');
    setShowRequestModal(true);
  }, []);

  const handleSubmitRequest = useCallback(async () => {
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
        childNames: ['Child'],
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
  }, [selectedOffer, requestSeats, requestMessage, parentId, parentName, loadData]);

  const handleManageRequests = useCallback((offer: CarpoolOffer) => {
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
          text: `${getCarpoolRequestParentLabel(req)} (${req.seatsRequested} seat${req.seatsRequested > 1 ? 's' : ''})`,
          onPress: () => handleRespondToRequest(offer.id, req.id, getCarpoolRequestParentLabel(req)),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
    );
  }, []);

  const handleRespondToRequest = useCallback((offerId: string, requestId: string, requesterName: string) => {
    Alert.alert(`Request from ${requesterName}`, 'What would you like to do?', [
      {
        text: 'Accept',
        onPress: async () => {
          try {
            const acceptResult = await communityService.acceptCarpoolRequest(offerId, requestId);
            if (!acceptResult.success) { Alert.alert('Error', acceptResult.error.message); return; }
            loadData();
            Alert.alert('Success', 'Request accepted!');
          } catch (error) { Alert.alert('Error', (error as Error).message); }
        },
      },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: async () => {
          try {
            const declineResult = await communityService.declineCarpoolRequest(offerId, requestId);
            if (!declineResult.success) { Alert.alert('Error', declineResult.error.message); return; }
            loadData();
            Alert.alert('Declined', 'Request has been declined.');
          } catch (error) { Alert.alert('Error', (error as Error).message); }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [loadData]);

  const handleCancelOffer = useCallback((offer: CarpoolOffer) => {
    Alert.alert('Cancel Offer', 'Are you sure you want to cancel this carpool offer?', [
      { text: 'Keep Offer', style: 'cancel' },
      {
        text: 'Cancel Offer',
        style: 'destructive',
        onPress: async () => {
          try {
            const cancelResult = await communityService.cancelCarpoolOffer(offer.id, parentId);
            if (!cancelResult.success) { Alert.alert('Error', cancelResult.error.message); return; }
            loadData();
          } catch (error) { Alert.alert('Error', (error as Error).message); }
        },
      },
    ]);
  }, [parentId, loadData]);

  const openCreateModal = useCallback(() => setShowCreateModal(true), []);
  const closeCreateModal = useCallback(() => setShowCreateModal(false), []);
  const closeRequestModal = useCallback(() => setShowRequestModal(false), []);

  const tabs: { key: CarpoolTab; label: string; count?: number }[] = [
    { key: 'available', label: 'Available', count: availableOffers.length },
    { key: 'my-offers', label: 'My Offers', count: myOffers.filter((o) => o.status === 'ACTIVE').length },
    { key: 'my-rides', label: 'My Rides', count: myRides.length },
  ];

  return {
    parentId, activeTab, setActiveTab, tabs,
    availableOffers, myOffers, myRides, loading, refreshing, onRefresh,
    showCreateModal, createForm, setCreateForm, creating,
    openCreateModal, closeCreateModal, handleCreateOffer,
    showRequestModal, selectedOffer, requestSeats, setRequestSeats,
    requestMessage, setRequestMessage, requesting,
    closeRequestModal, handleRequestSeat, handleSubmitRequest,
    handleManageRequests, handleCancelOffer,
  };
}
