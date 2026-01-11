import { View, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { GroupRegistration } from '@/constants/types';

const SWIPE_THRESHOLD = 80;

interface ParticipantCardProps {
  registration: GroupRegistration;
  onMarkAttendance?: (attended: boolean) => void;
  onCancel?: () => void;
  onMessage?: () => void;
  selectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  onLongPress?: () => void;
  enableSwipe?: boolean;
}

export function ParticipantCard({
  registration,
  onMarkAttendance,
  onCancel,
  onMessage,
  selectionMode = false,
  isSelected = false,
  onSelect,
  onLongPress,
  enableSwipe = true,
}: ParticipantCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  // Swipe animation values
  const translateX = useSharedValue(0);
  const swipeTriggered = useSharedValue(false);

  const statusColors: Record<GroupRegistration['status'], { bg: string; text: string }> = {
    REGISTERED: { bg: `${palette.success}15`, text: palette.success },
    WAITLISTED: { bg: `${palette.warning}15`, text: palette.warning },
    CANCELLED: { bg: `${palette.error}15`, text: palette.error },
    ATTENDED: { bg: `${palette.tint}15`, text: palette.tint },
    NO_SHOW: { bg: `${palette.muted}15`, text: palette.muted },
  };

  const statusLabels: Record<GroupRegistration['status'], string> = {
    REGISTERED: 'Registered',
    WAITLISTED: 'Waitlisted',
    CANCELLED: 'Cancelled',
    ATTENDED: 'Attended',
    NO_SHOW: 'No Show',
  };

  const colors = statusColors[registration.status] || statusColors.REGISTERED;
  const isAttended = registration.status === 'ATTENDED';
  const isWaitlisted = registration.status === 'WAITLISTED';

  // Haptic feedback helper
  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      // Haptics not available
    }
  };

  // Swipe gesture handler
  const panGesture = Gesture.Pan()
    .enabled(enableSwipe && !selectionMode && !isWaitlisted && !!onMarkAttendance)
    .activeOffsetX([-20, 20])
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      // Clamp translation
      translateX.value = Math.max(-120, Math.min(120, event.translationX));

      // Trigger haptic when crossing threshold
      if (Math.abs(translateX.value) >= SWIPE_THRESHOLD && !swipeTriggered.value) {
        swipeTriggered.value = true;
        runOnJS(triggerHaptic)();
      } else if (Math.abs(translateX.value) < SWIPE_THRESHOLD) {
        swipeTriggered.value = false;
      }
    })
    .onEnd((event) => {
      if (event.translationX >= SWIPE_THRESHOLD && onMarkAttendance) {
        // Swipe right - mark present
        runOnJS(onMarkAttendance)(true);
      } else if (event.translationX <= -SWIPE_THRESHOLD && onMarkAttendance) {
        // Swipe left - mark absent
        runOnJS(onMarkAttendance)(false);
      }

      // Reset position
      translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
      swipeTriggered.value = false;
    });

  // Long press gesture for selection mode
  const longPressGesture = Gesture.LongPress()
    .enabled(!!onLongPress)
    .minDuration(500)
    .onEnd(() => {
      if (onLongPress) {
        runOnJS(triggerHaptic)();
        runOnJS(onLongPress)();
      }
    });

  // Tap gesture for selection
  const tapGesture = Gesture.Tap()
    .enabled(selectionMode && !!onSelect)
    .onEnd(() => {
      if (onSelect) {
        runOnJS(triggerHaptic)();
        runOnJS(onSelect)();
      }
    });

  // Compose gestures
  const composedGesture = Gesture.Race(
    selectionMode ? tapGesture : Gesture.Simultaneous(panGesture, longPressGesture)
  );

  // Animated styles
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Background indicator styles
  const leftIndicatorStyle = useAnimatedStyle(() => ({
    opacity: translateX.value > 20 ? withTiming(1) : withTiming(0),
  }));

  const rightIndicatorStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < -20 ? withTiming(1) : withTiming(0),
  }));

  const cardContent = (
    <>
      <View style={styles.main}>
        {selectionMode && (
          <View style={styles.checkboxContainer}>
            <View
              style={[
                styles.checkbox,
                {
                  backgroundColor: isSelected ? palette.tint : 'transparent',
                  borderColor: isSelected ? palette.tint : palette.border,
                },
              ]}
            >
              {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
          </View>
        )}

        <View style={[styles.avatar, { backgroundColor: palette.border }]}>
          <ThemedText style={styles.avatarText}>
            {registration.athleteName.slice(0, 2).toUpperCase()}
          </ThemedText>
        </View>

        <View style={styles.info}>
          <View style={styles.nameRow}>
            <ThemedText type="defaultSemiBold">{registration.athleteName}</ThemedText>
            {registration.isWalkIn && (
              <View style={[styles.walkInBadge, { backgroundColor: `${palette.warning}20` }]}>
                <ThemedText style={[styles.walkInText, { color: palette.warning }]}>
                  Walk-in
                </ThemedText>
              </View>
            )}
          </View>
          {registration.parentName ? (
            <ThemedText style={[styles.parentName, { color: palette.muted }]}>
              Parent: {registration.parentName}
            </ThemedText>
          ) : null}
          <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
            <ThemedText style={[styles.statusText, { color: colors.text }]}>
              {statusLabels[registration.status]}
            </ThemedText>
          </View>
        </View>
      </View>

      {!selectionMode && (
        <View style={styles.actions}>
          {!isWaitlisted && onMarkAttendance && (
            <Clickable
              onPress={() => onMarkAttendance(!isAttended)}
              style={[
                styles.actionButton,
                {
                  backgroundColor: isAttended ? palette.success : palette.surface,
                  borderColor: isAttended ? palette.success : palette.border,
                },
              ]}
            >
              <Ionicons
                name={isAttended ? 'checkmark-circle' : 'checkmark-circle-outline'}
                size={18}
                color={isAttended ? '#fff' : palette.success}
              />
            </Clickable>
          )}

          {onMessage && (
            <Clickable
              onPress={onMessage}
              style={[styles.actionButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
            >
              <Ionicons name="chatbubble-outline" size={16} color={palette.tint} />
            </Clickable>
          )}

          {onCancel && (
            <Clickable
              onPress={onCancel}
              style={[styles.actionButton, { backgroundColor: palette.surface, borderColor: palette.border }]}
            >
              <Ionicons name="close" size={18} color={palette.error} />
            </Clickable>
          )}
        </View>
      )}

      {registration.notes && (
        <View style={[styles.notesSection, { borderTopColor: palette.border }]}>
          <Ionicons name="document-text-outline" size={14} color={palette.muted} />
          <ThemedText style={[styles.notesText, { color: palette.muted }]}>
            {registration.notes}
          </ThemedText>
        </View>
      )}
    </>
  );

  // If swipe is not enabled or in selection mode, render simpler version
  if (!enableSwipe || selectionMode || isWaitlisted) {
    return (
      <GestureDetector gesture={composedGesture}>
        <Animated.View>
          <SurfaceCard
            style={[
              styles.card,
              isSelected && { borderColor: palette.tint, borderWidth: 2 },
            ]}
          >
            {cardContent}
          </SurfaceCard>
        </Animated.View>
      </GestureDetector>
    );
  }

  return (
    <View style={styles.swipeContainer}>
      {/* Background indicators */}
      <Animated.View style={[styles.swipeIndicator, styles.leftIndicator, { backgroundColor: palette.success }, leftIndicatorStyle]}>
        <Ionicons name="checkmark-circle" size={24} color="#fff" />
        <ThemedText style={styles.indicatorText}>Present</ThemedText>
      </Animated.View>
      <Animated.View style={[styles.swipeIndicator, styles.rightIndicator, { backgroundColor: palette.error }, rightIndicatorStyle]}>
        <ThemedText style={styles.indicatorText}>Absent</ThemedText>
        <Ionicons name="close-circle" size={24} color="#fff" />
      </Animated.View>

      {/* Swipeable card */}
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={cardAnimatedStyle}>
          <SurfaceCard style={styles.card}>
            {cardContent}
          </SurfaceCard>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 0,
  },
  swipeContainer: {
    position: 'relative',
  },
  swipeIndicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: Radii.md,
  },
  leftIndicator: {
    left: 0,
  },
  rightIndicator: {
    right: 0,
  },
  indicatorText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  main: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  checkboxContainer: {
    paddingRight: Spacing.xs,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  walkInBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  walkInText: {
    fontSize: 10,
    fontWeight: '600',
  },
  parentName: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.sm,
    marginTop: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  notesSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  notesText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
});
