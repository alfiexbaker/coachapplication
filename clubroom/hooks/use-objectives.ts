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
import { hasChildren } from '@/utils/user-helpers';
import { toDateStr } from '@/utils/format';
import type { AthleteObjective, FootballObjective } from '@/constants/types';
import type { User } from '@/constants/app-types';

export const FOOTBALL_OBJECTIVES: FootballObjective[] = [
  'Dribbling',
  'Passing',
  'Defending',
  'Finishing',
  'Goalkeeping',
  'Conditioning',
];

const DEFAULT_OBJECTIVES: AthleteObjective[] = [
  {
    id: 'obj-seed-1',
    athleteId: 'user1',
    label: 'Dribbling',
    status: 'active',
    updatedAt: new Date().toISOString(),
    note: 'Keep touches tight at speed.',
    coachName: 'Coach Sarah',
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
    coachName: 'Coach Mike',
    progress: 50,
    sessionsCompleted: 5,
    startDate: toDateStr(new Date()),
    targetSessions: 12,
  },
];

export function useObjectives() {
  const { currentUser, availableUsers } = useAuth();

  const [objectives, setObjectives] = useState<AthleteObjective[]>(DEFAULT_OBJECTIVES);
  const [showModal, setShowModal] = useState(false);
  const [editingObjective, setEditingObjective] = useState<AthleteObjective | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<FootballObjective>('Dribbling');
  const [note, setNote] = useState('');
  const [targetSessions, setTargetSessions] = useState('10');

  // Parent-specific: child selection
  const children = useMemo<User[]>(() => {
    if (currentUser && hasChildren(currentUser)) {
      return (currentUser.children || []).map((childRef) => {
        const linkedUser = availableUsers.find((user) => user.id === childRef.childId);
        return {
          id: childRef.childId,
          name: childRef.childName || linkedUser?.name || 'Child',
          email: linkedUser?.email || '',
          role: linkedUser?.role || 'USER',
          postcode: linkedUser?.postcode || '',
          dateOfBirth: linkedUser?.dateOfBirth || '',
          avatar: linkedUser?.avatar,
        };
      });
    }
    return [];
  }, [availableUsers, currentUser]);

  const [selectedChildId, setSelectedChildId] = useState<string>(
    children.length > 0 ? children[0].id : ''
  );

  useEffect(() => {
    if (!selectedChildId && children.length > 0) {
      setSelectedChildId(children[0].id);
    }
  }, [children, selectedChildId]);

  const isParent = hasChildren(currentUser);

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
      setObjectives((prev) =>
        prev.map((obj) =>
          obj.id === editingObjective.id
            ? { ...obj, label: selectedSkill, note, targetSessions: parseInt(targetSessions) }
            : obj
        )
      );
    } else {
      const athleteId = isParent && selectedChildId
        ? selectedChildId
        : currentUser?.id;
      const newObjective: AthleteObjective = {
        id: `obj-${Date.now()}`,
        athleteId,
        label: selectedSkill,
        status: 'active',
        updatedAt: new Date().toISOString(),
        note,
        coachName: 'Assigned in sessions',
        progress: 0,
        sessionsCompleted: 0,
        startDate: toDateStr(new Date()),
        targetSessions: parseInt(targetSessions) || 10,
      };
      setObjectives((prev) => [...prev, newObjective]);
    }
    setShowModal(false);
  }, [editingObjective, selectedSkill, note, targetSessions, isParent, selectedChildId, currentUser]);

  const deleteObjective = useCallback((id: string) => {
    Alert.alert('Delete Goal', 'Remove this goal from your list?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => setObjectives((prev) => prev.filter((obj) => obj.id !== id)),
      },
    ]);
  }, []);

  return {
    // Data
    currentUser,
    filteredObjectives,
    children,
    selectedChildId,
    setSelectedChildId,
    isParent,
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
