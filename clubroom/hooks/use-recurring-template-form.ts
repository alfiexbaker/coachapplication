/**
 * useRecurringTemplateForm — Form state, validation, and handlers for RecurringTemplateModal.
 */
import { useState, useEffect, startTransition } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

import { createLogger } from '@/utils/logger';
import type { AvailabilityTemplate } from '@/constants/types';
import type { SessionTemplate } from '@/constants/session-types';
import { uiFeedback } from '@/services/ui-feedback';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

const logger = createLogger('RecurringTemplateModal');

const COMMON_LOCATIONS = [
  'Hackney Marshes',
  'Victoria Park',
  'London Fields',
  'Indoor Facility',
  'Online Session',
];

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface UseRecurringTemplateFormParams {
  visible: boolean;
  editingTemplate?: AvailabilityTemplate | null;
  preselectedDay?: number;
  preselectedHour?: number;
  onSave: (template: Omit<AvailabilityTemplate, 'id' | 'coachId'>) => Promise<void>;
  onDelete?: (templateId: string) => Promise<void>;
  onClose: () => void;
  onCheckLocationDrift?: (
    dayOfWeek: number,
    newLocation: string,
  ) => Promise<{
    affectedCount: number;
    affectedBookingIds: string[];
    oldLocation: string;
  } | null>;
  onUpdateBookingLocations?: (bookingIds: string[], newLocation: string) => Promise<void>;
}

export function useRecurringTemplateForm({
  visible,
  editingTemplate,
  preselectedDay,
  preselectedHour,
  onSave,
  onDelete,
  onClose,
  onCheckLocationDrift,
  onUpdateBookingLocations,
}: UseRecurringTemplateFormParams) {
  const [selectedDays, setSelectedDays] = useState<number[]>([1]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [location, setLocation] = useState('');
  const [maxConcurrent, setMaxConcurrent] = useState(1);
  const [bufferMinutes, setBufferMinutes] = useState(15);
  const [sessionTemplateId, setSessionTemplateId] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [showLocationInput, setShowLocationInput] = useState(false);

  const isEditing = !!editingTemplate;
  const isQuickAdd = preselectedDay !== undefined && !isEditing;

  useEffect(() => {
    if (!visible) return;
    if (editingTemplate) {
      startTransition(() => {
        setSelectedDays([editingTemplate.dayOfWeek]);
      });
      startTransition(() => {
        setStartTime(editingTemplate.startTime);
      });
      startTransition(() => {
        setEndTime(editingTemplate.endTime);
      });
      startTransition(() => {
        setLocation(editingTemplate.location || '');
      });
      startTransition(() => {
        setMaxConcurrent(editingTemplate.maxConcurrent);
      });
      startTransition(() => {
        setBufferMinutes(editingTemplate.bufferMinutes);
      });
      startTransition(() => {
        setSessionTemplateId(editingTemplate.sessionTemplateId);
      });
      startTransition(() => {
        setShowLocationInput(
          !!editingTemplate.location && !COMMON_LOCATIONS.includes(editingTemplate.location),
        );
      });
    } else {
      if (preselectedDay !== undefined) {
        startTransition(() => {
          setSelectedDays([preselectedDay]);
        });
      } else {
        startTransition(() => {
          setSelectedDays([1]);
        });
      }
      if (preselectedHour !== undefined) {
        startTransition(() => {
          setStartTime(`${preselectedHour.toString().padStart(2, '0')}:00`);
        });
        const endHour = Math.min(preselectedHour + 2, 20);
        startTransition(() => {
          setEndTime(`${endHour.toString().padStart(2, '0')}:00`);
        });
      } else {
        startTransition(() => {
          setStartTime('09:00');
        });
        startTransition(() => {
          setEndTime('17:00');
        });
      }
      startTransition(() => {
        setLocation('');
      });
      startTransition(() => {
        setMaxConcurrent(1);
      });
      startTransition(() => {
        setBufferMinutes(15);
      });
      startTransition(() => {
        setSessionTemplateId(undefined);
      });
      startTransition(() => {
        setShowLocationInput(false);
      });
    }
  }, [editingTemplate, preselectedDay, preselectedHour, visible]);

  const toggleDay = (dayIndex: number) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedDays((prev) => {
      if (prev.includes(dayIndex)) {
        if (prev.length === 1) return prev;
        return prev.filter((d) => d !== dayIndex);
      }
      return [...prev, dayIndex].sort((a, b) => a - b);
    });
  };

  const applyPreset = (days: number[]) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedDays(days);
  };

  const calculateDuration = () => {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const durationMinutes = endH * 60 + endM - (startH * 60 + startM);
    if (durationMinutes <= 0) return null;
    const hours = Math.floor(durationMinutes / 60);
    const mins = durationMinutes % 60;
    if (mins === 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
    return `${hours}h ${mins}m`;
  };

  const handleStartTimeChange = (newTime: string) => {
    setStartTime(newTime);
    const [newStartH, newStartM] = newTime.split(':').map(Number);
    const [currentEndH, currentEndM] = endTime.split(':').map(Number);
    const newStartMins = newStartH * 60 + newStartM;
    const currentEndMins = currentEndH * 60 + currentEndM;
    if (currentEndMins <= newStartMins) {
      const newEndMins = Math.min(newStartMins + 120, 20 * 60);
      const endH = Math.floor(newEndMins / 60);
      const endM = newEndMins % 60;
      setEndTime(`${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`);
    }
  };

  const doSaveAll = async () => {
    setSaving(true);

    await runAsyncTryCatchFinally(
      async () => {
        await Promise.all(
          selectedDays.map((dayOfWeek) =>
            onSave({
              dayOfWeek: dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6,
              startTime,
              endTime,
              isRecurring: true,
              maxConcurrent,
              bufferMinutes,
              location: location || undefined,
              sessionTemplateId,
            }),
          ),
        );
        if (Platform.OS !== 'web')
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onClose();
      },
      async (error) => {
        logger.error('Failed to save template:', error);
        uiFeedback.showToast('Failed to save availability. Please try again.', 'error');
      },
      () => {
        setSaving(false);
      },
    );
  };

  const handleSave = async () => {
    if (selectedDays.length === 0) {
      uiFeedback.showToast('Please select at least one day');
      return;
    }
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    if (endHour * 60 + endMin <= startHour * 60 + startMin) {
      uiFeedback.showToast('End time must be after start time', 'error');
      return;
    }

    const newLocation = location || undefined;
    const locationChanged =
      isEditing &&
      editingTemplate &&
      (editingTemplate.location || '') !== (location || '') &&
      newLocation;

    if (locationChanged && onCheckLocationDrift) {
      const drift = await onCheckLocationDrift(editingTemplate!.dayOfWeek, newLocation!);
      if (drift && drift.affectedCount > 0) {
        void (async () => {
          const selected = await uiFeedback.choose({
            title: 'Location Changed',
            message: `You have ${drift.affectedCount} upcoming booking${drift.affectedCount !== 1 ? 's' : ''} at ${drift.oldLocation} on ${DAYS[editingTemplate!.dayOfWeek]}s. Change them to ${newLocation}?`,
            options: [
              { id: 'keep_original', label: 'Keep Original' },
              { id: 'update_all', label: 'Update All' },
            ],
            cancelText: 'Cancel',
          });

          if (selected === 'keep_original') {
            await doSaveAll();
            return;
          }
          if (selected === 'update_all') {
            if (onUpdateBookingLocations) {
              await onUpdateBookingLocations(drift.affectedBookingIds, newLocation!);
            }
            await doSaveAll();
          }
        })();
        return;
      }
    }
    await doSaveAll();
  };

  const handleDelete = async () => {
    if (!editingTemplate || !onDelete) return;
    uiFeedback.alert('Delete Slot', 'Are you sure you want to delete this availability slot?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setSaving(true);

          await runAsyncTryCatchFinally(
            async () => {
              await onDelete(editingTemplate.id);
              if (Platform.OS !== 'web')
                void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              onClose();
            },
            async (error) => {
              logger.error('Failed to delete template:', error);
            },
            () => {
              setSaving(false);
            },
          );
        },
      },
    ]);
  };

  const selectLocation = (loc: string) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLocation((prev) => (prev === loc ? '' : loc));
    setShowLocationInput(false);
  };

  const openCustomLocation = () => {
    setShowLocationInput(true);
    setLocation('');
  };

  const selectSessionTemplate = (id: string | undefined) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSessionTemplateId(id);
  };

  const selectMaxConcurrent = (value: number) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMaxConcurrent(value);
  };

  const selectBufferMinutes = (mins: number) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBufferMinutes(mins);
  };

  return {
    selectedDays,
    startTime,
    endTime,
    location,
    setLocation,
    maxConcurrent,
    bufferMinutes,
    sessionTemplateId,
    saving,
    showLocationInput,
    isEditing,
    isQuickAdd,
    duration: calculateDuration(),
    toggleDay,
    applyPreset,
    handleStartTimeChange,
    setEndTime,
    handleSave,
    handleDelete,
    selectLocation,
    openCustomLocation,
    selectSessionTemplate,
    selectMaxConcurrent,
    selectBufferMinutes,
  };
}

export { COMMON_LOCATIONS, DAYS };
export const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const QUICK_PRESETS = [
  { id: 'weekdays', label: 'Weekdays', days: [1, 2, 3, 4, 5], icon: 'briefcase-outline' },
  { id: 'weekends', label: 'Weekends', days: [0, 6], icon: 'sunny-outline' },
  { id: 'mwf', label: 'Mon/Wed/Fri', days: [1, 3, 5], icon: 'calendar-outline' },
  { id: 'tth', label: 'Tue/Thu', days: [2, 4], icon: 'calendar-outline' },
];
