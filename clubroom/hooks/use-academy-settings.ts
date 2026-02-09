/**
 * Hook: useAcademySettings
 *
 * Manages academy settings state: load academy, form, save, membership check.
 * Used by app/academy/[id]/settings.tsx
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { useAuth } from '@/hooks/use-auth';
import { academyService } from '@/services/academy-service';
import { createLogger } from '@/utils/logger';
import type { Academy, AcademyMembership } from '@/constants/types';

const logger = createLogger('useAcademySettings');

export function useAcademySettings(id: string | undefined) {
  const { currentUser } = useAuth();

  const [academy, setAcademy] = useState<Academy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userMembership, setUserMembership] = useState<AcademyMembership | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [requiresApproval, setRequiresApproval] = useState(false);

  const isOwner = userMembership?.role === 'OWNER';

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [academyData, staffData] = await Promise.all([
        academyService.getAcademy(id),
        academyService.getStaff(id),
      ]);
      setAcademy(academyData);
      if (academyData) {
        setName(academyData.name);
        setDescription(academyData.description);
        setIsPublic(academyData.isPublic);
        setRequiresApproval(academyData.requiresApproval);
      }
      if (currentUser?.id) {
        const membership = staffData.find((m) => m.userId === currentUser.id);
        setUserMembership(membership || null);
      }
    } catch (error) {
      logger.error('Failed to load academy:', error);
    } finally {
      setLoading(false);
    }
  }, [id, currentUser?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = useCallback(async () => {
    if (!academy) return;
    setSaving(true);
    try {
      await academyService.updateSettings(academy.id, { name, description, isPublic, requiresApproval });
      Alert.alert('Success', 'Settings saved successfully');
      router.back();
    } catch (error) {
      logger.error('Failed to save settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }, [academy, name, description, isPublic, requiresApproval]);

  const navigateToBranding = useCallback(() => {
    if (id) router.push(Routes.academyBranding(id));
  }, [id]);

  const navigateToStaff = useCallback(() => {
    if (id) router.push(Routes.academyStaff(id));
  }, [id]);

  const handleDeleteAcademy = useCallback(() => {
    Alert.alert('Coming Soon', 'This feature is not yet available');
  }, []);

  return {
    academy, loading, saving, isOwner,
    name, description, isPublic, requiresApproval,
    setName, setDescription, setIsPublic, setRequiresApproval,
    handleSave, navigateToBranding, navigateToStaff, handleDeleteAcademy,
  };
}
