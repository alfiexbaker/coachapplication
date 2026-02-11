/**
 * Hook for the Carpool screen.
 * Manages available offers, my offers, my rides, create/request flows.
 */

import { useState, useCallback, type Dispatch, type SetStateAction } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '@/hooks/use-auth';
import {
  communityService,
  CreateCarpoolOfferParams,
  RequestCarpoolSeatParams,
} from '@/services/community-service';
import type { CarpoolOffer } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { getCarpoolRequestParentLabel } from '@/utils/carpool-display';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('CarpoolScreen');

export type CarpoolTab = 'available' | 'my-offers' | 'my-rides';

interface CarpoolScreenData {
  availableOffers: CarpoolOffer[];
  myOffers: CarpoolOffer[];
  myRides: CarpoolOffer[];
}

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

export interface UseCarpoolResult {
  parentId: string;
  activeTab: CarpoolTab;
  setActiveTab: (tab: CarpoolTab) => void;
  tabs: { key: CarpoolTab; label: string; count?: number }[];
  availableOffers: CarpoolOffer[];
  myOffers: CarpoolOffer[];
  myRides: CarpoolOffer[];
  status: ScreenStatus;
  loading: boolean;
  error: ServiceError | null;
  refreshing: boolean;
  onRefresh: () => void;
  retry: () => void;
  showCreateModal: boolean;
  createForm: CreateOfferFormState;
  setCreateForm: Dispatch<SetStateAction<CreateOfferFormState>>;
  creating: boolean;
  openCreateModal: () => void;
  closeCreateModal: () => void;
  handleCreateOffer: () => Promise<void>;
  showRequestModal: boolean;
  selectedOffer: CarpoolOffer | null;
  requestSeats: string;
  setRequestSeats: Dispatch<SetStateAction<string>>;
  requestMessage: string;
  setRequestMessage: Dispatch<SetStateAction<string>>;
  requesting: boolean;
  closeRequestModal: () => void;
  handleRequestSeat: (offer: CarpoolOffer) => void;
  handleSubmitRequest: () => Promise<void>;
  handleManageRequests: (offer: CarpoolOffer) => void;
  handleCancelOffer: (offer: CarpoolOffer) => void;
}

export function useCarpool(): UseCarpoolResult {
  const { currentUser } = useAuth();
  const parentId = currentUser?.id ?? 'parent1';
  const parentName = currentUser?.fullName ?? currentUser?.name ?? 'Parent';

  const [activeTab, setActiveTab] = useState<CarpoolTab>('available');

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
      const [availableResult, offersResult, allOffersResult] = await Promise.all([
        communityService.getAvailableCarpoolOffers(parentId),
        communityService.getParentCarpoolOffers(parentId),
        communityService.getAvailableCarpoolOffers(''),
      ]);

      if (!availableResult.success) return err(availableResult.error);
      if (!offersResult.success) return err(offersResult.error);
      if (!allOffersResult.success) return err(allOffersResult.error);

      const rides = allOffersResult.data.filter(
        (o) =>
          o.parentId !== parentId &&
          o.requests.some((r) => r.parentId === parentId && r.status === 'ACCEPTED'),
      );

      return ok<CarpoolScreenData>({
        availableOffers: availableResult.data,
        myOffers: offersResult.data,
        myRides: rides,
      });
    } catch (loadError) {
      logger.error('Failed to load carpool data', loadError);
      return err(
        serviceError('UNKNOWN', 'Failed to load carpool data. Pull down to refresh.', loadError),
      );
    }
  }, [parentId]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<CarpoolScreenData>({
    load: loadData,
    deps: [parentId],
    isEmpty: (value) =>
      value.availableOffers.length === 0 &&
      value.myOffers.length === 0 &&
      value.myRides.length === 0,
    refetchOnFocus: true,
  });

  const availableOffers = data?.availableOffers ?? [];
  const myOffers = data?.myOffers ?? [];
  const myRides = data?.myRides ?? [];
  const loading = status === 'loading';

  const handleCreateOffer = useCallback(async () => {
    if (
      !createForm.sessionName ||
      !createForm.sessionDate ||
      !createForm.pickupLocation ||
      !createForm.pickupTime
    ) {
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
      const createResult = await communityService.createCarpoolOffer(params);
      if (!createResult.success) {
        Alert.alert('Error', createResult.error.message);
        return;
      }
      setShowCreateModal(false);
      setCreateForm(initialFormState);
      onRefresh();
      Alert.alert('Success', 'Your carpool offer has been created!');
    } catch {
      Alert.alert('Error', 'Failed to create carpool offer. Please try again.');
    } finally {
      setCreating(false);
    }
  }, [createForm, parentId, parentName, onRefresh]);

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
      onRefresh();
      Alert.alert('Success', 'Your seat request has been sent!');
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setRequesting(false);
    }
  }, [selectedOffer, requestSeats, requestMessage, parentId, parentName, onRefresh]);

  const handleRespondToRequest = useCallback(
    (offerId: string, requestId: string, requesterName: string) => {
      Alert.alert(`Request from ${requesterName}`, 'What would you like to do?', [
        {
          text: 'Accept',
          onPress: async () => {
            try {
              const acceptResult = await communityService.acceptCarpoolRequest(offerId, requestId);
              if (!acceptResult.success) {
                Alert.alert('Error', acceptResult.error.message);
                return;
              }
              onRefresh();
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
              const declineResult = await communityService.declineCarpoolRequest(
                offerId,
                requestId,
              );
              if (!declineResult.success) {
                Alert.alert('Error', declineResult.error.message);
                return;
              }
              onRefresh();
              Alert.alert('Declined', 'Request has been declined.');
            } catch (error) {
              Alert.alert('Error', (error as Error).message);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [onRefresh],
  );

  const handleManageRequests = useCallback(
    (offer: CarpoolOffer) => {
      const pendingRequests = offer.requests.filter((r) => r.status === 'PENDING');
      if (pendingRequests.length === 0) {
        Alert.alert('No Pending Requests', 'There are no pending seat requests.');
        return;
      }
      Alert.alert('Manage Requests', `You have ${pendingRequests.length} pending request(s).`, [
        ...pendingRequests.slice(0, 3).map((req) => ({
          text: `${getCarpoolRequestParentLabel(req)} (${req.seatsRequested} seat${req.seatsRequested > 1 ? 's' : ''})`,
          onPress: () =>
            handleRespondToRequest(offer.id, req.id, getCarpoolRequestParentLabel(req)),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    },
    [handleRespondToRequest],
  );

  const handleCancelOffer = useCallback(
    (offer: CarpoolOffer) => {
      Alert.alert('Cancel Offer', 'Are you sure you want to cancel this carpool offer?', [
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
              onRefresh();
            } catch (error) {
              Alert.alert('Error', (error as Error).message);
            }
          },
        },
      ]);
    },
    [parentId, onRefresh],
  );

  const openCreateModal = useCallback(() => setShowCreateModal(true), []);
  const closeCreateModal = useCallback(() => setShowCreateModal(false), []);
  const closeRequestModal = useCallback(() => setShowRequestModal(false), []);

  const tabs: { key: CarpoolTab; label: string; count?: number }[] = [
    { key: 'available', label: 'Available', count: availableOffers.length },
    {
      key: 'my-offers',
      label: 'My Offers',
      count: myOffers.filter((o) => o.status === 'ACTIVE').length,
    },
    { key: 'my-rides', label: 'My Rides', count: myRides.length },
  ];

  return {
    parentId,
    activeTab,
    setActiveTab,
    tabs,
    availableOffers,
    myOffers,
    myRides,
    status,
    loading,
    error,
    refreshing,
    onRefresh,
    retry,
    showCreateModal,
    createForm,
    setCreateForm,
    creating,
    openCreateModal,
    closeCreateModal,
    handleCreateOffer,
    showRequestModal,
    selectedOffer,
    requestSeats,
    setRequestSeats,
    requestMessage,
    setRequestMessage,
    requesting,
    closeRequestModal,
    handleRequestSeat,
    handleSubmitRequest,
    handleManageRequests,
    handleCancelOffer,
  };
}
