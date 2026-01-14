# Clubroom Architecture

> Complete technical architecture of the Clubroom coaching marketplace platform.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLUBROOM PLATFORM                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   iOS App   │  │ Android App │  │   Web App   │  │  Admin Web  │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │                │                │                │                │
│         └────────────────┼────────────────┼────────────────┘                │
│                          │                │                                 │
│                          ▼                ▼                                 │
│              ┌───────────────────────────────────────┐                      │
│              │       EXPO ROUTER (React Native)      │                      │
│              │   File-based routing, 173 screens     │                      │
│              └───────────────────┬───────────────────┘                      │
│                                  │                                          │
│              ┌───────────────────┼───────────────────┐                      │
│              ▼                   ▼                   ▼                      │
│    ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐           │
│    │   Components    │  │     Hooks       │  │    Context      │           │
│    │   230+ files    │  │   12 custom     │  │  Auth, Theme    │           │
│    └────────┬────────┘  └────────┬────────┘  └────────┬────────┘           │
│             │                    │                    │                     │
│             └────────────────────┼────────────────────┘                     │
│                                  │                                          │
│                                  ▼                                          │
│              ┌───────────────────────────────────────┐                      │
│              │         SERVICE LAYER (50 files)      │                      │
│              │   Business logic, data management     │                      │
│              └───────────────────┬───────────────────┘                      │
│                                  │                                          │
│                                  ▼                                          │
│              ┌───────────────────────────────────────┐                      │
│              │          STORAGE SERVICE              │                      │
│              │    AsyncStorage wrapper (current)     │                      │
│              │    → API calls (future backend)       │                      │
│              └───────────────────────────────────────┘                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Layer Architecture

### 1. Presentation Layer (Screens)

**Location:** `/app/`

173 screen files using Expo Router's file-based routing.

```
/app/
├── _layout.tsx              # Root layout with providers
├── (tabs)/                  # Main tab navigation (32 screens)
│   ├── _layout.tsx          # Tab bar configuration
│   ├── index.tsx            # Role-based home router
│   ├── schedule.tsx         # Coach schedule (TODAY hero)
│   ├── availability.tsx     # Availability management
│   ├── bookings/            # Booking screens (6 files)
│   ├── athletes.tsx         # Athlete roster
│   ├── earnings.tsx         # Coach earnings
│   ├── messages.tsx         # Chat inbox
│   ├── notifications.tsx    # Notification center
│   └── settings.tsx         # Settings hub
│
├── book/[coachId]/          # Booking wizard (5 steps)
├── development/             # Progress tracking (6 screens)
├── availability/            # Availability management (6 screens)
├── session-invites/         # Invite flow (5 screens)
├── group-sessions/          # Group sessions (4 screens)
├── club/                    # Club features (5 screens)
├── academy/                 # Academy management (6 screens)
├── goals/                   # Goal tracking (3 screens)
├── drills/                  # Drill library (5 screens)
├── videos/                  # Video management (5 screens)
├── analytics/               # Analytics dashboards (4 screens)
├── events/                  # Event management (5 screens)
├── family/                  # Family features (4 screens)
└── settings/                # Settings pages (5+ screens)
```

### 2. Component Layer

**Location:** `/components/`

230+ components organized by domain:

```
/components/
├── booking/          # Booking wizard components
├── bookings/         # Booking management
├── coach/            # Coach dashboard
├── discover/         # Discovery & search
├── badges/           # Achievement display
├── progress/         # Progress tracking
├── analytics/        # Charts & stats
├── family/           # Family management
├── club/             # Club features
├── messaging/        # Chat components
├── video/            # Video player/annotations
├── drills/           # Training content
├── goals/            # Goal tracking
├── events/           # Event management
├── settings/         # Settings UI
├── auth/             # Authentication
└── ui/               # Base UI components
```

### 3. Hooks Layer

**Location:** `/hooks/`

12 custom hooks for reusable logic:

| Hook | Purpose |
|------|---------|
| `useAuth` | Authentication state and methods |
| `useBookingPersona` | Booking context management |
| `useAthleteData` | Fetch athlete information |
| `useCoachData` | Fetch coach roster and data |
| `useClubData` | Fetch club information |
| `useNotifications` | Notification management |
| `useSessionNote` | Session note creation |
| `useColorScheme` | Theme detection |
| `useThemeColor` | Theme color utility |

### 4. Service Layer

**Location:** `/services/`

50 service files containing all business logic:

#### Core Services (15)
| Service | Purpose | Storage Keys |
|---------|---------|--------------|
| `booking-service` | Booking CRUD, draft management | `clubroom.bookings` |
| `availability-service` | Templates, overrides | `availability_templates` |
| `session-invite-service` | Invite creation, responses | `session_invites` |
| `notification-service` | Push notifications | `clubroom.notifications` |
| `roster-service` | Athlete roster management | `coach_roster` |
| `progress-service` | Skill tracking | `progress.skill_levels` |
| `badge-service` | Badge awarding | `clubroom.badge_awards` |
| `messaging-service` | Chat messages | `clubroom.messages` |
| `analytics-service` | Statistics | `coach_analytics` |
| `storage-service` | AsyncStorage wrapper | N/A |

#### Domain Services (15)
| Service | Purpose |
|---------|---------|
| `group-session-service` | Group training sessions |
| `event-service` | Events and RSVPs |
| `club-service` | Club management |
| `squad-service` | Squad management |
| `academy-service` | Academy/organization |
| `family-service` | Family relationships |
| `drill-service` | Drill library |
| `video-service` | Video management |
| `skill-tree-service` | Skill progression |
| `goal-service` | Goal tracking |
| `match-service` | Match/game tracking |
| `community-service` | Parent groups |
| `consent-service` | Consent tracking |
| `injury-service` | Injury tracking |
| `calendar-service` | Calendar sync |

#### Financial Services (6)
| Service | Purpose |
|---------|---------|
| `earnings-service` | Coach revenue |
| `wallet-service` | User wallet |
| `invoice-service` | Invoice generation |
| `package-service` | Session packages |
| `promo-service` | Promo codes |
| `referral-service` | Referral system |

#### Utility Services (6)
| Service | Purpose |
|---------|---------|
| `discover-service` | Coach search |
| `review-service` | Reviews/ratings |
| `verification-service` | Coach verification |
| `favourite-service` | Saved coaches |
| `comparison-service` | Coach comparison |
| `counter-offer-service` | Price negotiation |

### 5. Context Layer

**Location:** `/context/`

React Context providers:

| Context | Purpose |
|---------|---------|
| `AuthProvider` | User authentication state |
| `ThemeProvider` | App theme (light/dark) |
| `BookingFlowContext` | Booking wizard state |
| `ToastProvider` | Toast notifications |
| `NotificationToastProvider` | In-app notifications |

### 6. Storage Layer

**Location:** `/services/storage-service.ts`

Currently uses AsyncStorage with mock data fallbacks:

```typescript
// Storage pattern
class StorageService {
  async getItem<T>(key: string): Promise<T | null>
  async setItem<T>(key: string, value: T): Promise<void>
  async removeItem(key: string): Promise<void>
}

// All services use storageService
const bookings = await storageService.getItem<Booking[]>('clubroom.bookings');
```

---

## Data Flow

### Read Flow
```
┌─────────┐    ┌───────────┐    ┌─────────────┐    ┌──────────────┐
│  Screen │───►│   Hook    │───►│   Service   │───►│ AsyncStorage │
│         │    │           │    │             │    │  (or API)    │
└─────────┘    └───────────┘    └─────────────┘    └──────────────┘
     │                                                     │
     │              ┌─────────────────────────────────────┘
     │              │ Data returned
     ▼              ▼
┌─────────────────────────┐
│   useState / Component  │
│     Re-renders UI       │
└─────────────────────────┘
```

### Write Flow
```
┌─────────┐    ┌───────────┐    ┌─────────────┐    ┌──────────────┐
│  User   │───►│ Component │───►│   Service   │───►│ AsyncStorage │
│ Action  │    │  Handler  │    │   Method    │    │  (or API)    │
└─────────┘    └───────────┘    └─────────────┘    └──────────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │  Notification   │
                              │    Service      │
                              └─────────────────┘
```

---

## Navigation Architecture

### Tab-Based Navigation
```
┌─────────────────────────────────────────────────────────────────┐
│                         APP ROOT                                 │
│                     ┌──────────────┐                            │
│                     │ AuthProvider │                            │
│                     └──────┬───────┘                            │
│                            │                                    │
│              ┌─────────────┴─────────────┐                      │
│              │                           │                      │
│         ┌────▼────┐               ┌──────▼──────┐              │
│         │ Login   │               │ Main App    │              │
│         │ Screen  │               │ (tabs)      │              │
│         └─────────┘               └──────┬──────┘              │
│                                          │                      │
│         ┌────────────────────────────────┼──────────────────┐  │
│         │                                │                   │  │
│    ┌────▼────┐  ┌────────┐  ┌────────┐  │  ┌────────┐      │  │
│    │  Home   │  │Schedule│  │Athletes│  │  │Messages│ ...  │  │
│    │ (USER)  │  │(COACH) │  │(COACH) │  │  │ (ALL)  │      │  │
│    └─────────┘  └────────┘  └────────┘  │  └────────┘      │  │
│                                         │                   │  │
└─────────────────────────────────────────┼───────────────────┘  │
                                          │                      │
                                          ▼                      │
                              ┌───────────────────────┐          │
                              │   Role-Based Routing  │          │
                              │   USER sees discovery │          │
                              │   COACH sees schedule │          │
                              └───────────────────────┘          │
```

### Role-Based Tab Configuration

**USER (Athlete/Parent) Tabs:**
1. Home - Discovery & upcoming
2. Bookings - My sessions
3. Feed - Social content
4. Messages - Chat
5. Profile - Settings

**COACH Tabs:**
1. Schedule - Today's sessions
2. Availability - Manage times
3. Athletes - Roster
4. Messages - Chat
5. Profile - Settings

---

## State Management Strategy

### 1. Local Component State
For UI-only state:
```typescript
const [isExpanded, setIsExpanded] = useState(false);
const [searchTerm, setSearchTerm] = useState('');
```

### 2. React Context
For shared state across components:
```typescript
// Auth state
const { currentUser, isAuthenticated, logout } = useAuth();

// Theme state
const theme = useTheme();
```

### 3. Service Layer
For business data and persistence:
```typescript
// Services maintain draft state
bookingService.updateDraft({ athleteId: '123' });
const draft = await bookingService.getDraft();

// Services persist to storage
await bookingService.createBooking(draft);
```

### 4. URL State (Expo Router)
For navigation-coupled state:
```typescript
// Route params
const { coachId } = useLocalSearchParams<{ coachId: string }>();

// Navigation
router.push(`/book/${coachId}/schedule`);
```

---

## API Integration Architecture

### Current State: Mock Data
```
┌─────────────┐         ┌─────────────────┐         ┌──────────────┐
│   Service   │────────►│ storageService  │────────►│ AsyncStorage │
│   Method    │         │                 │         │ + Mock Data  │
└─────────────┘         └─────────────────┘         └──────────────┘
```

### Target State: Real API
```
┌─────────────┐         ┌─────────────────┐         ┌──────────────┐
│   Service   │────────►│   API Client    │────────►│  REST API    │
│   Method    │         │  + JWT Auth     │         │  (Backend)   │
└─────────────┘         └─────────────────┘         └──────────────┘
                                │
                                ▼
                        ┌───────────────┐
                        │   WebSocket   │
                        │  (Real-time)  │
                        └───────────────┘
```

### API Contract Structure
```typescript
// Defined in api-contracts.ts
interface BookingAPI {
  createBooking: {
    method: 'POST';
    path: '/bookings';
    body: CreateBookingParams;
    response: Booking;
  };
  // ... more endpoints
}
```

---

## Security Architecture

### Authentication Flow
```
┌──────────────────────────────────────────────────────────────────┐
│                     AUTHENTICATION FLOW                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Login Request                                                │
│     ┌─────────┐          ┌──────────┐                           │
│     │ Login   │─────────►│  Auth    │                           │
│     │ Screen  │  email/  │  Service │                           │
│     └─────────┘  password└────┬─────┘                           │
│                               │                                  │
│  2. Validate & Issue Token    │                                  │
│     ┌─────────────────────────┼─────────────────────────┐       │
│     │                         ▼                         │       │
│     │              ┌──────────────────┐                 │       │
│     │              │  JWT Generation  │                 │       │
│     │              │  accessToken     │                 │       │
│     │              │  refreshToken    │                 │       │
│     │              └────────┬─────────┘                 │       │
│     │                       │                           │       │
│  3. Store Tokens            ▼                           │       │
│     │              ┌──────────────────┐                 │       │
│     │              │  Secure Storage  │                 │       │
│     │              └────────┬─────────┘                 │       │
│     │                       │                           │       │
│  4. Set Auth Context        ▼                           │       │
│     │              ┌──────────────────┐                 │       │
│     │              │   AuthProvider   │                 │       │
│     │              │  currentUser     │                 │       │
│     │              │  isAuthenticated │                 │       │
│     │              └──────────────────┘                 │       │
│     └───────────────────────────────────────────────────┘       │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Authorization Patterns
```typescript
// Role-based access in screens
if (currentUser?.role !== 'COACH') {
  router.replace('/');
  return null;
}

// Role-based tab visibility
const tabs = currentUser?.role === 'COACH'
  ? coachTabs
  : userTabs;

// Service-level authorization
async createBooking(params) {
  const canBook = await this.checkBookingPermission(params);
  if (!canBook) throw new AuthorizationError();
}
```

---

## Error Handling

### Error Boundary
```typescript
// Root error boundary
<ErrorBoundary fallback={<ErrorScreen />}>
  <App />
</ErrorBoundary>
```

### Service Error Handling
```typescript
async function serviceMethod() {
  try {
    const data = await storageService.getItem(KEY);
    return data;
  } catch (error) {
    console.error('[ServiceName] Error:', error);
    return fallbackData; // Mock data fallback
  }
}
```

### Component Error Handling
```typescript
const [error, setError] = useState<string | null>(null);

const handleSubmit = async () => {
  try {
    await service.create(data);
  } catch (e) {
    setError('Failed to save. Please try again.');
  }
};
```

---

## Performance Optimization

### 1. Component Memoization
```typescript
const MemoizedCard = memo(BookingCard);

const renderItem = useCallback(({ item }) => (
  <MemoizedCard booking={item} />
), []);
```

### 2. List Virtualization
```typescript
<FlatList
  data={bookings}
  renderItem={renderItem}
  windowSize={5}
  maxToRenderPerBatch={10}
  initialNumToRender={10}
/>
```

### 3. Image Optimization
```typescript
<Image
  source={{ uri: avatarUrl }}
  style={styles.avatar}
  cachePolicy="memory-disk"
/>
```

### 4. Lazy Loading
```typescript
// Route-level code splitting (automatic with Expo Router)
// Components load on navigation
```

---

## Testing Architecture

### Test Structure
```
/__tests__/
├── analytics/           # Analytics tests
├── booking/             # Booking flow tests
├── calendar/            # Calendar sync tests
├── community/           # Community tests
├── compare/             # Comparison tests
├── consent/             # Consent tests
├── discover/            # Discovery tests
├── drills/              # Drill tests
├── events/              # Event tests
├── family/              # Family tests
├── favourites/          # Favourites tests
├── goals/               # Goal tests
├── health/              # Health tests
├── invoices/            # Invoice tests
├── notification-preferences/
├── packages/            # Package tests
├── promo/               # Promo code tests
├── recurring/           # Recurring booking tests
├── referrals/           # Referral tests
├── safety/              # Safety tests
├── skills/              # Skill tree tests
├── squad/               # Squad tests
├── video/               # Video tests
└── waitlist/            # Waitlist tests
```

### Test Commands
```bash
npm test                  # Main suite
npm run test:booking      # Booking tests
npm run test:availability # Availability tests
npm run test:badges       # Badge tests
```

---

## Deployment Architecture

### Build Configuration
```
┌─────────────────────────────────────────────────────────────────┐
│                    EAS BUILD PIPELINE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   Source    │───►│  EAS Build  │───►│   Stores    │         │
│  │   Code      │    │   Service   │    │ iOS/Android │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│                            │                                    │
│                     ┌──────┴──────┐                            │
│                     ▼             ▼                            │
│              ┌──────────┐  ┌──────────┐                        │
│              │ iOS IPA  │  │Android   │                        │
│              │          │  │ APK/AAB  │                        │
│              └──────────┘  └──────────┘                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Environment Configuration
```typescript
// app.json
{
  "expo": {
    "name": "clubroom",
    "slug": "clubroom",
    "version": "1.0.0",
    "ios": { "bundleIdentifier": "com.coachapptrial.clubroom" },
    "android": { "package": "com.coachapptrial.clubroom" },
    "extra": {
      "apiUrl": process.env.EXPO_PUBLIC_API_URL
    }
  }
}
```

---

## Future Architecture Enhancements

### 1. Backend Integration
- Replace AsyncStorage with API calls
- Implement JWT token refresh
- Add request interceptors

### 2. Real-Time Features
- WebSocket for instant updates
- Typing indicators
- Live availability sync

### 3. Offline Support
- Queue mutations when offline
- Sync on reconnection
- Conflict resolution

### 4. Analytics
- Event tracking
- Performance monitoring
- Error reporting
