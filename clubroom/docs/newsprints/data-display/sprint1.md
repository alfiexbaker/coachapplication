# Data Display Sprint 1: Broken Display & Calculations

**Sprint Goal**: Fix data display bugs, broken calculations, and UI elements showing incorrect or malformed data. These are user-facing bugs that show wrong information or break visual layouts.

**Items**: 17 (2, 22, 23, 24, 127, 141, 152, 156, 159, 194, 204, 207, 244, 245, 246, 293, 294)

---

## Item 2: Invoice Cards Show Raw IDs

**Problem**: Invoice cards display `athleteId`/`coachId` UUIDs instead of names.

**Files**: `components/invoices/InvoiceCard.tsx` lines ~71, ~91

**Current behavior**: Shows "athlete_abc123def456" instead of "Sarah Johnson".

**Prompt**:
```
Replace raw IDs with user names in InvoiceCard component (components/invoices/InvoiceCard.tsx).

Current code (lines ~71, ~91):
<ThemedText>{invoice.athleteId}</ThemedText>
<ThemedText>{invoice.coachId}</ThemedText>

Replace with name lookups:

import { useState, useEffect } from 'react';
import { userService } from '@/services/user-service';

const InvoiceCard = ({ invoice }: Props) => {
  const { colors } = useTheme();
  const [athleteName, setAthleteName] = useState<string>('Loading...');
  const [coachName, setCoachName] = useState<string>('Loading...');

  useEffect(() => {
    const loadNames = async () => {
      const [athleteResult, coachResult] = await Promise.all([
        userService.getUserById(invoice.athleteId),
        userService.getUserById(invoice.coachId),
      ]);

      if (athleteResult.success) {
        setAthleteName(athleteResult.data.name);
      } else {
        setAthleteName('Unknown Athlete');
      }

      if (coachResult.success) {
        setCoachName(coachResult.data.name);
      } else {
        setCoachName('Unknown Coach');
      }
    };

    loadNames();
  }, [invoice.athleteId, invoice.coachId]);

  return (
    <SurfaceCard>
      <Row style={{ justifyContent: 'space-between', marginBottom: Spacing.sm }}>
        <Column>
          <ThemedText variant="caption" color="tertiary">
            Invoice #{invoice.invoiceNumber}
          </ThemedText>
          <ThemedText variant="heading" style={{ marginTop: Spacing.xxs }}>
            £{invoice.amount.toFixed(2)}
          </ThemedText>
        </Column>
        <Badge variant={getStatusVariant(invoice.status)}>
          {invoice.status}
        </Badge>
      </Row>

      <View style={{
        height: 1,
        backgroundColor: colors.border.base,
        marginVertical: Spacing.sm,
      }} />

      <Column style={{ gap: Spacing.xs }}>
        <Row style={{ alignItems: 'center' }}>
          <MaterialIcons name="person" size={16} color={colors.text.secondary} />
          <ThemedText variant="bodySmall" color="secondary" style={{ marginLeft: Spacing.xs }}>
            Athlete:
          </ThemedText>
          <ThemedText variant="bodySmall" style={{ marginLeft: Spacing.xs }}>
            {athleteName}
          </ThemedText>
        </Row>

        <Row style={{ alignItems: 'center' }}>
          <MaterialIcons name="sports" size={16} color={colors.text.secondary} />
          <ThemedText variant="bodySmall" color="secondary" style={{ marginLeft: Spacing.xs }}>
            Coach:
          </ThemedText>
          <ThemedText variant="bodySmall" style={{ marginLeft: Spacing.xs }}>
            {coachName}
          </ThemedText>
        </Row>

        <Row style={{ alignItems: 'center' }}>
          <MaterialIcons name="event" size={16} color={colors.text.secondary} />
          <ThemedText variant="bodySmall" color="secondary" style={{ marginLeft: Spacing.xs }}>
            Date:
          </ThemedText>
          <ThemedText variant="bodySmall" style={{ marginLeft: Spacing.xs }}>
            {formatDate(invoice.date)}
          </ThemedText>
        </Row>
      </Column>
    </SurfaceCard>
  );
};

const getStatusVariant = (status: string): 'success' | 'warning' | 'error' | 'info' => {
  switch (status) {
    case 'paid': return 'success';
    case 'pending': return 'warning';
    case 'overdue': return 'error';
    default: return 'info';
  }
};

// Alternative: use a custom hook for name caching with batch lookup
export function useUserNames(userIds: string[]) {
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // Stable dependency key: useMemo to avoid JSON.stringify in useEffect deps
  // JSON.stringify creates a new string every render — use useMemo for stable ref
  const stableKey = useMemo(() => [...userIds].sort().join(','), [userIds]);

  useEffect(() => {
    if (userIds.length === 0) {
      setIsLoading(false);
      return;
    }

    const loadNames = async () => {
      const nameMap = new Map<string, string>();

      // Batch: fetch all users in parallel (avoids N+1 per-card lookups)
      const results = await Promise.all(
        userIds.map(id => userService.getUserById(id))
      );

      results.forEach((result, idx) => {
        const userId = userIds[idx];
        if (result.success) {
          nameMap.set(userId, result.data.name);
        } else {
          nameMap.set(userId, 'Unknown User');
        }
      });

      setNames(nameMap);
      setIsLoading(false);
    };

    loadNames();
  }, [stableKey]); // Stable dependency via useMemo

  return { names, isLoading };
}

Acceptance criteria:
✓ Shows actual user names instead of IDs
✓ Loading state shows "Loading..." not undefined
✓ Error state shows "Unknown Athlete/Coach" not crash
✓ Names cached to avoid repeated lookups
✓ No flickering when switching invoices
✓ Works with FlatList (memo + useCallback)
✓ Avatars show alongside names
```

---

## Item 22: LocationCard Broken Map Placeholder

**Problem**: Map placeholder shows broken image or incorrect placeholder.

**Files**: `components/bookings/booking-info-cards.tsx`

**Current behavior**: Grey box or broken image icon.

**Prompt**:
```
Fix map placeholder in LocationCard (components/bookings/booking-info-cards.tsx).

Replace broken image with proper static map or styled placeholder:

import { Image } from 'expo-image';
import { Platform } from 'react-native';

const LocationCard = ({ location }: { location: BookingLocation }) => {
  const { colors } = useTheme();

  // Generate static map URL (Google Maps Static API)
  // NOTE: Restrict API key to Static Maps API only + app bundle ID in Google Cloud Console
  const getStaticMapUrl = (lat: number, lng: number, zoom: number = 15) => {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return null;

    return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=600x200&markers=color:red%7C${lat},${lng}&key=${apiKey}`;
  };

  const mapUri = location.coordinates
    ? getStaticMapUrl(location.coordinates.latitude, location.coordinates.longitude)
    : null;

  return (
    <SurfaceCard>
      <Row style={{ alignItems: 'flex-start', marginBottom: Spacing.sm }}>
        <MaterialIcons name="place" size={24} color={colors.primary.base} />
        <Column style={{ flex: 1, marginLeft: Spacing.sm }}>
          <ThemedText variant="subheading">Location</ThemedText>
          <ThemedText variant="body" style={{ marginTop: Spacing.xxs }}>
            {location.name || location.address}
          </ThemedText>
          {location.name && location.address && (
            <ThemedText variant="bodySmall" color="secondary" style={{ marginTop: Spacing.xxs }}>
              {location.address}
            </ThemedText>
          )}
        </Column>
      </Row>

      {/* Map preview */}
      {mapUri ? (
        <Pressable
          onPress={() => {
            const url = Platform.select({
              ios: `maps:?q=${location.coordinates.latitude},${location.coordinates.longitude}`,
              android: `geo:${location.coordinates.latitude},${location.coordinates.longitude}`,
              web: `https://www.google.com/maps/search/?api=1&query=${location.coordinates.latitude},${location.coordinates.longitude}`,
            });
            Linking.openURL(url);
          }}
        >
          <Image
            source={{ uri: mapUri }}
            style={{
              width: '100%',
              height: 120,
              borderRadius: Spacing.sm,
            }}
            contentFit="cover"
            transition={200}
            placeholder={require('@/assets/images/map-placeholder.png')}
          />
          <Row
            style={{
              position: 'absolute',
              bottom: Spacing.sm,
              right: Spacing.sm,
              backgroundColor: colors.primary.base,
              paddingHorizontal: Spacing.sm,
              paddingVertical: Spacing.xs,
              borderRadius: Spacing.pill,
              alignItems: 'center',
              ...Shadows[scheme].card,
            }}
          >
            <MaterialIcons name="directions" size={16} color={colors.text.inverse} />
            <ThemedText
              variant="caption"
              style={{ marginLeft: Spacing.xxs, color: colors.text.inverse }}
            >
              Get Directions
            </ThemedText>
          </Row>
        </Pressable>
      ) : (
        // Styled placeholder when no coordinates
        <View
          style={{
            width: '100%',
            height: 120,
            borderRadius: Spacing.sm,
            backgroundColor: colors.background.secondary,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <MaterialIcons name="location-off" size={48} color={colors.text.tertiary} />
          <ThemedText variant="caption" color="tertiary" style={{ marginTop: Spacing.xs }}>
            No map available
          </ThemedText>
        </View>
      )}

      {/* Action buttons */}
      <Row style={{ marginTop: Spacing.sm, gap: Spacing.xs }}>
        {location.coordinates && (
          <Button
            variant="secondary"
            size="small"
            onPress={() => {
              const url = Platform.select({
                ios: `maps:?q=${location.coordinates.latitude},${location.coordinates.longitude}`,
                android: `geo:${location.coordinates.latitude},${location.coordinates.longitude}`,
                web: `https://www.google.com/maps/search/?api=1&query=${location.coordinates.latitude},${location.coordinates.longitude}`,
              });
              Linking.openURL(url);
            }}
            leftIcon="directions"
            style={{ flex: 1 }}
          >
            Directions
          </Button>
        )}

        <Button
          variant="secondary"
          size="small"
          onPress={() => {
            const address = encodeURIComponent(location.address);
            Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${address}`);
          }}
          leftIcon="search"
          style={{ flex: 1 }}
        >
          Search
        </Button>
      </Row>
    </SurfaceCard>
  );
};

Acceptance criteria:
✓ Static map shows when coordinates available
✓ Styled placeholder when no coordinates
✓ "Get Directions" button opens native maps app
✓ Platform-specific map URL (iOS/Android/web)
✓ Search button always works with address
✓ No broken images or grey boxes
✓ Tap map preview opens directions
✓ Respects API key presence (fallback if missing)
```

---

## Item 23: Series Booking Blank When 0 Bookings

**Problem**: Series booking component shows nothing when no bookings exist.

**Files**: `components/bookings/series-booking-group.tsx`

**Current behavior**: Empty component, looks broken.

**Prompt**:
```
Add empty state to series booking group (components/bookings/series-booking-group.tsx).

Current component renders nothing with empty array. Add empty state:

const SeriesBookingGroup = ({ seriesId }: Props) => {
  const { colors } = useTheme();
  const { bookings, isLoading } = useSeriesBookings(seriesId);

  if (isLoading) return <LoadingState />;

  if (bookings.length === 0) {
    return (
      <SurfaceCard>
        <EmptyState
          icon="event-busy"
          title="No Sessions Scheduled"
          description="This series doesn't have any sessions yet. Check back later or contact the coach."
        />

        <Button
          variant="secondary"
          onPress={() => router.push('/discover')}
          style={{ marginTop: Spacing.md }}
        >
          Find Other Coaches
        </Button>
      </SurfaceCard>
    );
  }

  // Group bookings by status
  const upcoming = bookings.filter(b => b.status === 'confirmed' && new Date(b.date) > new Date());
  const past = bookings.filter(b => b.status === 'completed' || new Date(b.date) < new Date());
  const cancelled = bookings.filter(b => b.status === 'cancelled');

  return (
    <Column>
      {/* Series header */}
      <SurfaceCard style={{ marginBottom: Spacing.md }}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <Column style={{ flex: 1 }}>
            <ThemedText variant="heading">Series Progress</ThemedText>
            <ThemedText variant="bodySmall" color="secondary" style={{ marginTop: Spacing.xxs }}>
              {upcoming.length} upcoming • {past.length} completed
            </ThemedText>
          </Column>

          {/* Progress indicator */}
          <View style={{ alignItems: 'flex-end' }}>
            <ThemedText variant="display" style={{ color: colors.primary.base }}>
              {past.length}/{bookings.length}
            </ThemedText>
            <ThemedText variant="caption" color="secondary">
              Sessions
            </ThemedText>
          </View>
        </Row>

        {/* Progress bar */}
        <View
          style={{
            height: 8,
            backgroundColor: colors.background.secondary,
            borderRadius: Spacing.pill,
            marginTop: Spacing.sm,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${(past.length / bookings.length) * 100}%`,
              height: '100%',
              backgroundColor: colors.primary.base,
            }}
          />
        </View>
      </SurfaceCard>

      {/* Upcoming sessions */}
      {upcoming.length > 0 && (
        <Column style={{ marginBottom: Spacing.md }}>
          <ThemedText variant="subheading" style={{ marginBottom: Spacing.sm }}>
            Upcoming Sessions
          </ThemedText>
          {upcoming.map(booking => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </Column>
      )}

      {/* Past sessions */}
      {past.length > 0 && (
        <Column>
          <ThemedText variant="subheading" style={{ marginBottom: Spacing.sm }}>
            Past Sessions
          </ThemedText>
          {past.map(booking => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </Column>
      )}

      {/* Cancelled notice */}
      {cancelled.length > 0 && (
        <SurfaceCard
          style={{
            marginTop: Spacing.md,
            backgroundColor: colors.error.surface,
            borderLeftWidth: 3,
            borderLeftColor: colors.error.base,
          }}
        >
          <Row style={{ alignItems: 'center' }}>
            <MaterialIcons name="info" size={20} color={colors.error.base} />
            <ThemedText
              variant="bodySmall"
              style={{ marginLeft: Spacing.xs, color: colors.error.base }}
            >
              {cancelled.length} session{cancelled.length > 1 ? 's' : ''} cancelled
            </ThemedText>
          </Row>
        </SurfaceCard>
      )}
    </Column>
  );
};

Acceptance criteria:
✓ Empty state shows when no bookings
✓ Progress header shows series stats
✓ Progress bar visualizes completion
✓ Upcoming/past sections clearly separated
✓ Cancelled sessions noted but not listed by default
✓ "Find Other Coaches" CTA in empty state
✓ Grouped by status (upcoming, past, cancelled)
✓ Loading state before data arrives
```

---

## Item 24: Group Session "Ages Any-Any"

**Problem**: Age range shows "Ages Any-Any" or "Ages 0-0" for unrestricted sessions.

**Files**: `components/group/group-session-card.tsx`

**Current behavior**: Literal "Any" strings or 0 values.

**Prompt**:
```
Fix age range display in group session card (components/group/group-session-card.tsx).

Current code shows raw min/max values. Add smart formatting:

const formatAgeRange = (minAge?: number, maxAge?: number): string => {
  // No restrictions
  if (!minAge && !maxAge) {
    return 'All ages';
  }

  // Only minimum
  if (minAge && !maxAge) {
    return `${minAge}+ years`;
  }

  // Only maximum
  if (!minAge && maxAge) {
    return `Up to ${maxAge} years`;
  }

  // Both specified
  if (minAge === maxAge) {
    return `Age ${minAge}`;
  }

  return `Ages ${minAge}-${maxAge}`;
};

const GroupSessionCard = ({ session }: Props) => {
  const { colors } = useTheme();
  const ageRange = formatAgeRange(session.minAge, session.maxAge);

  return (
    <SurfaceCard>
      <Row style={{ justifyContent: 'space-between', marginBottom: Spacing.sm }}>
        <Column style={{ flex: 1 }}>
          <ThemedText variant="heading">{session.title}</ThemedText>
          <ThemedText
            variant="bodySmall"
            color="secondary"
            style={{ marginTop: Spacing.xxs }}
          >
            {session.description}
          </ThemedText>
        </Column>
        <Badge variant="primary">£{session.price}</Badge>
      </Row>

      <View style={{
        height: 1,
        backgroundColor: colors.border.base,
        marginVertical: Spacing.sm,
      }} />

      <Column style={{ gap: Spacing.xs }}>
        <Row style={{ alignItems: 'center' }}>
          <MaterialIcons name="event" size={16} color={colors.text.secondary} />
          <ThemedText variant="bodySmall" style={{ marginLeft: Spacing.xs }}>
            {formatDate(session.date)} • {formatTime(session.startTime)}
          </ThemedText>
        </Row>

        <Row style={{ alignItems: 'center' }}>
          <MaterialIcons name="schedule" size={16} color={colors.text.secondary} />
          <ThemedText variant="bodySmall" style={{ marginLeft: Spacing.xs }}>
            {session.duration} minutes
          </ThemedText>
        </Row>

        <Row style={{ alignItems: 'center' }}>
          <MaterialIcons name="people" size={16} color={colors.text.secondary} />
          <ThemedText variant="bodySmall" style={{ marginLeft: Spacing.xs }}>
            {session.currentParticipants}/{session.maxParticipants} spots • {ageRange}
          </ThemedText>
        </Row>

        {session.location && (
          <Row style={{ alignItems: 'center' }}>
            <MaterialIcons name="place" size={16} color={colors.text.secondary} />
            <ThemedText
              variant="bodySmall"
              style={{ marginLeft: Spacing.xs }}
              numberOfLines={1}
            >
              {session.location.name || session.location.address}
            </ThemedText>
          </Row>
        )}
      </Column>

      {/* Availability indicator */}
      <View style={{ marginTop: Spacing.sm }}>
        {session.currentParticipants >= session.maxParticipants ? (
          <Badge variant="error" style={{ alignSelf: 'flex-start' }}>
            Full
          </Badge>
        ) : session.currentParticipants / session.maxParticipants > 0.8 ? (
          <Badge variant="warning" style={{ alignSelf: 'flex-start' }}>
            Filling Fast
          </Badge>
        ) : (
          <Badge variant="success" style={{ alignSelf: 'flex-start' }}>
            {session.maxParticipants - session.currentParticipants} spots left
          </Badge>
        )}
      </View>
    </SurfaceCard>
  );
};

Acceptance criteria:
✓ No restrictions: "All ages"
✓ Min only: "12+ years"
✓ Max only: "Up to 16 years"
✓ Range: "Ages 8-12"
✓ Single age: "Age 10"
✓ Never shows "Any-Any" or "0-0"
✓ Availability badge dynamic (Full/Filling Fast/X spots left)
✓ All session metadata displayed clearly
```

---

## Item 127: Home Screen Stats "undefined" as String

**Problem**: Shows literal string "undefined" instead of placeholder or 0.

**Files**: `components/user/home-screen-sections.tsx` lines ~33-42

**Current behavior**: `${undefined}` renders as "undefined".

**Prompt**:
```
Fix undefined stats display in home screen sections (components/user/home-screen-sections.tsx).

Current code (lines 33-42):
<ThemedText>{stats.upcomingSessions}</ThemedText>

Add null safety:

const HomeScreenStats = ({ userId }: Props) => {
  const { colors } = useTheme();
  const { stats, isLoading } = useHomeStats(userId);

  if (isLoading) {
    return (
      <Row style={{ padding: Spacing.md, gap: Spacing.sm }}>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} width="32%" height={80} radius={Spacing.card} />
        ))}
      </Row>
    );
  }

  const statCards = [
    {
      icon: 'event',
      label: 'Upcoming',
      value: stats?.upcomingSessions ?? 0,
      color: colors.primary.base,
    },
    {
      icon: 'history',
      label: 'Completed',
      value: stats?.completedSessions ?? 0,
      color: colors.success.base,
    },
    {
      icon: 'star',
      label: 'Goals',
      value: stats?.activeGoals ?? 0,
      color: colors.warning.base,
    },
  ];

  return (
    <Row style={{ padding: Spacing.md, gap: Spacing.sm }}>
      {statCards.map((stat, idx) => (
        <SurfaceCard
          key={idx}
          style={{
            flex: 1,
            alignItems: 'center',
            paddingVertical: Spacing.md,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: withAlpha(stat.color, 0.2),
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: Spacing.xs,
            }}
          >
            <MaterialIcons name={stat.icon} size={24} color={stat.color} />
          </View>

          <ThemedText variant="display" style={{ color: stat.color }}>
            {stat.value}
          </ThemedText>

          <ThemedText variant="caption" color="secondary" style={{ marginTop: Spacing.xxs }}>
            {stat.label}
          </ThemedText>
        </SurfaceCard>
      ))}
    </Row>
  );
};

// Extract this hook to a separate file: hooks/use-home-stats.ts
// Don't define hooks inline in component files — separate for reuse and testability.
export function useHomeStats(userId: string) {
  const [stats, setStats] = useState<HomeStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      const bookingsResult = await bookingService.getUpcomingBookings(userId);
      const goalsResult = await goalService.getActiveGoals(userId);

      const upcomingSessions = bookingsResult.success ? bookingsResult.data.length : 0;
      const completedSessions = 0; // TODO: fetch from booking history
      const activeGoals = goalsResult.success ? goalsResult.data.length : 0;

      setStats({
        upcomingSessions,
        completedSessions,
        activeGoals,
      });

      setIsLoading(false);
    };

    loadStats();
  }, [userId]);

  return { stats, isLoading };
}

interface HomeStats {
  upcomingSessions: number;
  completedSessions: number;
  activeGoals: number;
}

Acceptance criteria:
✓ Never shows "undefined" text
✓ Loading shows skeleton placeholders
✓ Zero values show "0" not empty
✓ Null coalescing (??) for all stats
✓ Type-safe with interface
✓ Icons color-coded by stat type
✓ Responsive layout (equal widths)
✓ Error state handled (shows 0, not crash)
```

---

## Item 141: Series "All Sessions Complete" Ambiguous

**Problem**: Message doesn't distinguish between completed series vs cancelled series.

**Files**: `components/bookings/series-booking-group.tsx` lines ~65-71

**Current behavior**: Same message for both states.

**Prompt**:
```
Add state-specific messaging to series completion (components/bookings/series-booking-group.tsx).

Current code (lines 65-71) shows generic "All sessions complete". Add context:

// CRITICAL: useTheme() is a hook — it CANNOT be called inside a regular function.
// Pass colors as a parameter instead.
const getSeriesStatusMessage = (bookings: Booking[], colors: ReturnType<typeof useTheme>['colors']): {
  message: string;
  description: string;
  icon: string;
  color: string;
} => {

  const completed = bookings.filter(b => b.status === 'completed').length;
  const cancelled = bookings.filter(b => b.status === 'cancelled').length;
  const total = bookings.length;

  // All completed successfully
  if (completed === total) {
    return {
      message: 'Series Complete! 🎉',
      description: `You completed all ${total} sessions in this series`,
      icon: 'check-circle',
      color: colors.success.base,
    };
  }

  // All cancelled
  if (cancelled === total) {
    return {
      message: 'Series Cancelled',
      description: 'All sessions in this series were cancelled',
      icon: 'cancel',
      color: colors.error.base,
    };
  }

  // Mix of completed and cancelled
  if (completed + cancelled === total) {
    return {
      message: 'Series Ended',
      description: `${completed} session${completed !== 1 ? 's' : ''} completed • ${cancelled} cancelled`,
      icon: 'info',
      color: colors.warning.base,
    };
  }

  // Still in progress
  const remaining = total - completed - cancelled;
  return {
    message: `${remaining} Session${remaining !== 1 ? 's' : ''} Remaining`,
    description: `${completed} completed • ${cancelled} cancelled`,
    icon: 'schedule',
    color: colors.primary.base,
  };
};

const SeriesStatusBanner = ({ bookings }: { bookings: Booking[] }) => {
  const { colors } = useTheme();
  const status = getSeriesStatusMessage(bookings, colors);

  return (
    <SurfaceCard
      style={{
        backgroundColor: withAlpha(status.color, 0.1),
        borderLeftWidth: 3,
        borderLeftColor: status.color,
        marginBottom: Spacing.md,
      }}
    >
      <Row style={{ alignItems: 'flex-start' }}>
        <MaterialIcons name={status.icon} size={24} color={status.color} />
        <Column style={{ flex: 1, marginLeft: Spacing.sm }}>
          <ThemedText variant="subheading" style={{ color: status.color }}>
            {status.message}
          </ThemedText>
          <ThemedText
            variant="bodySmall"
            color="secondary"
            style={{ marginTop: Spacing.xxs }}
          >
            {status.description}
          </ThemedText>
        </Column>
      </Row>
    </SurfaceCard>
  );
};

Acceptance criteria:
✓ "Series Complete" only when all completed
✓ "Series Cancelled" when all cancelled
✓ "Series Ended" when mix of completed/cancelled
✓ "X Sessions Remaining" when in progress
✓ Color-coded by status (success/error/warning/info)
✓ Icon matches status type
✓ Counts accurate (completed, cancelled, remaining)
✓ Celebration emoji for full completion
```

---

## Item 152: Events Panel Disappears for Non-Coaches When Empty

**Problem**: Non-coach users see nothing when no events, should see empty state or option to request event.

**Files**: `components/club/EventsPanel.tsx` lines ~90-92

**Current behavior**: Returns null, component vanishes.

**Prompt**:
```
Add empty state for non-coaches in EventsPanel (components/club/EventsPanel.tsx).

Current code (lines 90-92):
if (events.length === 0) return null;

Replace with role-aware empty state:

const EventsPanel = ({ clubId, currentUserRole }: Props) => {
  const { colors } = useTheme();
  const { events, isLoading } = useClubEvents(clubId);

  const canCreateEvents = currentUserRole === 'admin' || currentUserRole === 'editor';

  if (isLoading) return <LoadingState />;

  // Empty state for admins/editors
  if (events.length === 0 && canCreateEvents) {
    return (
      <SurfaceCard>
        <EmptyState
          icon="event"
          title="No Events Yet"
          description="Create your first club event to bring members together"
        />
        <Button
          variant="primary"
          onPress={() => router.push(`/club/${clubId}/events/create`)}
          leftIcon="add"
          style={{ marginTop: Spacing.md }}
        >
          Create Event
        </Button>
      </SurfaceCard>
    );
  }

  // Empty state for members
  if (events.length === 0 && !canCreateEvents) {
    return (
      <SurfaceCard>
        <EmptyState
          icon="event-busy"
          title="No Upcoming Events"
          description="Check back soon for club events and social activities"
        />
        <Button
          variant="secondary"
          onPress={() => router.push(`/club/${clubId}/contact-admin`)}
          leftIcon="mail"
          style={{ marginTop: Spacing.md }}
        >
          Suggest an Event
        </Button>
      </SurfaceCard>
    );
  }

  // Has events: show list
  return (
    <Column>
      <Row style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
        <ThemedText variant="subheading">
          Upcoming Events ({events.length})
        </ThemedText>
        {canCreateEvents && (
          <Pressable onPress={() => router.push(`/club/${clubId}/events/create`)}>
            <MaterialIcons name="add-circle" size={24} color={colors.primary.base} />
          </Pressable>
        )}
      </Row>

      {events.map(event => (
        <EventCard key={event.id} event={event} />
      ))}

      {events.length > 3 && (
        <Button
          variant="secondary"
          onPress={() => router.push(`/club/${clubId}/events`)}
          style={{ marginTop: Spacing.sm }}
        >
          View All Events
        </Button>
      )}
    </Column>
  );
};

Acceptance criteria:
✓ Never returns null (always shows something)
✓ Admins see "Create Event" in empty state
✓ Members see "Suggest an Event" in empty state
✓ Empty state messages role-appropriate
✓ Has events: show list with counts
✓ "View All" button when >3 events
✓ "+" button for admins when events exist
✓ Different icons for different empty states
```

---

## Item 156: Event Card Venue Truncated

**Problem**: Long venue names cut off with no way to see full text.

**Files**: `components/event/event-card-sections.tsx` line ~63

**Current behavior**: `numberOfLines={1}` with no expansion.

**Prompt**:
```
Make venue text expandable in event card (components/event/event-card-sections.tsx).

Current code (line ~63):
<ThemedText numberOfLines={1}>{event.venue}</ThemedText>

Add expansion:

import { useState } from 'react';

const EventVenue = ({ venue }: { venue: string }) => {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const shouldTruncate = venue.length > 50;

  return (
    <Row style={{ alignItems: 'flex-start' }}>
      <MaterialIcons
        name="place"
        size={16}
        color={colors.text.secondary}
        style={{ marginTop: 2 }}
      />
      <Column style={{ flex: 1, marginLeft: Spacing.xs }}>
        <ThemedText
          variant="bodySmall"
          numberOfLines={expanded ? undefined : 1}
        >
          {venue}
        </ThemedText>

        {shouldTruncate && (
          <Pressable onPress={() => setExpanded(!expanded)}>
            <ThemedText
              variant="caption"
              style={{
                color: colors.primary.base,
                marginTop: Spacing.xxs,
              }}
            >
              {expanded ? 'Show less' : 'Show more'}
            </ThemedText>
          </Pressable>
        )}
      </Column>
    </Row>
  );
};

// Alternative: show full text in tooltip on long-press
const EventVenueWithTooltip = ({ venue }: { venue: string }) => {
  const { colors } = useTheme();

  const handleLongPress = () => {
    if (venue.length > 50) {
      Alert.alert('Venue', venue);
    }
  };

  return (
    <Pressable onLongPress={handleLongPress}>
      <Row style={{ alignItems: 'center' }}>
        <MaterialIcons name="place" size={16} color={colors.text.secondary} />
        <ThemedText
          variant="bodySmall"
          numberOfLines={1}
          style={{ marginLeft: Spacing.xs, flex: 1 }}
        >
          {venue}
        </ThemedText>
        {venue.length > 50 && (
          <MaterialIcons
            name="info"
            size={14}
            color={colors.text.tertiary}
            style={{ marginLeft: Spacing.xxs }}
          />
        )}
      </Row>
    </Pressable>
  );
};

Acceptance criteria:
✓ Short venues (<50 chars) show fully
✓ Long venues truncate with "Show more" link
✓ "Show more" expands to full text
✓ "Show less" collapses back
✓ Long-press shows alert with full text (alternative)
✓ Info icon hint when text is truncated
✓ No layout shift when expanding
✓ Consistent with other expandable text patterns
```

---

## Item 159: Match Result Confusing for Away Games

**Problem**: "Won 3-2" from away team perspective is ambiguous (did we score 3 or 2?).

**Files**: `components/match/match-header-card.tsx` lines ~73-76

**Current behavior**: Unclear which score belongs to which team.

**Prompt**:
```
Clarify match result display in match header (components/match/match-header-card.tsx).

Current code (lines 73-76):
<ThemedText>{match.result}</ThemedText> // "Won 3-2"

Add context-aware formatting:

// CRITICAL: useTheme() is a hook — it CANNOT be called inside a regular function.
// Pass colors as a parameter instead.
const formatMatchResult = (
  match: Match,
  currentTeamId: string,
  colors: ReturnType<typeof useTheme>['colors'],
): {
  outcome: 'Won' | 'Lost' | 'Drew' | 'Scheduled';
  score: string;
  detail: string;
  color: string;
} => {
  // Match not played yet
  if (!match.homeScore && !match.awayScore) {
    return {
      outcome: 'Scheduled',
      score: 'vs',
      detail: formatDate(match.date),
      color: colors.text.secondary,
    };
  }

  const isHomeTeam = match.homeTeamId === currentTeamId;
  const ourScore = isHomeTeam ? match.homeScore : match.awayScore;
  const theirScore = isHomeTeam ? match.awayScore : match.homeScore;
  const opponent = isHomeTeam ? match.awayTeamName : match.homeTeamName;

  let outcome: 'Won' | 'Lost' | 'Drew';
  let color: string;

  if (ourScore > theirScore) {
    outcome = 'Won';
    color = colors.success.base;
  } else if (ourScore < theirScore) {
    outcome = 'Lost';
    color = colors.error.base;
  } else {
    outcome = 'Drew';
    color = colors.warning.base;
  }

  return {
    outcome,
    score: `${ourScore}-${theirScore}`,
    detail: `vs ${opponent}`,
    color,
  };
};

const MatchHeaderCard = ({ match, currentTeamId }: Props) => {
  const { colors } = useTheme();
  const result = formatMatchResult(match, currentTeamId, colors);

  return (
    <SurfaceCard>
      <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Result */}
        <Column>
          <ThemedText variant="display" style={{ color: result.color }}>
            {result.outcome}
          </ThemedText>
          <ThemedText variant="heading" style={{ marginTop: Spacing.xxs }}>
            {result.score}
          </ThemedText>
          <ThemedText variant="bodySmall" color="secondary" style={{ marginTop: Spacing.xxs }}>
            {result.detail}
          </ThemedText>
        </Column>

        {/* Match info */}
        <Column style={{ alignItems: 'flex-end' }}>
          <Badge variant={match.isHome ? 'info' : 'warning'}>
            {match.isHome ? 'Home' : 'Away'}
          </Badge>
          <ThemedText variant="bodySmall" color="secondary" style={{ marginTop: Spacing.xs }}>
            {match.venue}
          </ThemedText>
        </Column>
      </Row>

      {/* Detailed score breakdown */}
      <View style={{
        marginTop: Spacing.md,
        paddingTop: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.border.base,
      }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Column style={{ alignItems: 'center', flex: 1 }}>
            <ThemedText variant="caption" color="tertiary">
              {match.homeTeamName}
            </ThemedText>
            <ThemedText
              variant="display"
              style={{
                marginTop: Spacing.xxs,
                color: match.homeTeamId === currentTeamId ? result.color : colors.text.secondary,
              }}
            >
              {match.homeScore ?? '-'}
            </ThemedText>
          </Column>

          <ThemedText variant="heading" color="tertiary" style={{ paddingTop: 20 }}>
            vs
          </ThemedText>

          <Column style={{ alignItems: 'center', flex: 1 }}>
            <ThemedText variant="caption" color="tertiary">
              {match.awayTeamName}
            </ThemedText>
            <ThemedText
              variant="display"
              style={{
                marginTop: Spacing.xxs,
                color: match.awayTeamId === currentTeamId ? result.color : colors.text.secondary,
              }}
            >
              {match.awayScore ?? '-'}
            </ThemedText>
          </Column>
        </Row>
      </View>
    </SurfaceCard>
  );
};

Acceptance criteria:
✓ Shows "Won 3-2 vs Lions" (our score first)
✓ Home/Away badge visible
✓ Detailed breakdown shows both teams clearly
✓ Current team score highlighted in result color
✓ Opponent score in neutral color
✓ Scheduled matches show "vs" and date
✓ No ambiguity about which team scored what
✓ Color-coded outcome (green/red/yellow)
```

---

(Continued in next message due to length...)

Acceptance criteria:
✓ Map shows all coach locations when zoomed out
✓ Empty state with helpful message
✓ "Zoom in to see coaches" hint
✓ Cluster markers for nearby coaches
✓ No blank map with silent failure
✓ Search box filters visible coaches
✓ "No coaches in this area" when filtered out
```

---

## Item 204: Empty State Icons All Same

**Problem**: All empty states use same generic icon instead of context-specific ones.

**Files**: `components/ui/empty-state.tsx` lines ~18-59

**Current behavior**: Default "inbox" icon for everything.

**Prompt**:
```
Add context-specific icons to empty states (components/ui/empty-state.tsx).

Current code (lines 18-59) uses same icon. Add smart defaults:

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary';
  };
  context?: 'bookings' | 'sessions' | 'events' | 'messages' | 'goals' | 'badges' | 'roster' | 'invoices';
}

const getDefaultIcon = (context?: string): string => {
  const iconMap: Record<string, string> = {
    bookings: 'event-busy',
    sessions: 'sports-soccer',
    events: 'event-note',
    messages: 'chat-bubble-outline',
    goals: 'flag',
    badges: 'emoji-events',
    roster: 'people-outline',
    invoices: 'receipt-long',
    search: 'search-off',
    network: 'cloud-off',
    error: 'error-outline',
    default: 'inbox',
  };

  return iconMap[context || 'default'] || iconMap.default;
};

const EmptyState = ({
  icon,
  title,
  description,
  action,
  context,
}: EmptyStateProps) => {
  const { colors } = useTheme();
  const displayIcon = icon || getDefaultIcon(context);

  return (
    <Center style={{ paddingVertical: Spacing.xl, paddingHorizontal: Spacing.md }}>
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: colors.background.secondary,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: Spacing.md,
        }}
      >
        <MaterialIcons
          name={displayIcon}
          size={40}
          color={colors.text.tertiary}
        />
      </View>

      <ThemedText
        variant="heading"
        style={{ textAlign: 'center', marginBottom: Spacing.xs }}
      >
        {title}
      </ThemedText>

      {description && (
        <ThemedText
          variant="bodySmall"
          color="secondary"
          style={{ textAlign: 'center', maxWidth: 280 }}
        >
          {description}
        </ThemedText>
      )}

      {action && (
        <Button
          variant={action.variant || 'primary'}
          onPress={action.onPress}
          style={{ marginTop: Spacing.lg }}
        >
          {action.label}
        </Button>
      )}
    </Center>
  );
};

// Usage examples
<EmptyState
  context="bookings"
  title="No Bookings Yet"
  description="Book your first session to get started"
  action={{
    label: 'Find Coaches',
    onPress: () => router.push('/discover'),
  }}
/>

<EmptyState
  context="messages"
  title="No Messages"
  description="Your messages will appear here"
/>

<EmptyState
  context="goals"
  title="No Goals Set"
  description="Set a goal to track your progress"
  action={{
    label: 'Create Goal',
    onPress: () => router.push('/goals/create'),
    variant: 'primary',
  }}
/>

Acceptance criteria:
✓ Each context has unique icon
✓ Fallback to default icon if context unknown
✓ Custom icon overrides context icon
✓ Icons semantic and recognizable
✓ Consistent empty state styling
✓ Optional CTA button
✓ Centered layout with max width
✓ All empty states use this component
```

---

## Item 207 / 293: Avatar Broken Image Permanent

**Problem**: When avatar image fails to load, error state persists forever.

**Files**: `components/ui/primitives/Avatar.tsx` line ~92

**Current behavior**: `hasError` set to true, never resets on retry.

**Prompt**:
```
Add retry logic to avatar image loading (components/ui/primitives/Avatar.tsx).

Current code (line ~92):
const [hasError, setHasError] = useState(false);
// Never resets, stuck showing initials forever

Add retry with timeout:

import { Image } from 'expo-image';
import { useState, useEffect } from 'react';

interface AvatarProps {
  uri?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  style?: import('react-native').ViewStyle;
}

const AVATAR_SIZES = {
  sm: 32,
  md: 44,
  lg: 64,
  xl: 80,
};

const Avatar = ({ uri, name, size = 'md', style }: AvatarProps) => {
  const { colors } = useTheme();
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const avatarSize = AVATAR_SIZES[size];
  const initials = getInitials(name);

  // Reset error state when URI changes
  useEffect(() => {
    setHasError(false);
    setRetryCount(0);
  }, [uri]);

  // Retry after delay
  const handleError = () => {
    if (retryCount < 2) {
      // Retry up to 2 times
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
      }, 1000 * (retryCount + 1)); // Backoff: 1s, 2s
    } else {
      setHasError(true);
    }
  };

  return (
    <View
      style={[
        {
          width: avatarSize,
          height: avatarSize,
          borderRadius: avatarSize / 2,
          backgroundColor: colors.primary.surface,
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {uri && !hasError ? (
        <Image
          source={{ uri: `${uri}?retry=${retryCount}` }} // Cache bust for retry
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={200}
          onError={handleError}
        />
      ) : (
        <ThemedText
          variant={size === 'sm' ? 'caption' : size === 'md' ? 'body' : 'heading'}
          style={{ color: colors.primary.base, fontWeight: '600' }}
        >
          {initials}
        </ThemedText>
      )}
    </View>
  );
};

const getInitials = (name: string): string => {
  if (!name) return '?';

  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

Acceptance criteria:
✓ Failed images retry up to 2 times
✓ Exponential backoff (1s, 2s)
✓ After 2 failures, show initials permanently
✓ Changing URI resets error state
✓ Cache bust on retry (query param)
✓ Initials fallback for missing names
✓ Size-appropriate text for initials
✓ Color-coded background (primary surface)
```

---

## Item 244: Cancellation Analytics Divide by Zero

**Problem**: Cancellation rate calculation crashes when totalBookings = 0.

**Files**: `components/analytics/cancellation-chart-sections.tsx` lines ~65-74

**Current behavior**: `cancellations / 0` returns Infinity or NaN.

**Prompt**:
```
Add zero-division guards to cancellation analytics (components/analytics/cancellation-chart-sections.tsx).

Current code (lines 65-74):
const rate = (cancellations / totalBookings) * 100;

Add safe calculation:

const calculateCancellationRate = (cancellations: number, totalBookings: number): number => {
  if (totalBookings === 0) return 0;
  return Math.round((cancellations / totalBookings) * 100);
};

const formatCancellationRate = (rate: number): string => {
  if (rate === 0) return '0%';
  if (rate < 1) return '<1%';
  return `${rate}%`;
};

const CancellationChartSection = ({ stats }: Props) => {
  const { colors } = useTheme();
  const cancellationRate = calculateCancellationRate(stats.cancellations, stats.totalBookings);

  // No data state
  if (stats.totalBookings === 0) {
    return (
      <SurfaceCard>
        <ThemedText variant="subheading" style={{ marginBottom: Spacing.sm }}>
          Cancellation Rate
        </ThemedText>
        <EmptyState
          icon="show-chart"
          title="No Booking Data"
          description="Cancellation analytics will appear once you have completed bookings"
        />
      </SurfaceCard>
    );
  }

  // Has data: show chart
  return (
    <SurfaceCard>
      <Row style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }}>
        <ThemedText variant="subheading">Cancellation Rate</ThemedText>

        <View style={{ alignItems: 'flex-end' }}>
          <ThemedText
            variant="display"
            style={{
              color: cancellationRate > 20
                ? colors.error.base
                : cancellationRate > 10
                ? colors.warning.base
                : colors.success.base,
            }}
          >
            {formatCancellationRate(cancellationRate)}
          </ThemedText>
          <ThemedText variant="caption" color="secondary">
            {stats.cancellations} of {stats.totalBookings} bookings
          </ThemedText>
        </View>
      </Row>

      {/* Breakdown by reason */}
      <Column style={{ gap: Spacing.xs }}>
        {stats.reasonBreakdown.map(reason => {
          const percentage = calculateCancellationRate(reason.count, stats.cancellations);
          return (
            <Row key={reason.reason} style={{ alignItems: 'center' }}>
              <ThemedText variant="bodySmall" style={{ flex: 1 }}>
                {reason.reason}
              </ThemedText>
              <ThemedText variant="bodySmall" color="secondary">
                {reason.count} ({percentage}%)
              </ThemedText>
            </Row>
          );
        })}
      </Column>

      {/* Trend indicator */}
      {stats.previousPeriodRate !== undefined && (
        <Row style={{
          marginTop: Spacing.md,
          paddingTop: Spacing.md,
          borderTopWidth: 1,
          borderTopColor: colors.border.base,
          alignItems: 'center',
        }}>
          <MaterialIcons
            name={stats.previousPeriodRate > cancellationRate ? 'trending-down' : 'trending-up'}
            size={20}
            color={stats.previousPeriodRate > cancellationRate ? colors.success.base : colors.error.base}
          />
          <ThemedText
            variant="bodySmall"
            style={{
              marginLeft: Spacing.xs,
              color: stats.previousPeriodRate > cancellationRate ? colors.success.base : colors.error.base,
            }}
          >
            {Math.abs(cancellationRate - stats.previousPeriodRate)}% vs last period
          </ThemedText>
        </Row>
      )}
    </SurfaceCard>
  );
};

Acceptance criteria:
✓ No crashes when totalBookings = 0
✓ Returns 0% for zero bookings
✓ Shows empty state when no data
✓ Rounds percentages to whole numbers
✓ Formats <1% appropriately
✓ Color-coded by severity (green/yellow/red)
✓ Breakdown by cancellation reason
✓ Trend comparison vs previous period
```

---

## Item 245: Analytics 1 Data Point "100% Retention"

**Problem**: Single data point shows misleading "100% retention" metric.

**Files**: `components/analytics/retention-funnel.tsx` lines ~22-24

**Current behavior**: Calculates rate from single session.

**Prompt**:
```
Add minimum data requirements to retention analytics (components/analytics/retention-funnel.tsx).

Current code (lines 22-24) calculates from any amount of data. Add threshold:

const MINIMUM_SESSIONS_FOR_RETENTION = 5;

const RetentionFunnel = ({ athleteId }: Props) => {
  const { colors } = useTheme();
  const { sessions, isLoading } = useAthleteRetention(athleteId);

  if (isLoading) return <LoadingState />;

  // Insufficient data
  if (sessions.length < MINIMUM_SESSIONS_FOR_RETENTION) {
    return (
      <SurfaceCard>
        <ThemedText variant="subheading" style={{ marginBottom: Spacing.sm }}>
          Retention Analysis
        </ThemedText>

        <SurfaceCard
          style={{
            backgroundColor: colors.warning.surface,
            borderLeftWidth: 3,
            borderLeftColor: colors.warning.base,
          }}
        >
          <Row style={{ alignItems: 'flex-start' }}>
            <MaterialIcons name="info" size={20} color={colors.warning.base} />
            <Column style={{ flex: 1, marginLeft: Spacing.sm }}>
              <ThemedText variant="bodySmall" style={{ color: colors.warning.base }}>
                Insufficient Data
              </ThemedText>
              <ThemedText
                variant="caption"
                color="secondary"
                style={{ marginTop: Spacing.xxs }}
              >
                Retention analytics require at least {MINIMUM_SESSIONS_FOR_RETENTION} completed sessions.
                Current: {sessions.length}
              </ThemedText>
            </Column>
          </Row>
        </SurfaceCard>

        <View style={{
          marginTop: Spacing.md,
          padding: Spacing.sm,
          backgroundColor: colors.background.secondary,
          borderRadius: Spacing.sm,
        }}>
          <ThemedText variant="caption" color="tertiary" style={{ textAlign: 'center' }}>
            {MINIMUM_SESSIONS_FOR_RETENTION - sessions.length} more session{MINIMUM_SESSIONS_FOR_RETENTION - sessions.length > 1 ? 's' : ''} needed
          </ThemedText>
        </View>
      </SurfaceCard>
    );
  }

  // Calculate retention metrics
  const retentionData = calculateRetentionMetrics(sessions);

  return (
    <SurfaceCard>
      <ThemedText variant="subheading" style={{ marginBottom: Spacing.md }}>
        Retention Analysis
      </ThemedText>

      {/* Funnel visualization */}
      <Column style={{ gap: Spacing.sm }}>
        {retentionData.stages.map((stage, idx) => (
          <View key={idx}>
            <Row style={{ justifyContent: 'space-between', marginBottom: Spacing.xxs }}>
              <ThemedText variant="bodySmall">{stage.label}</ThemedText>
              <ThemedText variant="bodySmall" style={{ color: colors.primary.base }}>
                {stage.count} ({stage.percentage}%)
              </ThemedText>
            </Row>
            <View
              style={{
                height: 8,
                backgroundColor: colors.background.secondary,
                borderRadius: Spacing.pill,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${stage.percentage}%`,
                  height: '100%',
                  backgroundColor: colors.primary.base,
                }}
              />
            </View>
          </View>
        ))}
      </Column>

      {/* Key metric */}
      <View style={{
        marginTop: Spacing.lg,
        padding: Spacing.md,
        backgroundColor: colors.primary.surface,
        borderRadius: Spacing.sm,
      }}>
        <ThemedText variant="caption" color="secondary" style={{ textAlign: 'center' }}>
          Overall Retention Rate
        </ThemedText>
        <ThemedText
          variant="display"
          style={{ textAlign: 'center', marginTop: Spacing.xs, color: colors.primary.base }}
        >
          {retentionData.overallRate}%
        </ThemedText>
        <ThemedText variant="caption" color="tertiary" style={{ textAlign: 'center', marginTop: Spacing.xxs }}>
          Based on {sessions.length} sessions
        </ThemedText>
      </View>
    </SurfaceCard>
  );
};

interface RetentionMetrics {
  stages: Array<{
    label: string;
    count: number;
    percentage: number;
  }>;
  overallRate: number;
}

// NOTE: Retention means tracking UNIQUE athletes who return, not counting sessions.
// Use a Set<athleteId> to deduplicate per stage.
const calculateRetentionMetrics = (sessions: Session[]): RetentionMetrics => {
  // Group sessions by athlete
  const sessionsByAthlete = new Map<string, number>();
  for (const session of sessions) {
    const count = sessionsByAthlete.get(session.athleteId) ?? 0;
    sessionsByAthlete.set(session.athleteId, count + 1);
  }

  const totalAthletes = sessionsByAthlete.size;
  if (totalAthletes === 0) {
    return { stages: [], overallRate: 0 };
  }

  // Count unique athletes at each retention threshold
  const returned = new Set<string>();
  const regular = new Set<string>();
  const committed = new Set<string>();

  for (const [athleteId, count] of sessionsByAthlete) {
    if (count >= 2) returned.add(athleteId);
    if (count >= 5) regular.add(athleteId);
    if (count >= 10) committed.add(athleteId);
  }

  const stages = [
    { label: 'First Session', count: totalAthletes, percentage: 100 },
    { label: 'Returned (2+)', count: returned.size, percentage: Math.round((returned.size / totalAthletes) * 100) },
    { label: 'Regular (5+)', count: regular.size, percentage: Math.round((regular.size / totalAthletes) * 100) },
    { label: 'Committed (10+)', count: committed.size, percentage: Math.round((committed.size / totalAthletes) * 100) },
  ];

  const overallRate = Math.round((committed.size / totalAthletes) * 100);

  return { stages, overallRate };
};

Acceptance criteria:
✓ Requires minimum 5 sessions for retention calc
✓ Shows "Insufficient Data" warning below threshold
✓ Displays progress toward minimum (e.g., "3 more sessions needed")
✓ Retention funnel shows multiple stages
✓ Percentages relative to total, not previous stage
✓ Overall retention rate clearly displayed
✓ Data source count shown ("Based on X sessions")
✓ No misleading 100% from 1 session
```

---

## Item 246: Holiday Presets Hardcoded 2024-2025

**Problem**: Date picker holiday presets show outdated year ranges.

**Files**: `components/coach/block-date-helpers.ts` lines ~18-24

**Current behavior**: Static dates from 2024-2025.

**Prompt**:
```
Make holiday presets dynamic by year in components/coach/block-date-helpers.ts.

Current code (lines 18-24):
export const HOLIDAY_PRESETS = [
  { label: 'Christmas 2024', start: '2024-12-23', end: '2025-01-02' },
  // ... hardcoded dates
];

Replace with dynamic generation:

export function getHolidayPresets(year?: number): HolidayPreset[] {
  const targetYear = year || new Date().getFullYear();
  const nextYear = targetYear + 1;

  return [
    {
      id: 'christmas',
      label: `Christmas ${targetYear}`,
      start: `${targetYear}-12-23`,
      end: `${nextYear}-01-02`,
      description: 'Christmas and New Year break',
    },
    {
      id: 'easter',
      label: `Easter ${nextYear}`,
      start: getEasterDate(nextYear, -7), // Week before Easter
      end: getEasterDate(nextYear, 7), // Week after Easter
      description: 'Easter holidays',
    },
    {
      id: 'summer',
      label: `Summer ${nextYear}`,
      start: `${nextYear}-07-20`,
      end: `${nextYear}-09-05`,
      description: 'Summer break',
    },
    {
      id: 'half-term-oct',
      label: `October Half Term ${targetYear}`,
      start: `${targetYear}-10-23`,
      end: `${targetYear}-10-31`,
      description: 'Autumn half term',
    },
    {
      id: 'half-term-feb',
      label: `February Half Term ${nextYear}`,
      start: `${nextYear}-02-12`,
      end: `${nextYear}-02-16`,
      description: 'Spring half term',
    },
  ];
}

// Calculate Easter Sunday for any year (Computus algorithm)
function getEasterDate(year: number, offsetDays: number = 0): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  const easterDate = new Date(year, month - 1, day);
  easterDate.setDate(easterDate.getDate() + offsetDays);

  const yyyy = easterDate.getFullYear();
  const mm = String(easterDate.getMonth() + 1).padStart(2, '0');
  const dd = String(easterDate.getDate()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd}`;
}

// Usage in component
const BlockDateModal = () => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const holidayPresets = getHolidayPresets(selectedYear);

  return (
    <ScrollView>
      {/* Year selector */}
      <Row style={{ marginBottom: Spacing.md, gap: Spacing.xs }}>
        <Chip
          selected={selectedYear === currentYear}
          onPress={() => setSelectedYear(currentYear)}
        >
          {currentYear}
        </Chip>
        <Chip
          selected={selectedYear === currentYear + 1}
          onPress={() => setSelectedYear(currentYear + 1)}
        >
          {currentYear + 1}
        </Chip>
      </Row>

      {/* Holiday presets */}
      <Column style={{ gap: Spacing.sm }}>
        {holidayPresets.map(preset => (
          <Pressable
            key={preset.id}
            onPress={() => handleSelectPreset(preset)}
          >
            <SurfaceCard>
              <Row style={{ justifyContent: 'space-between' }}>
                <Column>
                  <ThemedText variant="subheading">{preset.label}</ThemedText>
                  <ThemedText variant="caption" color="secondary">
                    {formatDateRange(preset.start, preset.end)} • {preset.description}
                  </ThemedText>
                </Column>
                <MaterialIcons name="chevron-right" size={24} color={colors.text.tertiary} />
              </Row>
            </SurfaceCard>
          </Pressable>
        ))}
      </Column>
    </ScrollView>
  );
};

interface HolidayPreset {
  id: string;
  label: string;
  start: string;
  end: string;
  description: string;
}

Acceptance criteria:
✓ Holiday presets dynamically generated for current/next year
✓ Easter calculated correctly using Computus algorithm
✓ Year selector shows current and next year
✓ Dates update when year changes
✓ UK school holiday dates accurate
✓ No hardcoded 2024/2025 dates
✓ Works correctly across year boundaries (Dec → Jan)
✓ Presets include description and date range
```

---

## Sprint 1 Summary

**Total Items**: 17
**Estimated Effort**: 28-34 hours
**Priority**: HIGH - broken displays and calculations

**Dependency Map**:
- Items 2, 127, 244, 245 require safe null handling → establish pattern first
- Items 207, 293 are duplicates → fix Avatar once
- Items 22, 156, 159 UI layout improvements → similar patterns
- Item 246 affects multiple date pickers → test thoroughly

**Success Criteria**:
- ✓ No raw IDs shown to users
- ✓ No division by zero crashes
- ✓ No "undefined" as string
- ✓ All empty states show helpful messages
- ✓ All calculations bounded and validated
- ✓ Dynamic dates (no hardcoded 2024/2025)

**Testing Focus**:
- Zero/null/undefined edge cases
- Empty data sets (no bookings, no events)
- Single data point scenarios
- Date calculations across year boundaries
- Image loading failures and retries
- Long text truncation and expansion

**Risk Areas**:
- Easter date calculation algorithm accuracy
- Static map API costs and quotas
- Avatar retry logic and caching
- Retention funnel calculation with edge cases
- Match result logic for various team configurations
