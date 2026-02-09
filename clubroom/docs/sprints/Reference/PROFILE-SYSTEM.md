# Profile System - Complete Documentation

## Overview

The profile system manages user and coach profiles, including personal info, credentials, verification, privacy settings, and public-facing information.

---

## 1. Screens & Navigation

### Coach Screens

| Screen | Path | Purpose |
|--------|------|---------|
| Coach Profile | `/(tabs)/coach-profile` | Public profile view |
| Edit Profile | `/(tabs)/edit-profile` | Edit all coach info |

### User Screens

| Screen | Path | Purpose |
|--------|------|---------|
| Profile | `/(tabs)/profile` | Redirects to settings |
| Edit User Profile | `/(tabs)/edit-user-profile` | Edit user info |
| Privacy Settings | `/settings/privacy` | Privacy controls |

### Progress Screens

| Screen | Path | Purpose |
|--------|------|---------|
| My Progress | `/development/my-progress` | Athlete's own progress |
| Athlete Detail | `/development/athlete/[athleteId]` | Coach viewing athlete |
| Analytics | `/analytics/[athleteId]` | Advanced analytics |

---

## 2. Coach Profile - All Fields

### Basic Information

```typescript
interface CoachProfile {
  // Identity
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  website?: string;
  bio: string;
  shortBio?: string;
  joinedDate: string;

  // Visual
  profilePhotoUrl?: string;
  coverPhotoUrl?: string;

  // Location
  city: string;
  state?: string;
  location?: { lat: number; lng: number };
  distanceMiles?: number;

  // Pricing
  priceRange: {
    minUsd: number;
    maxUsd: number;
    unitLabel: string;
  };

  // Stats
  totalSessions: number;
  rating: {
    average: number;
    reviewCount: number;
  };

  // Primary sport
  primarySport: SportCategory;
  sports: SportCategory[];

  // Specialties
  footballFocuses: FootballObjective[];  // Dribbling, Passing, etc.

  // Credentials
  experiences: CoachExperience[];
  certifications: CoachCertification[];
  languages: CoachLanguage[];
  achievements: string[];

  // Session formats
  sessionFormats: TrainingFormat[];  // In-person, Virtual, Small group

  // Social
  socialLinks?: SocialLinks;

  // Badges
  badges: CoachBadge[];

  // Media
  photoGallery: string[];
  videoGallery: string[];
  posts: CoachPost[];
}
```

### Experience

```typescript
interface CoachExperience {
  id: string;
  title: string;                // "Head Goalkeeping Coach"
  organization: string;         // "Premier Football Academy"
  startDate: string;            // "2018-01"
  endDate?: string;             // "2023-12" or null if current
  description?: string;
  current: boolean;
}
```

### Certifications

```typescript
interface CoachCertification {
  id: string;
  name: string;                 // "UEFA B Licence"
  issuer: string;               // "UEFA"
  issueDate: string;
  expiryDate?: string;
  credentialUrl?: string;
}
```

### Languages

```typescript
interface CoachLanguage {
  id: string;
  name: string;                 // "English"
  proficiency: 'Native' | 'Fluent' | 'Conversational' | 'Basic';
}
```

### Social Links

```typescript
interface SocialLinks {
  instagram?: string;           // "@coachsarah"
  twitter?: string;             // "@SarahMitchellGK"
  facebook?: string;
  linkedin?: string;
  youtube?: string;
  tiktok?: string;
  website?: string;
}
```

---

## 3. User Profile - All Fields

```typescript
interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  bio?: string;
  profilePhotoUrl?: string;
  role: 'User' | 'Parent' | 'Coach' | 'Admin';
  joinedDate: string;

  // Parent-specific
  children?: Array<{
    name: string;
    age: number;
  }>;
}
```

### Athlete-Specific (from old profiles)

```typescript
interface AthleteProfile {
  skillLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  position: string;             // "Striker", "Midfielder"
  goals: AthleteObjective[];
}
```

---

## 4. Profile Tabs (Coach)

### Posts Tab
- Coach's social feed posts
- Create new post button
- Shows: avatar, content, media, likes, comments

### About Tab
- Bio
- Contact info (email, phone, website)
- Social media links
- Experience history
- Certifications
- Languages
- Achievements

### Sessions Tab
- Session offerings created by coach
- Pricing info
- Availability preview

### Photos Tab
- Photo gallery (3-column grid)
- Portfolio images

### Reviews Tab
- Review list (currently shows "No reviews yet")
- Rating statistics

---

## 5. Verification System

### Verification Levels

| Level | Requirements | Badge |
|-------|--------------|-------|
| NONE | Nothing verified | - |
| BASIC | Email + Phone | Yellow checkmark |
| VERIFIED | + Identity + Background | Green shield |
| PREMIUM | + Credentials + Insurance | Gold shield |

### Verification Items

```typescript
interface VerificationStatus {
  coachId: string;
  overallLevel: VerificationLevel;
  lastUpdated: string;

  email: VerificationItem;
  phone: VerificationItem;
  identity: VerificationItem;
  backgroundCheck: VerificationItem;
  credentials: VerificationItem[];
  insurance: VerificationItem;
}

interface VerificationItem {
  status: 'NOT_STARTED' | 'PENDING' | 'VERIFIED' | 'FAILED' | 'EXPIRED';
  verifiedAt?: string;
  expiresAt?: string;
  documentUrl?: string;
  notes?: string;
}
```

### Verification Badge Component

```typescript
<VerificationBadge
  level="PREMIUM"
  size="medium"
  showLabel={true}
/>
```

---

## 6. Privacy Settings

### Profile Visibility

| Setting | Default | Description |
|---------|---------|-------------|
| profileVisible | true | Make profile public |
| showLocation | true | Show city/distance |
| showOnlineStatus | true | Show when active |
| showActivityStatus | false | Show recent activity |

### Coach-Specific

| Setting | Default | Description |
|---------|---------|-------------|
| showEarnings | false | Display earnings |
| showClientCount | false | Display client count |

### Data & Analytics

| Setting | Default | Description |
|---------|---------|-------------|
| shareAnalytics | true | Allow usage data |
| personalizedAds | false | Allow personalized ads |
| shareWithPartners | false | Share with partners |

### Data Management

- Download Your Data (48hr email)
- Manage Blocked Users

**Note:** Privacy settings are UI-only. No backend enforcement exists.

---

## 7. Photo/Avatar Handling

### Cover Photo (Coach Only)
- Size: 800x200px landscape
- Click to upload via image picker
- Camera overlay on hover

### Profile Photo
- Size: 100-120px circular
- 4px white border (coach)
- Camera icon on edit mode

### Mock Sources
- Avatars: `https://i.pravatar.cc/150?u={userId}`
- Cover photos: Unsplash URLs
- Initials: First letters of name

---

## 8. Edit Profile Flow

### Coach Edit

```
┌─────────────────────────────────────────────────┐
│ Edit Profile                                    │
├─────────────────────────────────────────────────┤
│ [Cover Photo - 800x200]                         │
│                                                 │
│ [Avatar]  Full Name: [________________]         │
│                                                 │
│ Bio:                                            │
│ ┌─────────────────────────────────────────┐     │
│ │ 15 years experience coaching...          │     │
│ └─────────────────────────────────────────┘     │
│                                                 │
│ Email: [________________________]               │
│ Phone: [________________________]               │
│ Website: [______________________]               │
│                                                 │
│ Pricing:                                        │
│ Min: [£50]  Max: [£80]                          │
│                                                 │
│ Specialties:                                    │
│ [Dribbling] [Passing] [✓ Goalkeeping]           │
│ [Defending] [Finishing] [Conditioning]          │
│                                                 │
│ Experience:        [+ Add Experience]           │
│ ├─ Head Coach @ Premier Academy (2018-present)  │
│ └─ Assistant @ City FC (2015-2018)              │
│                                                 │
│ Languages:         [+ Add Language]             │
│ ├─ English (Native)                             │
│ └─ Spanish (Conversational)                     │
│                                                 │
│ Certifications:    Coming soon                  │
│                                                 │
│ Social Links:      [Edit]                       │
│ ├─ Instagram: @coachsarah                       │
│ └─ Twitter: @SarahMitchellGK                    │
│                                                 │
│              [Save Changes]                     │
└─────────────────────────────────────────────────┘
```

### User Edit (Parent)

```
┌─────────────────────────────────────────────────┐
│ Edit Profile                                    │
├─────────────────────────────────────────────────┤
│                                                 │
│     [Avatar]                                    │
│                                                 │
│ Full Name: [________________________]           │
│ Email: [____________________________]           │
│ Phone: [____________________________]           │
│                                                 │
│ Bio:                                            │
│ ┌─────────────────────────────────────────┐     │
│ │ Parent of two young athletes...          │     │
│ └─────────────────────────────────────────┘     │
│                                                 │
│ My Children:       [+ Add Child]                │
│ ├─ Tom Henderson (15)      [Edit] [Remove]      │
│ └─ Emma Henderson (14)     [Edit] [Remove]      │
│                                                 │
│              [Save Changes]                     │
└─────────────────────────────────────────────────┘
```

---

## 9. Coach Badges

```typescript
interface CoachBadge {
  id: string;
  label: string;               // "Verified", "Top Rated"
  tone: 'success' | 'warning' | 'default';
  description?: string;
}
```

### Common Badges

| Badge | Tone | Meaning |
|-------|------|---------|
| Verified | success | Background check passed |
| Top Rated | warning | High rating average |
| Premier Partner | default | Platform partner |

---

## 10. Profile Search/Discovery

### Search Parameters

```typescript
interface CoachSearchParams {
  availability?: { startDate: string; endDate: string };
  geo?: {
    boundingBox?: { ne: LatLng; sw: LatLng };
    radiusKm?: number;
    center?: LatLng;
  };
  sports?: SportCategory[];
  formats?: TrainingFormat[];
  skillLevels?: string[];
  price?: { minUsd?: number; maxUsd?: number };
  rating?: { min: number };
  coachGender?: 'Male' | 'Female' | 'Non-binary';
  languages?: string[];
}
```

**Note:** Search parameters defined but no search UI implemented.

---

## 11. Progress Display (Athlete)

### Skill Levels

```typescript
interface SkillLevel {
  skill: string;               // "Dribbling"
  level: number;               // 1-10
  trend: 'improving' | 'steady' | 'declining';
}
```

### Session History

```typescript
interface SessionHistoryEntry {
  id: string;
  sessionId: string;
  coachId: string;
  coachName: string;
  date: string;
  duration: number;
  focusAreas: string[];
  overallRating: number;
  notes?: string;
}
```

### Analytics Dashboard

```typescript
interface AthleteAnalytics {
  totalSessions: number;
  totalHours: number;
  averageRating: number;
  skillProgress: SkillProgress[];
  recentFeedback: SessionFeedback[];
  goalsProgress: Goal[];
  badgeCount: number;
}
```

---

## 12. Mock Data

### Coach Profiles

**Sarah Mitchell (coach1)**
- Rating: 4.9/5 (47 reviews)
- Price: £50-80/session
- Specialties: Goalkeeping, Defending
- Experiences: 4 roles
- Certifications: 6 (UEFA B, FA Level 3, etc.)
- Languages: 3 (English, Spanish, French)
- Total Sessions: 230

### User Profiles

**John Henderson (user1)**
- Role: Parent
- Children: Tom (15), Emma (14)
- Bio: "Parent of two young athletes..."

---

## 13. Implementation Status

### Fully Implemented

- Coach profile display (all tabs)
- Coach profile editing
- User profile editing
- Children management (parents)
- Experience management
- Language management
- Social links display/edit
- Verification badge display
- Privacy settings UI
- Photo gallery display
- Posts display

### Partially Implemented

- Verification system (display only)
- Privacy enforcement (UI only)
- Photo upload (UI, no actual upload)

### Not Implemented

- Reviews tab content
- Profile completion percentage
- Coach search/discovery UI
- Certifications editing
- Video portfolio
- Profile visibility enforcement
- Public profile URL/sharing

---

## 14. Non-Bilateral Issues

### Current Limitations

1. **Privacy settings not enforced** - Settings saved but not checked
2. **No profile completion tracking** - Should calculate % filled
3. **Reviews only one-way** - Parents review coaches, not vice versa

---

## 15. Files Reference

### Screens
- `/app/(tabs)/coach-profile.tsx`
- `/app/(tabs)/edit-profile.tsx`
- `/app/(tabs)/edit-user-profile.tsx`
- `/app/settings/privacy.tsx`

### Components
- `/components/profile/social-links.tsx`
- `/components/profile/social-links-editor.tsx`
- `/components/verification/verification-badge.tsx`

### Services
- `/services/verification-service.ts`

### Types
- `/constants/types.ts` - CoachProfile, UserProfile, VerificationStatus
- `/constants/mock-data.ts` - coachProfiles, mockUserProfile
