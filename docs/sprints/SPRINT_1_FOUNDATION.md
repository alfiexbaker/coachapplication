# Sprint 1: Foundation & Authentication
**Duration:** 2-3 weeks
**Goal:** Establish technical foundation, authentication, and role-based architecture

---

## Sprint Objectives

By the end of Sprint 1, we will have:
1. ✅ Backend infrastructure set up
2. ✅ Multi-role authentication system
3. ✅ Basic user profiles for all roles
4. ✅ Role-based navigation
5. ✅ API client architecture in frontend
6. ✅ State management configured
7. ✅ Database schema implemented

---

## Features to Build

### 1. Backend Setup

#### Tech Stack Decision & Setup:
- [ ] Choose: Node.js (NestJS) vs Supabase vs Firebase
- [ ] Set up project repository
- [ ] Configure TypeScript
- [ ] Set up ESLint + Prettier
- [ ] Environment variables (.env)
- [ ] Docker setup (PostgreSQL, Redis) - if going custom backend

#### Database:
- [ ] Set up PostgreSQL database
- [ ] Create migration system (Prisma, TypeORM, or Drizzle)
- [ ] Implement core schema:
  - Users table
  - Player_Profiles table
  - Coach_Profiles table
  - Parent_Profiles table
  - School_Profiles table
  - Parent_Children junction table

**Schema (Initial):**

```sql
-- Users (base table)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL, -- 'player', 'parent', 'coach', 'school'
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Player Profiles
CREATE TABLE player_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  date_of_birth DATE,
  location_postcode VARCHAR(10),
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  bio TEXT,
  position VARCHAR(50), -- 'Forward', 'Midfielder', 'Defender', 'Goalkeeper'
  club VARCHAR(100),
  level VARCHAR(20) DEFAULT 'Bronze', -- 'Bronze', 'Silver', 'Gold', 'Elite'
  total_sessions INT DEFAULT 0,
  total_hours DECIMAL(6, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Coach Profiles
CREATE TABLE coach_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  location_postcode VARCHAR(10),
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  certifications TEXT[], -- ['DBS Check', 'FA Level 2', 'First Aid']
  verified BOOLEAN DEFAULT FALSE,
  specialties TEXT[], -- ['Youth Development', 'Goalkeeper Training']
  age_groups TEXT[], -- ['U10', 'U14', 'U18', 'Adult']
  years_experience INT,
  price_1on1 DECIMAL(6, 2), -- £50.00
  price_small_group DECIMAL(6, 2), -- £30.00
  price_team DECIMAL(6, 2), -- £100.00
  rating DECIMAL(3, 2) DEFAULT 0.00,
  total_reviews INT DEFAULT 0,
  total_sessions INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Parent Profiles
CREATE TABLE parent_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

-- School Profiles
CREATE TABLE school_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  logo_url TEXT,
  location_postcode VARCHAR(10),
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  bio TEXT,
  verified BOOLEAN DEFAULT FALSE,
  website VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  staff_count INT DEFAULT 0,
  founded_year INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Parent-Child Relationships
CREATE TABLE parent_children (
  parent_id UUID REFERENCES users(id) ON DELETE CASCADE,
  child_id UUID REFERENCES users(id) ON DELETE CASCADE,
  relationship VARCHAR(50), -- 'Parent', 'Guardian', 'Coach-Manager'
  approved BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (parent_id, child_id)
);
```

#### API Structure:
- [ ] Set up Express/NestJS server
- [ ] Configure CORS
- [ ] Set up request logging (Morgan or Winston)
- [ ] Error handling middleware
- [ ] Rate limiting
- [ ] API versioning (/api/v1/)

---

### 2. Authentication System

#### Backend Auth:
- [ ] JWT token generation (access + refresh tokens)
- [ ] Password hashing (bcrypt)
- [ ] Implement endpoints:
  - `POST /api/v1/auth/register` - Multi-role signup
  - `POST /api/v1/auth/login` - Login (returns JWT)
  - `POST /api/v1/auth/refresh` - Refresh access token
  - `POST /api/v1/auth/logout` - Invalidate refresh token
  - `POST /api/v1/auth/forgot-password` - Send reset email
  - `POST /api/v1/auth/reset-password` - Reset password
  - `POST /api/v1/auth/verify-email` - Verify email

#### Auth Middleware:
- [ ] JWT verification middleware
- [ ] Role-based authorization middleware
- [ ] User context injection (req.user)

#### Email Service:
- [ ] Set up SendGrid or AWS SES
- [ ] Email templates:
  - Welcome email
  - Email verification
  - Password reset

#### Refresh Token Strategy:
- [ ] Store refresh tokens in Redis or DB
- [ ] Implement token rotation
- [ ] Set expiry (access: 15min, refresh: 30 days)

---

### 3. Frontend Auth Integration

#### API Client Setup:
- [ ] Install Axios
- [ ] Create API client wrapper (`services/api/client.ts`)
- [ ] Add request interceptor (attach JWT to headers)
- [ ] Add response interceptor (handle 401, auto-refresh)
- [ ] Environment config for API_URL

**Example client.ts:**
```typescript
import axios from 'axios';
import { getSecureItem, setSecureItem, deleteSecureItem } from '@/utils/secureStorage';

const client = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 10000,
});

// Request interceptor: Add auth token
client.interceptors.request.use(async (config) => {
  const token = await getSecureItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: Handle token refresh
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await getSecureItem('refresh_token');
        const { data } = await axios.post(`${process.env.EXPO_PUBLIC_API_URL}/auth/refresh`, {
          refreshToken,
        });

        await setSecureItem('access_token', data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;

        return client(originalRequest);
      } catch (refreshError) {
        await deleteSecureItem('access_token');
        await deleteSecureItem('refresh_token');
        // Navigate to login
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default client;
```

#### Auth Service:
- [ ] Create `services/api/auth.ts`
- [ ] Implement functions:
  - `login(email, password, role)`
  - `register(data, role)`
  - `logout()`
  - `refreshToken()`
  - `forgotPassword(email)`
  - `resetPassword(token, newPassword)`

#### Secure Token Storage:
- [ ] Install `expo-secure-store`
- [ ] Create wrapper functions:
  - `setSecureItem(key, value)`
  - `getSecureItem(key)`
  - `deleteSecureItem(key)`
- [ ] Store access & refresh tokens securely

#### Auth Context (Frontend):
- [ ] Update `AuthContext` to use real API
- [ ] State: `{ user, role, loading, error }`
- [ ] Functions:
  - `signIn(email, password, role)`
  - `signUp(data, role)`
  - `signOut()`
  - `checkAuthStatus()` (on app load)
- [ ] Persist user data (Async Storage)

---

### 4. Multi-Role Registration

#### Sign Up Flow:

**Step 1: Choose Role**
- [ ] Create `RoleSelectionScreen`
- [ ] 4 options: Player, Parent, Coach, School
- [ ] Visual cards with icons and descriptions

**Step 2: Role-Specific Forms**

**Player Form:**
- [ ] Fields: Name, Email, Password, Date of Birth, Postcode
- [ ] Validation (Zod schema)

**Parent Form:**
- [ ] Fields: Name, Email, Password, Phone
- [ ] (Add children later in onboarding)

**Coach Form:**
- [ ] Fields: Name, Email, Password, Phone, Postcode
- [ ] Fields: Years experience, Certifications (multi-select)
- [ ] Pricing (1-on-1, small group)

**School Form:**
- [ ] Fields: School Name, Email, Password, Postcode
- [ ] Fields: Phone, Website
- [ ] Upload logo

#### Form Components:
- [ ] Install `react-hook-form`
- [ ] Install `zod` for validation
- [ ] Create reusable form components:
  - `<InputField>`
  - `<PasswordField>`
  - `<PhoneInput>`
  - `<PostcodeInput>`
  - `<DatePicker>`
  - `<MultiSelect>`

#### Backend Registration:
- [ ] Validate email uniqueness
- [ ] Hash password
- [ ] Create user record
- [ ] Create role-specific profile
- [ ] Send verification email
- [ ] Return JWT tokens

---

### 5. Role-Based Navigation

#### Refactor Tab Navigation:

**Current:** Single tab bar for all users
**New:** Dynamic tabs based on role

**Player Tabs:**
- Discover (find coaches/schools)
- Development (stats, progress)
- Bookings
- Messages
- Profile

**Parent Tabs:**
- Dashboard (overview of all kids)
- Bookings (all kids)
- Messages
- Payments
- Profile

**Coach Tabs:**
- Calendar (manage availability, view bookings)
- Income (earnings dashboard)
- Sessions (upcoming, add notes)
- Team (manage roster)
- Messages
- Profile

**School Tabs:**
- Dashboard (overview)
- Calendar
- Staff (manage coaches)
- Posts (create announcements)
- Messages
- Profile

#### Implementation:
- [ ] Update `app/(tabs)/_layout.tsx`
- [ ] Conditionally render tabs based on `user.role`
- [ ] Create role-specific screen components
- [ ] Update navigation types

**Example:**
```typescript
// app/(tabs)/_layout.tsx
const { user } = useAuth();

const getTabsForRole = (role: UserRole) => {
  switch (role) {
    case 'player':
      return ['discover', 'development', 'bookings', 'messages', 'profile'];
    case 'parent':
      return ['dashboard', 'bookings', 'messages', 'payments', 'profile'];
    case 'coach':
      return ['calendar', 'income', 'sessions', 'team', 'messages', 'profile'];
    case 'school':
      return ['dashboard', 'calendar', 'staff', 'posts', 'messages', 'profile'];
  }
};
```

---

### 6. User Profile Management

#### Profile Screens (All Roles):

**View Profile:**
- [ ] `GET /api/v1/users/:id` - Get profile
- [ ] Display role-specific data
- [ ] Public vs Private view (own profile has edit button)

**Edit Profile:**
- [ ] `PATCH /api/v1/users/:id` - Update profile
- [ ] Forms for:
  - Player: Name, Bio, Avatar, Position, Club
  - Coach: Name, Bio, Avatar, Certifications, Pricing
  - Parent: Name, Phone, Avatar
  - School: Name, Logo, Bio, Website, Phone

**Avatar Upload:**
- [ ] Install `expo-image-picker`
- [ ] Image picker component
- [ ] Upload to S3 (or use Supabase Storage)
- [ ] `POST /api/v1/upload` - Upload endpoint
- [ ] Return CDN URL, save to profile

#### Backend Profile Endpoints:
- [ ] `GET /api/v1/users/me` - Get own profile
- [ ] `GET /api/v1/users/:id` - Get user profile (public)
- [ ] `PATCH /api/v1/users/:id` - Update profile (auth required)
- [ ] `DELETE /api/v1/users/:id` - Delete account

---

### 7. State Management Setup

#### Choose State Library:
- [ ] **Option A:** Zustand (lightweight, recommended)
- [ ] **Option B:** Redux Toolkit
- [ ] **Option C:** React Query only (for server state)

#### Install & Configure:
```bash
npm install zustand
npm install @tanstack/react-query
```

#### Create Stores (Zustand Example):

**Auth Store:**
```typescript
// stores/authStore.ts
import { create } from 'zustand';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  setUser: (user) => set({ user }),
  setToken: (token) => set({ accessToken: token }),
  logout: () => set({ user: null, accessToken: null }),
}));
```

#### React Query Setup:
- [ ] Wrap app in `QueryClientProvider`
- [ ] Configure default options (retry, caching)
- [ ] Create query hooks:
  - `useProfile(userId)`
  - `useUpdateProfile()`

---

### 8. Loading & Error States

#### Components to Build:
- [ ] `<LoadingSpinner>` - Full screen loader
- [ ] `<Skeleton>` - Shimmer placeholders
- [ ] `<ErrorBoundary>` - Catch component errors
- [ ] `<ErrorMessage>` - Inline error display
- [ ] `<Toast>` - Notifications (success, error, info)

#### Install Toast Library:
```bash
npm install react-native-toast-message
```

#### Error Handling:
- [ ] Create error utility functions
- [ ] Map API errors to user-friendly messages
- [ ] Log errors to monitoring service (optional: Sentry)

---

### 9. Parent-Child Account Management

#### Parent Dashboard:
- [ ] Screen: `app/(tabs)/dashboard.tsx` (parent only)
- [ ] Display list of children
- [ ] Button: "Add Child"

#### Add Child Flow:
- [ ] Modal: Add child (name, age, position)
- [ ] `POST /api/v1/parent/children` - Create child account
- [ ] Backend: Create player profile linked to parent
- [ ] Frontend: Refresh child list

#### Child Switcher:
- [ ] Dropdown in header to switch active child
- [ ] Update context: `activeChildId`
- [ ] Filter data by active child (bookings, messages)

#### Backend:
- [ ] Endpoint: `POST /api/v1/parent/children`
- [ ] Endpoint: `GET /api/v1/parent/children` - List children
- [ ] Endpoint: `DELETE /api/v1/parent/children/:childId` - Remove child

---

### 10. Testing & QA

#### Backend Tests:
- [ ] Unit tests for auth logic (Jest)
- [ ] Integration tests for API endpoints
- [ ] Test password hashing
- [ ] Test JWT generation/validation

#### Frontend Tests:
- [ ] Test auth flow (login, logout, refresh)
- [ ] Test role-based navigation
- [ ] Test form validation

#### Manual Testing Checklist:
- [ ] Sign up as each role
- [ ] Login/logout
- [ ] Token refresh works
- [ ] Forgot password flow
- [ ] Email verification
- [ ] Edit profile
- [ ] Upload avatar
- [ ] Parent can add child
- [ ] Child switcher works

---

## API Endpoints Summary (Sprint 1)

### Auth
- `POST /api/v1/auth/register` - Register user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `POST /api/v1/auth/logout` - Logout
- `POST /api/v1/auth/forgot-password` - Forgot password
- `POST /api/v1/auth/reset-password` - Reset password
- `POST /api/v1/auth/verify-email` - Verify email

### Users
- `GET /api/v1/users/me` - Get own profile
- `GET /api/v1/users/:id` - Get user profile
- `PATCH /api/v1/users/:id` - Update profile
- `DELETE /api/v1/users/:id` - Delete account
- `POST /api/v1/upload` - Upload file (avatar, etc.)

### Parent
- `POST /api/v1/parent/children` - Add child
- `GET /api/v1/parent/children` - List children
- `DELETE /api/v1/parent/children/:childId` - Remove child

---

## UI Screens to Build (Sprint 1)

### Authentication:
- [x] LoginScreen (update to use real API)
- [ ] RoleSelectionScreen
- [ ] PlayerSignUpScreen
- [ ] ParentSignUpScreen
- [ ] CoachSignUpScreen
- [ ] SchoolSignUpScreen
- [ ] ForgotPasswordScreen
- [ ] ResetPasswordScreen
- [ ] EmailVerificationScreen

### Profile:
- [ ] ProfileScreen (view own profile)
- [ ] EditProfileScreen
- [ ] PublicProfileScreen (view others)

### Parent:
- [ ] ParentDashboard
- [ ] AddChildScreen
- [ ] ChildSwitcher component

### Placeholders (for navigation):
- [ ] CoachCalendarScreen (placeholder)
- [ ] CoachIncomeScreen (placeholder)
- [ ] DevelopmentHubScreen (placeholder)
- [ ] (Keep existing screens as placeholders)

---

## Success Criteria

✅ Sprint 1 is complete when:
1. User can sign up for any role (Player, Parent, Coach, School)
2. User can log in and receive JWT tokens
3. Tokens are stored securely
4. Token refresh works automatically
5. User can edit their profile
6. User can upload an avatar
7. Parent can add/remove children
8. Navigation changes based on user role
9. Backend has all auth endpoints working
10. Database schema is implemented and migrated

---

## Dependencies & Blockers

**External Services Needed:**
- PostgreSQL database (local or hosted)
- Redis (for refresh tokens) - optional
- Email service (SendGrid/SES) - for verification emails
- S3 or Supabase Storage (for file uploads)

**Decisions to Make:**
- [ ] Choose backend framework (NestJS vs Express vs Supabase)
- [ ] Choose file storage (S3 vs Cloudflare R2 vs Supabase)
- [ ] Choose state management (Zustand vs Redux)

---

## Estimated Effort

**Backend:** 5-7 days
- Database setup: 1 day
- Auth system: 2 days
- Profile endpoints: 1 day
- File upload: 1 day
- Testing: 1 day

**Frontend:** 5-7 days
- API client setup: 1 day
- Auth screens: 2 days
- Profile screens: 1 day
- Role-based navigation: 1 day
- State management: 1 day
- Testing: 1 day

**Total:** 10-14 days (2-3 weeks with buffer)

---

## Next Sprint Preview

Sprint 2 will focus on:
- Social features (feed, posts, likes, comments)
- User connections (follow/unfollow)
- Public profiles
- Search functionality
- Coach/School discovery

