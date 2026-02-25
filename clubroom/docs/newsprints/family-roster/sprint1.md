# Family & Roster Sprint 1: Parent & Multi-Child UX

**Sprint Goal**: Fix UX issues specific to family management and multi-child scenarios. These are small but impactful issues that affect parent user experience.

**Items**: 2 (213, 224)

---

## Item 213: Single-Child Parent Sees One-Item Dropdown

**Problem**: Parents with only one child still see a dropdown switcher with a single option.

**Files**: `components/user/home-screen.tsx` lines ~80-87

**Current behavior**: Child switcher always shown regardless of family size.

**Prompt**:
```
Hide child switcher for single-child families in components/user/home-screen.tsx.

Current code (lines 80-87) always renders switcher:
<ChildSwitcher
  currentChildId={currentChild.id}
  onSelectChild={handleSelectChild}
/>

Add conditional rendering based on family size:

const HomeScreen = () => {
  const { colors } = useTheme();
  const { children, currentChild, selectChild } = useCurrentChild();
  const hasSingleChild = children.length === 1;

  return (
    <Column>
      {/* Header */}
      <Row style={{
        padding: Spacing.md,
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {hasSingleChild ? (
          // Single child: show static header with name
          <Row style={{ alignItems: 'center', gap: Spacing.sm }}>
            <Avatar
              uri={currentChild.photoUri}
              size="md"
              name={currentChild.name}
            />
            <Column>
              <ThemedText variant="heading">{currentChild.name}</ThemedText>
              <ThemedText variant="caption" color="secondary">
                Age {calculateAge(currentChild.dateOfBirth)}
              </ThemedText>
            </Column>
          </Row>
        ) : (
          // Multiple children: show switcher
          <ChildSwitcher
            currentChildId={currentChild.id}
            children={children}
            onSelectChild={selectChild}
          />
        )}

        {/* Right-side actions */}
        <Row style={{ gap: Spacing.xs }}>
          <IconButton icon="notifications" onPress={openNotifications} />
          <IconButton icon="add" onPress={openAddChild} />
        </Row>
      </Row>

      {/* Rest of screen */}
    </Column>
  );
};

// Move this helper to utils/calculate-age.ts for reuse across screens.
// Don't define inline — it's used in multiple places.
// utils/calculate-age.ts:
export const calculateAge = (dateOfBirth: string): number => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

Also hide switcher in other screens:
- app/development/my-progress.tsx
- app/family/calendar.tsx
- components/user/today-family-summary.tsx

Add "Add Child" prompt for zero children:
{children.length === 0 && (
  <EmptyState
    icon="person-add"
    title="No Children Added"
    description="Add your first child to start booking sessions and tracking progress"
    action={{
      label: 'Add Child',
      onPress: () => router.push('/(modal)/add-child'),
    }}
  />
)}

Acceptance criteria:
✓ Single-child families see static header, not dropdown
✓ Multi-child families see switcher
✓ Zero children shows empty state with prompt
✓ Child photo, name, and age displayed for single child
✓ Add Child button always accessible
✓ Consistent behavior across all screens with child switcher
✓ No dropdown flicker when loading family data
✓ Smooth transition when second child added (switcher appears)
```

---

## Item 224: Family Calendar Overlap Detection Handler Optional

**Problem**: `hasConflictsForDate` function is optional, so conflicts are never shown to users.

**Files**: `components/family/family-calendar-sections.tsx` lines ~166-175

**Current behavior**: Conflict detection exists but callback is optional and often undefined.

**Prompt**:
```
Make conflict detection mandatory and visible in components/family/family-calendar-sections.tsx.

Current code (lines 166-175):
const hasConflicts = hasConflictsForDate?.(date);
// Never shows conflicts because function is optional

Make conflict detection built-in:

import { useMemo } from 'react';
// NOTE: groupBy import removed — not needed. Using Map-based grouping instead.

interface CalendarEvent {
  id: string;
  childId: string;
  startTime: string;
  endTime: string;
  title: string;
  type: 'session' | 'event' | 'booking';
}

const FamilyCalendarDay = ({ date, events }: Props) => {
  const { colors } = useTheme();

  // Detect time overlaps — O(n log n) sweep-line per child (not O(n^2) brute force)
  const conflicts = useMemo(() => {
    const conflicts: Array<[CalendarEvent, CalendarEvent]> = [];

    // Group events by child first
    const eventsByChild = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const list = eventsByChild.get(event.childId) || [];
      list.push(event);
      eventsByChild.set(event.childId, list);
    }

    // For each child, sort by start time and sweep for overlaps
    for (const childEvents of eventsByChild.values()) {
      if (childEvents.length < 2) continue;

      // Sort by start time — O(n log n)
      const sorted = [...childEvents].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );

      // Sweep: compare each event with the previous one
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const curr = sorted[i];
        const prevEnd = new Date(prev.endTime).getTime();
        const currStart = new Date(curr.startTime).getTime();

        if (currStart < prevEnd) {
          conflicts.push([prev, curr]);
        }
      }
    }

    return conflicts;
  }, [events]);

  const hasConflicts = conflicts.length > 0;

  return (
    <Column>
      {/* Date header */}
      <Row style={{
        padding: Spacing.sm,
        backgroundColor: hasConflicts
          ? colors.error.surface
          : colors.background.secondary,
        borderRadius: Radii.sm,
      }}>
        <ThemedText variant="subheading">
          {formatDate(date)}
        </ThemedText>
        {hasConflicts && (
          <Row style={{ marginLeft: Spacing.sm, alignItems: 'center' }}>
            <MaterialIcons name="warning" size={16} color={colors.error.base} />
            <ThemedText variant="bodySmall" style={{ marginLeft: Spacing.xxs, color: colors.error.base }}>
              {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''}
            </ThemedText>
          </Row>
        )}
      </Row>

      {/* Event list */}
      {events.map(event => (
        <EventCard
          key={event.id}
          event={event}
          hasConflict={conflicts.some(([e1, e2]) =>
            e1.id === event.id || e2.id === event.id
          )}
        />
      ))}

      {/* Conflict details */}
      {hasConflicts && (
        <SurfaceCard
          style={{
            marginTop: Spacing.sm,
            backgroundColor: colors.error.surface,
            borderLeftWidth: 3,
            borderLeftColor: colors.error.base,
          }}
        >
          <Row style={{ alignItems: 'center', marginBottom: Spacing.xs }}>
            <MaterialIcons name="info" size={20} color={colors.error.base} />
            <ThemedText
              variant="subheading"
              style={{ marginLeft: Spacing.xs, color: colors.error.base }}
            >
              Scheduling Conflicts
            </ThemedText>
          </Row>

          {conflicts.map(([event1, event2], idx) => (
            <View key={idx} style={{ marginTop: Spacing.xs }}>
              <ThemedText variant="bodySmall">
                {event1.title} ({formatTime(event1.startTime)})
              </ThemedText>
              <ThemedText variant="bodySmall" color="secondary">
                overlaps with
              </ThemedText>
              <ThemedText variant="bodySmall">
                {event2.title} ({formatTime(event2.startTime)})
              </ThemedText>
              {idx < conflicts.length - 1 && (
                <View style={{
                  height: 1,
                  backgroundColor: colors.border.base,
                  marginVertical: Spacing.xs,
                }} />
              )}
            </View>
          ))}

          <Button
            variant="secondary"
            size="small"
            onPress={() => router.push('/family/resolve-conflicts')}
            style={{ marginTop: Spacing.sm }}
          >
            Resolve Conflicts
          </Button>
        </SurfaceCard>
      )}
    </Column>
  );
};

Add helpers:
const formatTime = (isoString: string): string => {
  return new Date(isoString).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

Highlight conflicting events:
const EventCard = ({ event, hasConflict }: { event: CalendarEvent; hasConflict: boolean }) => {
  const { colors } = useTheme();

  return (
    <SurfaceCard
      style={{
        marginTop: Spacing.xs,
        borderLeftWidth: hasConflict ? 3 : 0,
        borderLeftColor: colors.error.base,
      }}
    >
      {hasConflict && (
        <Badge variant="error" size="small" style={{ marginBottom: Spacing.xxs }}>
          Conflict
        </Badge>
      )}
      {/* Event details */}
    </SurfaceCard>
  );
};

Acceptance criteria:
✓ Automatically detects time overlaps for same child
✓ Shows conflict count in date header
✓ Highlights conflicting events with error color
✓ Displays detailed conflict breakdown
✓ "Resolve Conflicts" button navigates to resolution flow
✓ Multi-child families don't flag cross-sibling overlaps as conflicts
✓ Same-child, different-time events not flagged
✓ Conflict detection performant with 50+ events
✓ Visual hierarchy clear (error colors, warning icons)
```

---

## Sprint 1 Summary

**Total Items**: 2
**Estimated Effort**: 4-6 hours
**Priority**: MEDIUM - affects parent UX but not blocking

**Dependency Map**:
- Item 213: Independent, touches multiple screens
- Item 224: Independent, calendar-specific

**Success Criteria**:
- ✓ Single-child UX is streamlined (no unnecessary switcher)
- ✓ Calendar conflicts automatically detected and clearly shown
- ✓ Parents can identify and resolve booking overlaps
- ✓ No confusion from empty dropdowns or hidden conflicts

**Testing Focus**:
- Family size transitions (0 → 1 → 2 children)
- Conflict detection accuracy across time zones
- Performance with dense calendar (many events per day)
- Multi-child vs single-child scenarios
- Edge cases: same start time, partial overlap, back-to-back sessions

**Architecture Notes**:
- Add `createLogger('FamilyCalendar')` and `createLogger('ChildSwitcher')` to new service/hook code
- Conflict detection is now O(n log n) per child via sweep-line (not O(n^2) brute force)
- calculateAge should live in utils/calculate-age.ts for reuse

**Risk Areas**:
- Time overlap logic correctness (boundary conditions)
- Performance of sweep-line conflict detection with many events
- Child switcher state management when adding/removing children
- Calendar re-render performance when conflict state changes

**Future Enhancements** (not in this sprint):
- Auto-suggest alternative times for conflicts
- Calendar sync with Google/Apple Calendar
- Conflict resolution wizard
- Travel time buffer detection
- Recurring event conflict detection
