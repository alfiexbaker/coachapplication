/**
 * useDayEditor — State, effects, validation, and handlers for DayEditorSheet.
 */
import { useState, useEffect, useRef, startTransition } from 'react';
import { PanResponder, Platform, useWindowDimensions } from 'react-native';
import { useSharedValue, withTiming, runOnJS } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import type { AvailabilityTemplate, AvailabilityOverride } from '@/constants/types';
import type { DayEditorScope } from '@/components/coach/day-editor-sheet';

export const SHEET_FOOTER_HEIGHT = 108;

export const DAYS_FULL = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

interface UseDayEditorParams {
  visible: boolean;
  onClose: () => void;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  dateStr?: string;
  template?: AvailabilityTemplate | null;
  existingOverride?: AvailabilityOverride | null;
  existingTemplatesForDay?: AvailabilityTemplate[];
  defaultScope?: DayEditorScope;
  onSaveRecurring: (data: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    location?: string;
  }) => void;
  onSaveOverride: (data: {
    date: string;
    startTime: string;
    endTime: string;
    location?: string;
  }) => void;
  onSaveRepeatedOverride: (data: {
    date: string;
    startTime: string;
    endTime: string;
    location?: string;
    repeatWeeks: number;
  }) => void;
  onDeleteTemplate?: (templateId: string) => void;
  onAddVenue?: (label: string) => void;
}

export function useDayEditor({
  visible,
  onClose,
  dayOfWeek,
  dateStr,
  template,
  existingOverride,
  existingTemplatesForDay,
  defaultScope,
  onSaveRecurring,
  onSaveOverride,
  onSaveRepeatedOverride,
  onDeleteTemplate,
  onAddVenue,
}: UseDayEditorParams) {
  const { height } = useWindowDimensions();
  const dayName = DAYS_FULL[dayOfWeek];

  const [scope, setScope] = useState<DayEditorScope>(defaultScope ?? 'recurring');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [location, setLocation] = useState<string>('');
  const [showAddVenueInput, setShowAddVenueInput] = useState(false);
  const [newVenueLabel, setNewVenueLabel] = useState('');
  const [repeatWeeks, setRepeatWeeks] = useState(4);

  // Animation
  const slideAnim = useSharedValue(height);
  const overlayOpacity = useSharedValue(0);

  // Sync form state
  useEffect(() => {
    if (!visible) return;
    startTransition(() => {
      setScope(defaultScope ?? 'recurring');
    });

    if (template) {
      startTransition(() => {
        setStartTime(template.startTime);
      });
      startTransition(() => {
        setEndTime(template.endTime);
      });
      startTransition(() => {
        setLocation(template.location ?? '');
      });
    } else if (existingOverride?.customSlots?.length) {
      const slot = existingOverride.customSlots[0];
      startTransition(() => {
        setStartTime(slot.startTime);
      });
      startTransition(() => {
        setEndTime(slot.endTime);
      });
      startTransition(() => {
        setLocation(slot.location ?? '');
      });
    } else if (existingTemplatesForDay && existingTemplatesForDay.length > 0) {
      const sorted = Array.from(existingTemplatesForDay).toSorted((a, b) =>
        a.endTime.localeCompare(b.endTime),
      );
      const lastEnd = sorted[sorted.length - 1].endTime;
      const lastEndMins = timeToMinutes(lastEnd);
      const smartStart = Math.min(lastEndMins + 15, 23 * 60 + 45);
      const smartEnd = Math.min(smartStart + 120, 24 * 60);
      startTransition(() => {
        setStartTime(minutesToTime(smartStart));
      });
      startTransition(() => {
        setEndTime(minutesToTime(smartEnd));
      });
      startTransition(() => {
        setLocation('');
      });
    } else {
      startTransition(() => {
        setStartTime('09:00');
      });
      startTransition(() => {
        setEndTime('17:00');
      });
      startTransition(() => {
        setLocation('');
      });
    }
    startTransition(() => {
      setShowAddVenueInput(false);
    });
    startTransition(() => {
      setNewVenueLabel('');
    });
    startTransition(() => {
      setRepeatWeeks(4);
    });
  }, [visible, template, existingOverride, existingTemplatesForDay, defaultScope]);

  // Animate in/out
  useEffect(() => {
    if (visible) {
      slideAnim.set(withTiming(0, { duration: 300 }));
      overlayOpacity.set(withTiming(1, { duration: 200 }));
    } else {
      slideAnim.set(withTiming(height, { duration: 250 }));
      overlayOpacity.set(withTiming(0, { duration: 150 }));
    }
  }, [height, visible, slideAnim, overlayOpacity]);

  // Pan responder
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 5,
    onPanResponderMove: (_, gesture) => {
      if (gesture.dy > 0) slideAnim.set(gesture.dy);
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy > 80) {
        slideAnim.set(withTiming(height, { duration: 250 }));
        overlayOpacity.set(
          withTiming(0, { duration: 150 }, (finished) => {
            if (finished) runOnJS(onClose)();
          }),
        );
      } else {
        slideAnim.set(withTiming(0, { duration: 200 }));
      }
    },
  });

  const isValid = (() => {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    return endH * 60 + endM > startH * 60 + startM;
  })();

  const overlapWarning = (() => {
    if (!existingTemplatesForDay || existingTemplatesForDay.length === 0) return null;
    const currentStart = timeToMinutes(startTime);
    const currentEnd = timeToMinutes(endTime);
    if (currentEnd <= currentStart) return null;
    const siblings = template
      ? existingTemplatesForDay.filter((t) => t.id !== template.id)
      : existingTemplatesForDay;
    for (const sibling of siblings) {
      const sibStart = timeToMinutes(sibling.startTime);
      const sibEnd = timeToMinutes(sibling.endTime);
      if (rangesOverlap(currentStart, currentEnd, sibStart, sibEnd)) {
        return `Overlaps with ${sibling.startTime} - ${sibling.endTime}${sibling.location ? ` (${sibling.location})` : ''}`;
      }
    }
    return null;
  })();

  const isNewTimeBlock = !template && (existingTemplatesForDay?.length ?? 0) > 0;

  const durationLabel = (() => {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const mins = endH * 60 + endM - (startH * 60 + startM);
    if (mins <= 0) return null;
    const hours = Math.floor(mins / 60);
    const remainder = mins % 60;
    return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
  })();

  const formattedDate = (() => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  })();

  const saveLabel = (() => {
    if (scope === 'recurring') {
      return `Save for Every ${dayName}`;
    }
    if (scope === 'next-n-weeks') {
      return `Save for ${repeatWeeks} Weeks`;
    }
    return `Save for This ${dayName}`;
  })();

  const handleStartTimeChange = (newTime: string) => {
    setStartTime(newTime);
    const [newStartH, newStartM] = newTime.split(':').map(Number);
    const [currentEndH, currentEndM] = endTime.split(':').map(Number);
    const newStartMins = newStartH * 60 + newStartM;
    const currentEndMins = currentEndH * 60 + currentEndM;
    if (currentEndMins <= newStartMins) {
      const newEndMins = Math.min(newStartMins + 120, 20 * 60);
      const h = Math.floor(newEndMins / 60);
      const m = newEndMins % 60;
      setEndTime(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
    }
  };

  const handleSave = () => {
    if (!isValid) return;
    if (Platform.OS !== 'web')
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const loc = location || undefined;
    if (scope === 'recurring') {
      onSaveRecurring({ dayOfWeek, startTime, endTime, location: loc });
    } else if (scope === 'just-this-date' && dateStr) {
      onSaveOverride({ date: dateStr, startTime, endTime, location: loc });
    } else if (scope === 'next-n-weeks' && dateStr) {
      onSaveRepeatedOverride({
        date: dateStr,
        startTime,
        endTime,
        location: loc,
        repeatWeeks,
      });
    }
  };

  const handleDelete = () => {
    if (!template || !onDeleteTemplate) return;
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDeleteTemplate(template.id);
  };

  const handleAddVenue = (labelOverride?: string) => {
    const nextLabel = (labelOverride ?? newVenueLabel).trim();
    if (!nextLabel || !onAddVenue) return;
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAddVenue(nextLabel);
    setLocation(nextLabel);
    setNewVenueLabel('');
    setShowAddVenueInput(false);
  };

  const handleScopeChange = (newScope: DayEditorScope) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setScope(newScope);
  };

  return {
    dayName,
    scope,
    startTime,
    endTime,
    location,
    setLocation,
    showAddVenueInput,
    setShowAddVenueInput,
    newVenueLabel,
    setNewVenueLabel,
    repeatWeeks,
    setRepeatWeeks,
    slideAnim,
    overlayOpacity,
    panResponder,
    isValid,
    overlapWarning,
    isNewTimeBlock,
    durationLabel,
    formattedDate,
    saveLabel,
    handleStartTimeChange,
    setEndTime,
    handleSave,
    handleDelete,
    handleAddVenue,
    handleScopeChange,
  };
}
