# Data Display Sprint 2: Mock Data Issues

**Sprint Goal**: Replace hardcoded mock data with real data or clear "Demo" indicators. Expose data sourcing issues and create paths to real data entry.

**Items**: 14 (29, 34, 45, 62, 64, 65, 66, 68, 71, 72, 73, 74, 75, 77)

**Note**: This is a "mock data awareness" sprint. Most items won't be fully fixed (backend doesn't exist), but we'll add clear indicators that data is simulated and provide paths to enter real data.

---

## Item 29: Smart Slots Mock Statistics

**Problem**: Smart Slots shows fake heatmap data instead of real booking patterns.

**Files**: `components/coach/smart-slots-cards.tsx` line ~14

**Current behavior**: Hardcoded mock data pretending to be real insights.

**Prompt**:
```
Add demo indicator and real data collection to Smart Slots (components/coach/smart-slots-cards.tsx).

Current code (line ~14) uses MOCK_SMART_SLOTS_DATA. Add awareness:

import { Alert } from 'react-native';

const SmartSlotsScreen = () => {
  const { colors } = useTheme();
  const { bookings, isLoading } = useCoachBookings();
  const hasRealData = bookings.length >= 10;

  // Calculate real smart slots from actual booking data
  const smartSlotsData = hasRealData
    ? calculateSmartSlotsFromBookings(bookings)
    : MOCK_SMART_SLOTS_DATA;

  return (
    <ScrollView>
      {/* Demo banner */}
      {!hasRealData && (
        <SurfaceCard
          style={{
            backgroundColor: colors.warning.surface,
            marginBottom: Spacing.md,
            borderLeftWidth: 3,
            borderLeftColor: colors.warning.base,
          }}
        >
          <Row style={{ alignItems: 'flex-start' }}>
            <MaterialIcons name="science" size={24} color={colors.warning.base} />
            <Column style={{ flex: 1, marginLeft: Spacing.sm }}>
              <ThemedText variant="subheading" style={{ color: colors.warning.base }}>
                Demo Data
              </ThemedText>
              <ThemedText
                variant="bodySmall"
                color="secondary"
                style={{ marginTop: Spacing.xxs }}
              >
                This shows sample recommendations. Complete at least 10 bookings to see real insights based on your schedule.
              </ThemedText>
              <ThemedText
                variant="caption"
                style={{ marginTop: Spacing.xs, color: colors.warning.base }}
              >
                Progress: {bookings.length}/10 bookings
              </ThemedText>
            </Column>
          </Row>
        </SurfaceCard>
      )}

      {/* Heatmap */}
      <SmartSlotsHeatmap data={smartSlotsData.heatmap} isDemoData={!hasRealData} />

      {/* Recommendations */}
      <SmartSlotsCards recommendations={smartSlotsData.recommendations} isDemoData={!hasRealData} />

      {/* Info footer */}
      <SurfaceCard style={{ backgroundColor: colors.background.secondary, marginTop: Spacing.lg }}>
        <ThemedText variant="bodySmall" color="secondary">
          {hasRealData
            ? `Recommendations based on ${bookings.length} completed bookings from the last 90 days.`
            : 'Complete more bookings to unlock personalized recommendations.'}
        </ThemedText>
      </SurfaceCard>
    </ScrollView>
  );
};

// Calculate smart slots from real booking data
function calculateSmartSlotsFromBookings(bookings: Booking[]) {
  const heatmap: Record<string, Record<string, number>> = {};
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 8am-10pm

  // Initialize heatmap
  days.forEach(day => {
    heatmap[day] = {};
    hours.forEach(hour => {
      heatmap[day][hour] = 0;
    });
  });

  // Count bookings per day/hour
  // BUG FIX: getDay() returns 0=Sunday, but our days array starts with Monday.
  // Use (getDay() + 6) % 7 to convert: Monday=0, Tuesday=1, ..., Sunday=6
  bookings.forEach(booking => {
    const date = new Date(booking.date);
    const dayIndex = (date.getDay() + 6) % 7; // Monday=0...Sunday=6
    const dayName = days[dayIndex];
    const hour = date.getHours();

    if (heatmap[dayName] && heatmap[dayName][hour] !== undefined) {
      heatmap[dayName][hour]++;
    }
  });

  // Find top 5 time slots
  const recommendations = [];
  for (const day of days) {
    for (const hour of hours) {
      const count = heatmap[day][hour];
      if (count > 0) {
        recommendations.push({
          dayOfWeek: day,
          startTime: `${hour.toString().padStart(2, '0')}:00`,
          endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
          bookingCount: count,
        });
      }
    }
  }

  // Sort by booking count and take top 5
  recommendations.sort((a, b) => b.bookingCount - a.bookingCount);
  const topRecommendations = recommendations.slice(0, 5);

  return {
    heatmap,
    recommendations: topRecommendations,
  };
}

Acceptance criteria:
✓ Demo banner shows when <10 bookings
✓ Progress indicator (X/10 bookings)
✓ Real calculations when ≥10 bookings
✓ Mock data clearly labeled as "Demo Data"
✓ Heatmap visual indicator for demo vs real
✓ Footer explains data source
✓ Smooth transition when crossing 10-booking threshold
✓ No pretense that mock data is real
```

---

## Item 34: PaymentCard Shows "(mock)"

**Problem**: Payment amounts show "£65 (mock)" label in UI.

**Files**: `components/bookings/booking-info-cards.tsx` line ~121

**Current behavior**: Literal "(mock)" string visible to users.

**Prompt**:
```
Remove "(mock)" labels and add demo indicators to payment card (components/bookings/booking-info-cards.tsx).

Current code (line ~121):
<ThemedText>£{payment.amount} (mock)</ThemedText>

Replace with clean UI plus optional demo mode:

interface PaymentCardProps {
  payment: Payment;
  showDemoIndicator?: boolean;
}

const PaymentCard = ({ payment, showDemoIndicator = false }: Props) => {
  const { colors } = useTheme();

  return (
    <SurfaceCard>
      <Row style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm }}>
        <ThemedText variant="subheading">Payment</ThemedText>

        {showDemoIndicator && (
          <Badge variant="warning" size="small">
            Demo
          </Badge>
        )}
      </Row>

      {/* Amount */}
      <Row style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <ThemedText variant="caption" color="secondary">
          Amount
        </ThemedText>
        <ThemedText variant="heading">
          £{payment.amount.toFixed(2)}
        </ThemedText>
      </Row>

      {/* Status */}
      <Row style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.xs }}>
        <ThemedText variant="caption" color="secondary">
          Status
        </ThemedText>
        <Badge variant={getPaymentStatusVariant(payment.status)}>
          {payment.status}
        </Badge>
      </Row>

      {/* Method */}
      {payment.method && (
        <Row style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.xs }}>
          <ThemedText variant="caption" color="secondary">
            Method
          </ThemedText>
          <Row style={{ alignItems: 'center' }}>
            <MaterialIcons
              name={getPaymentMethodIcon(payment.method)}
              size={16}
              color={colors.text.secondary}
            />
            <ThemedText variant="bodySmall" style={{ marginLeft: Spacing.xxs }}>
              {payment.method}
            </ThemedText>
          </Row>
        </Row>
      )}

      {/* Demo notice */}
      {showDemoIndicator && (
        <View style={{
          marginTop: Spacing.sm,
          padding: Spacing.sm,
          backgroundColor: colors.warning.surface,
          borderRadius: Spacing.sm,
        }}>
          <ThemedText variant="micro" style={{ color: colors.warning.base }}>
            Note: Payment processing not yet connected. This is demo data.
          </ThemedText>
        </View>
      )}
    </SurfaceCard>
  );
};

const getPaymentStatusVariant = (status: string) => {
  switch (status) {
    case 'paid': return 'success';
    case 'pending': return 'warning';
    case 'failed': return 'error';
    default: return 'info';
  }
};

const getPaymentMethodIcon = (method: string) => {
  switch (method.toLowerCase()) {
    case 'card': return 'credit-card';
    case 'bank': return 'account-balance';
    case 'cash': return 'payments';
    default: return 'payment';
  }
};

// Usage: detect demo mode based on environment
// NOTE: process.env.EXPO_PUBLIC_* is fine in components.
// Do NOT import from constants/config.ts (it uses expo-constants which fails in Node test runner).
const BookingDetailScreen = ({ bookingId }: Props) => {
  const isDemoMode = !process.env.EXPO_PUBLIC_STRIPE_ENABLED;

  return (
    <ScrollView>
      <PaymentCard payment={booking.payment} showDemoIndicator={isDemoMode} />
    </ScrollView>
  );
};

Acceptance criteria:
✓ No "(mock)" text in UI
✓ Clean payment display
✓ Optional "Demo" badge when showDemoIndicator={true}
✓ Demo notice explains payment not connected
✓ Real payment UI identical (just remove badge)
✓ Status and method properly formatted
✓ Icons for payment methods
✓ Currency formatting with 2 decimals
```

---

## Item 45: Override Indicator Dot No Explanation

**Problem**: Small dot on availability slots but no tooltip or legend explaining what it means.

**Files**: `components/coach/week-pattern-slot-row.tsx` lines ~123-128

**Current behavior**: Mystery dot with no context.

**Prompt**:
```
Add tooltip/legend for override indicator in week-pattern-slot-row.tsx.

Current code (lines 123-128) shows dot without explanation. Add context:

import { useState } from 'react';
import { Modal, Pressable } from 'react-native';

const WeekPatternSlotRow = ({ slots }: Props) => {
  const { colors } = useTheme();
  const [showLegend, setShowLegend] = useState(false);

  const hasOverrides = slots.some(slot => slot.hasOverride);

  return (
    <Column>
      {/* Legend toggle */}
      {hasOverrides && (
        <Pressable
          onPress={() => setShowLegend(true)}
          style={{
            alignSelf: 'flex-end',
            marginBottom: Spacing.xs,
          }}
        >
          <Row style={{ alignItems: 'center' }}>
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: colors.warning.base,
                marginRight: Spacing.xxs,
              }}
            />
            <ThemedText variant="caption" style={{ color: colors.primary.base }}>
              What's this?
            </ThemedText>
          </Row>
        </Pressable>
      )}

      {/* Slot list */}
      <Row style={{ flexWrap: 'wrap', gap: Spacing.xs }}>
        {slots.map(slot => (
          <View key={slot.id} style={{ position: 'relative' }}>
            <SlotChip slot={slot} />

            {/* Override indicator */}
            {slot.hasOverride && (
              <Pressable
                onPress={() => showOverrideDetails(slot)}
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  width: 12,
                  height: 12,
                  borderRadius: 6,
                  backgroundColor: colors.warning.base,
                  borderWidth: 2,
                  borderColor: colors.background.base,
                }}
              />
            )}
          </View>
        ))}
      </Row>

      {/* Legend modal */}
      <Modal
        visible={showLegend}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLegend(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: withAlpha(colors.background.base, 0.9),
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => setShowLegend(false)}
        >
          <SurfaceCard style={{ maxWidth: 320, margin: Spacing.md }}>
            <Row style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md }}>
              <ThemedText variant="heading">Availability Legend</ThemedText>
              <Pressable onPress={() => setShowLegend(false)}>
                <MaterialIcons name="close" size={24} color={colors.text.secondary} />
              </Pressable>
            </Row>

            <Column style={{ gap: Spacing.md }}>
              {/* Regular slot */}
              <Row style={{ alignItems: 'center' }}>
                <View
                  style={{
                    width: 40,
                    height: 32,
                    backgroundColor: colors.success.surface,
                    borderRadius: Spacing.sm,
                    borderWidth: 1,
                    borderColor: colors.success.base,
                  }}
                />
                <Column style={{ flex: 1, marginLeft: Spacing.sm }}>
                  <ThemedText variant="bodySmall">Regular Availability</ThemedText>
                  <ThemedText variant="caption" color="secondary">
                    Your default weekly schedule
                  </ThemedText>
                </Column>
              </Row>

              {/* Override */}
              <Row style={{ alignItems: 'center' }}>
                <View style={{ position: 'relative' }}>
                  <View
                    style={{
                      width: 40,
                      height: 32,
                      backgroundColor: colors.success.surface,
                      borderRadius: Spacing.sm,
                      borderWidth: 1,
                      borderColor: colors.success.base,
                    }}
                  />
                  <View
                    style={{
                      position: 'absolute',
                      top: -4,
                      right: -4,
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: colors.warning.base,
                      borderWidth: 2,
                      borderColor: colors.background.base,
                    }}
                  />
                </View>
                <Column style={{ flex: 1, marginLeft: Spacing.sm }}>
                  <ThemedText variant="bodySmall">One-Time Override</ThemedText>
                  <ThemedText variant="caption" color="secondary">
                    Modified for a specific date
                  </ThemedText>
                </Column>
              </Row>

              {/* Blocked */}
              <Row style={{ alignItems: 'center' }}>
                <View
                  style={{
                    width: 40,
                    height: 32,
                    backgroundColor: colors.background.tertiary,
                    borderRadius: Spacing.sm,
                    borderWidth: 1,
                    borderColor: colors.border.base,
                  }}
                />
                <Column style={{ flex: 1, marginLeft: Spacing.sm }}>
                  <ThemedText variant="bodySmall">Unavailable</ThemedText>
                  <ThemedText variant="caption" color="secondary">
                    Blocked or removed from schedule
                  </ThemedText>
                </Column>
              </Row>
            </Column>

            <ThemedText
              variant="caption"
              color="tertiary"
              style={{ marginTop: Spacing.md, fontStyle: 'italic' }}
            >
              Tip: Tap any slot to edit or remove it. Long-press for bulk actions.
            </ThemedText>
          </SurfaceCard>
        </Pressable>
      </Modal>
    </Column>
  );
};

const showOverrideDetails = (slot: AvailabilitySlot) => {
  Alert.alert(
    'One-Time Override',
    `This slot has been modified for ${formatDate(slot.overrideDate)}.\n\nOriginal: ${slot.originalTime}\nOverride: ${slot.overrideTime}\n\nReason: ${slot.overrideReason || 'None provided'}`,
    [
      { text: 'OK' },
      {
        text: 'Remove Override',
        style: 'destructive',
        onPress: () => removeOverride(slot.id),
      },
    ]
  );
};

Acceptance criteria:
✓ "What's this?" link shown when overrides exist
✓ Tapping link opens legend modal
✓ Legend explains all slot states
✓ Visual examples in legend
✓ Tapping override dot shows details
✓ Override details show date, reason, original vs modified
✓ Option to remove override from details
✓ Legend dismisses on backdrop tap
✓ Tips included in legend
```

---

## Items 64-77: Mock Data Cleanup (Bulk Treatment)

**Problem**: 84+ files contain MOCK_*/SEED_* constants, 2719-line seed file, hardcoded 2023-2024 dates across 44+ files.

**Files**:
- 64: Constants files with MOCK_* prefix
- 65: `constants/relational-demo-seeds.ts` (2719 lines)
- 66: `services/progress/progress-demo-seed-service.ts` (1754 lines)
- 68: 44+ files with hardcoded 2023-2024 dates
- 71: `app/settings/account.tsx` line ~153 ("Member Since January 2024")
- 72: `services/favourite-service.ts` lines ~32-54 (auto-populated favorites)
- 73: `services/referral-service.ts` lines ~39-72 (fake referral dashboard)
- 74: `hooks/use-objectives.ts` lines ~26-51 (pre-seeded objectives)
- 75: `services/availability-service.ts` lines ~71-185 (mock availability)
- 77: `components/coach/smart-slots-data.ts` lines ~54-99 (mock heatmap)

**Prompt (consolidated)**:
```
Add mock data awareness and cleanup across codebase.

This is a multi-file refactor to make demo data visible and replaceable. Follow these patterns:

## Pattern 1: Add "Demo Mode" indicators

For any component using mock data:

import { isDemoMode } from '@/utils/demo-mode';

const Component = () => {
  const isDemo = isDemoMode();

  return (
    <>
      {isDemo && <DemoBanner message="This feature uses demo data" />}
      {/* ... rest of component ... */}
    </>
  );
};

Create utils/demo-mode.ts:

// Synchronous check — reads from cached values set by useAuth on login
export function isDemoMode(): boolean {
  // apiClient has in-memory cache, so .get() is sync-safe after first load
  // Check for real user-created data presence
  return !_hasCachedRealData;
}

// Set by useAuth hook on login/startup
let _hasCachedRealData = false;

export async function refreshDemoModeStatus(): Promise<boolean> {
  const bookings = await apiClient.get(StorageKeys.USER_BOOKINGS, []);
  const profile = await apiClient.get(StorageKeys.USER_PROFILE, null);
  _hasCachedRealData = bookings.length > 0 && profile !== null;
  return !_hasCachedRealData;
}

export const DemoBanner = ({ message }: { message: string }) => {
  const { colors } = useTheme();

  return (
    <View style={{
      backgroundColor: colors.warning.surface,
      padding: Spacing.sm,
      borderRadius: Spacing.sm,
      marginBottom: Spacing.md,
      borderLeftWidth: 3,
      borderLeftColor: colors.warning.base,
    }}>
      <Row style={{ alignItems: 'center' }}>
        <MaterialIcons name="science" size={16} color={colors.warning.base} />
        <ThemedText
          variant="caption"
          style={{ marginLeft: Spacing.xs, color: colors.warning.base, flex: 1 }}
        >
          {message}
        </ThemedText>
      </Row>
    </View>
  );
};

## Pattern 2: Dynamic dates (fix hardcoded 2023-2024)

Replace all hardcoded dates with relative dates:

// BEFORE
const memberSince = 'January 2024';

// AFTER
const calculateMemberSince = async (userId: string): Promise<string> => {
  const result = await userService.getUserById(userId);
  if (result.success && result.data.createdAt) {
    return formatMonthYear(result.data.createdAt);
  }

  // Fallback: estimate from current date
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  return formatMonthYear(threeMonthsAgo.toISOString());
};

const formatMonthYear = (isoDate: string): string => {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
};

## Pattern 3: Replace seed files with lazy generation

Instead of 2719-line seed file, generate on-demand:

// services/demo-data-service.ts
export class DemoDataService {
  private generated = new Map<string, User>();

  async getDemoCoach(id: string): Promise<User> {
    if (this.generated.has(id)) {
      return this.generated.get(id);
    }

    const coach = this.generateCoach(id);
    this.generated.set(id, coach);
    return coach;
  }

  private generateCoach(id: string): User {
    // Deterministic generation based on ID
    const seed = hashString(id);
    const names = ['Emma', 'Jack', 'Sophie', 'Tom', 'Olivia'];
    const sports = ['Football', 'Rugby', 'Hockey'];

    return {
      id,
      name: names[seed % names.length],
      sport: sports[seed % sports.length],
      rating: 4 + (seed % 11) / 10, // 4.0-5.0
      isDemo: true, // Flag as demo data
    };
  }
}

// Hash function for deterministic generation
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

## Pattern 4: Auto-population with opt-out

For favorites, objectives, etc. that auto-populate:

// BEFORE
const favorites = MOCK_FAVORITES;

// AFTER
const favorites = await getFavorites();

async function getFavorites(): Promise<Coach[]> {
  // Check if user has manually added any favorites
  const userFavorites = await apiClient.get(StorageKeys.USER_FAVORITES, []);

  if (userFavorites.length > 0) {
    return userFavorites;
  }

  // First-time user: offer demo favorites
  const showDemoFavorites = await apiClient.get(StorageKeys.SHOW_DEMO_FAVORITES, true);

  if (showDemoFavorites) {
    return generateDemoFavorites(); // Generate, don't hardcode
  }

  return [];
}

// Add dismiss action
const handleDismissDemoFavorites = async () => {
  await apiClient.set(StorageKeys.SHOW_DEMO_FAVORITES, false);
  setFavorites([]);
};

## Files to update (specific, file-by-file):

**New files:**
1. `utils/demo-mode.ts` — isDemoMode() + DemoBanner component
2. `services/demo-data-service.ts` — lazy deterministic generation

**Top 10 files with hardcoded mock data (in priority order):**
1. `app/settings/account.tsx` line ~153 — "Member Since January 2024" → dynamic
2. `services/favourite-service.ts` lines ~32-54 — auto-populated favorites → lazy + opt-out
3. `services/referral-service.ts` lines ~39-72 — fake referral dashboard → demo indicator
4. `hooks/use-objectives.ts` lines ~26-51 — pre-seeded objectives → opt-in demo
5. `services/availability-service.ts` lines ~71-185 — mock availability blocks → empty + demo banner
6. `components/coach/smart-slots-data.ts` lines ~54-99 — mock heatmap → calculate or show empty
7. `constants/relational-demo-seeds.ts` (2719 lines) — move to demo-data-service lazy generation
8. `services/progress/progress-demo-seed-service.ts` (1754 lines) — same treatment
9. `components/progress/player-card.tsx` — mock OVR stats → demo indicator
10. `components/coach/analytics-screen-sections.tsx` — mock analytics → demo banner

## Acceptance criteria:
✓ Demo data clearly labeled with banners/badges
✓ No hardcoded 2023/2024 dates remaining
✓ Seed files deleted or moved to demo-data-service
✓ Mock data generated lazily, not stored in constants
✓ Users can opt out of demo data
✓ First-time users see helpful demo data
✓ Returning users see their real data
✓ "isDemo" flag on all generated data
✓ Clear path from demo to real data entry

## Implementation notes:
- This is a large refactor (~50+ files touched)
- Do in multiple commits grouped by pattern
- Test demo mode toggle thoroughly
- Ensure no breaking changes to existing flows
- Add TypeScript isDemo: boolean to relevant interfaces
```

---

## Item 62: Coach-Says Homework Expansion Resets on Re-render

**Problem**: Expanding homework details resets when parent component re-renders.

**Files**: `components/progress/coach-says-card.tsx` lines ~76, 93-95

**Current behavior**: Local useState lost on re-render.

**Prompt**:
```
Persist homework expansion state in coach-says card (components/progress/coach-says-card.tsx).

Current code (lines 76, 93-95):
const [expanded, setExpanded] = useState(false); // Lost on re-render

Use ref or controlled state:

import { useRef, useCallback } from 'react';

const CoachSaysCard = ({ sessionId }: Props) => {
  const { colors } = useTheme();
  const expandedItemsRef = useRef<Set<string>>(new Set());
  // Replace forceUpdate anti-pattern with useReducer counter
  const [, forceRender] = useReducer((x: number) => x + 1, 0);

  const toggleExpansion = useCallback((itemId: string) => {
    if (expandedItemsRef.current.has(itemId)) {
      expandedItemsRef.current.delete(itemId);
    } else {
      expandedItemsRef.current.add(itemId);
    }
    forceRender(); // Trigger re-render via useReducer counter
  }, []);

  const isExpanded = useCallback(
    (itemId: string) => expandedItemsRef.current.has(itemId),
    []
  );

  return (
    <Column>
      {homeworkItems.map(item => (
        <HomeworkItem
          key={item.id}
          item={item}
          isExpanded={isExpanded(item.id)}
          onToggle={() => toggleExpansion(item.id)}
        />
      ))}
    </Column>
  );
};

interface HomeworkItemProps {
  item: Homework;
  isExpanded: boolean;
  onToggle: () => void;
}

const HomeworkItem = memo(({ item, isExpanded, onToggle }: HomeworkItemProps) => {
  const { colors } = useTheme();

  return (
    <SurfaceCard style={{ marginBottom: Spacing.sm }}>
      <Pressable onPress={onToggle}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <ThemedText variant="subheading">{item.title}</ThemedText>
          <MaterialIcons
            name={isExpanded ? 'expand-less' : 'expand-more'}
            size={24}
            color={colors.text.secondary}
          />
        </Row>
      </Pressable>

      {isExpanded && (
        <Column style={{ marginTop: Spacing.sm }}>
          <ThemedText variant="bodySmall" color="secondary">
            {item.description}
          </ThemedText>

          {item.resources && item.resources.length > 0 && (
            <Column style={{ marginTop: Spacing.sm, gap: Spacing.xs }}>
              <ThemedText variant="caption" color="tertiary">
                Resources:
              </ThemedText>
              {item.resources.map((resource, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => Linking.openURL(resource.url)}
                >
                  <Row style={{ alignItems: 'center' }}>
                    <MaterialIcons
                      name="link"
                      size={16}
                      color={colors.primary.base}
                    />
                    <ThemedText
                      variant="bodySmall"
                      style={{ marginLeft: Spacing.xxs, color: colors.primary.base }}
                    >
                      {resource.title}
                    </ThemedText>
                  </Row>
                </Pressable>
              ))}
            </Column>
          )}
        </Column>
      )}
    </SurfaceCard>
  );
});

// Alternative: persist to AsyncStorage for permanent expansion state
const usePersistedExpansion = (sessionId: string) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loadExpansion = async () => {
      const stored = await apiClient.get(`HOMEWORK_EXPANDED_${sessionId}`, []);
      setExpandedItems(new Set(stored));
    };
    loadExpansion();
  }, [sessionId]);

  const toggleExpansion = useCallback(async (itemId: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }

      // Persist
      apiClient.set(`HOMEWORK_EXPANDED_${sessionId}`, Array.from(next));

      return next;
    });
  }, [sessionId]);

  return { expandedItems, toggleExpansion };
};

Acceptance criteria:
✓ Expansion state survives re-renders
✓ Each homework item independently expandable
✓ State persisted with useRef or AsyncStorage
✓ Memoized components don't re-render unnecessarily
✓ Smooth expand/collapse animation
✓ Multiple items can be expanded simultaneously
✓ State resets when navigating away (if using ref)
✓ State persists across app restarts (if using AsyncStorage)
```

---

## Sprint 2 Summary

**Total Items**: 14 (many consolidated into bulk item 64-77)
**Estimated Effort**: 24-30 hours
**Priority**: MEDIUM - tech debt and transparency

**Dependency Map**:
- Items 64-77 are all mock data → consolidate into patterns
- Create utils/demo-mode.ts first (used by all)
- Create services/demo-data-service.ts second
- Update individual files last

**Success Criteria**:
- ✓ All demo data clearly labeled
- ✓ No "(mock)" text in user-facing UI
- ✓ No hardcoded 2023/2024 dates
- ✓ Demo mode detectable programmatically
- ✓ Path to enter real data always visible
- ✓ Seed files replaced with lazy generation

**Testing Focus**:
- Demo mode detection accuracy
- Transition from demo to real data
- Date calculations across years
- Lazy data generation performance
- Persistence of expansion states
- Cache invalidation when entering real data

**Risk Areas**:
- Large refactor touches many files
- Risk of breaking existing flows
- Performance impact of lazy generation
- AsyncStorage quota with expansion states
- Demo mode detection false positives/negatives

**Tech Debt Resolved**:
- Massive seed files deleted
- Hardcoded dates eliminated
- Mock data made discoverable
- Clear separation demo vs real data
- Foundation for real backend integration

**Future Work** (not in this sprint):
- Backend API integration
- Real payment processing (Stripe)
- Actual booking confirmations
- Live coach discovery
- Real-time messaging
