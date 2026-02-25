# Dead Ends Sprint 1: Broken & Misleading UI

**Sprint Goal**: Fix UI elements that are broken, misleading, or appear interactive but do nothing. These create user frustration and erode trust in the app.

**Items**: 12 (4, 10, 25, 27, 44, 123, 124, 125, 126, 140, 212, 317)

---

## Item 4: Smart Slots is Dead-End Info Screen

**Problem**: Smart Slots screen shows recommendations but has no actions to apply them.

**Files**: `app/settings/smart-slots.tsx`

**Current behavior**: Read-only statistics with no way to use the insights.

**Prompt**:
```
Add actionable controls to Smart Slots screen in app/settings/smart-slots.tsx.

Current screen shows heatmap and recommendations but no actions. Add:

import { useState } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { availabilityService } from '@/services/availability-service';
import { Button, Chip } from '@/components/primitives';

const SmartSlotsScreen = () => {
  const { colors } = useTheme();
  const [applyingSlots, setApplyingSlots] = useState(false);
  const { smartSlots, isLoading } = useSmartSlots();

  const handleApplyRecommendations = async () => {
    Alert.alert(
      'Apply Smart Slots?',
      'This will add recommended time slots to your availability based on booking patterns. You can edit them afterwards.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply',
          onPress: async () => {
            setApplyingSlots(true);

            // Convert recommendations to availability blocks
            const blocks = smartSlots.recommendations.map(rec => ({
              dayOfWeek: rec.dayOfWeek,
              startTime: rec.startTime,
              endTime: rec.endTime,
              isAvailable: true,
              source: 'smart_slots' as const,
            }));

            const result = await availabilityService.addSmartSlots(blocks);

            setApplyingSlots(false);

            if (result.success) {
              Toast.show({
                text: `Added ${blocks.length} recommended time slots`,
                type: 'success',
              });
              router.push('/availability');
            } else {
              Alert.alert('Error', result.error.message);
            }
          },
        },
      ]
    );
  };

  const handleCustomizeAndApply = () => {
    router.push({
      pathname: '/availability/customize-smart-slots',
      params: { recommendations: JSON.stringify(smartSlots.recommendations) },
    });
  };

  return (
    <ScrollView>
      {/* Existing heatmap and stats */}
      <SmartSlotsHeatmap data={smartSlots.heatmap} />
      <SmartSlotsCards recommendations={smartSlots.recommendations} />

      {/* Action buttons */}
      <Column style={{ padding: Spacing.md, gap: Spacing.sm }}>
        <Button
          variant="primary"
          onPress={handleApplyRecommendations}
          disabled={applyingSlots || smartSlots.recommendations.length === 0}
          loading={applyingSlots}
        >
          Apply All Recommendations
        </Button>

        <Button
          variant="secondary"
          onPress={handleCustomizeAndApply}
          disabled={smartSlots.recommendations.length === 0}
        >
          Customize & Apply
        </Button>

        {/* Info card */}
        <SurfaceCard style={{ backgroundColor: colors.primary.surface }}>
          <Row style={{ alignItems: 'flex-start' }}>
            <MaterialIcons name="info" size={20} color={colors.primary.base} />
            <Column style={{ flex: 1, marginLeft: Spacing.sm }}>
              <ThemedText variant="bodySmall" style={{ color: colors.primary.base }}>
                These recommendations are based on {smartSlots.totalBookings} bookings
                from the last {smartSlots.dayRange} days.
              </ThemedText>
            </Column>
          </Row>
        </SurfaceCard>

        {/* Quick filters */}
        <Row style={{ flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.sm }}>
          <Chip
            selected={filter === 'all'}
            onPress={() => setFilter('all')}
          >
            All Times
          </Chip>
          <Chip
            selected={filter === 'weekday'}
            onPress={() => setFilter('weekday')}
          >
            Weekdays Only
          </Chip>
          <Chip
            selected={filter === 'weekend'}
            onPress={() => setFilter('weekend')}
          >
            Weekends Only
          </Chip>
        </Row>
      </Column>
    </ScrollView>
  );
};

Add to availabilityService:
async addSmartSlots(blocks: AvailabilityBlock[]): Promise<Result<void, ServiceError>> {
  try {
    const existing = await this.getAvailability();
    const merged = this.mergeAvailabilityBlocks(existing, blocks);
    await apiClient.set(StorageKeys.AVAILABILITY_BLOCKS, merged);
    emitTyped('AVAILABILITY_UPDATED', { userId: this.currentUserId });
    return ok(undefined);
  } catch (thrown: unknown) {
    const message = thrown instanceof Error ? thrown.message : 'Failed to update availability';
    return err({ code: 'STORAGE', message });
  }
}

Acceptance criteria:
✓ "Apply All" button adds all recommended slots
✓ "Customize & Apply" navigates to editor with pre-filled recommendations
✓ Confirmation alert before applying
✓ Success toast shows count of added slots
✓ Navigation to availability screen after apply
✓ Disabled state when no recommendations
✓ Loading state during apply operation
✓ Error handling with user-friendly messages
✓ Info card explains data source
✓ Quick filters to refine recommendations
```

---

## Item 10: Waitlist Button Disabled No Explanation

**Problem**: "Join Waitlist" button is disabled but doesn't explain why.

**Files**: `components/group/waitlist-banner.tsx`

**Current behavior**: Greyed out button with no context.

**Prompt**:
```
Add explanation for disabled waitlist button in components/group/waitlist-banner.tsx.

Current code shows disabled button without reason. Add state-aware messaging:

interface WaitlistBannerProps {
  sessionId: string;
  currentUserId: string;
  status: 'open' | 'closed' | 'full' | 'already_joined';
  position?: number;
}

const WaitlistBanner = ({ sessionId, currentUserId, status, position }: Props) => {
  const { colors } = useTheme();

  const getStatusConfig = () => {
    switch (status) {
      case 'already_joined':
        return {
          icon: 'check-circle' as const,
          title: 'You\'re on the Waitlist',
          description: `Position #${position} • We'll notify you if a spot opens up`,
          action: {
            label: 'Leave Waitlist',
            variant: 'secondary' as const,
            onPress: handleLeaveWaitlist,
          },
          color: colors.success.base,
        };

      case 'full':
        return {
          icon: 'people' as const,
          title: 'Waitlist Full',
          description: 'The waitlist has reached maximum capacity',
          action: null,
          color: colors.text.tertiary,
        };

      case 'closed':
        return {
          icon: 'block' as const,
          title: 'Waitlist Closed',
          description: 'The coach has closed the waitlist for this session',
          action: {
            label: 'Find Similar Sessions',
            variant: 'secondary' as const,
            onPress: () => router.push('/group-sessions'),
          },
          color: colors.text.secondary,
        };

      case 'open':
      default:
        return {
          icon: 'person-add' as const,
          title: 'Join Waitlist',
          description: 'Get notified if a spot becomes available',
          action: {
            label: 'Join Waitlist',
            variant: 'primary' as const,
            onPress: handleJoinWaitlist,
          },
          color: colors.primary.base,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <SurfaceCard
      style={{
        borderLeftWidth: 3,
        borderLeftColor: config.color,
        backgroundColor: withAlpha(config.color, 0.1),
      }}
    >
      <Row style={{ alignItems: 'flex-start' }}>
        <MaterialIcons name={config.icon} size={24} color={config.color} />
        <Column style={{ flex: 1, marginLeft: Spacing.sm }}>
          <ThemedText variant="subheading" style={{ color: config.color }}>
            {config.title}
          </ThemedText>
          <ThemedText variant="bodySmall" color="secondary" style={{ marginTop: Spacing.xxs }}>
            {config.description}
          </ThemedText>
        </Column>
      </Row>

      {config.action && (
        <Button
          variant={config.action.variant}
          onPress={config.action.onPress}
          style={{ marginTop: Spacing.sm }}
        >
          {config.action.label}
        </Button>
      )}
    </SurfaceCard>
  );
};

const handleJoinWaitlist = async () => {
  const result = await groupSessionService.joinWaitlist(sessionId, currentUserId);
  if (result.success) {
    Toast.show({ text: 'Joined waitlist!', type: 'success' });
  } else {
    Alert.alert('Error', result.error.message);
  }
};

const handleLeaveWaitlist = async () => {
  Alert.alert(
    'Leave Waitlist?',
    'You\'ll lose your position and won\'t be notified if a spot opens.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          const result = await groupSessionService.leaveWaitlist(sessionId, currentUserId);
          if (result.success) {
            Toast.show({ text: 'Left waitlist', type: 'info' });
          }
        },
      },
    ]
  );
};

Acceptance criteria:
✓ Each status shows specific explanation
✓ "Already joined" shows position number
✓ "Full" explains waitlist at capacity
✓ "Closed" offers alternative action
✓ "Open" shows clear join CTA
✓ Color-coded by status (success/error/info)
✓ No disabled buttons without explanation
✓ Alternative actions when primary unavailable
✓ Leave waitlist requires confirmation
```

---

## Item 25: "Ask Coach About This" May Do Nothing

**Problem**: Button appears but might not have a handler or coach contact method.

**Files**: `app/development/my-progress.tsx`

**Current behavior**: Button exists but functionality unclear or missing.

**Prompt**:
```
Implement "Ask Coach About This" functionality in app/development/my-progress.tsx.

Add complete flow for contacting coach about progress item:

import { Alert } from 'react-native';
import { router } from 'expo-router';
import { messagingService } from '@/services/community/community-messaging-service';

const MyProgressScreen = () => {
  const { currentChild } = useCurrentChild();
  const { coaches } = useChildCoaches(currentChild.id);

  const handleAskCoachAboutItem = async (progressItem: ProgressItem) => {
    // Check if child has active coaches
    if (coaches.length === 0) {
      Alert.alert(
        'No Active Coaches',
        'You need to book a session before you can contact a coach about progress.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Find Coaches', onPress: () => router.push('/discover') },
        ]
      );
      return;
    }

    // Single coach: send message directly
    if (coaches.length === 1) {
      router.push({
        pathname: '/chat/compose',
        params: {
          recipientId: coaches[0].id,
          recipientName: coaches[0].name,
          contextType: 'progress',
          contextId: progressItem.id,
          prefilledMessage: `Hi ${coaches[0].name}, I have a question about ${progressItem.skillName} progress for ${currentChild.name}.`,
        },
      });
      return;
    }

    // Multiple coaches: show picker
    Alert.alert(
      'Select Coach',
      'Which coach would you like to ask?',
      [
        ...coaches.map(coach => ({
          text: coach.name,
          onPress: () => {
            router.push({
              pathname: '/chat/compose',
              params: {
                recipientId: coach.id,
                recipientName: coach.name,
                contextType: 'progress',
                contextId: progressItem.id,
                prefilledMessage: `Hi ${coach.name}, I have a question about ${progressItem.skillName} progress for ${currentChild.name}.`,
              },
            });
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <ScrollView>
      {progressItems.map(item => (
        <ProgressItemCard key={item.id} item={item}>
          <Button
            variant="secondary"
            size="small"
            onPress={() => handleAskCoachAboutItem(item)}
            leftIcon="chat"
          >
            Ask Coach About This
          </Button>
        </ProgressItemCard>
      ))}
    </ScrollView>
  );
};

Add useChildCoaches hook:
export function useChildCoaches(childId: string) {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCoaches = async () => {
      // Get all bookings for child
      const bookingsResult = await bookingService.getBookingsByAthlete(childId);
      if (!bookingsResult.success) return;

      // Extract unique coach IDs
      const coachIds = [...new Set(bookingsResult.data.map(b => b.coachId))];

      // Fetch coach details
      const coachResults = await Promise.all(
        coachIds.map(id => userService.getUserById(id))
      );

      const loadedCoaches = coachResults
        .filter(r => r.success)
        .map(r => r.data);

      setCoaches(loadedCoaches);
      setIsLoading(false);
    };

    loadCoaches();
  }, [childId]);

  return { coaches, isLoading };
}

Acceptance criteria:
✓ Button always has working handler
✓ No coaches: clear message + navigation to discover
✓ Single coach: navigate directly to compose message
✓ Multiple coaches: show picker to select recipient
✓ Pre-filled message includes context (skill, child name)
✓ Message composition includes progress item reference
✓ Back navigation returns to progress screen
✓ Handles loading and error states
```

---

## Item 27: Consent Stat Cards Clickable But Do Nothing

**Problem**: Consent summary cards look tappable but have no action.

**Files**: `app/roster/consents.tsx`

**Current behavior**: Cards respond to press but nothing happens.

**Prompt**:
```
Add drill-down functionality to consent stat cards in app/roster/consents.tsx.

Current cards are tappable but no-op. Add filtered views:

import { useState } from 'react';
import { router } from 'expo-router';

const ConsentsScreen = () => {
  const { colors } = useTheme();
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'approved' | 'pending' | 'declined'>('all');
  const { athletes, consents } = useRosterConsents();

  const stats = {
    total: athletes.length,
    approved: consents.filter(c => c.status === 'approved').length,
    pending: consents.filter(c => c.status === 'pending').length,
    declined: consents.filter(c => c.status === 'declined').length,
  };

  const filteredAthletes = useMemo(() => {
    if (selectedFilter === 'all') return athletes;

    return athletes.filter(athlete => {
      const consent = consents.find(c => c.athleteId === athlete.id);
      return consent?.status === selectedFilter;
    });
  }, [athletes, consents, selectedFilter]);

  return (
    <Column>
      {/* Stat cards */}
      <Row style={{ padding: Spacing.md, gap: Spacing.sm }}>
        <Clickable
          style={{ flex: 1 }}
          onPress={() => setSelectedFilter('approved')}
        >
          <SurfaceCard
            style={{
              backgroundColor: selectedFilter === 'approved'
                ? colors.success.surface
                : colors.background.secondary,
              borderWidth: selectedFilter === 'approved' ? 2 : 0,
              borderColor: colors.success.base,
            }}
          >
            <MaterialIcons
              name="check-circle"
              size={32}
              color={colors.success.base}
            />
            <ThemedText variant="display" style={{ marginTop: Spacing.xs }}>
              {stats.approved}
            </ThemedText>
            <ThemedText variant="caption" color="secondary">
              Approved
            </ThemedText>
          </SurfaceCard>
        </Clickable>

        <Clickable
          style={{ flex: 1 }}
          onPress={() => setSelectedFilter('pending')}
        >
          <SurfaceCard
            style={{
              backgroundColor: selectedFilter === 'pending'
                ? colors.warning.surface
                : colors.background.secondary,
              borderWidth: selectedFilter === 'pending' ? 2 : 0,
              borderColor: colors.warning.base,
            }}
          >
            <MaterialIcons
              name="schedule"
              size={32}
              color={colors.warning.base}
            />
            <ThemedText variant="display" style={{ marginTop: Spacing.xs }}>
              {stats.pending}
            </ThemedText>
            <ThemedText variant="caption" color="secondary">
              Pending
            </ThemedText>
          </SurfaceCard>
        </Clickable>

        <Clickable
          style={{ flex: 1 }}
          onPress={() => setSelectedFilter('declined')}
        >
          <SurfaceCard
            style={{
              backgroundColor: selectedFilter === 'declined'
                ? colors.error.surface
                : colors.background.secondary,
              borderWidth: selectedFilter === 'declined' ? 2 : 0,
              borderColor: colors.error.base,
            }}
          >
            <MaterialIcons
              name="cancel"
              size={32}
              color={colors.error.base}
            />
            <ThemedText variant="display" style={{ marginTop: Spacing.xs }}>
              {stats.declined}
            </ThemedText>
            <ThemedText variant="caption" color="secondary">
              Declined
            </ThemedText>
          </SurfaceCard>
        </Clickable>
      </Row>

      {/* Filter indicator */}
      <Row style={{
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.xs,
        backgroundColor: colors.background.secondary,
      }}>
        <ThemedText variant="bodySmall" color="secondary">
          Showing {filteredAthletes.length} of {stats.total} athletes
        </ThemedText>
        {selectedFilter !== 'all' && (
          <Clickable onPress={() => setSelectedFilter('all')}>
            <ThemedText variant="bodySmall" style={{ marginLeft: Spacing.sm, color: colors.primary.base }}>
              Clear Filter
            </ThemedText>
          </Clickable>
        )}
      </Row>

      {/* Filtered athlete list */}
      <FlatList
        data={filteredAthletes}
        renderItem={({ item }) => (
          <ConsentCard
            athlete={item}
            consent={consents.find(c => c.athleteId === item.id)}
            onPress={() => router.push(`/roster/${item.id}/consent`)}
          />
        )}
      />
    </Column>
  );
};

Acceptance criteria:
✓ Tapping stat card filters athlete list
✓ Selected card highlighted with border
✓ Filter indicator shows count and selection
✓ "Clear Filter" resets to all athletes
✓ Filtered list updates immediately
✓ Empty state when no athletes match filter
✓ Stat cards show accurate counts
✓ Visual feedback on card press
```

---

## Item 44: Week Pattern Slot Row Doesn't Look Tappable

**Problem**: Slots appear as static text, not interactive elements.

**Files**: `components/coach/week-pattern-slot-row.tsx` lines ~63-130

**Current behavior**: No visual affordance for interactivity.

**Prompt**:
```
Make week pattern slots visually interactive in components/coach/week-pattern-slot-row.tsx.

Current slots (lines 63-130) look like labels. Add interactive styling:

import { Clickable } from '@/components/primitives';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const WeekPatternSlotRow = ({ slots, onEditSlot, onDeleteSlot }: Props) => {
  const { colors } = useTheme();

  return (
    <Row style={{ flexWrap: 'wrap', gap: Spacing.xs }}>
      {slots.map(slot => (
        <SlotChip
          key={slot.id}
          slot={slot}
          onPress={() => onEditSlot(slot)}
          onLongPress={() => showSlotOptions(slot)}
        />
      ))}
    </Row>
  );
};

const SlotChip = ({ slot, onPress, onLongPress }: SlotChipProps) => {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Clickable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => {
        scale.value = withSpring(0.95);
      }}
      onPressOut={() => {
        scale.value = withSpring(1.0);
      }}
    >
      <Animated.View
        style={[
          {
            backgroundColor: slot.isAvailable
              ? colors.success.surface
              : colors.background.tertiary,
            paddingHorizontal: Spacing.sm,
            paddingVertical: Spacing.xs,
            borderRadius: Radii.pill,
            borderWidth: 1,
            borderColor: slot.isAvailable
              ? colors.success.base
              : colors.border.base,
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.xxs,
          },
          animatedStyle,
        ]}
      >
        <MaterialIcons
          name={slot.isAvailable ? 'check' : 'block'}
          size={16}
          color={slot.isAvailable ? colors.success.base : colors.text.tertiary}
        />
        <ThemedText
          variant="bodySmall"
          style={{
            color: slot.isAvailable ? colors.success.base : colors.text.secondary,
          }}
        >
          {formatTimeRange(slot.startTime, slot.endTime)}
        </ThemedText>
      </Animated.View>
    </Clickable>
  );
};

const showSlotOptions = (slot: AvailabilitySlot) => {
  Alert.alert(
    formatTimeRange(slot.startTime, slot.endTime),
    'Choose an action',
    [
      {
        text: 'Edit Time',
        onPress: () => onEditSlot(slot),
      },
      {
        text: slot.isAvailable ? 'Mark Unavailable' : 'Mark Available',
        onPress: () => toggleSlotAvailability(slot),
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => confirmDeleteSlot(slot),
      },
      { text: 'Cancel', style: 'cancel' },
    ]
  );
};

Add visual hints:
- Icon indicating available vs blocked
- Scale animation on press
- Pill shape with colored border
- Long-press for options
- Tooltip on web showing "Tap to edit"

Acceptance criteria:
✓ Slots look like interactive chips/buttons
✓ Scale animation on tap
✓ Icon indicates availability status
✓ Color-coded by status (success/neutral)
✓ Long-press shows action menu
✓ Tap opens edit modal
✓ Visual feedback immediate (<100ms)
✓ Accessible labels for screen readers
```

---

## Item 123: Invite Accept Button Greyed Out No Hint

**Problem**: Accept button disabled but no indication why (e.g., missing availability, conflict).

**Files**: `components/invite/invite-action-bar.tsx` line ~70

**Current behavior**: Disabled button with no explanation.

**Prompt**:
```
Add validation messaging to invite accept button in components/invite/invite-action-bar.tsx.

Current code (line ~70):
<Button disabled={!canAccept}>Accept Invite</Button>

Replace with state-aware UI:

interface InviteValidation {
  canAccept: boolean;
  reason?: string;
  suggestion?: string;
}

const InviteActionBar = ({ invite }: Props) => {
  const { colors } = useTheme();
  const validation = validateInviteAcceptance(invite);

  const handleAcceptPress = () => {
    if (!validation.canAccept) {
      Alert.alert(
        'Cannot Accept Invite',
        validation.reason,
        validation.suggestion
          ? [
              { text: 'Cancel', style: 'cancel' },
              { text: validation.suggestion, onPress: () => handleSuggestion(validation) },
            ]
          : [{ text: 'OK' }]
      );
      return;
    }

    handleAcceptInvite();
  };

  return (
    <Column>
      {!validation.canAccept && validation.reason && (
        <SurfaceCard
          style={{
            backgroundColor: colors.warning.surface,
            marginBottom: Spacing.sm,
            borderLeftWidth: 3,
            borderLeftColor: colors.warning.base,
          }}
        >
          <Row style={{ alignItems: 'flex-start' }}>
            <MaterialIcons name="info" size={20} color={colors.warning.base} />
            <Column style={{ flex: 1, marginLeft: Spacing.sm }}>
              <ThemedText variant="bodySmall" style={{ color: colors.warning.base }}>
                {validation.reason}
              </ThemedText>
              {validation.suggestion && (
                <ThemedText
                  variant="caption"
                  style={{ marginTop: Spacing.xxs, color: colors.text.secondary }}
                >
                  {validation.suggestion}
                </ThemedText>
              )}
            </Column>
          </Row>
        </SurfaceCard>
      )}

      <Row style={{ gap: Spacing.sm }}>
        <Button
          variant="secondary"
          onPress={handleDecline}
          style={{ flex: 1 }}
        >
          Decline
        </Button>
        <Button
          variant="primary"
          onPress={handleAcceptPress}
          style={{ flex: 1 }}
          disabled={!validation.canAccept}
        >
          Accept
        </Button>
      </Row>
    </Column>
  );
};

const validateInviteAcceptance = (invite: Invite): InviteValidation => {
  // Check child selection required
  if (invite.requiresChildSelection && !invite.selectedChildId) {
    return {
      canAccept: false,
      reason: 'Please select which child this invite is for',
      suggestion: 'Select child above',
    };
  }

  // Check availability conflict
  if (invite.hasScheduleConflict) {
    return {
      canAccept: false,
      reason: 'This session conflicts with an existing booking',
      suggestion: 'View your calendar to resolve conflicts',
    };
  }

  // Check payment method
  if (invite.requiresPayment && !hasPaymentMethod) {
    return {
      canAccept: false,
      reason: 'Payment method required to accept',
      suggestion: 'Add payment method in settings',
    };
  }

  // Check invite expiry
  if (new Date(invite.expiresAt) < new Date()) {
    return {
      canAccept: false,
      reason: 'This invite has expired',
    };
  }

  return { canAccept: true };
};

Acceptance criteria:
✓ Disabled button shows explanation banner
✓ Banner color-coded by issue type
✓ Suggestion provides actionable next step
✓ Tapping disabled button shows alert with full details
✓ Multiple validation issues prioritized correctly
✓ Expired invites clearly indicated
✓ Conflict detection accurate
✓ Payment requirement explicit
```

---

## Item 124: Session Invite Multi-Slot Selection Unexplained

**Problem**: Can select multiple time slots but UI doesn't explain this is for preferences.

**Files**: `components/parent/session-invite-card.tsx` line ~238

**Current behavior**: Multi-select UI with no context.

**Prompt**:
```
Add explanation for multi-slot selection in components/parent/session-invite-card.tsx.

Current code (line ~238) shows checkboxes without context. Add explainer:

const SessionInviteCard = ({ invite }: Props) => {
  const { colors } = useTheme();
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);

  return (
    <Column>
      {/* Explainer card */}
      <SurfaceCard
        style={{
          backgroundColor: colors.primary.surface,
          marginBottom: Spacing.md,
        }}
      >
        <Row style={{ alignItems: 'flex-start' }}>
          <MaterialIcons name="info" size={20} color={colors.primary.base} />
          <Column style={{ flex: 1, marginLeft: Spacing.sm }}>
            <ThemedText variant="subheading" style={{ color: colors.primary.base }}>
              Select Your Preferred Times
            </ThemedText>
            <ThemedText
              variant="bodySmall"
              color="secondary"
              style={{ marginTop: Spacing.xxs }}
            >
              Choose one or more time slots. The coach will confirm the final time based on availability.
            </ThemedText>
          </Column>
        </Row>
      </SurfaceCard>

      {/* Time slot selection */}
      <ThemedText variant="subheading" style={{ marginBottom: Spacing.sm }}>
        Available Times
      </ThemedText>

      {invite.proposedSlots.map(slot => (
        <Clickable
          key={slot.id}
          onPress={() => toggleSlotSelection(slot.id)}
          style={{
            marginBottom: Spacing.xs,
          }}
        >
          <SurfaceCard
            style={{
              borderWidth: 2,
              borderColor: selectedSlots.includes(slot.id)
                ? colors.primary.base
                : colors.border.base,
              backgroundColor: selectedSlots.includes(slot.id)
                ? colors.primary.surface
                : colors.background.secondary,
            }}
          >
            <Row style={{ alignItems: 'center' }}>
              <Checkbox
                checked={selectedSlots.includes(slot.id)}
                onPress={() => toggleSlotSelection(slot.id)}
                color={colors.primary.base}
              />
              <Column style={{ flex: 1, marginLeft: Spacing.sm }}>
                <ThemedText variant="body">
                  {formatDate(slot.date)}
                </ThemedText>
                <ThemedText variant="bodySmall" color="secondary">
                  {formatTimeRange(slot.startTime, slot.endTime)}
                </ThemedText>
              </Column>
              {slot.isPreferred && (
                <Badge variant="info" size="small">
                  Coach's Preference
                </Badge>
              )}
            </Row>
          </SurfaceCard>
        </Clickable>
      ))}

      {/* Selection summary */}
      <View style={{
        padding: Spacing.sm,
        backgroundColor: colors.background.secondary,
        borderRadius: Radii.sm,
        marginTop: Spacing.sm,
      }}>
        <ThemedText variant="caption" color="secondary">
          {selectedSlots.length === 0 && 'Select at least one time slot to continue'}
          {selectedSlots.length === 1 && 'You selected 1 time slot'}
          {selectedSlots.length > 1 && `You selected ${selectedSlots.length} time slots • The coach will choose the final time`}
        </ThemedText>
      </View>

      <Button
        variant="primary"
        onPress={handleAcceptWithSlots}
        disabled={selectedSlots.length === 0}
        style={{ marginTop: Spacing.md }}
      >
        Accept Invite
      </Button>
    </Column>
  );
};

const toggleSlotSelection = (slotId: string) => {
  setSelectedSlots(prev =>
    prev.includes(slotId)
      ? prev.filter(id => id !== slotId)
      : [...prev, slotId]
  );
};

Acceptance criteria:
✓ Explainer card at top explains multi-select purpose
✓ Selected slots visually distinct (border, background)
✓ Checkboxes indicate selection state
✓ Coach's preferred slots badged
✓ Selection count summary at bottom
✓ Accept button disabled until ≥1 slot selected
✓ Clear messaging about coach final confirmation
✓ Single-select mode if coach requires specific time
```

---

## Item 125: Adjust Day Save Greyed Out No Error

**Problem**: Save button disabled when blocking date but no indication what's wrong.

**Files**: `components/coach/adjust-day-modal.tsx` lines ~62-69

**Current behavior**: Validation errors not shown to user.

**Prompt**:
```
Show validation errors for adjust day modal in components/coach/adjust-day-modal.tsx.

Current code (lines 62-69):
<Button disabled={!isValid}>Save</Button>

Add visible validation feedback:

const AdjustDayModal = ({ date, onSave }: Props) => {
  const { colors } = useTheme();
  const [reason, setReason] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const validateForm = (): string[] => {
    const errors: string[] = [];

    if (!reason.trim()) {
      errors.push('Reason is required');
    }

    if (!startTime || !endTime) {
      errors.push('Start and end time are required');
    }

    if (startTime && endTime) {
      const start = parseTime(startTime);
      const end = parseTime(endTime);
      if (start >= end) {
        errors.push('End time must be after start time');
      }
    }

    if (reason.length > 200) {
      errors.push('Reason must be less than 200 characters');
    }

    return errors;
  };

  useEffect(() => {
    setValidationErrors(validateForm());
  }, [reason, startTime, endTime]);

  const isValid = validationErrors.length === 0;

  return (
    <Modal visible animationType="slide">
      <SafeAreaView style={{ flex: 1, padding: Spacing.md }}>
        <Column>
          <ThemedText variant="heading">Adjust Day</ThemedText>

          {/* Validation errors */}
          {validationErrors.length > 0 && (
            <SurfaceCard
              style={{
                backgroundColor: colors.error.surface,
                marginTop: Spacing.md,
                borderLeftWidth: 3,
                borderLeftColor: colors.error.base,
              }}
            >
              <Row style={{ alignItems: 'flex-start' }}>
                <MaterialIcons name="error" size={20} color={colors.error.base} />
                <Column style={{ flex: 1, marginLeft: Spacing.sm }}>
                  {validationErrors.map((error, idx) => (
                    <ThemedText
                      key={idx}
                      variant="bodySmall"
                      style={{ color: colors.error.base, marginBottom: Spacing.xxs }}
                    >
                      • {error}
                    </ThemedText>
                  ))}
                </Column>
              </Row>
            </SurfaceCard>
          )}

          {/* Form fields */}
          <TextInput
            label="Reason"
            value={reason}
            onChangeText={setReason}
            placeholder="e.g., Doctor's appointment"
            maxLength={200}
            error={validationErrors.includes('Reason is required')}
            style={{ marginTop: Spacing.md }}
          />
          <ThemedText variant="caption" color="tertiary">
            {reason.length}/200 characters
          </ThemedText>

          <Row style={{ marginTop: Spacing.md, gap: Spacing.sm }}>
            <Column style={{ flex: 1 }}>
              <TimePicker
                label="Start Time"
                value={startTime}
                onChange={setStartTime}
                error={validationErrors.some(e => e.includes('time'))}
              />
            </Column>
            <Column style={{ flex: 1 }}>
              <TimePicker
                label="End Time"
                value={endTime}
                onChange={setEndTime}
                error={validationErrors.some(e => e.includes('time'))}
              />
            </Column>
          </Row>

          {/* Actions */}
          <Row style={{ marginTop: Spacing.xl, gap: Spacing.sm }}>
            <Button variant="secondary" onPress={onClose} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onPress={handleSave}
              disabled={!isValid}
              style={{ flex: 1 }}
            >
              Save
            </Button>
          </Row>
        </Column>
      </SafeAreaView>
    </Modal>
  );
};

Acceptance criteria:
✓ Validation errors shown in error card
✓ Errors update in real-time as user types
✓ Individual fields show error state
✓ Character count for reason field
✓ Time validation prevents end before start
✓ Save button disabled with visible explanation
✓ All validation rules clear and specific
✓ Error card dismisses when issues resolved
```

---

## Item 126: Athlete Sessions "20+ Older" No Way to View

**Problem**: Shows truncated history but no way to access full list.

**Files**: `components/athlete/athlete-sessions.tsx` lines ~141-145

**Current behavior**: Indicates more sessions exist but no navigation.

**Prompt**:
```
Add "View All Sessions" navigation in components/athlete/athlete-sessions.tsx.

Current code (lines 141-145) shows count but no action:

const AthleteSessionsTab = ({ athleteId }: Props) => {
  const { colors } = useTheme();
  const { recentSessions, olderSessionsCount, isLoading } = useAthleteSessions(athleteId);

  return (
    <Column>
      {/* Recent sessions */}
      <FlatList
        data={recentSessions}
        renderItem={({ item }) => <SessionCard session={item} />}
        ListHeaderComponent={
          <ThemedText variant="subheading" style={{ padding: Spacing.md }}>
            Recent Sessions
          </ThemedText>
        }
        ListFooterComponent={
          olderSessionsCount > 0 ? (
            <Column style={{ padding: Spacing.md, gap: Spacing.sm }}>
              <SurfaceCard
                style={{
                  backgroundColor: colors.background.secondary,
                  alignItems: 'center',
                  paddingVertical: Spacing.lg,
                }}
              >
                <MaterialIcons
                  name="history"
                  size={40}
                  color={colors.text.secondary}
                />
                <ThemedText
                  variant="heading"
                  color="secondary"
                  style={{ marginTop: Spacing.sm }}
                >
                  {olderSessionsCount} Older Sessions
                </ThemedText>
                <ThemedText
                  variant="bodySmall"
                  color="tertiary"
                  style={{ marginTop: Spacing.xxs }}
                >
                  View complete session history
                </ThemedText>
              </SurfaceCard>

              <Button
                variant="secondary"
                onPress={() =>
                  router.push({
                    pathname: '/athlete/[id]/sessions/all',
                    params: { id: athleteId },
                  })
                }
                leftIcon="format-list-bulleted"
              >
                View All {recentSessions.length + olderSessionsCount} Sessions
              </Button>

              {/* Quick stats */}
              <Row style={{ gap: Spacing.sm, marginTop: Spacing.sm }}>
                <SurfaceCard style={{ flex: 1, alignItems: 'center' }}>
                  <ThemedText variant="display">{getTotalHours(athleteId)}</ThemedText>
                  <ThemedText variant="caption" color="secondary">
                    Total Hours
                  </ThemedText>
                </SurfaceCard>
                <SurfaceCard style={{ flex: 1, alignItems: 'center' }}>
                  <ThemedText variant="display">{getAttendanceRate(athleteId)}%</ThemedText>
                  <ThemedText variant="caption" color="secondary">
                    Attendance
                  </ThemedText>
                </SurfaceCard>
              </Row>
            </Column>
          ) : null
        }
      />
    </Column>
  );
};

Create full history screen at app/athlete/[id]/sessions/all.tsx:
NOTE: This is a new route file — it will be auto-registered by Expo Router file-based routing.

export default function AllSessionsScreen() {
  const { id } = useLocalSearchParams();
  const { sessions, isLoading } = useAllAthleteSessions(id as string);

  return (
    <Screen>
      <ScreenHeader title="All Sessions" backButton />

      {/* Filter chips */}
      <Row style={{ padding: Spacing.md, gap: Spacing.xs }}>
        <Chip selected={filter === 'all'} onPress={() => setFilter('all')}>
          All
        </Chip>
        <Chip selected={filter === 'completed'} onPress={() => setFilter('completed')}>
          Completed
        </Chip>
        <Chip selected={filter === 'cancelled'} onPress={() => setFilter('cancelled')}>
          Cancelled
        </Chip>
      </Row>

      <FlatList
        data={filteredSessions}
        renderItem={({ item }) => <SessionCard session={item} />}
        keyExtractor={(item) => item.id}
      />
    </Screen>
  );
}

Acceptance criteria:
✓ "View All" button navigates to full history
✓ Full history screen shows all sessions paginated
✓ Filter chips for completed/cancelled/all
✓ Summary stats shown before navigation
✓ Session count accurate in button label
✓ Back navigation returns to athlete profile
✓ Loading states handled
✓ Empty state if no older sessions
```

---

## Item 140: QuickActions Discover/Find Coach Default No-op

**Problem**: Quick action buttons might not have configured handlers.

**Files**: `components/bookings/QuickActions.tsx` lines ~37, 47

**Current behavior**: Buttons exist but onPress might be undefined or no-op.

**Prompt**:
```
Ensure QuickActions buttons have working handlers in components/bookings/QuickActions.tsx.

Current code (lines 37, 47) may have undefined handlers. Add defaults:

import { router } from 'expo-router';
import { Platform, Linking, Alert, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';

interface QuickActionsProps {
  onDiscoverCoaches?: () => void;
  onFindSession?: () => void;
  onBookTrial?: () => void;
  onInviteFriend?: () => void;
}

const QuickActions = ({
  onDiscoverCoaches,
  onFindSession,
  onBookTrial,
  onInviteFriend,
}: QuickActionsProps) => {
  const { colors } = useTheme();

  const handleDiscoverCoaches = () => {
    if (onDiscoverCoaches) {
      onDiscoverCoaches();
    } else {
      // Default: navigate to discover screen
      router.push('/discover');
    }
  };

  const handleFindSession = () => {
    if (onFindSession) {
      onFindSession();
    } else {
      // Default: navigate to group sessions
      router.push('/group-sessions');
    }
  };

  const handleBookTrial = () => {
    if (onBookTrial) {
      onBookTrial();
    } else {
      // Default: navigate to discover with trial filter
      router.push({
        pathname: '/discover',
        params: { filter: 'trial' },
      });
    }
  };

  const handleInviteFriend = async () => {
    if (onInviteFriend) {
      onInviteFriend();
    } else {
      // Default: share referral link
      const referralCode = await getReferralCode();
      const message = `Join Clubroom! Use my code ${referralCode} for £5 off your first session. ${getReferralLink(referralCode)}`;

      // Use RN Share API (works cross-platform) — NOT navigator.share/navigator.clipboard
      try {
        await Share.share({
          message,
          title: 'Join Clubroom',
        });
      } catch {
        // Fallback: copy to clipboard using expo-clipboard
        await Clipboard.setStringAsync(message);
        Toast.show({ text: 'Referral link copied!', type: 'success' });
      }
    }
  };

  const actions = [
    {
      id: 'discover',
      icon: 'search' as const,
      label: 'Discover Coaches',
      onPress: handleDiscoverCoaches,
      color: colors.primary.base,
    },
    {
      id: 'session',
      icon: 'group' as const,
      label: 'Find Session',
      onPress: handleFindSession,
      color: colors.success.base,
    },
    {
      id: 'trial',
      icon: 'star' as const,
      label: 'Book Trial',
      onPress: handleBookTrial,
      color: colors.warning.base,
    },
    {
      id: 'invite',
      icon: 'person-add' as const,
      label: 'Invite Friend',
      onPress: handleInviteFriend,
      color: colors.info.base,
    },
  ];

  return (
    <Row style={{ padding: Spacing.md, gap: Spacing.sm }}>
      {actions.map(action => (
        <Clickable
          key={action.id}
          onPress={action.onPress}
          style={{ flex: 1 }}
        >
          <SurfaceCard
            style={{
              alignItems: 'center',
              paddingVertical: Spacing.md,
            }}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: withAlpha(action.color, 0.2),
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: Spacing.xs,
              }}
            >
              <MaterialIcons name={action.icon} size={24} color={action.color} />
            </View>
            <ThemedText
              variant="caption"
              style={{ textAlign: 'center' }}
            >
              {action.label}
            </ThemedText>
          </SurfaceCard>
        </Clickable>
      ))}
    </Row>
  );
};

Acceptance criteria:
✓ All buttons have working handlers
✓ Default handlers navigate to relevant screens
✓ Invite Friend shares referral link
✓ Share works on web and native
✓ Fallback to clipboard if share unavailable
✓ Icons color-coded per action type
✓ Visual feedback on press
✓ No console errors from undefined handlers
```

---

## Item 212: New Parent Barren Home Screen

**Problem**: Parents with no bookings see empty screen with no guidance.

**Files**: `components/user/home-screen.tsx`

**Current behavior**: Blank or minimal content when no data.

**Prompt**:
```
Add onboarding flow for new parents in components/user/home-screen.tsx.

Current screen shows nothing for new users. Add guided empty state:

const HomeScreen = () => {
  const { colors } = useTheme();
  const { children } = useCurrentChild();
  const { upcomingSessions, isLoading } = useUpcomingSessions();
  const isNewUser = children.length === 0 || upcomingSessions.length === 0;

  if (isLoading) return <LoadingState />;

  if (isNewUser) {
    return (
      <Column style={{ padding: Spacing.md }}>
        {/* Welcome header */}
        <SurfaceCard
          style={{
            backgroundColor: colors.primary.surface,
            padding: Spacing.lg,
            alignItems: 'center',
          }}
        >
          <ThemedText variant="display" style={{ color: colors.primary.base }}>
            Welcome to Clubroom!
          </ThemedText>
          <ThemedText
            variant="body"
            color="secondary"
            style={{ marginTop: Spacing.xs, textAlign: 'center' }}
          >
            Let's get you started with your first coaching session
          </ThemedText>
        </SurfaceCard>

        {/* Onboarding steps */}
        <Column style={{ marginTop: Spacing.lg, gap: Spacing.md }}>
          <OnboardingStep
            number={1}
            title="Add Your Child"
            description="Create a profile to track progress and book sessions"
            icon="person-add"
            completed={children.length > 0}
            action={{
              label: children.length > 0 ? 'View Profile' : 'Add Child',
              onPress: () =>
                children.length > 0
                  ? router.push(`/child/${children[0].id}`)
                  : router.push('/(modal)/add-child'),
            }}
          />

          <OnboardingStep
            number={2}
            title="Find a Coach"
            description="Browse local coaches and read reviews from other parents"
            icon="search"
            disabled={children.length === 0}
            action={{
              label: 'Discover Coaches',
              onPress: () => router.push('/discover'),
            }}
          />

          <OnboardingStep
            number={3}
            title="Book Your First Session"
            description="Try a one-off session or commit to regular coaching"
            icon="event"
            disabled={children.length === 0}
            action={{
              label: 'Browse Sessions',
              onPress: () => router.push('/group-sessions'),
            }}
          />
        </Column>

        {/* Help card */}
        <SurfaceCard
          style={{
            marginTop: Spacing.xl,
            backgroundColor: colors.background.secondary,
          }}
        >
          <Row style={{ alignItems: 'flex-start' }}>
            <MaterialIcons name="help" size={24} color={colors.primary.base} />
            <Column style={{ flex: 1, marginLeft: Spacing.sm }}>
              <ThemedText variant="subheading">Need Help Getting Started?</ThemedText>
              <ThemedText
                variant="bodySmall"
                color="secondary"
                style={{ marginTop: Spacing.xxs }}
              >
                Our support team is here to help you find the perfect coach for your child.
              </ThemedText>
              <Button
                variant="secondary"
                size="small"
                onPress={() => router.push('/support')}
                style={{ marginTop: Spacing.sm, alignSelf: 'flex-start' }}
              >
                Contact Support
              </Button>
            </Column>
          </Row>
        </SurfaceCard>
      </Column>
    );
  }

  // Existing home screen for active users
  return (
    <ScrollView>
      {/* ... existing content ... */}
    </ScrollView>
  );
};

const OnboardingStep = ({ number, title, description, icon, completed, disabled, action }: StepProps) => {
  const { colors } = useTheme();

  return (
    <SurfaceCard
      style={{
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Row style={{ alignItems: 'flex-start' }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: completed
              ? colors.success.base
              : disabled
              ? colors.background.tertiary
              : colors.primary.base,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {completed ? (
            <MaterialIcons name="check" size={24} color={colors.text.inverse} />
          ) : (
            <ThemedText variant="heading" style={{ color: colors.text.inverse }}>
              {number}
            </ThemedText>
          )}
        </View>

        <Column style={{ flex: 1, marginLeft: Spacing.sm }}>
          <ThemedText variant="subheading">{title}</ThemedText>
          <ThemedText
            variant="bodySmall"
            color="secondary"
            style={{ marginTop: Spacing.xxs }}
          >
            {description}
          </ThemedText>

          {!completed && action && (
            <Button
              variant="secondary"
              size="small"
              onPress={action.onPress}
              disabled={disabled}
              style={{ marginTop: Spacing.sm, alignSelf: 'flex-start' }}
              leftIcon={icon}
            >
              {action.label}
            </Button>
          )}
        </Column>
      </Row>
    </SurfaceCard>
  );
};

Acceptance criteria:
✓ New users see guided onboarding steps
✓ Steps show completion status
✓ Sequential flow (must add child first)
✓ Clear CTAs for each step
✓ Help/support always accessible
✓ Completed steps show checkmark
✓ Disabled steps visually distinct
✓ Smooth transition to regular home screen after first booking
```

---

## Item 317: PackageCard No onPress Fallback

**Problem**: Package cards may be tappable but have no default action.

**Files**: `components/packages/PackageCard.tsx` lines ~48-50

**Current behavior**: onPress prop required but may be undefined.

**Prompt**:
```
Add default onPress handler to PackageCard in components/packages/PackageCard.tsx.

Current code (lines 48-50):
<Clickable onPress={onPress}>

Make onPress optional with default:

import { router } from 'expo-router';

interface PackageCardProps {
  package: Package;
  onPress?: () => void;
  variant?: 'default' | 'compact';
}

const PackageCard = ({ package: pkg, onPress, variant = 'default' }: Props) => {
  const { colors } = useTheme();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      // Default: navigate to package detail
      router.push({
        pathname: '/packages/[id]',
        params: { id: pkg.id },
      });
    }
  };

  return (
    <Clickable
      onPress={handlePress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.8 : 1,
      })}
    >
        <SurfaceCard
          style={{
            borderWidth: pkg.isPopular ? 2 : 0,
            borderColor: pkg.isPopular ? colors.primary.base : 'transparent',
          }}
        >
          {/* Popular badge */}
          {pkg.isPopular && (
            <Badge
              variant="primary"
              size="small"
              style={{ position: 'absolute', top: -8, right: Spacing.md }}
            >
              Most Popular
            </Badge>
          )}

          {/* Package content */}
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Column style={{ flex: 1 }}>
              <ThemedText variant="heading">{pkg.name}</ThemedText>
              <ThemedText
                variant="bodySmall"
                color="secondary"
                style={{ marginTop: Spacing.xxs }}
              >
                {pkg.sessionCount} sessions • {pkg.durationWeeks} weeks
              </ThemedText>
            </Column>

            <Column style={{ alignItems: 'flex-end' }}>
              <ThemedText variant="display" style={{ color: colors.primary.base }}>
                £{pkg.price}
              </ThemedText>
              {pkg.savings > 0 && (
                <ThemedText variant="caption" style={{ color: colors.success.base }}>
                  Save £{pkg.savings}
                </ThemedText>
              )}
            </Column>
          </Row>

          {/* Features */}
          <Column style={{ marginTop: Spacing.sm, gap: Spacing.xxs }}>
            {pkg.features.map((feature, idx) => (
              <Row key={idx} style={{ alignItems: 'center' }}>
                <MaterialIcons
                  name="check"
                  size={16}
                  color={colors.success.base}
                />
                <ThemedText
                  variant="bodySmall"
                  style={{ marginLeft: Spacing.xxs }}
                >
                  {feature}
                </ThemedText>
              </Row>
            ))}
          </Column>

          {/* CTA hint */}
          <Row style={{
            marginTop: Spacing.sm,
            paddingTop: Spacing.sm,
            borderTopWidth: 1,
            borderTopColor: colors.border.base,
            alignItems: 'center',
          }}>
            <ThemedText variant="bodySmall" style={{ color: colors.primary.base }}>
              View Details
            </ThemedText>
            <Spacer />
            <MaterialIcons
              name="arrow-forward"
              size={20}
              color={colors.primary.base}
            />
          </Row>
        </SurfaceCard>
    </Clickable>
  );
};

Acceptance criteria:
✓ onPress is optional prop
✓ Default navigates to package detail screen
✓ Custom handler works when provided
✓ Visual feedback on press (opacity)
✓ Popular packages badged
✓ Savings highlighted if applicable
✓ Features list with checkmarks
✓ "View Details" CTA hint at bottom
✓ Accessible (role, label, hint)
```

---

## Sprint 1 Summary

**Total Items**: 12
**Estimated Effort**: 22-28 hours
**Priority**: HIGH - user frustration and trust issues

**Dependency Map**:
- Items 4, 140, 212 require navigation setup → establish routing first
- Items 10, 123, 124, 125 similar validation patterns → create shared ValidationMessage component
- Items 126, 317 need detail screens → create if missing

**Success Criteria**:
- ✓ No disabled buttons without explanation
- ✓ All interactive elements have working handlers
- ✓ New users see guided onboarding
- ✓ Dead-end screens provide next actions
- ✓ Validation errors visible and actionable

**Testing Focus**:
- New user onboarding flow
- Validation message clarity
- Default navigation paths
- Edge cases (no coaches, no children, expired invites)
- Share functionality across platforms

**Architecture Notes**:
- Screen-level items (4, 25, 27, 126, 212) should use the `useScreen()` hook for data loading
  (provides state machine: loading -> error -> empty -> success + refresh + events)
- All screen files must implement 4 visual states: LoadingState, ErrorState, EmptyState, success content

**Risk Areas**:
- Onboarding step sequencing logic
- Multi-platform share API differences (use RN Share, NOT navigator.share)
- Validation rule complexity
- Navigation state management
- Default handler conflicts with custom handlers
