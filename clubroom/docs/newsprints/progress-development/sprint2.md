# Progress & Development Sprint 2: Polish & UX

**Sprint Goal**: Add interactivity, feedback, and polish to progress tracking features. These are all "it works but feels incomplete" issues that reduce user engagement.

**Items**: 9 (177, 178, 179, 180, 181, 182, 183, 184, 231)

---

## Item 177: Attendance Heatmap Cells View-Only

**Problem**: Heatmap cells show attendance but have no interaction or detail view.

**Files**: `components/progress/attendance-heatmap.tsx` lines ~61-83

**Current behavior**: Static grid with no tap handling.

**Prompt**:
```
Add interactivity to attendance heatmap in components/progress/attendance-heatmap.tsx.

Current cells (lines 61-83) are non-interactive. Add tooltip/modal on tap:

import { Pressable, Modal } from 'react-native';
import { useState } from 'react';
import { ThemedText } from '@/components/primitives';
// NOTE: No shared modal component exists in this codebase. Use raw RN Modal.

// Inside component
const [selectedDate, setSelectedDate] = useState<string | null>(null);
const [modalVisible, setModalVisible] = useState(false);

// Replace View with Pressable for each cell
<Pressable
  key={`${week}-${day}`}
  onPress={() => {
    if (attendance > 0) {
      setSelectedDate(cellDate);
      setModalVisible(true);
    }
  }}
  style={({ pressed }) => ({
    width: cellSize,
    height: cellSize,
    backgroundColor: getCellColor(attendance),
    borderRadius: Spacing.xxs,
    opacity: pressed ? 0.7 : 1,
  })}
  accessibilityLabel={`${cellDate}: ${attendance} sessions`}
  accessibilityRole="button"
/>

// Add detail modal (raw RN Modal — no shared modal component in this codebase)
<Modal
  visible={modalVisible}
  transparent
  animationType="fade"
  onRequestClose={() => setModalVisible(false)}
>
  <Pressable
    style={{ flex: 1, backgroundColor: withAlpha(colors.background.base, 0.9) }}
    onPress={() => setModalVisible(false)}
  >
    <Center style={{ flex: 1 }}>
      <SurfaceCard style={{ padding: Spacing.md, minWidth: 280 }}>
        <ThemedText variant="heading" style={{ marginBottom: Spacing.sm }}>
          {formatDate(selectedDate)}
        </ThemedText>
        {getSessionsForDate(selectedDate).map(session => (
          <Row key={session.id} style={{ marginBottom: Spacing.xs }}>
            <ThemedText variant="body">{session.title}</ThemedText>
            <Spacer />
            <ThemedText variant="bodySmall" color="secondary">
              {session.duration}min
            </ThemedText>
          </Row>
        ))}
        <Button
          variant="secondary"
          onPress={() => setModalVisible(false)}
          style={{ marginTop: Spacing.sm }}
        >
          Close
        </Button>
      </SurfaceCard>
    </Center>
  </Pressable>
</Modal>

Add getSessionsForDate helper to fetch actual session details.

Acceptance criteria:
✓ Tapping cell shows session details for that date
✓ Modal shows all sessions from that day
✓ Empty dates don't open modal (attendance = 0)
✓ Modal dismisses on backdrop tap
✓ Visual feedback on cell press (opacity change)
✓ Uses theme colors and spacing tokens
✓ Accessible labels for screen readers
```

---

## Item 178: Session Timeline "3 Areas Improved" No Drill-Down

**Problem**: Shows "3 areas improved" but can't see which areas or details.

**Files**: `components/progress/session-timeline-card.tsx` lines ~32-53

**Current behavior**: Summary text only, no expansion or detail view.

**Prompt**:
```
Add expandable details to session timeline card in components/progress/session-timeline-card.tsx.

Current code (lines 32-53) shows summary only. Add expansion:

import { useState } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';

const SessionTimelineCard = ({ session }: Props) => {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const heightValue = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    height: heightValue.value,
    opacity: heightValue.value > 0 ? 1 : 0,
  }));

  // NOTE: Don't hardcode 200px. Use onLayout to measure actual content height,
  // or use LayoutAnimation for automatic height transitions.
  const [contentHeight, setContentHeight] = useState(0);

  const toggleExpanded = () => {
    const targetHeight = expanded ? 0 : (contentHeight || 200);
    heightValue.value = withTiming(targetHeight, { duration: 200 });
    setExpanded(!expanded);
  };

  return (
    <SurfaceCard>
      <Pressable onPress={toggleExpanded}>
        <Row>
          <ThemedText variant="body">
            {session.areasImproved.length} areas improved
          </ThemedText>
          <Spacer />
          <MaterialIcons
            name={expanded ? 'expand-less' : 'expand-more'}
            size={20}
            color={colors.text.secondary}
          />
        </Row>
      </Pressable>

      <Animated.View style={animatedStyle}>
        {session.areasImproved.map((area, idx) => (
          <Row key={idx} style={{ marginTop: Spacing.xs }}>
            <MaterialIcons
              name="trending-up"
              size={16}
              color={colors.success.base}
            />
            <ThemedText variant="bodySmall" style={{ marginLeft: Spacing.xxs }}>
              {area.name}
            </ThemedText>
            <Spacer />
            <Badge variant="success" size="small">
              +{area.improvement}
            </Badge>
          </Row>
        ))}
      </Animated.View>
    </SurfaceCard>
  );
};

Also show coach notes if present:
- Expandable section below improvements
- Use colors.text.secondary for notes text
- Icon to indicate notes exist

Acceptance criteria:
✓ Tapping summary expands to show all areas
✓ Smooth height animation (200ms)
✓ Shows improvement amount for each area
✓ Success color for positive changes
✓ Chevron icon rotates to indicate state
✓ Can collapse back to summary
✓ Multiple cards can be expanded simultaneously
✓ Uses react-native-reanimated 4
```

---

## Item 179: Goal Milestone Completion No Celebration

**Problem**: Completing a milestone has no visual feedback or celebration.

**Files**: `components/goals/MilestoneList.tsx` lines ~51-63

**Current behavior**: Just updates state, no animation or feedback.

**Prompt**:
```
Add celebration animation to milestone completion in components/goals/MilestoneList.tsx.

Current code (lines 51-63) updates state silently. Add celebration:

import { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const MilestoneItem = ({ milestone, onComplete }: Props) => {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const [showConfetti, setShowConfetti] = useState(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleComplete = async () => {
    // Haptic feedback
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    // Scale animation
    scale.value = withSequence(
      withSpring(1.2, { damping: 2 }),
      withSpring(1.0)
    );

    // Show confetti
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 2000);

    // Complete milestone
    await onComplete(milestone.id);

    // Show toast (no emoji in code — use type:'success' for icon)
    Toast.show({
      text: `${milestone.title} completed!`,
      type: 'success',
      duration: 3000,
    });
  };

  return (
    <Animated.View style={animatedStyle}>
      <SurfaceCard>
        {/* Milestone content */}
        <Pressable onPress={handleComplete} disabled={milestone.completed}>
          {/* ... existing UI ... */}
        </Pressable>

        {showConfetti && (
          <View style={{ position: 'absolute', top: -20, left: '50%' }}>
            <ThemedText style={{ fontSize: 40 }}>🎉</ThemedText>
          </View>
        )}
      </SurfaceCard>
    </Animated.View>
  );
};

Add confetti emojis that float up and fade:
- Random emojis: 🎉 🎊 ⭐ 🏆 💪
- Animate upward with fade out
- Multiple emojis at random positions

Acceptance criteria:
✓ Haptic feedback on completion (iOS/Android)
✓ Scale animation on milestone card
✓ Confetti emojis appear and animate
✓ Success toast with celebration emoji
✓ Smooth spring animation (not jarring)
✓ Confetti auto-removes after 2s
✓ Disabled state prevents double-completion
✓ Works on web (no haptics, animation still works)
```

---

## Item 180: Cosmetic Selector No Live Preview

**Problem**: Can select cosmetics (card frames, colors) but can't preview before applying.

**Files**: `components/progress/cosmetic-selector.tsx` lines ~22-122

**Current behavior**: Selection updates immediately without preview.

**Prompt**:
```
Add live preview to cosmetic selector in components/progress/cosmetic-selector.tsx.

Current code (lines 22-122) applies on tap. Add preview mode:

import { useState } from 'react';
import { PlayerCard } from '@/components/progress/player-card';

const CosmeticSelector = ({ currentCosmetics, onApply }: Props) => {
  const { colors } = useTheme();
  const [previewCosmetics, setPreviewCosmetics] = useState(currentCosmetics);
  const [hasChanges, setHasChanges] = useState(false);

  const handleSelectFrame = (frameId: string) => {
    setPreviewCosmetics(prev => ({ ...prev, frameId }));
    setHasChanges(true);
  };

  const handleSelectColor = (colorScheme: string) => {
    setPreviewCosmetics(prev => ({ ...prev, colorScheme }));
    setHasChanges(true);
  };

  const handleApply = async () => {
    const result = await onApply(previewCosmetics);
    if (result.success) {
      setHasChanges(false);
      Toast.show({ text: 'Cosmetics applied!', type: 'success' });
    }
  };

  const handleReset = () => {
    setPreviewCosmetics(currentCosmetics);
    setHasChanges(false);
  };

  return (
    <Column>
      {/* Live Preview */}
      <View style={{ marginBottom: Spacing.lg }}>
        <ThemedText variant="subheading" style={{ marginBottom: Spacing.sm }}>
          Preview
        </ThemedText>
        <Center>
          <PlayerCard cosmetics={previewCosmetics} />
        </Center>
      </View>

      {/* Frame Selector */}
      <ThemedText variant="subheading" style={{ marginBottom: Spacing.sm }}>
        Card Frame
      </ThemedText>
      <Row style={{ flexWrap: 'wrap', gap: Spacing.xs }}>
        {frames.map(frame => (
          <Pressable
            key={frame.id}
            onPress={() => handleSelectFrame(frame.id)}
            style={{
              borderWidth: previewCosmetics.frameId === frame.id ? 2 : 0,
              borderColor: colors.primary.base,
              borderRadius: Spacing.xs,
            }}
          >
            <Image source={frame.thumbnail} style={{ width: 60, height: 80 }} />
            {frame.locked && <LockIcon />}
          </Pressable>
        ))}
      </Row>

      {/* Color Selector */}
      {/* ... similar pattern ... */}

      {/* Action Buttons */}
      <Row style={{ marginTop: Spacing.lg, gap: Spacing.sm }}>
        <Button
          variant="secondary"
          onPress={handleReset}
          disabled={!hasChanges}
          style={{ flex: 1 }}
        >
          Reset
        </Button>
        <Button
          variant="primary"
          onPress={handleApply}
          disabled={!hasChanges}
          style={{ flex: 1 }}
        >
          Apply
        </Button>
      </Row>
    </Column>
  );
};

Acceptance criteria:
✓ Preview updates immediately when selecting cosmetics
✓ Shows full player card with selected cosmetics
✓ Apply button saves changes
✓ Reset button reverts to current cosmetics
✓ Buttons disabled when no changes
✓ Success toast on apply
✓ Locked cosmetics show lock icon and can't be selected
✓ Preview is visually prominent
```

---

## Item 181: Homework Card Disabled Button No Explanation

**Problem**: Completed homework shows disabled "Mark Complete" button with no explanation.

**Files**: `components/progress/homework-card.tsx` lines ~65-69

**Current behavior**: Button is disabled but no indication why.

**Prompt**:
```
Add completion state messaging to homework card in components/progress/homework-card.tsx.

Current code (lines 65-69):
<Button disabled={homework.completed}>
  Mark Complete
</Button>

Replace with state-aware UI:

const { colors } = useTheme();

{homework.completed ? (
  <Row style={{
    padding: Spacing.sm,
    backgroundColor: colors.success.surface,
    borderRadius: Spacing.sm,
  }}>
    <MaterialIcons name="check-circle" size={20} color={colors.success.base} />
    <ThemedText
      variant="bodySmall"
      style={{ marginLeft: Spacing.xs, color: colors.success.base }}
    >
      Completed on {formatDate(homework.completedAt)}
    </ThemedText>
  </Row>
) : (
  <Column>
    <Button onPress={handleMarkComplete}>
      Mark Complete
    </Button>
    {homework.dueDate && (
      <ThemedText
        variant="caption"
        color="secondary"
        style={{ marginTop: Spacing.xxs, textAlign: 'center' }}
      >
        Due {formatRelativeDate(homework.dueDate)}
      </ThemedText>
    )}
  </Column>
)}

Add overdue indicator if past due date:
{homework.dueDate && isPastDue(homework.dueDate) && !homework.completed && (
  <Badge variant="error" style={{ position: 'absolute', top: Spacing.sm, right: Spacing.sm }}>
    Overdue
  </Badge>
)}

Helper functions:
const formatRelativeDate = (date: string) => {
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days < 0) return `${Math.abs(days)} days ago`;
  return `in ${days} days`;
};

const isPastDue = (date: string) => new Date(date) < new Date();

Acceptance criteria:
✓ Completed homework shows success badge with date
✓ Incomplete homework shows Mark Complete button
✓ Due date shown in relative format
✓ Overdue homework shows red badge
✓ No disabled buttons (clear state instead)
✓ Uses theme colors for success/error states
✓ Completion date formatted readably
```

---

## Item 182: Media Strip "+3" Without Total Count

**Problem**: Shows "+3 more" but doesn't indicate total (could be 4 or 100).

**Files**: `components/progress/media-strip.tsx` lines ~88-96

**Current behavior**: Overflow badge shows only hidden count.

**Prompt**:
```
Show total media count in media strip overflow badge (components/progress/media-strip.tsx).

Current code (lines 88-96):
<Badge>+{remaining}</Badge>

Change to show total and remaining:

const MediaStrip = ({ media, maxVisible = 3 }: Props) => {
  const { colors } = useTheme();
  const visibleMedia = media.slice(0, maxVisible);
  const remaining = media.length - maxVisible;

  return (
    <Row>
      {visibleMedia.map((item, idx) => (
        <Pressable
          key={item.id}
          onPress={() => openMediaViewer(media, idx)}
          style={{ marginRight: Spacing.xs }}
        >
          <Image
            source={{ uri: item.thumbnailUri }}
            style={{
              width: 60,
              height: 60,
              borderRadius: Spacing.xs,
            }}
          />
        </Pressable>
      ))}

      {remaining > 0 && (
        <Pressable
          onPress={() => openMediaViewer(media, maxVisible)}
          style={{
            width: 60,
            height: 60,
            backgroundColor: withAlpha(colors.background.tertiary, 0.8),
            borderRadius: Spacing.xs,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <ThemedText variant="heading" color="primary">
            +{remaining}
          </ThemedText>
          <ThemedText variant="micro" color="secondary">
            of {media.length}
          </ThemedText>
        </Pressable>
      )}

      {media.length === 0 && (
        <View style={{
          padding: Spacing.sm,
          backgroundColor: colors.background.secondary,
          borderRadius: Spacing.sm,
        }}>
          <ThemedText variant="bodySmall" color="tertiary">
            No media yet
          </ThemedText>
        </View>
      )}
    </Row>
  );
};

Add media viewer modal:
- Full-screen image/video viewer
- Swipe to navigate
- Close button
- Share/download actions

Acceptance criteria:
✓ Shows "+3 of 10" instead of just "+3"
✓ Tapping overflow badge opens viewer at first hidden item
✓ Tapping visible media opens viewer at that item
✓ Empty state shows "No media yet"
✓ Uses theme colors with alpha transparency
✓ Overflow badge visually distinct from media thumbnails
✓ Total count always visible in overflow badge
```

---

## Item 183: Monthly Story Progress Bars Re-animate Every Tap

**Problem**: Progress bars restart animation whenever the component re-renders.

**Files**: `components/progress/monthly-story.tsx` lines ~101-125

**Current behavior**: Animation runs on every render, not just mount.

**Prompt**:
```
Fix progress bar animation to run once in components/progress/monthly-story.tsx.

Current code (lines 101-125) re-animates on every render. Use proper animation lifecycle:

import { useEffect, useRef } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay
} from 'react-native-reanimated';

// CRITICAL: useSharedValue is a hook — it CANNOT be called inside forEach/loops/conditionals.
// Pre-allocate a fixed number of shared values at component top level.
const MAX_STATS = 10;

const MonthlyStory = ({ stats }: Props) => {
  const hasAnimated = useRef(false);

  // Pre-allocate fixed shared values at top level (Rules of Hooks compliant).
  // Each useSharedValue call is at the top level of the component — NOT in a loop.
  const sv0 = useSharedValue(0);
  const sv1 = useSharedValue(0);
  const sv2 = useSharedValue(0);
  const sv3 = useSharedValue(0);
  const sv4 = useSharedValue(0);
  const sv5 = useSharedValue(0);
  const sv6 = useSharedValue(0);
  const sv7 = useSharedValue(0);
  const sv8 = useSharedValue(0);
  const sv9 = useSharedValue(0);
  const progressValues = [sv0, sv1, sv2, sv3, sv4, sv5, sv6, sv7, sv8, sv9];

  useEffect(() => {
    // Only animate once
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    stats.slice(0, MAX_STATS).forEach((stat, idx) => {
      progressValues[idx].value = withDelay(
        idx * 100, // Stagger animations
        withTiming(stat.progress, { duration: 800 })
      );
    });
  }, []); // Empty deps = run once

  return (
    <Column>
      {stats.slice(0, MAX_STATS).map((stat, idx) => (
        <StatRow key={stat.id}>
          <ThemedText variant="bodySmall">{stat.label}</ThemedText>
          <ProgressBar sharedValue={progressValues[idx]} />
        </StatRow>
      ))}
    </Column>
  );
};

// Extract ProgressBar as a separate memoized component so useAnimatedStyle
// is called at component top level (not inside .map()):
const ProgressBar = memo(({ sharedValue }: { sharedValue: Animated.SharedValue<number> }) => {
  const { colors } = useTheme();
  const animatedStyle = useAnimatedStyle(() => ({
    width: `${sharedValue.value}%`,
  }));
  return (
    <Animated.View style={[{
      height: 8,
      backgroundColor: colors.primary.base,
      borderRadius: Spacing.pill,
    }, animatedStyle]} />
  );
});

Reset animation if stats change:
useEffect(() => {
  hasAnimated.current = false;
  progressValues.forEach(v => { v.value = 0; });
  // Re-trigger animation
  setTimeout(() => {
    stats.slice(0, MAX_STATS).forEach((stat, idx) => {
      progressValues[idx].value = withDelay(
        idx * 100,
        withTiming(stat.progress, { duration: 800 })
      );
    });
  }, 50);
}, [stats.length]); // Re-animate only when stats change

Acceptance criteria:
✓ Animations run once on mount
✓ Staggered start (100ms between each bar)
✓ Smooth 800ms easing
✓ No re-animation on tap or re-render
✓ Re-animate only when stats data changes
✓ Uses react-native-reanimated 4
✓ No performance issues with 10+ stats
```

---

## Item 184: Daily Challenge Banner Replays Animation on Mount

**Problem**: Challenge banner animates every time screen is viewed, not just on new challenge.

**Files**: `components/progress/daily-challenge-banner.tsx` lines ~55-71

**Current behavior**: Entrance animation runs on every mount.

**Prompt**:
```
Make daily challenge animation run once per challenge in components/progress/daily-challenge-banner.tsx.

Current code (lines 55-71) runs on mount. Add persistence:

import { useEffect, useState } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn
} from 'react-native-reanimated';
import { apiClient } from '@/services/api-client';

const DailyChallengeBanner = ({ challenge }: Props) => {
  const { colors } = useTheme();
  const scale = useSharedValue(0.8);
  const [hasSeenAnimation, setHasSeenAnimation] = useState(false);

  useEffect(() => {
    const checkIfSeen = async () => {
      const seen = await apiClient.get(
        `CHALLENGE_ANIMATION_SEEN_${challenge.id}`,
        false
      );
      setHasSeenAnimation(seen);

      if (!seen) {
        // Play entrance animation
        scale.value = withSpring(1.0, { damping: 8, stiffness: 100 });

        // Mark as seen
        await apiClient.set(`CHALLENGE_ANIMATION_SEEN_${challenge.id}`, true);
      } else {
        // Skip animation, show immediately
        scale.value = 1.0;
      }
    };

    checkIfSeen();
  }, [challenge.id]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (hasSeenAnimation === null) return null; // Loading

  return (
    <Animated.View
      entering={hasSeenAnimation ? undefined : FadeIn}
      style={animatedStyle}
    >
      {/* Banner content */}
    </Animated.View>
  );
};

Add "Dismiss" action that marks challenge as acknowledged:
const handleDismiss = async () => {
  await apiClient.set(`CHALLENGE_DISMISSED_${challenge.id}`, true);
  onDismiss?.(challenge.id);
};

Clear seen state at midnight for new daily challenge:
- Check if challenge.id changed (new day)
- Clear animation flags for old challenges

IMPORTANT: Storage key cleanup strategy for unbounded keys like
`CHALLENGE_ANIMATION_SEEN_${challenge.id}` and `CHALLENGE_DISMISSED_${challenge.id}`:
- On app startup, scan for keys matching CHALLENGE_ANIMATION_SEEN_* older than 7 days
- Delete stale keys to prevent AsyncStorage from growing unbounded
- Alternatively, store all challenge states in a single Map<challengeId, { seen, dismissed, timestamp }>
  and prune entries older than 7 days on read

Acceptance criteria:
✓ Animation plays once per unique challenge
✓ Re-visiting screen doesn't replay animation
✓ New daily challenge triggers animation
✓ Dismissed challenges stay dismissed
✓ Animation skipped if already seen
✓ Smooth spring entrance (not jarring)
✓ Animation state persisted in AsyncStorage
```

---

## Item 231: Drill Completion No Proof/Evidence

**Problem**: Athletes can mark drills complete without submitting video or evidence.

**Files**: `components/drills/AssignmentCard.tsx` lines ~172-182

**Current behavior**: "Mark Complete" button with no validation.

**Prompt**:
```
Add evidence requirement to drill completion in components/drills/AssignmentCard.tsx.

Current code (lines 172-182):
<Button onPress={handleMarkComplete}>
  Mark Complete
</Button>

Replace with evidence flow:

import { useState } from 'react';
import { Modal, Alert } from 'react-native';
import { VideoPlayer } from '@/components/drills/VideoPlayer';

const AssignmentCard = ({ assignment }: Props) => {
  const { colors } = useTheme();
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [evidenceUri, setEvidenceUri] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const handleMarkComplete = () => {
    if (!assignment.requiresEvidence) {
      // Simple completion
      completeAssignment(assignment.id);
      return;
    }

    // Show evidence modal
    setShowEvidenceModal(true);
  };

  const handleSubmitCompletion = async () => {
    if (assignment.requiresEvidence && !evidenceUri) {
      Alert.alert('Evidence Required', 'Please upload a video of you completing this drill');
      return;
    }

    const result = await drillService.completeAssignment({
      assignmentId: assignment.id,
      evidenceUri,
      notes: notes.trim(),
      completedAt: new Date().toISOString(),
    });

    if (result.success) {
      setShowEvidenceModal(false);
      Toast.show({ text: 'Drill completed!', type: 'success' });
    } else {
      Alert.alert('Error', result.error.message);
    }
  };

  return (
    <>
      <SurfaceCard>
        {/* Assignment details */}

        <Button
          onPress={handleMarkComplete}
          disabled={assignment.completed}
        >
          {assignment.requiresEvidence ? 'Submit Completion' : 'Mark Complete'}
        </Button>
      </SurfaceCard>

      <Modal visible={showEvidenceModal} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.base }}>
          <Column style={{ padding: Spacing.md }}>
            <ThemedText variant="heading">Submit Evidence</ThemedText>

            {evidenceUri ? (
              <VideoPlayer uri={evidenceUri} />
            ) : (
              <Button
                variant="secondary"
                onPress={async () => {
                  const result = await pickVideo();
                  if (result.success) setEvidenceUri(result.data.uri);
                }}
              >
                Record/Upload Video
              </Button>
            )}

            {/* NOTE: Move inline styles to a StyleSheet for performance.
                Create styles via StyleSheet.create() or useStyleSheet(colors). */}
            <TextInput
              placeholder="Add notes (optional)"
              value={notes}
              onChangeText={setNotes}
              multiline
              style={{
                minHeight: 80,
                borderWidth: 1,
                borderColor: colors.border.base,
                borderRadius: Spacing.sm,
                padding: Spacing.sm,
                marginTop: Spacing.md,
                color: colors.text.primary,
                backgroundColor: colors.background.secondary,
              }}
              placeholderTextColor={colors.text.tertiary}
            />

            <Row style={{ marginTop: Spacing.lg, gap: Spacing.sm }}>
              <Button
                variant="secondary"
                onPress={() => setShowEvidenceModal(false)}
                style={{ flex: 1 }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onPress={handleSubmitCompletion}
                style={{ flex: 1 }}
              >
                Submit
              </Button>
            </Row>
          </Column>
        </SafeAreaView>
      </Modal>
    </>
  );
};

Add requiresEvidence flag to drill assignments:
- Coach sets when creating assignment
- Video evidence stored with completion
- Coach can review evidence in roster

Acceptance criteria:
✓ Drills requiring evidence show upload modal
✓ Cannot submit without video if required
✓ Optional notes field for context
✓ Video preview before submission
✓ Success feedback on completion
✓ Evidence stored and retrievable by coach
✓ Simple drills can be completed without evidence
✓ Clear indication which drills require evidence
```

---

## Sprint 2 Summary

**Total Items**: 9
**Estimated Effort**: 16-20 hours
**Priority**: MEDIUM - UX polish and engagement features

**Dependency Map**:
- Items 177, 178 require interaction patterns → establish first
- Items 179, 184 use similar animation patterns → reuse code
- Item 180 depends on PlayerCard component
- Item 231 needs VideoPlayer from Sprint 1 (item 228)

**Success Criteria**:
- ✓ All interactive elements provide feedback
- ✓ Animations smooth and run once per trigger
- ✓ Evidence capture works end-to-end
- ✓ All disabled states have clear explanations
- ✓ Celebratory moments feel rewarding

**Testing Focus**:
- Animation lifecycle (mount, unmount, re-render)
- Evidence upload and retrieval flow
- Modal interactions and dismissal
- Haptic feedback on iOS/Android
- Preview functionality accuracy

**Risk Areas**:
- react-native-reanimated 4 animation complexity
- Video recording/upload UX on mobile
- Modal state management across multiple modals
- AsyncStorage persistence for animation flags
