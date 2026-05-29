/**
 * Hook for the Squad Invite screen.
 * Manages squad data loading, form state, time slots, and bulk invite sending.
 */

import { useState, useEffect, startTransition } from 'react';

import { router, useLocalSearchParams } from 'expo-router';

import { Routes } from '@/navigation/routes';
import { useAuth } from '@/hooks/use-auth';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { inviteService as squadBulkInviteService } from '@/services/invite';
import { squadService } from '@/services/squad-service';
import { createLogger } from '@/utils/logger';
import { err, ok, serviceError, type ServiceError } from '@/types/result';
import type {
  ClubSquad,
  SquadMember,
  TimeSlot,
  BulkInviteResult,
  SquadSessionInvite,
  SquadInviteHistoryEntry,
} from '@/constants/types';
import { uiFeedback } from '@/services/ui-feedback';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

const logger = createLogger('SquadInviteScreen');
const EMPTY_SQUAD_MEMBERS: SquadMember[] = [];
const EMPTY_INVITE_HISTORY: SquadInviteHistoryEntry[] = [];

export const SESSION_TYPES = ['1:1 Coaching', 'Group Session', 'Assessment', 'Training'];
export const FOCUSES = [
  'Dribbling',
  'Passing',
  'Finishing',
  'Defending',
  'Goalkeeping',
  'Conditioning',
];

export type ViewMode = 'form' | 'sending' | 'result';

interface SquadInviteData {
  squad: ClubSquad | null;
  members: SquadMember[];
  inviteHistory: SquadInviteHistoryEntry[];
}

export interface UseSquadInviteResult {
  squadId: string | undefined;
  squad: ClubSquad | null;
  members: SquadMember[];
  inviteHistory: SquadInviteHistoryEntry[];
  loading: boolean;
  status: ScreenStatus;
  error: ServiceError | null;
  refreshing: boolean;
  onRefresh: () => void;
  retry: () => void;
  selectedMemberIds: string[];
  setSelectedMemberIds: (value: string[]) => void;
  sessionType: string;
  setSessionType: (value: string) => void;
  focus: string;
  setFocus: (value: string) => void;
  sessionTitle: string;
  setSessionTitle: (value: string) => void;
  proposedSlots: TimeSlot[];
  slotDate: string;
  setSlotDate: (value: string) => void;
  slotStartTime: string;
  setSlotStartTime: (value: string) => void;
  slotEndTime: string;
  setSlotEndTime: (value: string) => void;
  slotLocation: string;
  setSlotLocation: (value: string) => void;
  viewMode: ViewMode;
  sendingInvites: boolean;
  inviteResult: {
    squadInvite: SquadSessionInvite;
    result: BulkInviteResult;
  } | null;
  addTimeSlot: () => void;
  removeTimeSlot: (index: number) => void;
  uniqueParentCount: number;
  canSend: boolean;
  sendBulkInvites: () => Promise<void>;
  handleDone: () => void;
  handleViewInvites: () => void;
}

export function useSquadInvite() {
  const { currentUser } = useAuth();
  const { id: squadId } = useLocalSearchParams<{ id: string }>();

  // Form state
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [sessionType, setSessionType] = useState(SESSION_TYPES[0]);
  const [focus, setFocus] = useState(FOCUSES[0]);
  const [sessionTitle, setSessionTitle] = useState('');
  const [notes] = useState('');
  const [price] = useState('');
  const [proposedSlots, setProposedSlots] = useState<TimeSlot[]>([]);
  const [initializedSquadId, setInitializedSquadId] = useState<string | null>(null);

  // Time slot form
  const [slotDate, setSlotDate] = useState('');
  const [slotStartTime, setSlotStartTime] = useState('');
  const [slotEndTime, setSlotEndTime] = useState('');
  const [slotLocation, setSlotLocation] = useState('');

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>('form');
  const [sendingInvites, setSendingInvites] = useState(false);
  const [inviteResult, setInviteResult] = useState<{
    squadInvite: SquadSessionInvite;
    result: BulkInviteResult;
  } | null>(null);

  const loadSquadData = async () => {
    if (!squadId) {
      return ok<SquadInviteData>({
        squad: null,
        members: [],
        inviteHistory: [],
      });
    }

    try {
      const [squadData, membersData, historyData] = await Promise.all([
        squadService.getSquad(squadId),
        squadService.getSquadMembers(squadId),
        squadBulkInviteService.getSquadInviteHistory(squadId),
      ]);

      return ok<SquadInviteData>({
        squad: squadData,
        members: membersData,
        inviteHistory: historyData,
      });
    } catch (loadError) {
      logger.error('Failed to load squad invite data:', loadError);
      return err(
        serviceError(
          'UNKNOWN',
          'Failed to load squad invite data. Pull down to refresh.',
          loadError,
        ),
      );
    }
  };

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<SquadInviteData>({
    load: loadSquadData,
    deps: [squadId],
    isEmpty: (value) => value.squad === null,
    refetchOnFocus: true,
  });

  const squad = data?.squad ?? null;
  const members = data?.members ?? EMPTY_SQUAD_MEMBERS;
  const inviteHistory = data?.inviteHistory ?? EMPTY_INVITE_HISTORY;
  const loading = status === 'loading';

  useEffect(() => {
    if (!squad || initializedSquadId === squad.id) return;
    startTransition(() => {
      setSessionTitle(`${squad.name} Training`);
    });
    startTransition(() => {
      setSelectedMemberIds(members.map((member) => member.id));
    });
    startTransition(() => {
      setInitializedSquadId(squad.id);
    });
  }, [squad, members, initializedSquadId]);

  const addTimeSlot = () => {
    if (!slotDate || !slotStartTime || !slotEndTime) {
      uiFeedback.showToast('Please fill in date, start time, and end time', 'error');
      return;
    }

    setProposedSlots((prev) => [
      ...prev,
      {
        date: slotDate,
        startTime: slotStartTime,
        endTime: slotEndTime,
        location: slotLocation || undefined,
      },
    ]);

    setSlotDate('');
    setSlotStartTime('');
    setSlotEndTime('');
    setSlotLocation('');
  };

  const removeTimeSlot = (index: number) => {
    setProposedSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const uniqueParentCount = (() => {
    const selectedMembers = members.filter((member) => selectedMemberIds.includes(member.id));
    return new Set(selectedMembers.map((member) => member.parentId)).size;
  })();

  const canSend =
    selectedMemberIds.length > 0 &&
    sessionTitle.trim() !== '' &&
    sessionType !== '' &&
    focus !== '' &&
    proposedSlots.length > 0;

  const sendBulkInvites = async () => {
    if (!currentUser || !squadId || !canSend) return;

    setSendingInvites(true);
    setViewMode('sending');

    return await runAsyncTryCatchFinally(
      async () => {
        const result = await squadBulkInviteService.createBulkInvite({
          squadId,
          sessionId: `session_${Date.now()}`,
          sessionTitle,
          coachId: currentUser.id,
          coachName: currentUser.name || 'Coach',
          clubName: squad?.name,
          proposedSlots,
          sessionType,
          focus,
          notes: notes || undefined,
          price: price ? parseFloat(price) : undefined,
          expiresInDays: 7,
        });

        if (!result.success) {
          logger.error('Failed to send bulk invites:', result.error);
          uiFeedback.showToast(
            result.error.message || 'Failed to send invites. Please try again.',
            'error',
          );
          setViewMode('form');
          return;
        }

        setInviteResult(result.data);
        setViewMode('result');
      },
      async (sendError) => {
        logger.error('Failed to send bulk invites:', sendError);
        uiFeedback.showToast('Failed to send invites. Please try again.', 'error');
        setViewMode('form');
      },
      () => {
        setSendingInvites(false);
      },
    );
  };

  const handleDone = () => {
    router.back();
  };

  const handleViewInvites = () => {
    router.push(Routes.SESSION_INVITES);
  };

  return {
    squadId,
    squad,
    members,
    inviteHistory,
    loading,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
    selectedMemberIds,
    setSelectedMemberIds,
    sessionType,
    setSessionType,
    focus,
    setFocus,
    sessionTitle,
    setSessionTitle,
    proposedSlots,
    slotDate,
    setSlotDate,
    slotStartTime,
    setSlotStartTime,
    slotEndTime,
    setSlotEndTime,
    slotLocation,
    setSlotLocation,
    viewMode,
    sendingInvites,
    inviteResult,
    addTimeSlot,
    removeTimeSlot,
    uniqueParentCount,
    canSend,
    sendBulkInvites,
    handleDone,
    handleViewInvites,
  } satisfies UseSquadInviteResult;
}
