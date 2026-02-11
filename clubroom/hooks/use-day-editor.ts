/**
 * useDayEditor — State, effects, validation, and handlers for DayEditorSheet.
 */
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { PanResponder, Dimensions, Platform } from 'react-native';
import { useSharedValue, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import type { AvailabilityTemplate, AvailabilityOverride, CoachVenue } from '@/constants/types';
import type { DayEditorScope } from '@/components/coach/day-editor-sheet';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
export const SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.7;

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
  onDeleteTemplate,
  onAddVenue,
}: UseDayEditorParams) {
  const dayName = DAYS_FULL[dayOfWeek];

  const [scope, setScope] = useState<DayEditorScope>(defaultScope ?? 'recurring');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [location, setLocation] = useState<string>('');
  const [showAddVenueInput, setShowAddVenueInput] = useState(false);
  const [newVenueLabel, setNewVenueLabel] = useState('');

  // Animation
  const slideAnim = useSharedValue(SCREEN_HEIGHT);
  const overlayOpacity = useSharedValue(0);

  // Sync form state
  useEffect(() => {
    if (!visible) return;
    setScope(defaultScope ?? 'recurring');

    if (template) {
      setStartTime(template.startTime);
      setEndTime(template.endTime);
      setLocation(template.location ?? '');
    } else if (existingOverride?.customSlots?.length) {
      const slot = existingOverride.customSlots[0];
      setStartTime(slot.startTime);
      setEndTime(slot.endTime);
      setLocation(slot.location ?? '');
    } else if (existingTemplatesForDay && existingTemplatesForDay.length > 0) {
      const sorted = [...existingTemplatesForDay].sort((a, b) =>
        a.endTime.localeCompare(b.endTime),
      );
      const lastEnd = sorted[sorted.length - 1].endTime;
      const lastEndMins = timeToMinutes(lastEnd);
      const smartStart = Math.min(lastEndMins + 15, 23 * 60 + 45);
      const smartEnd = Math.min(smartStart + 120, 24 * 60);
      setStartTime(minutesToTime(smartStart));
      setEndTime(minutesToTime(smartEnd));
      setLocation('');
    } else {
      setStartTime('09:00');
      setEndTime('17:00');
      setLocation('');
    }
    setShowAddVenueInput(false);
    setNewVenueLabel('');
  }, [visible, template, existingOverride, existingTemplatesForDay, defaultScope]);

  // Animate in/out
  useEffect(() => {
    if (visible) {
      slideAnim.value = withSpring(0, { damping: 20, stiffness: 200 });
      overlayOpacity.value = withTiming(1, { duration: 200 });
    } else {
      slideAnim.value = withSpring(SCREEN_HEIGHT, { damping: 20, stiffness: 200 });
      overlayOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [visible, slideAnim, overlayOpacity]);

  // Pan responder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 5,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) slideAnim.value = gesture.dy;
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 80) {
          slideAnim.value = withSpring(SCREEN_HEIGHT, { damping: 20, stiffness: 200 });
          overlayOpacity.value = withTiming(0, { duration: 150 }, (finished) => {
            if (finished) runOnJS(onClose)();
          });
        } else {
          slideAnim.value = withSpring(0, { damping: 20, stiffness: 200 });
        }
      },
    }),
  ).current;

  const isValid = useMemo(() => {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    return endH * 60 + endM > startH * 60 + startM;
  }, [startTime, endTime]);

  const overlapWarning = useMemo(() => {
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
  }, [startTime, endTime, existingTemplatesForDay, template]);

  const isNewTimeBlock = !template && (existingTemplatesForDay?.length ?? 0) > 0;

  const durationLabel = useMemo(() => {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const mins = endH * 60 + endM - (startH * 60 + startM);
    if (mins <= 0) return null;
    const hours = Math.floor(mins / 60);
    const remainder = mins % 60;
    return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
  }, [startTime, endTime]);

  const formattedDate = useMemo(() => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  }, [dateStr]);

  const saveLabel = useMemo(() => {
    return scope === 'recurring' ? `Save for Every ${dayName}` : `Save for This ${dayName}`;
  }, [scope, dayName]);

  const handleStartTimeChange = useCallback(
    (newTime: string) => {
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
    },
    [endTime],
  );

  const handleSave = useCallback(() => {
    if (!isValid) return;
    if (Platform.OS !== 'web')
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const loc = location || undefined;
    if (scope === 'recurring') {
      onSaveRecurring({ dayOfWeek, startTime, endTime, location: loc });
    } else if (scope === 'just-this-date' && dateStr) {
      onSaveOverride({ date: dateStr, startTime, endTime, location: loc });
    }
  }, [
    isValid,
    scope,
    dayOfWeek,
    startTime,
    endTime,
    location,
    dateStr,
    onSaveRecurring,
    onSaveOverride,
  ]);

  const handleDelete = useCallback(() => {
    if (!template || !onDeleteTemplate) return;
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDeleteTemplate(template.id);
  }, [template, onDeleteTemplate]);

  const handleAddVenue = useCallback(() => {
    if (!newVenueLabel.trim() || !onAddVenue) return;
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAddVenue(newVenueLabel.trim());
    setLocation(newVenueLabel.trim());
    setNewVenueLabel('');
    setShowAddVenueInput(false);
  }, [newVenueLabel, onAddVenue]);

  const handleScopeChange = useCallback((newScope: DayEditorScope) => {
    if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setScope(newScope);
  }, []);

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
