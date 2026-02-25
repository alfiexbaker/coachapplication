# Dead Ends Sprint 2: Polish & Hidden Affordances

**Sprint Goal**: Fix UI elements that have hidden interactions, unclear affordances, or polish issues. These are "papercut" UX problems that reduce discoverability and delight.

**Items**: 8 (11, 32, 57, 58, 153, 154, 196, 200)

---

## Item 11: Availability Grid Long-Press Invisible

**Problem**: Long-press functionality exists but has no visual hint or documentation.

**Files**: `components/coach/availability-grid.tsx` line ~131

**Current behavior**: Hidden Easter egg interaction with no discoverability.

**Prompt**:
```
Add visual hints for long-press interaction in components/coach/availability-grid.tsx.

Current code (line ~131) supports long-press but it's invisible. Add discovery cues:

import { useState, useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  cancelAnimation
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AvailabilityGrid = () => {
  const { colors } = useTheme();
  const [showHint, setShowHint] = useState(false);
  const pulseScale = useSharedValue(1);

  // Show hint on first load for new users
  useEffect(() => {
    const checkIfNewUser = async () => {
      const hasSeenHint = await apiClient.get('AVAILABILITY_HINT_SEEN', false);
      if (!hasSeenHint) {
        setShowHint(true);
        // Pulse animation
        pulseScale.value = withRepeat(
          withSequence(
            withSpring(1.1),
            withSpring(1.0)
          ),
          3,
          false
        );

        // Hide after 5 seconds
        setTimeout(() => {
          setShowHint(false);
          cancelAnimation(pulseScale);
          apiClient.set('AVAILABILITY_HINT_SEEN', true);
        }, 5000);
      }
    };

    checkIfNewUser();
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <View>
      {/* Hint tooltip */}
      {showHint && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: -60,
              alignSelf: 'center',
              width: 240,
              backgroundColor: colors.primary.base,
              padding: Spacing.sm,
              borderRadius: Radii.sm,
              zIndex: 100,
              ...Shadows[scheme].card,
            },
            pulseStyle,
          ]}
        >
          <Row style={{ alignItems: 'flex-start' }}>
            <MaterialIcons name="touch-app" size={20} color={colors.text.inverse} />
            <Column style={{ flex: 1, marginLeft: Spacing.xs }}>
              <ThemedText variant="bodySmall" style={{ color: colors.text.inverse }}>
                Tip: Long-press time slots to multi-select
              </ThemedText>
            </Column>
            <Clickable onPress={() => setShowHint(false)}>
              <MaterialIcons name="close" size={16} color={colors.text.inverse} />
            </Clickable>
          </Row>
          {/* Arrow */}
          <View
            style={{
              position: 'absolute',
              bottom: -8,
              alignSelf: 'center',
              width: 0,
              height: 0,
              borderLeftWidth: 8,
              borderRightWidth: 8,
              borderTopWidth: 8,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderTopColor: colors.primary.base,
            }}
          />
        </Animated.View>
      )}

      {/* Time slot grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs }}>
        {timeSlots.map((slot) => (
          <TimeSlot
            key={slot.id}
            slot={slot}
            onPress={handleSlotPress}
            onLongPress={handleSlotLongPress}
            isMultiSelectMode={multiSelectMode}
          />
        ))}
      </View>

      {/* Multi-select mode indicator */}
      {multiSelectMode && (
        <SurfaceCard
          style={{
            marginTop: Spacing.md,
            backgroundColor: colors.primary.surface,
            borderLeftWidth: 3,
            borderLeftColor: colors.primary.base,
          }}
        >
          <Row style={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Row style={{ alignItems: 'center', flex: 1 }}>
              <MaterialIcons name="check-box" size={20} color={colors.primary.base} />
              <ThemedText
                variant="bodySmall"
                style={{ marginLeft: Spacing.xs, color: colors.primary.base }}
              >
                {selectedSlots.length} slots selected • Tap slots to add/remove
              </ThemedText>
            </Row>
            <Clickable onPress={exitMultiSelectMode}>
              <ThemedText variant="bodySmall" style={{ color: colors.primary.base }}>
                Done
              </ThemedText>
            </Clickable>
          </Row>
        </SurfaceCard>
      )}

      {/* Action buttons when multi-select active */}
      {multiSelectMode && selectedSlots.length > 0 && (
        <Row style={{ marginTop: Spacing.sm, gap: Spacing.sm }}>
          <Button
            variant="secondary"
            onPress={handleBulkDelete}
            style={{ flex: 1 }}
            leftIcon="delete"
          >
            Delete ({selectedSlots.length})
          </Button>
          <Button
            variant="primary"
            onPress={handleBulkToggle}
            style={{ flex: 1 }}
            leftIcon="swap-horiz"
          >
            Toggle Availability
          </Button>
        </Row>
      )}
    </View>
  );
};

const TimeSlot = ({ slot, onPress, onLongPress, isMultiSelectMode }: SlotProps) => {
  const { colors } = useTheme();
  const [isPressed, setIsPressed] = useState(false);

  const handleLongPress = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onLongPress(slot);
  };

  return (
    <Clickable
      onPress={() => onPress(slot)}
      onLongPress={handleLongPress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      delayLongPress={500}
    >
      <View
        style={{
          padding: Spacing.sm,
          backgroundColor: slot.isSelected
            ? colors.primary.surface
            : colors.background.secondary,
          borderWidth: slot.isSelected ? 2 : 1,
          borderColor: slot.isSelected ? colors.primary.base : colors.border.base,
          borderRadius: Radii.sm,
          opacity: isPressed ? 0.7 : 1,
        }}
      >
        {isMultiSelectMode && (
          <MaterialIcons
            name={slot.isSelected ? 'check-box' : 'check-box-outline-blank'}
            size={16}
            color={slot.isSelected ? colors.primary.base : colors.text.tertiary}
            style={{ position: 'absolute', top: 4, right: 4 }}
          />
        )}
        <ThemedText variant="bodySmall">{formatTime(slot.time)}</ThemedText>
      </View>
    </Clickable>
  );
};

Acceptance criteria:
✓ First-time users see animated hint tooltip
✓ Hint auto-dismisses after 5s or on close
✓ Long-press activates multi-select mode
✓ Haptic feedback on long-press (iOS/Android)
✓ Multi-select mode shows counter and "Done" button
✓ Selected slots visually distinct (checkbox, border)
✓ Bulk actions available in multi-select mode
✓ "Done" exits multi-select mode
✓ Hint never shows again after dismissal
```

---

## Item 32: Club Read-Only No Way to Request Access

**Problem**: Users viewing club they can't edit have no way to request permission or join.

**Files**: `app/club/settings.tsx`

**Current behavior**: Read-only view with no CTA for joining or requesting access.

**Prompt**:
```
Add join/request access flow to read-only club view in app/club/settings.tsx.

Current screen shows settings for admins only. Add member view:

import { router } from 'expo-router';
import { Alert } from 'react-native';

const ClubSettingsScreen = () => {
  const { club, currentUserRole, isLoading } = useClubSettings();
  const { colors } = useTheme();

  if (isLoading) return <LoadingState />;

  // Admin/Editor view: existing settings
  if (currentUserRole === 'admin' || currentUserRole === 'editor') {
    return (
      <ScrollView>
        {/* Existing admin settings */}
      </ScrollView>
    );
  }

  // Member view: limited info + actions
  if (currentUserRole === 'member') {
    return (
      <ScrollView style={{ padding: Spacing.md }}>
        <ThemedText variant="heading" style={{ marginBottom: Spacing.md }}>
          {club.name}
        </ThemedText>

        <SurfaceCard style={{ marginBottom: Spacing.md }}>
          <ThemedText variant="subheading" style={{ marginBottom: Spacing.sm }}>
            Your Membership
          </ThemedText>
          <Row style={{ alignItems: 'center', marginBottom: Spacing.xs }}>
            <MaterialIcons name="badge" size={20} color={colors.text.secondary} />
            <ThemedText variant="body" style={{ marginLeft: Spacing.xs }}>
              Role: Member
            </ThemedText>
          </Row>
          <Row style={{ alignItems: 'center' }}>
            <MaterialIcons name="event" size={20} color={colors.text.secondary} />
            <ThemedText variant="body" style={{ marginLeft: Spacing.xs }}>
              Joined {formatDate(club.memberSince)}
            </ThemedText>
          </Row>
        </SurfaceCard>

        <Button
          variant="secondary"
          onPress={handleLeaveClub}
          leftIcon="exit-to-app"
        >
          Leave Club
        </Button>
      </ScrollView>
    );
  }

  // Non-member view: join options
  return (
    <ScrollView style={{ padding: Spacing.md }}>
      <SurfaceCard style={{ marginBottom: Spacing.lg }}>
        <ThemedText variant="display" style={{ marginBottom: Spacing.sm }}>
          {club.name}
        </ThemedText>
        <ThemedText variant="body" color="secondary" style={{ marginBottom: Spacing.md }}>
          {club.description}
        </ThemedText>

        <Row style={{ gap: Spacing.md }}>
          <Column style={{ alignItems: 'center', flex: 1 }}>
            <ThemedText variant="heading">{club.memberCount}</ThemedText>
            <ThemedText variant="caption" color="secondary">
              Members
            </ThemedText>
          </Column>
          <Column style={{ alignItems: 'center', flex: 1 }}>
            <ThemedText variant="heading">{club.squadCount}</ThemedText>
            <ThemedText variant="caption" color="secondary">
              Squads
            </ThemedText>
          </Column>
          <Column style={{ alignItems: 'center', flex: 1 }}>
            <ThemedText variant="heading">{club.eventCount}</ThemedText>
            <ThemedText variant="caption" color="secondary">
              Events
            </ThemedText>
          </Column>
        </Row>
      </SurfaceCard>

      {/* Membership type */}
      {club.isPublic ? (
        <Column style={{ gap: Spacing.sm }}>
          <SurfaceCard
            style={{
              backgroundColor: colors.success.surface,
              borderLeftWidth: 3,
              borderLeftColor: colors.success.base,
            }}
          >
            <Row style={{ alignItems: 'flex-start' }}>
              <MaterialIcons name="public" size={24} color={colors.success.base} />
              <Column style={{ flex: 1, marginLeft: Spacing.sm }}>
                <ThemedText variant="subheading" style={{ color: colors.success.base }}>
                  Open Club
                </ThemedText>
                <ThemedText variant="bodySmall" color="secondary">
                  Anyone can join immediately
                </ThemedText>
              </Column>
            </Row>
          </SurfaceCard>

          <Button variant="primary" onPress={handleJoinClub} leftIcon="person-add">
            Join Club
          </Button>
        </Column>
      ) : (
        <Column style={{ gap: Spacing.sm }}>
          <SurfaceCard
            style={{
              backgroundColor: colors.warning.surface,
              borderLeftWidth: 3,
              borderLeftColor: colors.warning.base,
            }}
          >
            <Row style={{ alignItems: 'flex-start' }}>
              <MaterialIcons name="lock" size={24} color={colors.warning.base} />
              <Column style={{ flex: 1, marginLeft: Spacing.sm }}>
                <ThemedText variant="subheading" style={{ color: colors.warning.base }}>
                  Private Club
                </ThemedText>
                <ThemedText variant="bodySmall" color="secondary">
                  Membership requires approval from club admin
                </ThemedText>
              </Column>
            </Row>
          </SurfaceCard>

          <Button variant="primary" onPress={handleRequestAccess} leftIcon="mail">
            Request to Join
          </Button>
        </Column>
      )}

      {/* Contact admin */}
      <SurfaceCard style={{ marginTop: Spacing.lg }}>
        <ThemedText variant="subheading" style={{ marginBottom: Spacing.sm }}>
          Club Admin
        </ThemedText>
        <Row style={{ alignItems: 'center', marginBottom: Spacing.sm }}>
          <Avatar uri={club.admin.photoUri} size="md" name={club.admin.name} />
          <Column style={{ marginLeft: Spacing.sm, flex: 1 }}>
            <ThemedText variant="body">{club.admin.name}</ThemedText>
            <ThemedText variant="bodySmall" color="secondary">
              {club.admin.role}
            </ThemedText>
          </Column>
        </Row>
        <Button
          variant="secondary"
          size="small"
          onPress={() => router.push(`/chat/compose?recipientId=${club.admin.id}`)}
          leftIcon="chat"
        >
          Contact Admin
        </Button>
      </SurfaceCard>
    </ScrollView>
  );
};

const handleJoinClub = async () => {
  const result = await clubService.joinClub(club.id);
  if (result.success) {
    Toast.show({ text: 'Joined club!', type: 'success' });
    router.push(`/club/${club.id}`);
  } else {
    Alert.alert('Error', result.error.message);
  }
};

const handleRequestAccess = async () => {
  Alert.alert(
    'Request to Join',
    'Send a message to the club admin with your request?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send Request',
        onPress: async () => {
          const result = await clubService.requestMembership(club.id);
          if (result.success) {
            Toast.show({
              text: 'Request sent! The admin will review your request.',
              type: 'success',
              duration: 4000,
            });
          }
        },
      },
    ]
  );
};

const handleLeaveClub = async () => {
  Alert.alert(
    'Leave Club?',
    'You\'ll no longer have access to club events and squads.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          const result = await clubService.leaveClub(club.id);
          if (result.success) {
            Toast.show({ text: 'Left club', type: 'info' });
            router.back();
          }
        },
      },
    ]
  );
};

Acceptance criteria:
✓ Non-members see public/private status
✓ Public clubs show "Join Club" button
✓ Private clubs show "Request to Join" button
✓ Members can leave club with confirmation
✓ Contact admin button for questions
✓ Club stats visible to all (members, squads, events)
✓ Join requests tracked and notified
✓ Success feedback after joining
```

---

## Item 57: Homework Completed State Still Looks Tappable

**Problem**: Completed homework cards respond to taps but shouldn't be interactive.

**Files**: `components/progress/homework-card.tsx` lines ~57-86

**Current behavior**: Pressable styling remains after completion.

**Prompt**:
```
Make completed homework visually static in components/progress/homework-card.tsx.

Current code (lines 57-86) uses Pressable for all states. Replace with Clickable/View:

import { View } from 'react-native';
import { Clickable } from '@/components/primitives';

interface HomeworkCardProps {
  homework: Homework;
  onPress?: () => void;
  onMarkComplete?: () => void;
}

const HomeworkCard = ({ homework, onPress, onMarkComplete }: Props) => {
  const { colors } = useTheme();
  const isCompleted = homework.status === 'completed';

  // Completed: static view
  if (isCompleted) {
    return (
      <View
        style={{
          backgroundColor: colors.background.secondary,
          padding: Spacing.md,
          borderRadius: Radii.card,
          opacity: 0.7,
        }}
      >
        {/* Success banner */}
        <Row
          style={{
            backgroundColor: colors.success.surface,
            padding: Spacing.sm,
            borderRadius: Radii.sm,
            marginBottom: Spacing.sm,
          }}
        >
          <MaterialIcons name="check-circle" size={20} color={colors.success.base} />
          <ThemedText
            variant="bodySmall"
            style={{ marginLeft: Spacing.xs, color: colors.success.base }}
          >
            Completed on {formatDate(homework.completedAt)}
          </ThemedText>
        </Row>

        {/* Content (greyed out) */}
        <ThemedText variant="subheading" style={{ textDecorationLine: 'line-through' }}>
          {homework.title}
        </ThemedText>
        <ThemedText
          variant="bodySmall"
          color="tertiary"
          style={{ marginTop: Spacing.xxs }}
        >
          {homework.description}
        </ThemedText>

        {/* Evidence link if present */}
        {homework.evidenceUri && (
          <Clickable
            onPress={() => router.push(`/progress/homework/${homework.id}/evidence`)}
            style={{ marginTop: Spacing.sm }}
          >
            <Row style={{ alignItems: 'center' }}>
              <MaterialIcons name="attach-file" size={16} color={colors.primary.base} />
              <ThemedText
                variant="bodySmall"
                style={{ marginLeft: Spacing.xxs, color: colors.primary.base }}
              >
                View Evidence
              </ThemedText>
            </Row>
          </Clickable>
        )}
      </View>
    );
  }

  // Incomplete: interactive card
  return (
    <Clickable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: colors.background.base,
        padding: Spacing.md,
        borderRadius: Radii.card,
        borderWidth: 2,
        borderColor: homework.isOverdue ? colors.error.base : colors.border.base,
        opacity: pressed ? 0.8 : 1,
        ...Shadows[scheme].card,
      })}
    >
      {/* Overdue badge */}
      {homework.isOverdue && (
        <Badge
          variant="error"
          size="small"
          style={{ position: 'absolute', top: Spacing.sm, right: Spacing.sm }}
        >
          Overdue
        </Badge>
      )}

      {/* Content */}
      <ThemedText variant="subheading">{homework.title}</ThemedText>
      <ThemedText
        variant="bodySmall"
        color="secondary"
        style={{ marginTop: Spacing.xxs }}
      >
        {homework.description}
      </ThemedText>

      {/* Due date */}
      {homework.dueDate && (
        <Row style={{ marginTop: Spacing.sm, alignItems: 'center' }}>
          <MaterialIcons
            name="schedule"
            size={16}
            color={homework.isOverdue ? colors.error.base : colors.text.secondary}
          />
          <ThemedText
            variant="caption"
            style={{
              marginLeft: Spacing.xxs,
              color: homework.isOverdue ? colors.error.base : colors.text.secondary,
            }}
          >
            Due {formatRelativeDate(homework.dueDate)}
          </ThemedText>
        </Row>
      )}

      {/* Actions */}
      <Row style={{ marginTop: Spacing.md, gap: Spacing.sm }}>
        <Button
          variant="secondary"
          size="small"
          onPress={onPress}
          style={{ flex: 1 }}
        >
          View Details
        </Button>
        <Button
          variant="primary"
          size="small"
          onPress={onMarkComplete}
          style={{ flex: 1 }}
        >
          Mark Complete
        </Button>
      </Row>
    </Clickable>
  );
};

Acceptance criteria:
✓ Completed homework uses View (not Pressable/Clickable)
✓ Completed content greyed out with line-through
✓ Success badge shows completion date
✓ Evidence link remains tappable if present
✓ Incomplete homework has interactive styling
✓ Overdue homework shows red border and badge
✓ Clear visual distinction between states
✓ No accidental taps on completed items
```

---

## Item 58: Locked Cosmetics Accept Taps

**Problem**: Locked cosmetic items are tappable but should be disabled.

**Files**: `components/progress/cosmetic-selector.tsx` lines ~29-36

**Current behavior**: All items use same Pressable, locked items just show lock icon.

**Prompt**:
```
Disable locked cosmetics in components/progress/cosmetic-selector.tsx.

Current code (lines 29-36) makes all items tappable. Add locked state:

const CosmeticSelector = ({ cosmetics, selectedId, onSelect }: Props) => {
  const { colors } = useTheme();

  return (
    <Row style={{ flexWrap: 'wrap', gap: Spacing.sm }}>
      {cosmetics.map(cosmetic => (
        <CosmeticItem
          key={cosmetic.id}
          cosmetic={cosmetic}
          isSelected={cosmetic.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </Row>
  );
};

interface CosmeticItemProps {
  cosmetic: Cosmetic;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const CosmeticItem = ({ cosmetic, isSelected, onSelect }: CosmeticItemProps) => {
  const { colors } = useTheme();

  const handlePress = () => {
    if (cosmetic.isLocked) {
      Alert.alert(
        `${cosmetic.name} Locked`,
        cosmetic.unlockRequirement,
        [
          { text: 'OK' },
          cosmetic.unlockAction && {
            text: cosmetic.unlockActionLabel,
            onPress: cosmetic.unlockAction,
          },
        ].filter(Boolean)
      );
    } else {
      onSelect(cosmetic.id);
    }
  };

  return (
    <Clickable
      onPress={handlePress}
      disabled={cosmetic.isLocked}
      style={({ pressed }) => ({
        width: 80,
        alignItems: 'center',
        opacity: cosmetic.isLocked ? 0.5 : pressed ? 0.8 : 1,
      })}
    >
      <View
        style={{
          width: 60,
          height: 60,
          borderRadius: Radii.sm,
          borderWidth: 2,
          borderColor: isSelected ? colors.primary.base : colors.border.base,
          backgroundColor: isSelected ? colors.primary.surface : colors.background.secondary,
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
        }}
      >
        {/* Cosmetic preview */}
        <Image
          source={{ uri: cosmetic.thumbnailUri }}
          style={{
            width: 40,
            height: 40,
            tintColor: cosmetic.isLocked ? colors.text.tertiary : undefined,
          }}
        />

        {/* Lock overlay */}
        {cosmetic.isLocked && (
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: withAlpha(colors.background.base, 0.8),
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: Radii.sm,
            }}
          >
            <MaterialIcons name="lock" size={24} color={colors.text.tertiary} />
          </View>
        )}

        {/* Selection checkmark */}
        {isSelected && !cosmetic.isLocked && (
          <View
            style={{
              position: 'absolute',
              top: -6,
              right: -6,
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: colors.primary.base,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <MaterialIcons name="check" size={14} color={colors.text.inverse} />
          </View>
        )}
      </View>

      {/* Name */}
      <ThemedText
        variant="caption"
        color={cosmetic.isLocked ? 'tertiary' : 'primary'}
        style={{
          marginTop: Spacing.xxs,
          textAlign: 'center',
        }}
      >
        {cosmetic.name}
      </ThemedText>

      {/* Unlock hint */}
      {cosmetic.isLocked && cosmetic.unlockHint && (
        <ThemedText
          variant="micro"
          color="tertiary"
          style={{
            marginTop: 2,
            textAlign: 'center',
          }}
        >
          {cosmetic.unlockHint}
        </ThemedText>
      )}
    </Clickable>
  );
};

// Cosmetic type with unlock info
interface Cosmetic {
  id: string;
  name: string;
  thumbnailUri: string;
  isLocked: boolean;
  unlockRequirement?: string; // e.g., "Complete 10 sessions"
  unlockHint?: string; // e.g., "6/10 sessions"
  unlockAction?: () => void; // e.g., navigate to sessions
  unlockActionLabel?: string; // e.g., "View Progress"
}

Acceptance criteria:
✓ Locked cosmetics have disabled={true}
✓ Locked items show lock icon overlay
✓ Locked items greyed out (50% opacity)
✓ Tapping locked item shows unlock requirement
✓ Unlock alert can include action button
✓ Unlock hint shows progress (e.g., "6/10")
✓ Selected items show checkmark (unlocked only)
✓ Clear visual distinction locked vs unlocked
```

---

## Item 153: Members Panel "Tap to Manage" Shown to Non-Admins

**Problem**: Non-admin members see "Tap to manage" hint but tapping does nothing.

**Files**: `components/club/MembersPanel.tsx` lines ~99-101

**Current behavior**: Hint text shown to all users regardless of permission.

**Prompt**:
```
Make "Tap to manage" role-aware in components/club/MembersPanel.tsx.

Current code (lines 99-101) shows hint unconditionally. Add permission check:

interface MembersPanelProps {
  clubId: string;
  currentUserRole: 'admin' | 'editor' | 'member' | 'viewer';
}

const MembersPanel = ({ clubId, currentUserRole }: Props) => {
  const { colors } = useTheme();
  const { members, isLoading } = useClubMembers(clubId);
  const canManage = currentUserRole === 'admin' || currentUserRole === 'editor';

  if (isLoading) return <LoadingState />;

  return (
    <SurfaceCard>
      <Row style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
        <ThemedText variant="subheading">
          Members ({members.length})
        </ThemedText>

        {canManage && (
          <Clickable onPress={() => router.push(`/club/${clubId}/members`)}>
            <Row style={{ alignItems: 'center' }}>
              <ThemedText variant="bodySmall" style={{ color: colors.primary.base }}>
                Manage
              </ThemedText>
              <MaterialIcons
                name="chevron-right"
                size={20}
                color={colors.primary.base}
              />
            </Row>
          </Clickable>
        )}
      </Row>

      {/* Member avatars */}
      <Row style={{ flexWrap: 'wrap', gap: Spacing.xs }}>
        {members.slice(0, 12).map(member => (
          <Clickable
            key={member.id}
            onPress={() => {
              if (canManage) {
                router.push(`/club/${clubId}/members/${member.id}`);
              } else {
                router.push(`/profile/${member.id}`);
              }
            }}
          >
            <View>
              <Avatar uri={member.photoUri} size="md" name={member.name} />
              {member.role === 'admin' && (
                <View
                  style={{
                    position: 'absolute',
                    bottom: -4,
                    right: -4,
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: colors.warning.base,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 2,
                    borderColor: colors.background.base,
                  }}
                >
                  <MaterialIcons name="star" size={12} color={colors.text.inverse} />
                </View>
              )}
            </View>
          </Clickable>
        ))}

        {/* Don't use disabled Pressable for non-admins — conditionally render as View */}
        {members.length > 12 && (
          canManage ? (
            <Clickable onPress={() => router.push(`/club/${clubId}/members`)}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: colors.background.tertiary,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <ThemedText variant="bodySmall" color="secondary">
                  +{members.length - 12}
                </ThemedText>
              </View>
            </Clickable>
          ) : (
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: colors.background.tertiary,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <ThemedText variant="bodySmall" color="secondary">
                +{members.length - 12}
              </ThemedText>
            </View>
          )
        )}
      </Row>

      {/* Hint for admins only */}
      {canManage && (
        <ThemedText
          variant="caption"
          color="tertiary"
          style={{ marginTop: Spacing.sm }}
        >
          Tap members to edit roles or remove from club
        </ThemedText>
      )}

      {/* Info for non-admins */}
      {!canManage && members.length > 12 && (
        <ThemedText
          variant="caption"
          color="tertiary"
          style={{ marginTop: Spacing.sm }}
        >
          Tap a member to view their profile
        </ThemedText>
      )}
    </SurfaceCard>
  );
};

Acceptance criteria:
✓ "Manage" button shown to admin/editor only
✓ Hint text role-specific
✓ Admins: "Tap to edit roles or remove"
✓ Non-admins: "Tap to view all members"
✓ Member taps navigate based on permission
✓ Admin badge shown on admin avatars
✓ "+X" overflow badge navigates if allowed
✓ Non-admin overflow badge disabled
```

---

## Item 154: Create Match Squad Dead End When No Squads

**Problem**: "Create Match" requires squad selection but shows empty dropdown if no squads exist.

**Files**: `components/match/create-match-squad.tsx` lines ~83-88

**Current behavior**: Empty dropdown with no guidance.

**Prompt**:
```
Add squad creation prompt to create match flow in components/match/create-match-squad.tsx.

Current code (lines 83-88) shows empty dropdown. Add creation flow:

const CreateMatchSquadStep = ({ clubId, onSquadSelected }: Props) => {
  const { colors } = useTheme();
  const { squads, isLoading } = useClubSquads(clubId);

  if (isLoading) return <LoadingState />;

  // No squads: show creation prompt
  if (squads.length === 0) {
    return (
      <Column style={{ padding: Spacing.md }}>
        <EmptyState
          icon="groups"
          title="No Squads Yet"
          description="Create a squad to organize matches and track team progress"
        />

        <SurfaceCard
          style={{
            backgroundColor: colors.primary.surface,
            marginTop: Spacing.md,
          }}
        >
          <Row style={{ alignItems: 'flex-start' }}>
            <MaterialIcons name="info" size={24} color={colors.primary.base} />
            <Column style={{ flex: 1, marginLeft: Spacing.sm }}>
              <ThemedText variant="subheading" style={{ color: colors.primary.base }}>
                What's a Squad?
              </ThemedText>
              <ThemedText
                variant="bodySmall"
                color="secondary"
                style={{ marginTop: Spacing.xxs }}
              >
                Squads are groups of athletes you can organize for matches, training sessions, and tournaments.
              </ThemedText>
            </Column>
          </Row>
        </SurfaceCard>

        <Column style={{ marginTop: Spacing.lg, gap: Spacing.sm }}>
          <Button
            variant="primary"
            onPress={() =>
              router.push({
                pathname: '/(modal)/create-squad',
                params: { clubId, returnTo: 'match-create' },
              })
            }
            leftIcon="add"
          >
            Create Your First Squad
          </Button>

          <Button
            variant="secondary"
            onPress={() => router.back()}
          >
            Cancel
          </Button>
        </Column>
      </Column>
    );
  }

  // Has squads: show selector
  return (
    <Column style={{ padding: Spacing.md }}>
      <ThemedText variant="heading" style={{ marginBottom: Spacing.sm }}>
        Select Squad
      </ThemedText>
      <ThemedText variant="bodySmall" color="secondary" style={{ marginBottom: Spacing.md }}>
        Choose which squad will play in this match
      </ThemedText>

      {squads.map(squad => (
        <Clickable
          key={squad.id}
          onPress={() => onSquadSelected(squad)}
        >
          <SurfaceCard
            style={{
              marginBottom: Spacing.xs,
              borderWidth: 2,
              borderColor: 'transparent',
            }}
          >
            <Row style={{ alignItems: 'center', justifyContent: 'space-between' }}>
              <Column style={{ flex: 1 }}>
                <ThemedText variant="subheading">{squad.name}</ThemedText>
                <Row style={{ marginTop: Spacing.xxs, alignItems: 'center' }}>
                  <MaterialIcons name="people" size={16} color={colors.text.secondary} />
                  <ThemedText
                    variant="caption"
                    color="secondary"
                    style={{ marginLeft: Spacing.xxs }}
                  >
                    {squad.memberCount} athletes • {squad.ageGroup}
                  </ThemedText>
                </Row>
              </Column>
              <MaterialIcons name="chevron-right" size={24} color={colors.text.tertiary} />
            </Row>
          </SurfaceCard>
        </Clickable>
      ))}

      {/* Create new squad option */}
      <Clickable
        onPress={() =>
          router.push({
            pathname: '/(modal)/create-squad',
            params: { clubId, returnTo: 'match-create' },
          })
        }
      >
        <SurfaceCard
          style={{
            marginTop: Spacing.sm,
            borderWidth: 2,
            borderColor: colors.primary.base,
            borderStyle: 'dashed',
            backgroundColor: colors.primary.surface,
          }}
        >
          <Row style={{ alignItems: 'center', justifyContent: 'center' }}>
            <MaterialIcons name="add-circle" size={24} color={colors.primary.base} />
            <ThemedText
              variant="subheading"
              style={{ marginLeft: Spacing.xs, color: colors.primary.base }}
            >
              Create New Squad
            </ThemedText>
          </Row>
        </SurfaceCard>
      </Clickable>
    </Column>
  );
};

// Handle return from squad creation
useEffect(() => {
  const handleSquadCreated = (event: { squadId: string }) => {
    const squad = squads.find(s => s.id === event.squadId);
    if (squad) {
      onSquadSelected(squad);
    }
  };

  const unsubscribe = onTyped('SQUAD_CREATED', handleSquadCreated);
  return unsubscribe;
}, [squads, onSquadSelected]);

Acceptance criteria:
✓ No squads: shows empty state with explanation
✓ "Create Squad" button navigates to creation modal
✓ Squad creation returns to match flow
✓ Has squads: shows selectable list
✓ "Create New Squad" option always available
✓ Squad cards show member count and age group
✓ Selection navigates to next step
✓ Back button cancels flow
```

---

## Item 196: Settings Toggles No Explanation

**Problem**: Toggle switches don't explain what they do until you toggle them.

**Files**: `components/settings/settings-row.tsx` lines ~94-125

**Current behavior**: Just label and switch, no description.

**Prompt**:
```
Add descriptions to settings toggles in components/settings/settings-row.tsx.

Current code (lines 94-125) shows minimal info. Add explanatory text:

interface SettingsRowProps {
  label: string;
  description?: string;
  value?: string | boolean;
  type: 'toggle' | 'navigation' | 'value';
  onPress?: () => void;
  onChange?: (value: boolean) => void;
  disabled?: boolean;
  icon?: string;
  badge?: { text: string; variant: 'info' | 'warning' | 'error' };
}

const SettingsRow = ({
  label,
  description,
  value,
  type,
  onPress,
  onChange,
  disabled,
  icon,
  badge,
}: Props) => {
  const { colors } = useTheme();

  const content = (
    <Row
      style={{
        padding: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.base,
        alignItems: 'center',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {icon && (
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.background.secondary,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: Spacing.sm,
          }}
        >
          <MaterialIcons name={icon} size={20} color={colors.text.primary} />
        </View>
      )}

      <Column style={{ flex: 1 }}>
        <Row style={{ alignItems: 'center' }}>
          <ThemedText variant="body">{label}</ThemedText>
          {badge && (
            <Badge
              variant={badge.variant}
              size="small"
              style={{ marginLeft: Spacing.xs }}
            >
              {badge.text}
            </Badge>
          )}
        </Row>

        {description && (
          <ThemedText
            variant="caption"
            color="secondary"
            style={{ marginTop: Spacing.xxs }}
          >
            {description}
          </ThemedText>
        )}
      </Column>

      {type === 'toggle' && (
        <Switch
          value={value as boolean}
          onValueChange={onChange}
          disabled={disabled}
          trackColor={{
            false: colors.background.tertiary,
            true: colors.primary.base,
          }}
          thumbColor={colors.text.inverse}
        />
      )}

      {type === 'navigation' && (
        <Row style={{ alignItems: 'center' }}>
          {value && (
            <ThemedText variant="bodySmall" color="secondary" style={{ marginRight: Spacing.xs }}>
              {value}
            </ThemedText>
          )}
          <MaterialIcons name="chevron-right" size={24} color={colors.text.tertiary} />
        </Row>
      )}

      {type === 'value' && value && (
        <ThemedText variant="bodySmall" color="secondary">
          {value}
        </ThemedText>
      )}
    </Row>
  );

  if (type === 'toggle' || disabled) {
    return <View>{content}</View>;
  }

  return (
    <Clickable onPress={onPress} disabled={disabled}>
      {content}
    </Clickable>
  );
};

// Usage examples with descriptions
<SettingsRow
  label="Push Notifications"
  description="Receive alerts for bookings, messages, and session reminders"
  type="toggle"
  value={notificationsEnabled}
  onChange={handleToggleNotifications}
  icon="notifications"
/>

<SettingsRow
  label="Auto-Accept Bookings"
  description="Automatically confirm bookings without manual approval"
  type="toggle"
  value={autoAcceptEnabled}
  onChange={handleToggleAutoAccept}
  icon="check-circle"
  badge={{ text: 'Premium', variant: 'info' }}
/>

<SettingsRow
  label="DBS Check"
  description="Required for coaching in the UK. Upload your certificate."
  type="navigation"
  value={dbsStatus}
  onPress={() => router.push('/verification/background')}
  icon="verified-user"
  badge={!hasValidDBS ? { text: 'Required', variant: 'error' } : undefined}
/>

Acceptance criteria:
✓ All toggles have description text
✓ Description explains what the toggle does
✓ Icon helps identify setting category
✓ Badges highlight important states (required, premium, new)
✓ Navigation rows show current value
✓ Disabled state visually distinct (50% opacity)
✓ Descriptions concise (1-2 lines max)
✓ Uses caption variant for descriptions
```

---

## Item 200: Compare Button Disabled No Explanation

**Problem**: Coach comparison button greyed out but doesn't say why (e.g., need 2+ coaches).

**Files**: `components/compare/CompareButton.tsx` lines ~79-209

**Current behavior**: Disabled button with no context.

**Prompt**:
```
Add validation messaging to compare button in components/compare/CompareButton.tsx.

Current code (lines 79-209) just disables button. Add explanation:

import { useCompare } from '@/hooks/use-compare';

const CompareButton = () => {
  const { colors } = useTheme();
  const { selectedCoaches, addCoach, removeCoach, clearAll } = useCompare();
  const [showTooltip, setShowTooltip] = useState(false);

  const canCompare = selectedCoaches.length >= 2;
  const isMaxed = selectedCoaches.length >= 4;

  const getButtonState = () => {
    if (selectedCoaches.length === 0) {
      return {
        label: 'Compare Coaches',
        disabled: true,
        message: 'Select coaches to compare by tapping the compare icon',
        icon: 'compare' as const,
      };
    }

    if (selectedCoaches.length === 1) {
      return {
        label: 'Compare (Select 1 More)',
        disabled: true,
        message: 'Select at least one more coach to compare',
        icon: 'add-circle' as const,
      };
    }

    return {
      label: `Compare ${selectedCoaches.length} Coaches`,
      disabled: false,
      message: null,
      icon: 'compare-arrows' as const,
    };
  };

  const state = getButtonState();

  return (
    <View
      style={{
        // NOTE: position:'fixed' does NOT exist in React Native. Use 'absolute'.
        position: 'absolute',
        bottom: Platform.OS === 'web' ? 20 : 80,
        left: 20,
        right: 20,
        zIndex: 100,
      }}
    >
      {/* Tooltip/hint */}
      {state.message && showTooltip && (
        <SurfaceCard
          style={{
            backgroundColor: colors.primary.base,
            marginBottom: Spacing.xs,
            padding: Spacing.sm,
          }}
        >
          <Row style={{ alignItems: 'flex-start' }}>
            <MaterialIcons name="info" size={20} color={colors.text.inverse} />
            <ThemedText
              variant="bodySmall"
              style={{ flex: 1, marginLeft: Spacing.xs, color: colors.text.inverse }}
            >
              {state.message}
            </ThemedText>
            <Clickable onPress={() => setShowTooltip(false)}>
              <MaterialIcons name="close" size={16} color={colors.text.inverse} />
            </Clickable>
          </Row>
        </SurfaceCard>
      )}

      {/* Main button */}
      <Row style={{ gap: Spacing.sm }}>
        {selectedCoaches.length > 0 && (
          <Clickable
            onPress={clearAll}
            style={{
              backgroundColor: colors.background.secondary,
              padding: Spacing.sm,
              borderRadius: Radii.pill,
              justifyContent: 'center',
              alignItems: 'center',
              ...Shadows[scheme].card,
            }}
          >
            <MaterialIcons name="clear" size={24} color={colors.text.primary} />
          </Clickable>
        )}

        <Clickable
          onPress={() => {
            if (state.disabled) {
              setShowTooltip(true);
              setTimeout(() => setShowTooltip(false), 3000);
            } else {
              router.push('/compare');
            }
          }}
          style={{
            flex: 1,
            backgroundColor: state.disabled
              ? colors.background.tertiary
              : colors.primary.base,
            paddingVertical: Spacing.sm,
            paddingHorizontal: Spacing.md,
            borderRadius: Radii.pill,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            ...Shadows[scheme].card,
          }}
        >
          <MaterialIcons
            name={state.icon}
            size={20}
            color={state.disabled ? colors.text.tertiary : colors.text.inverse}
          />
          <ThemedText
            variant="subheading"
            style={{
              marginLeft: Spacing.xs,
              color: state.disabled ? colors.text.tertiary : colors.text.inverse,
            }}
          >
            {state.label}
          </ThemedText>

          {selectedCoaches.length > 0 && (
            <View
              style={{
                marginLeft: Spacing.xs,
                backgroundColor: state.disabled ? colors.background.base : withAlpha(colors.text.inverse, 0.3),
                borderRadius: Radii.pill,
                width: 24,
                height: 24,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <ThemedText
                variant="bodySmall"
                style={{
                  color: state.disabled ? colors.text.secondary : colors.text.inverse,
                  fontWeight: '600',
                }}
              >
                {selectedCoaches.length}
              </ThemedText>
            </View>
          )}
        </Clickable>
      </Row>

      {/* Selected coaches preview */}
      {selectedCoaches.length > 0 && !showTooltip && (
        <Row
          style={{
            marginTop: Spacing.xs,
            justifyContent: 'center',
            // NOTE: Negative gap is not supported in RN. Use marginLeft:-8 on individual items.
          }}
        >
          {selectedCoaches.slice(0, 4).map((coach, idx) => (
            <Avatar
              key={coach.id}
              uri={coach.photoUri}
              size="sm"
              name={coach.name}
              style={{
                borderWidth: 2,
                borderColor: colors.background.base,
                marginLeft: idx > 0 ? -8 : 0, // Overlap effect
              }}
            />
          ))}
        </Row>
      )}
    </View>
  );
};

Acceptance criteria:
✓ Button shows count of selected coaches
✓ 0 selected: "Select coaches to compare"
✓ 1 selected: "Select 1 more"
✓ 2+ selected: enabled "Compare X Coaches"
✓ Tapping disabled button shows tooltip
✓ Tooltip auto-dismisses after 3s
✓ Clear button removes all selections
✓ Avatar preview shows selected coaches
✓ Max 4 coaches for comparison
✓ Smooth transitions between states
```

---

## Sprint 2 Summary

**Total Items**: 8
**Estimated Effort**: 14-18 hours
**Priority**: MEDIUM - discoverability and polish

**Dependency Map**:
- Items 11, 57, 58 use similar interaction patterns → share components
- Items 32, 153, 154 club-related → work together
- Items 196, 200 validation patterns → reusable approach

**Success Criteria**:
- ✓ Hidden interactions discoverable (hints, tooltips)
- ✓ Locked/disabled states clearly explained
- ✓ Role-based UI correctly shown/hidden
- ✓ Empty states provide creation paths
- ✓ All settings have descriptions

**Testing Focus**:
- First-time user experience (hint displays)
- Role permission edge cases
- Empty state flows (no squads, no coaches)
- Tooltip timing and dismissal
- Multi-platform consistency

**Architecture Notes**:
- All interactive elements must include `accessibilityLabel` and `accessibilityRole="button"`
- position:'fixed' does NOT exist in React Native — always use position:'absolute'
- Negative `gap` is not supported in RN — use `marginLeft: -N` on individual items
- Never hardcode 'white' — use `colors.text.inverse` from useTheme()

**Risk Areas**:
- Hint persistence management (when to show/hide)
- Role permission complexity across club features
- Animation performance for hints/tooltips
- State management for compare selections
- Platform differences (web vs native) for absolute positioning
