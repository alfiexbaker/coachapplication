# CLAUDE.md - AI Assistant Guide for Clubroom

**Last Updated**: 2025-11-20
**Project**: Clubroom - The Uber of Football Coaching
**Status**: MVP Development - Dashboard Separation Phase

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Codebase Structure](#codebase-structure)
3. [Technology Stack](#technology-stack)
4. [Development Workflows](#development-workflows)
5. [Key Conventions](#key-conventions)
6. [Role-Based Architecture](#role-based-architecture)
7. [Common Tasks](#common-tasks)
8. [Important Files Reference](#important-files-reference)
9. [Safety Guidelines](#safety-guidelines)
10. [Testing & Deployment](#testing--deployment)

---

## Project Overview

### What is Clubroom?

Clubroom is a **football coaching marketplace platform** that connects players, parents, and coaches. Think Uber for football coaching combined with development tracking.

**Core Features**:
- 🔍 **Discovery**: Players find coaches via map/list with filters
- 📅 **Booking**: Schedule sessions with objectives (dribbling, passing, etc.)
- 💬 **Messaging**: Real-time chat between coaches and clients
- 📊 **Development Tracking**: Monitor player progress over time
- 💳 **Payments**: Stripe Connect marketplace (planned)

### Current Development Phase

**Status**: MVP - Dashboard Separation Phase

**Completed**:
- ✅ Role-based authentication (demo/hardcoded)
- ✅ Tab navigation with role-specific screens
- ✅ Modern UI design (Uber-inspired)
- ✅ Coach discovery interface
- ✅ Booking cards and session history
- ✅ Messaging UI components

**In Progress**:
- 🚧 Separating User vs Coach dashboards
- 🚧 Role-based tab routing refinements

**Not Yet Implemented**:
- ⏳ Real backend (currently all mock data)
- ⏳ Real-time messaging (Socket.io planned)
- ⏳ Stripe Connect payments
- ⏳ PostgreSQL database

### Key Documentation

**Essential Reading**:
- `/docs/SOURCE_OF_TRUTH.md` - Single source of truth for project decisions
- `/docs/vision/DASHBOARD_REQUIREMENTS.md` - User vs Coach dashboard specs
- `/docs/vision/SOFTWARE_DESIGN_DOCUMENT.md` - Complete technical vision
- `/docs/technical/DB_MODEL_NOTES.md` - Planned database schema

---

## Codebase Structure

### Root Directory Layout

```
coachapplication/
├── clubroom/              # Main React Native application
│   ├── app/              # Expo Router file-based routing
│   ├── components/       # React components
│   ├── constants/        # Types, theme, mock data
│   ├── hooks/            # Custom React hooks
│   ├── utils/            # Utility functions
│   └── assets/           # Images and static files
├── docs/                 # Comprehensive documentation
│   ├── technical/        # DB models, technical specs
│   ├── vision/          # Product requirements
│   ├── sprints/         # Sprint planning docs
│   └── links/           # External resources
└── CLAUDE.md            # This file
```

### Clubroom Application Structure

```
clubroom/
├── app/
│   ├── _layout.tsx                # Root layout with AuthProvider
│   ├── (tabs)/                    # Tab navigation group
│   │   ├── _layout.tsx           # Role-based tab configuration
│   │   ├── index.tsx             # Discover screen (Users/Parents)
│   │   ├── availability.tsx      # Calendar (Coaches only)
│   │   ├── bookings.tsx          # Bookings management
│   │   ├── messages.tsx          # Messaging interface
│   │   └── profile.tsx           # User profile
│   └── modal.tsx                 # Modal screen example
│
├── components/
│   ├── auth/                     # Authentication screens
│   │   └── login-screen.tsx     # Login UI
│   ├── bookings/                 # Booking components
│   │   └── booking-card.tsx     # Session cards
│   ├── discover/                 # Coach discovery components
│   │   ├── coach-card.tsx       # Coach profile cards
│   │   ├── booking-flow.tsx     # Booking workflow
│   │   ├── filter-tray.tsx      # Search filters
│   │   └── map-preview.tsx      # Map integration
│   ├── messaging/                # Chat & messaging UI
│   │   ├── message-bubble.tsx   # Chat bubbles
│   │   ├── chat-input.tsx       # Message input
│   │   ├── thread-summary.tsx   # Thread previews
│   │   └── typing-indicator.tsx # Typing status
│   ├── primitives/               # Base UI components
│   │   ├── surface-card.tsx     # Main card component
│   │   ├── badge.tsx            # Status badges
│   │   ├── chip.tsx             # Filter chips
│   │   └── section-header.tsx   # Section titles
│   ├── themed-text.tsx          # Theme-aware text
│   └── themed-view.tsx          # Theme-aware views
│
├── hooks/
│   └── use-auth.tsx             # Auth context & hook
│
├── constants/
│   ├── types.ts                 # TypeScript types
│   ├── theme.ts                 # Design tokens
│   └── mock-data.ts             # Hardcoded data
│
├── utils/
│   └── format.ts                # Formatting utilities
│
└── assets/
    ├── fonts/                   # Custom fonts
    └── images/                  # Images
```

---

## Technology Stack

### Frontend (Current)

- **Framework**: React Native 0.81.5 with React 19.1.0
- **Platform**: Expo SDK 54 (managed workflow)
- **Routing**: Expo Router 6.0 (file-based routing)
- **Language**: TypeScript 5.9.2 (strict mode)
- **UI/Animations**: React Native Reanimated 4.1
- **Navigation**: React Navigation 7.1 with Bottom Tabs
- **Icons**: Expo Vector Icons & SF Symbols

### Backend (Planned - Not Implemented)

- **Runtime**: Node.js + NestJS
- **Database**: PostgreSQL
- **Cache**: Redis
- **Payments**: Stripe Connect
- **Real-time**: Socket.io
- **Storage**: AWS S3

### Data State

**IMPORTANT**: Currently **all data is mock/hardcoded**. No real backend exists.

Mock data location: `/clubroom/constants/mock-data.ts`

Includes:
- Coach profiles
- Bookings
- Chat messages
- Session history
- Payment data

---

## Development Workflows

### Getting Started

```bash
# Navigate to clubroom directory
cd clubroom

# Install dependencies
npm install

# Start development server
npm run dev

# Platform-specific runs
npm run android    # Android emulator
npm run ios        # iOS simulator
npm run web        # Web browser
```

### Code Quality

```bash
# Run ESLint
npm run lint

# TypeScript type checking (automatic in IDE)
npx tsc --noEmit
```

### Git Workflow

**Current Branch**: `claude/claude-md-mi7pjpz9vbgubivf-01WjZ1oXAt3Ka6NoNfcFo6Sg`

**IMPORTANT Git Rules**:
1. **ALWAYS** develop on the designated Claude branch
2. **NEVER** push to main/master directly
3. **ALWAYS** use descriptive commit messages
4. **ALWAYS** push with: `git push -u origin <branch-name>`
5. **ONLY** retry on network errors (up to 4 times with exponential backoff)

**Commit Message Style** (based on recent commits):
- Clear, imperative mood
- Reference what was changed and why
- Examples:
  - "Fix admin navigation with single conditional structure"
  - "Implement role-based tab visibility"
  - "Add coach discovery filter tray"

### Build & Deployment

```bash
# Create builds using EAS
eas build --platform ios
eas build --platform android

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

**EAS Project**: `9d89d9ae-d218-4670-89aa-38d0f7564554`
**Owner**: `coachapptrial`

---

## Key Conventions

### File Naming

- **Components**: `kebab-case.tsx` (e.g., `coach-card.tsx`)
- **Hooks**: `use-*.tsx` (e.g., `use-auth.tsx`)
- **Screens**: `snake_case.tsx` in app folder (e.g., `bookings.tsx`)
- **Constants**: `kebab-case.ts` (e.g., `mock-data.ts`)

### Import Aliases

```typescript
// Use @ alias for project root
import { Colors } from '@/constants/theme';
import { CoachProfile } from '@/constants/types';
```

### Component Patterns

#### Themed Components

```typescript
// Accept lightColor and darkColor props
<ThemedText lightColor="#FFFFFF" darkColor="#000000">
  Hello World
</ThemedText>
```

#### Animated Components

```typescript
import Animated, { FadeInDown } from 'react-native-reanimated';

<Animated.View entering={FadeInDown.springify()}>
  {/* content */}
</Animated.View>
```

#### Surface Cards (Primary UI Container)

```typescript
<SurfaceCard
  onPress={handlePress}          // Optional interaction
  loading={isLoading}            // Shimmer effect
  animateElevation={true}        // Press animations
  haptics={true}                 // Haptic feedback
  outlineGradient={['#00D9A3', '#00D9A3']}  // Optional outline
>
  {/* Card content */}
</SurfaceCard>
```

### Styling Patterns

#### StyleSheet.create Usage

```typescript
import { StyleSheet } from 'react-native';
import { Spacing, Radii } from '@/constants/theme';

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    gap: Spacing.md,
    borderRadius: Radii.md,
  },
});
```

#### Theme-Aware Inline Styles

```typescript
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/theme';

const colorScheme = useColorScheme();
const palette = Colors[colorScheme ?? 'light'];

style={[styles.text, { color: palette.muted }]}
```

### Design Tokens

Located in: `/clubroom/constants/theme.ts`

```typescript
// Colors - Uber/Whoop inspired palette
Colors = {
  light: {
    text: '#000000',
    background: '#FFFFFF',
    tint: '#000000',
    premium: '#00D9A3',  // Teal accent
    error: '#FF3B30',
    // ... more
  },
  dark: {
    text: '#FFFFFF',
    background: '#000000',
    tint: '#FFFFFF',
    // ... more
  }
}

// Spacing - 4px base unit
Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 48
}

// Border Radii
Radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999
}

// Typography
Typography = {
  xs: { fontSize: 11, lineHeight: 16 },
  base: { fontSize: 15, lineHeight: 22 },
  '2xl': { fontSize: 28, lineHeight: 34 },
  // ... more sizes
}
```

### Button Styling Rules

**CRITICAL**: Buttons must have proper color contrast

#### Primary Buttons (CTAs)

```typescript
// Background: palette.tint (black in light, white in dark)
// Text: MUST be inverse of background

<ThemedText
  lightColor="#FFFFFF"  // White text on black button
  darkColor="#000000"   // Black text on white button
>
  Book Session
</ThemedText>
```

#### Accent Buttons

```typescript
// Background: palette.premium (#00D9A3 teal)
// Text: ALWAYS black for contrast

<ThemedText lightColor="#000000" darkColor="#000000">
  Upgrade
</ThemedText>
```

#### Destructive Buttons

```typescript
// Background: palette.error (#FF3B30 red)
// Text: ALWAYS white

<ThemedText lightColor="#FFFFFF" darkColor="#FFFFFF">
  Cancel
</ThemedText>
```

### Utility Functions

Located in: `/clubroom/utils/format.ts`

```typescript
formatPriceRange(price: CoachProfile['priceRange'])
formatDistance(distanceMiles: number)
formatNextAvailability(isoString: string)
formatWeekday(value: Date)
formatTime(value: Date)
formatTimeRange(start: Date, durationMinutes: number)
```

### Navigation Patterns

#### File-Based Routing

- `app/` folder maps to routes
- `(tabs)/` creates a layout group (not in URL)
- `_layout.tsx` controls nested layouts
- `index.tsx` is the default route

#### Tab Visibility

```typescript
// Hide tab from specific roles
<Tabs.Screen
  name="availability"
  options={{
    href: null  // Hides the tab completely
  }}
/>

// Or conditionally hide
<Tabs.Screen
  name="availability"
  options={{
    href: currentUser.role === 'Coach' ? '/availability' : null
  }}
/>
```

---

## Role-Based Architecture

### User Roles

```typescript
type UserRole = 'User' | 'Parent' | 'Coach' | 'Admin';
```

### Demo Credentials

**IMPORTANT**: These are hardcoded for MVP testing

| Username | Password | Role |
|----------|----------|------|
| `user` | `user1234` | User |
| `parent` | `parent1234` | Parent |
| `coach` | `coach1234` | Coach |
| `admin` | `admin1234` | Admin |

### Auth Hook Usage

Located in: `/clubroom/hooks/use-auth.tsx`

```typescript
import { useAuth } from '@/hooks/use-auth';

function MyComponent() {
  const { currentUser, isAuthenticated, login, logout } = useAuth();

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Access user role
  if (currentUser.role === 'Coach') {
    return <CoachDashboard />;
  }

  return <UserDashboard />;
}
```

### Role-Specific Dashboards

#### User/Player Dashboard

**Navigation**: Discover | Bookings | Messages | Profile

**Features**:
- Discovery screen with coach search
- "Next session" tile (NOT full calendar)
- Upcoming & past bookings
- Session history with objectives
- Messages with coaches

**Excluded**:
- ❌ Calendar tab
- ❌ Availability builder
- ❌ School management

#### Coach Dashboard

**Navigation**: Calendar | Bookings | Messages | Profile

**Features**:
- Full calendar with week/month views
- Availability builder
- Service management
- Booking requests
- Post-session notes
- Income dashboard (planned)

**Excluded**:
- ❌ Discovery tab (coaches don't book)

#### Parent Dashboard

**Same as User/Player** + Multi-child management

**Additional Features**:
- Child switcher in top bar
- Actions hub (confirm attendance, update objectives)
- Unified bookings across children
- Payment center

#### Admin Dashboard

**Navigation**: Users | Bookings | Reports | Settings

**Features**:
- User management
- Moderation tools
- Platform configuration

See `/docs/vision/DASHBOARD_REQUIREMENTS.md` for complete specs.

---

## Common Tasks

### Adding a New Screen

1. Create file in `app/` folder:

```typescript
// app/new-screen.tsx
import { View, Text } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';

export default function NewScreen() {
  return (
    <ThemedView style={{ flex: 1, padding: 20 }}>
      <ThemedText>New Screen</ThemedText>
    </ThemedView>
  );
}
```

2. Add to navigation if needed
3. Expo Router automatically creates the route

### Adding a New Component

1. Create component file:

```typescript
// components/my-component.tsx
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii } from '@/constants/theme';

export function MyComponent() {
  return (
    <View style={styles.container}>
      <ThemedText>My Component</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    borderRadius: Radii.md,
  },
});
```

2. Export from index if creating a module
3. Import where needed

### Adding Mock Data

Edit: `/clubroom/constants/mock-data.ts`

```typescript
export const myMockData: MyType[] = [
  {
    id: '1',
    name: 'Example',
    // ... fields
  },
];
```

### Modifying Types

Edit: `/clubroom/constants/types.ts`

```typescript
export interface MyNewType {
  id: string;
  field: string;
  // ... more fields
}
```

### Adding a Role-Based Feature

1. Check user role:

```typescript
import { useAuth } from '@/hooks/use-auth';

const { currentUser } = useAuth();

if (currentUser.role === 'Coach') {
  // Show coach-specific feature
}
```

2. Update tab layout if needed: `/clubroom/app/(tabs)/_layout.tsx`
3. Update documentation: `/docs/SOURCE_OF_TRUTH.md`

### Updating Theme

Edit: `/clubroom/constants/theme.ts`

**IMPORTANT**: Maintain both light and dark mode values

```typescript
export const Colors = {
  light: {
    myNewColor: '#123456',
  },
  dark: {
    myNewColor: '#654321',
  },
};
```

---

## Important Files Reference

### Configuration Files

| File | Purpose | Location |
|------|---------|----------|
| `package.json` | Dependencies, scripts | `/clubroom/package.json` |
| `tsconfig.json` | TypeScript config | `/clubroom/tsconfig.json` |
| `app.json` | Expo configuration | `/clubroom/app.json` |
| `eas.json` | EAS Build config | `/clubroom/eas.json` |
| `eslint.config.js` | ESLint rules | `/clubroom/eslint.config.js` |

### Core Application Files

| File | Purpose | Line Reference |
|------|---------|---------------|
| `app/_layout.tsx` | Root layout with AuthProvider | Root |
| `app/(tabs)/_layout.tsx` | Role-based tab configuration | Tab setup |
| `hooks/use-auth.tsx` | Authentication context | Auth |
| `constants/types.ts` | TypeScript type definitions | Types |
| `constants/theme.ts` | Design tokens | Theme |
| `constants/mock-data.ts` | Hardcoded data | Data |

### Documentation Files

| File | Purpose |
|------|---------|
| `docs/SOURCE_OF_TRUTH.md` | Single source of truth |
| `docs/vision/DASHBOARD_REQUIREMENTS.md` | Dashboard specs |
| `docs/vision/SOFTWARE_DESIGN_DOCUMENT.md` | Technical vision |
| `docs/vision/FOOTBALL_ROLE_FEATURES.md` | Football features |
| `docs/technical/DB_MODEL_NOTES.md` | Database schema |

---

## Safety Guidelines

### DO's

✅ **Always read files before editing**
✅ **Use TypeScript strict mode**
✅ **Test changes in both light and dark mode**
✅ **Maintain role-based access control**
✅ **Update documentation when changing features**
✅ **Use design tokens from theme.ts**
✅ **Commit with descriptive messages**
✅ **Push to the designated Claude branch only**

### DON'Ts

❌ **Never push to main/master**
❌ **Never bypass authentication**
❌ **Never hardcode colors (use theme tokens)**
❌ **Never skip dark mode testing**
❌ **Never delete mock data (real backend isn't ready)**
❌ **Never modify package.json without understanding dependencies**
❌ **Never introduce security vulnerabilities** (XSS, injection, etc.)
❌ **Never commit without testing the change**

### Making Safe Changes

1. **Read the relevant files first**
   ```bash
   # Use Read tool to understand current implementation
   ```

2. **Check documentation**
   - Consult `/docs/SOURCE_OF_TRUTH.md`
   - Review role requirements in `/docs/vision/DASHBOARD_REQUIREMENTS.md`

3. **Test both themes**
   - Light mode
   - Dark mode

4. **Test all affected roles**
   - If changing navigation, test User, Coach, Parent, Admin
   - If changing UI, test on iOS/Android/Web

5. **Update documentation if needed**
   - Update `/docs/SOURCE_OF_TRUTH.md` changelog
   - Update feature docs if behavior changed

6. **Commit and push**
   ```bash
   git add .
   git commit -m "Clear description of what changed and why"
   git push -u origin <branch-name>
   ```

---

## Testing & Deployment

### Current Testing Status

**No automated tests exist yet** - this is MVP prototype phase.

### Manual Testing Checklist

When making changes, test:

- [ ] Light mode
- [ ] Dark mode
- [ ] All affected user roles
- [ ] iOS simulator (if available)
- [ ] Android emulator (if available)
- [ ] Web browser
- [ ] Navigation flows
- [ ] Button interactions
- [ ] Form submissions

### Planned Testing (Future)

- Jest for unit testing
- React Native Testing Library for components
- Detox for E2E testing

### Deployment

**Development**:
- Run locally: `npm run dev`
- Test on device: Expo Go app

**Production**:
- Build with EAS: `eas build`
- Submit to stores: `eas submit`

---

## Quick Decision Tree

### "Should I modify this file?"

**Yes if**:
- You understand the file's purpose
- You've read the existing code
- The change aligns with project goals
- Documentation supports your approach

**No if**:
- You're unsure of side effects
- It affects authentication without understanding security
- It breaks role-based access control
- Documentation contradicts your approach

**Ask first if**:
- Major architectural change
- New dependency needed
- Changing navigation structure
- Modifying theme tokens
- Affecting multiple roles

### "Where should this code go?"

- **New screen** → `app/`
- **New component** → `components/` (with appropriate subfolder)
- **New hook** → `hooks/`
- **New type** → `constants/types.ts`
- **New mock data** → `constants/mock-data.ts`
- **New utility** → `utils/`
- **New constant** → `constants/`

### "How do I know my change is correct?"

1. ✅ Code compiles without TypeScript errors
2. ✅ App runs without crashes
3. ✅ Works in both light and dark mode
4. ✅ Works for all relevant user roles
5. ✅ Follows existing patterns in codebase
6. ✅ Matches design system (spacing, colors, typography)
7. ✅ Documentation is updated if behavior changed

---

## Helpful Commands

```bash
# Development
cd clubroom && npm run dev          # Start dev server
npm run ios                         # Run iOS simulator
npm run android                     # Run Android emulator
npm run web                         # Run in browser

# Code Quality
npm run lint                        # Run ESLint
npx tsc --noEmit                    # Type check

# Git
git status                          # Check status
git add .                           # Stage changes
git commit -m "message"             # Commit
git push -u origin <branch>         # Push to branch

# Project Management
npm install                         # Install dependencies
npm outdated                        # Check for updates
npx expo start --clear              # Clear cache and start
```

---

## Key Principles

1. **Football-First**: Every feature tailored to football coaching
2. **Role-Based**: Different experiences for Users vs Coaches
3. **Mobile-First**: Native iOS/Android + web support
4. **Type-Safe**: Full TypeScript strict mode
5. **Theme-Aware**: Always support light and dark mode
6. **Premium UX**: Haptic feedback, fluid animations
7. **Documentation-Driven**: Keep docs updated
8. **MVP Mindset**: Ship fast, iterate based on feedback

---

## Getting Help

### Documentation Hierarchy

1. **This file (CLAUDE.md)** - Quick reference for AI assistants
2. **SOURCE_OF_TRUTH.md** - Project decisions and status
3. **Feature docs** - Specific feature requirements
4. **Code comments** - Inline documentation

### When Stuck

1. Search codebase for similar patterns
2. Check `/docs/SOURCE_OF_TRUTH.md` for decisions
3. Review `/docs/vision/` for requirements
4. Look at existing components for patterns
5. Check git history for context

### Red Flags

🚩 **Stop and ask if**:
- Modifying authentication without understanding security
- Breaking role-based access control
- Introducing new dependencies
- Major architectural changes
- Affecting payment flows (when implemented)
- Changing database schema (when implemented)

---

## Version History

| Date | Change | Author |
|------|--------|--------|
| 2025-11-20 | Created comprehensive CLAUDE.md | Claude |

---

**Remember**: We're building the Uber of football coaching. Every decision should make it easier to book a coach, track development, or grow a coaching business. When in doubt, refer to `/docs/SOURCE_OF_TRUTH.md` and ask questions before making significant changes.
