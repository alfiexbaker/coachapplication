/**
 * useObjectives — State management hook for the Objectives screen.
 *
 * Manages:
 * - Objective CRUD (add, edit, delete)
 * - Modal state (open/close, editing vs new)
 * - Form fields (skill, note, target sessions)
 * - Child filtering for parent users
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';

import { useAuth } from '@/hooks/use-auth';
import { useChildContext } from '@/hooks/use-child-context';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { apiClient } from '@/services/api-client';
import { toDateStr } from '@/utils/format';
import type { AthleteObjective, FootballObjective } from '@/constants/types';
import type { User } from '@/constants/app-types';
import { err, ok, serviceError, type ServiceError } from '@/types/result';
import { COACHING_FOCUSES } from '@/constants/football-registry';

export const FOOTBALL_OBJECTIVES: FootballObjective[] = COACHING_FOCUSES;

const DEFAULT_OBJECTIVES: AthleteObjective[] = [
  {
    id: 'obj-seed-1',
    athleteId: 'user1',
    label: 'Dribbling',
    status: 'active',
    updatedAt: new Date().toISOString(),
    note: 'Keep touches tight at speed.',
    progress: 35,
    sessionsCompleted: 3,
    startDate: toDateStr(new Date()),
    targetSessions: 10,
  },
  {
    id: 'obj-seed-2',
    athleteId: 'user2',
    label: 'Passing',
    status: 'active',
    updatedAt: new Date().toISOString(),
    note: 'Focus on first-time passing under pressure.',
    progress: 50,
    sessionsCompleted: 5,
    startDate: toDateStr(new Date()),
    targetSessions: 12,
  },
];

const OBJECTIVES_STORAGE_KEY = 'clubroom.objectives';

interface ObjectivesLoadData {
  objectives: AthleteObjective[];
  isDemoSeeded: boolean;
}

export function useObjectives() {
  const { currentUser } = useAuth();
  const { children: contextChildren, isParent } = useChildContext();

  const [objectives, setObjectives] = useState<AthleteObjective[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingObjective, setEditingObjective] = useState<AthleteObjective | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<FootballObjective>('Dribbling');
  const [note, setNote] = useState('');
  const [targetSessions, setTargetSessions] = useState('10');

  const loadObjectives = useCallback(async () => {
    try {
      const storedObjectives = await apiClient.get<AthleteObjective[]>(
        OBJECTIVES_STORAGE_KEY,
        DEFAULT_OBJECTIVES,
      );
      return ok<ObjectivesLoadData>({
        objectives: storedObjectives,
        isDemoSeeded: storedObjectives.some((objective) => objective.id.startsWith('obj-seed-')),
      });
    } catch (loadError) {
      return err(serviceError('UNKNOWN', 'Failed to load objectives.', loadError));
    }
  }, []);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<ObjectivesLoadData>({
    load: loadObjectives,
    deps: [currentUser?.id],
    isEmpty: (value) => value.objectives.length === 0,
    refetchOnFocus: true,
  });

  useEffect(() => {
    if (!data) return;
    setObjectives(data.objectives);
  }, [data]);

  const isUsingDemoObjectives = data?.isDemoSeeded ?? false;

  // Parent-specific: child selection
  const children = useMemo<User[]>(() => {
    if (!isParent) return [];
    return contextChildren.map((c) => ({
      id: c.id,
      name: c.name,
      email: '',
      role: 'USER' as const,
      postcode: '',
      dateOfBirth: c.dateOfBirth || '',
      avatar: c.avatarUrl ?? undefined,
    }));
  }, [contextChildren, isParent]);

  const [selectedChildId, setSelectedChildId] = useState<string>(
    children.length > 0 ? children[0].id : '',
  );

  const firstChildId = children[0]?.id;
  useEffect(() => {
    if (!selectedChildId && firstChildId) {
      setSelectedChildId(firstChildId);
    }
  }, [firstChildId, selectedChildId]);

  // Filter objectives by selected child for parents
  const filteredObjectives = useMemo(() => {
    if (isParent && selectedChildId) {
      return objectives.filter((obj) => obj.athleteId === selectedChildId);
    }
    return objectives.filter((obj) => !obj.athleteId || obj.athleteId === currentUser?.id);
  }, [objectives, currentUser, selectedChildId, isParent]);

  const openAddModal = useCallback(() => {
    setEditingObjective(null);
    setSelectedSkill('Dribbling');
    setNote('');
    setTargetSessions('10');
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((objective: AthleteObjective) => {
    setEditingObjective(objective);
    setSelectedSkill(objective.label as FootballObjective);
    setNote(objective.note || '');
    setTargetSessions(objective.targetSessions?.toString() || '10');
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
  }, []);

  const saveObjective = useCallback(() => {
    if (editingObjective) {
      const next = objectives.map((obj) =>
        obj.id === editingObjective.id
          ? { ...obj, label: selectedSkill, note, targetSessions: parseInt(targetSessions) }
          : obj,
      );
      setObjectives(next);
      void apiClient.set(OBJECTIVES_STORAGE_KEY, next);
    } else {
      const athleteId = isParent && selectedChildId ? selectedChildId : currentUser?.id;
      const newObjective: AthleteObjective = {
        id: `obj-${Date.now()}`,
        athleteId,
        label: selectedSkill,
        status: 'active',
        updatedAt: new Date().toISOString(),
        note,
        progress: 0,
        sessionsCompleted: 0,
        startDate: toDateStr(new Date()),
        targetSessions: parseInt(targetSessions) || 10,
      };
      const next = [...objectives, newObjective];
      setObjectives(next);
      void apiClient.set(OBJECTIVES_STORAGE_KEY, next);
    }
    setShowModal(false);
  }, [
    editingObjective,
    selectedSkill,
    note,
    targetSessions,
    isParent,
    isUsingDemoObjectives,
    data?.isDemoSeeded,
    selectedChildId,
    currentUser,
    objectives,
  ]);

  const deleteObjective = useCallback(
    (id: string) => {
      Alert.alert('Delete Goal', 'Remove this goal from your list?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const next = objectives.filter((obj) => obj.id !== id);
            setObjectives(next);
            void apiClient.set(OBJECTIVES_STORAGE_KEY, next);
          },
        },
      ]);
    },
    [objectives],
  );

  return {
    // Data
    currentUser,
    status: status as ScreenStatus,
    error: error as ServiceError | null,
    refreshing,
    onRefresh,
    retry,
    filteredObjectives,
    children,
    selectedChildId,
    setSelectedChildId,
    isParent,
    isUsingDemoObjectives,
    // Modal state
    showModal,
    editingObjective,
    selectedSkill,
    setSelectedSkill,
    note,
    setNote,
    targetSessions,
    setTargetSessions,
    // Actions
    openAddModal,
    openEditModal,
    closeModal,
    saveObjective,
    deleteObjective,
  };
}
