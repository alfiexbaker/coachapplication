# Components Guide

> Reference for UI component library with usage patterns and theming.

---

## Overview

Clubroom uses a layered component architecture with primitive building blocks, themed components, and feature-specific components.

### Component Hierarchy

```
Feature Components (e.g., CoachCard, BookingWizard)
         │
    Themed Components (e.g., ThemedText, SurfaceCard)
         │
    Primitive Components (e.g., Clickable, Badge)
         │
    React Native Core (View, Text, Pressable)
```

---

## Component Directory

```
clubroom/components/
├── primitives/           # Base building blocks
│   ├── badge.tsx
│   ├── button.tsx
│   ├── clickable.tsx
│   ├── icon-button.tsx
│   ├── surface-card.tsx
│   └── ...
├── ui/                   # UI elements
│   ├── avatar.tsx
│   ├── bottom-sheet.tsx
│   ├── icon-symbol.tsx
│   ├── loading-overlay.tsx
│   └── ...
├── themed-text.tsx       # Typography
├── themed-view.tsx       # Themed container
├── coach/               # Coach features
├── parent/              # Parent features
├── booking/             # Booking features
├── club/                # Club features
├── event/               # Event features
├── message/             # Messaging
├── progress/            # Progress tracking
├── review/              # Reviews
├── verification/        # Verification
├── video/               # Video player
└── ...
```

---

## Primitive Components

### Clickable

Touch-responsive wrapper with press states.

```tsx
import { Clickable } from '@/components/primitives/clickable';

<Clickable
  onPress={() => handlePress()}
  style={({ pressed }) => [
    styles.button,
    { opacity: pressed ? 0.7 : 1 }
  ]}
  hitSlop={8}
>
  <ThemedText>Press Me</ThemedText>
</Clickable>
```

### SurfaceCard

Elevated card container with theme-aware styling.

```tsx
import { SurfaceCard } from '@/components/primitives/surface-card';

<SurfaceCard style={styles.card}>
  <ThemedText type="subtitle">Card Title</ThemedText>
  <ThemedText>Card content here</ThemedText>
</SurfaceCard>
```

### Badge

Status/label badge component.

```tsx
import { Badge } from '@/components/primitives/badge';

<Badge
  label="Verified"
  tone="success"    // 'success' | 'warning' | 'error' | 'default'
  size="sm"         // 'sm' | 'md' | 'lg'
/>
```

### Button

Primary action button.

```tsx
import { Button } from '@/components/primitives/button';

<Button
  title="Book Session"
  onPress={handleBook}
  variant="primary"  // 'primary' | 'secondary' | 'outline' | 'ghost'
  size="md"          // 'sm' | 'md' | 'lg'
  loading={isLoading}
  disabled={isDisabled}
/>
```

### IconButton

Circular icon button.

```tsx
import { IconButton } from '@/components/primitives/icon-button';

<IconButton
  icon="add"
  onPress={handleAdd}
  size={44}
  color={palette.tint}
/>
```

---

## Themed Components

### ThemedText

Typography component with predefined styles.

```tsx
import { ThemedText } from '@/components/themed-text';

// Type variants
<ThemedText type="title">Page Title</ThemedText>
<ThemedText type="subtitle">Section Title</ThemedText>
<ThemedText type="defaultSemiBold">Bold Text</ThemedText>
<ThemedText type="default">Body Text</ThemedText>
<ThemedText type="link">Link Text</ThemedText>

// With custom styles
<ThemedText style={{ color: palette.muted, fontSize: 12 }}>
  Secondary text
</ThemedText>
```

### ThemedView

Container with theme-aware background.

```tsx
import { ThemedView } from '@/components/themed-view';

<ThemedView style={styles.container}>
  <ThemedText>Content</ThemedText>
</ThemedView>
```

---

## UI Components

### Avatar

User profile avatar.

```tsx
import { Avatar } from '@/components/ui/avatar';

<Avatar
  source={{ uri: user.profilePhotoUrl }}
  fallback={user.name.charAt(0)}
  size={48}
/>
```

### BottomSheet

Modal bottom sheet.

```tsx
import { BottomSheet } from '@/components/ui/bottom-sheet';

<BottomSheet
  isVisible={showSheet}
  onClose={() => setShowSheet(false)}
  snapPoints={['50%', '90%']}
>
  <View style={styles.sheetContent}>
    <ThemedText>Sheet Content</ThemedText>
  </View>
</BottomSheet>
```

### LoadingOverlay

Full-screen loading indicator.

```tsx
import { LoadingOverlay } from '@/components/ui/loading-overlay';

<LoadingOverlay
  visible={isLoading}
  message="Processing..."
/>
```

### IconSymbol

Platform-aware icon component.

```tsx
import { IconSymbol } from '@/components/ui/icon-symbol';

<IconSymbol
  name="checkmark.circle.fill"  // SF Symbol name
  fallback="checkmark-circle"   // Ionicons fallback
  size={24}
  color={palette.success}
/>
```

---

## Feature Components

### Coach Card
**File:** `components/coach/coach-card.tsx`

Displays coach summary in search results.

```tsx
<CoachCard
  coach={coachProfile}
  distance={2.5}
  nextAvailable="Tomorrow at 10:00"
  onPress={() => navigateToCoach(coach.id)}
/>
```

### Booking Card
**File:** `components/booking/booking-card.tsx`

Displays booking summary.

```tsx
<BookingCard
  booking={booking}
  variant="upcoming"  // 'upcoming' | 'past' | 'minimal'
  onPress={() => navigateToBooking(booking.id)}
/>
```

### Session Invite Card
**File:** `components/booking/session-invite-card.tsx`

Displays pending session invitation.

```tsx
<SessionInviteCard
  invite={invite}
  onAccept={(slotId) => handleAccept(invite.id, slotId)}
  onDecline={() => handleDecline(invite.id)}
/>
```

### Progress Chart
**File:** `components/progress/progress-chart.tsx`

Displays skill progression.

```tsx
<ProgressChart
  skills={athlete.skills}
  period="month"
  showTrends={true}
/>
```

### Skill Radar
**File:** `components/progress/skill-radar.tsx`

Radar chart comparing skills.

```tsx
<SkillRadar
  athleteSkills={skills}
  averageSkills={benchmarks}
/>
```

### Event Card
**File:** `components/event/event-card.tsx`

Displays club event summary.

```tsx
<EventCard
  event={event}
  onPress={() => navigateToEvent(event.id)}
  onRSVP={(status) => handleRSVP(event.id, status)}
/>
```

### Message Bubble
**File:** `components/message/message-bubble.tsx`

Chat message display.

```tsx
<MessageBubble
  message={message}
  isOwn={message.senderId === currentUser.id}
  showAvatar={true}
/>
```

### Review Card
**File:** `components/review/review-card.tsx`

Displays coach review.

```tsx
<ReviewCard
  review={review}
  showCoach={false}
  onHelpful={() => markHelpful(review.id)}
/>
```

### Verification Badge
**File:** `components/verification/verification-badge.tsx`

Coach verification status badge.

```tsx
<VerificationBadge
  level={coach.verificationLevel}
  showLabel={true}
/>
```

---

## Theming

### Color Palette

```typescript
// constants/theme.ts
export const Colors = {
  light: {
    text: '#11181C',
    background: '#FFFFFF',
    surface: '#F5F5F5',
    tint: '#007AFF',
    muted: '#6B7280',
    border: '#E5E7EB',
    icon: '#687076',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    secondary: '#6B7280',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    surface: '#1F2123',
    tint: '#0A84FF',
    muted: '#9BA1A6',
    border: '#2D3134',
    icon: '#9BA1A6',
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    secondary: '#9BA1A6',
  },
};
```

### Using Colors

```tsx
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

function MyComponent() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <View style={{ backgroundColor: palette.background }}>
      <ThemedText style={{ color: palette.text }}>
        Themed Content
      </ThemedText>
    </View>
  );
}
```

### Spacing

```typescript
// constants/theme.ts
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
};
```

### Radii

```typescript
// constants/theme.ts
export const Radii = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};
```

---

## Animation Patterns

### Animated Entrance

```tsx
import Animated, { FadeInDown } from 'react-native-reanimated';

<Animated.View entering={FadeInDown.springify()}>
  <CoachCard coach={coach} />
</Animated.View>
```

### Staggered List

```tsx
{items.map((item, index) => (
  <Animated.View
    key={item.id}
    entering={FadeInDown.delay(index * 50).springify()}
  >
    <ItemCard item={item} />
  </Animated.View>
))}
```

### Press Feedback

```tsx
<Pressable
  onPress={handlePress}
  style={({ pressed }) => [
    styles.card,
    { opacity: pressed ? 0.7 : 1 }
  ]}
>
  <Content />
</Pressable>
```

---

## Accessibility

### Labels

```tsx
<Pressable
  onPress={handlePress}
  accessibilityLabel="Book session with Coach Marcus"
  accessibilityRole="button"
>
  <CoachCard coach={coach} />
</Pressable>
```

### Hints

```tsx
<TextInput
  placeholder="Enter postcode"
  accessibilityHint="Search for coaches near this location"
/>
```

### States

```tsx
<Button
  title={isLoading ? "Loading..." : "Submit"}
  accessibilityState={{ busy: isLoading, disabled: isDisabled }}
/>
```

---

## Best Practices

### Component Structure

```tsx
// Good component structure
export function CoachCard({ coach, onPress }: CoachCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <Clickable onPress={onPress}>
      <SurfaceCard style={styles.card}>
        <Avatar source={coach.profilePhotoUrl} />
        <ThemedText type="defaultSemiBold">{coach.fullName}</ThemedText>
        <Badge label="Verified" tone="success" />
      </SurfaceCard>
    </Clickable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
});
```

### Props Interface

```tsx
interface CoachCardProps {
  coach: CoachProfile;
  distance?: number;
  nextAvailable?: string;
  onPress?: () => void;
  testID?: string;
}
```

### Memoization

```tsx
import { memo } from 'react';

export const CoachCard = memo(function CoachCard({ coach, onPress }: CoachCardProps) {
  // Component implementation
});
```

---

## Testing Components

```tsx
// __tests__/components/CoachCard.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { CoachCard } from '@/components/coach/coach-card';

describe('CoachCard', () => {
  it('displays coach name', () => {
    const { getByText } = render(
      <CoachCard coach={mockCoach} />
    );

    expect(getByText('Marcus Thompson')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <CoachCard coach={mockCoach} onPress={onPress} testID="coach-card" />
    );

    fireEvent.press(getByTestId('coach-card'));
    expect(onPress).toHaveBeenCalled();
  });
});
```
