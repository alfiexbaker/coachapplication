/**
 * Hook: useEditTemplate
 *
 * Manages edit availability template state: load, save, delete template.
 * Used by app/availability/edit-template.tsx
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';

import { useAuth } from '@/hooks/use-auth';
import { useScreen } from '@/hooks/use-screen';
import { availabilityService } from '@/services/availability-service';
import type { AvailabilityTemplate } from '@/constants/types';
import { createLogger } from '@/utils/logger';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('useEditTemplate');

export const TIME_OPTIONS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00',
];

export const BUFFER_OPTIONS = [0, 10, 15, 30, 45];
export const MAX_SLOTS_OPTIONS = [1, 2, 3, 4, 5];

export function useEditTemplate(id: string | undefined) {
  const { currentUser } = useAuth();

  const [saving, setSaving] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState<0 | 1 | 2 | 3 | 4 | 5 | 6>(1);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [maxSlots, setMaxSlots] = useState(1);
  const [bufferMinutes, setBufferMinutes] = useState(15);

  const loadTemplate = useCallback(async () => {
    if (!id || !currentUser?.id) {
      return ok<AvailabilityTemplate | null>(null);
    }
    try {
      const templates = await availabilityService.getTemplates(currentUser.id);
      const found = templates.find(t => t.id === id);
      return ok<AvailabilityTemplate | null>(found ?? null);
    } catch (error) {
      logger.error('Failed to load template', error);
      return err(serviceError('UNKNOWN', 'Failed to load availability template.', error));
    }
  }, [id, currentUser?.id]);

  const {
    data: template,
    status,
    error,
    refreshing,
    onRefresh,
    retry,
  } = useScreen<AvailabilityTemplate | null>({
    load: loadTemplate,
    deps: [id, currentUser?.id],
    isEmpty: (value) => value === null,
    refetchOnFocus: true,
  });

  useEffect(() => {
    if (!template) return;
    setDayOfWeek(template.dayOfWeek);
    setStartTime(template.startTime);
    setEndTime(template.endTime);
    setMaxSlots(template.maxConcurrent);
    setBufferMinutes(template.bufferMinutes);
  }, [template?.id]);

  const handleSave = useCallback(async () => {
    if (!currentUser?.id || !template) return;
    if (startTime >= endTime) {
      Alert.alert('Invalid Time', 'End time must be after start time');
      return;
    }
    setSaving(true);
    try {
      await availabilityService.saveTemplate({
        id: template.id, coachId: template.coachId,
        dayOfWeek, startTime, endTime, isRecurring: true,
        maxConcurrent: maxSlots, bufferMinutes,
      });
      Alert.alert('Template Updated', 'Your availability has been updated', [
        { text: 'OK', onPress: () => router.back() },
      ]);
      logger.success('TemplateUpdated', { templateId: template.id });
    } catch (error) {
      logger.error('Failed to update template', error);
      Alert.alert('Error', 'Failed to update template');
    } finally {
      setSaving(false);
    }
  }, [currentUser?.id, template, dayOfWeek, startTime, endTime, maxSlots, bufferMinutes]);

  const handleDelete = useCallback(() => {
    if (!template) return;
    Alert.alert('Delete Template', 'Are you sure you want to delete this availability slot?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await availabilityService.deleteTemplate(template.id);
            Alert.alert('Deleted', 'Template removed');
            router.back();
          } catch {
            Alert.alert('Error', 'Failed to delete template');
          }
        },
      },
    ]);
  }, [template]);

  return {
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    loading: status === 'loading',
    refreshing,
    onRefresh,
    retry,
    saving,
    template: template ?? null,
    dayOfWeek, startTime, endTime, maxSlots, bufferMinutes,
    setDayOfWeek, setStartTime, setEndTime, setMaxSlots, setBufferMinutes,
    handleSave, handleDelete,
  };
}
