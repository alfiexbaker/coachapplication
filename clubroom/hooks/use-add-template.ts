/**
 * Hook for the Add Availability Template screen.
 * Manages form state for creating recurring availability slots.
 */

import { useState } from 'react';

import { router } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { availabilityService } from '@/services/availability-service';
import { createLogger } from '@/utils/logger';
import { uiFeedback } from '@/services/ui-feedback';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

const logger = createLogger('AddTemplate');

export const TIME_OPTIONS = [
  '06:00',
  '07:00',
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
];

export const BUFFER_OPTIONS = [0, 10, 15, 30, 45];
export const MAX_SLOTS_OPTIONS = [1, 2, 3, 4, 5];

type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export function useAddTemplate() {
  const { currentUser } = useAuth();

  const [dayOfWeek, setDayOfWeek] = useState<DayIndex>(1);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [maxSlots, setMaxSlots] = useState(1);
  const [bufferMinutes, setBufferMinutes] = useState(15);
  const [saving, setSaving] = useState(false);

  const handleDaySelect = (index: number) => {
    setDayOfWeek(index as DayIndex);
  };

  const handleSave = async () => {
    if (!currentUser?.id) return;
    if (startTime >= endTime) {
      uiFeedback.showToast('End time must be after start time', 'error');
      return;
    }

    const toMinutes = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    setSaving(true);

    return await runAsyncTryCatchFinally(async () => {
      const existingTemplates = await availabilityService.getTemplates(currentUser.id);
      const nextStart = toMinutes(startTime);
      const nextEnd = toMinutes(endTime);
      const overlappingTemplate = existingTemplates.find((template) => {
        if (template.dayOfWeek !== dayOfWeek) return false;
        const existingStart = toMinutes(template.startTime);
        const existingEnd = toMinutes(template.endTime);
        return nextStart < existingEnd && existingStart < nextEnd;
      });

      if (overlappingTemplate) {
        uiFeedback.showToast(`This overlaps with an existing block (${overlappingTemplate.startTime}-${overlappingTemplate.endTime}). Choose a different time or make the blocks adjacent.`);
        return;
      }

      await availabilityService.saveTemplate({
        coachId: currentUser.id,
        dayOfWeek,
        startTime,
        endTime,
        isRecurring: true,
        maxConcurrent: maxSlots,
        bufferMinutes,
      });
      uiFeedback.showToast('Your availability has been updated');
router.back();
      logger.success('TemplateAdded', { dayOfWeek, startTime, endTime });
    }, async error => {
      logger.error('Failed to add template', error);
      uiFeedback.showToast('Failed to add availability template', 'error');
    }, () => {
      setSaving(false);
    });
  };

  return {
    dayOfWeek,
    startTime,
    endTime,
    maxSlots,
    bufferMinutes,
    saving,
    setStartTime,
    setEndTime,
    setMaxSlots,
    setBufferMinutes,
    handleDaySelect,
    handleSave,
  };
}
