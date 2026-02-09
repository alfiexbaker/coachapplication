# Review & Rating System - Complete Documentation

## Overview

The review system allows parents to rate and review coaches after sessions. Currently one-way (parent → coach only). Separate from session feedback which is coach → athlete.

---

## 1. Screens & Navigation

| Screen | Path | Purpose |
|--------|------|---------|
| Leave Review | `/review/[bookingId]` | Submit review after session |
| Coach Profile | `/(tabs)/coach-profile` | View ratings (reviews tab empty) |
| Session Feedback | `/(tabs)/bookings/session-feedback` | Coach creates session record |
| Session Notes | `/development/session/[sessionId]` | Coach adds athlete notes |

---

## 2. Review vs Session Feedback

**Two completely separate systems:**

| Aspect | Review | Session Feedback |
|--------|--------|------------------|
| Direction | Parent → Coach | Coach → Athlete |
| Purpose | Rate coaching quality | Track athlete progress |
| Storage | `clubroom.reviews` | `progress.session_feedback` |
| Visibility | Public (potentially) | Controlled by visibility setting |
| Triggers | After booking complete | During/after session |

---

## 3. Review Data Model

```typescript
interface Review {
  id: string;
  coachId: string;
  coachName: string;
  parentId: string;
  parentName: string;
  parentPhotoUrl?: string;

  // Optional athlete info
  athleteId?: string;
  athleteName?: string;

  // Booking reference
  bookingId?: string;
  isVerifiedBooking: boolean;

  // Rating
  rating: number;              // 1-5 stars

  // Content
  title?: string;
  content: string;

  // Visibility
  isPublic: boolean;
  status: 'PENDING' | 'PUBLISHED' | 'HIDDEN' | 'FLAGGED';

  // Coach response
  response?: string;
  respondedAt?: string;

  // Engagement
  helpfulCount: number;

  // Timestamps
  createdAt: string;
  updatedAt?: string;
}
```

---

## 4. Review Submission Flow

### Review Form

```
┌─────────────────────────────────────────────────┐
│ Leave a Review                                  │
├─────────────────────────────────────────────────┤
│                                                 │
│ Overall Rating:                                 │
│ ★ ★ ★ ★ ☆                                       │
│                                                 │
│ Category Ratings:                               │
│ Communication:     ★★★★★                        │
│ Skill development: ★★★★☆                        │
│ Punctuality:       ★★★★★                        │
│ Value:             ★★★★☆                        │
│                                                 │
│ Your Review:                                    │
│ ┌─────────────────────────────────────────┐     │
│ │ Keep it constructive and specific...     │     │
│ │                                          │     │
│ │                                          │     │
│ └─────────────────────────────────────────┘     │
│                                                 │
│              [Submit Review]                    │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Category Ratings

**For Parents reviewing coaches:**
- Communication
- Skill development
- Punctuality
- Value

**For Coaches reviewing athletes (not implemented):**
- Attitude
- Work ethic
- Coachability

### Submission Handler

```typescript
async submitReview(params: {
  coachId: string;
  coachName: string;
  parentId: string;
  parentName: string;
  parentPhotoUrl?: string;
  athleteId?: string;
  athleteName?: string;
  bookingId?: string;
  rating: number;
  title?: string;
  content: string;
}): Promise<Review> {
  const review: Review = {
    id: `rev_${Date.now()}`,
    ...params,
    isPublic: true,
    isVerifiedBooking: !!params.bookingId,
    status: 'PUBLISHED',       // Auto-published, no approval
    helpfulCount: 0,
    createdAt: new Date().toISOString(),
  };

  await storageService.save('clubroom.reviews', review);

  // Notify coach
  await notificationService.notifyCoachNewReview({
    coachId: params.coachId,
    parentName: params.parentName,
    rating: params.rating,
    reviewId: review.id,
  });

  return review;
}
```

---

## 5. Review Status Flow

```
┌──────────┐
│ PENDING  │  (Not currently used - all auto-publish)
└────┬─────┘
     │ Admin approves
     ▼
┌───────────┐
│ PUBLISHED │  ← Default state on submission
└─────┬─────┘
      │
      ├──► HIDDEN (Coach/admin hides)
      │
      └──► FLAGGED (Reported as inappropriate)
```

**Current behavior:** All reviews auto-set to `PUBLISHED`. Status field exists but not used for moderation workflow.

---

## 6. Rating Calculation

```typescript
async getCoachRating(coachId: string): Promise<{
  average: number;
  count: number;
}> {
  const reviews = await this.getByCoachId(coachId);

  if (reviews.length === 0) {
    return { average: 0, count: 0 };
  }

  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);

  return {
    average: Math.round((sum / reviews.length) * 10) / 10,
    count: reviews.length,
  };
}
```

### Display

- Coach card: `4.9 ★`
- Coach profile: `4.9 · 47 reviews`
- Roster entry: `4.8`

---

## 7. Coach Response to Reviews

### Data Fields

```typescript
{
  response?: string;           // Coach's reply text
  respondedAt?: string;        // When coach replied
}
```

### Current Status: NOT IMPLEMENTED

- Fields exist in type definition
- Mock data shows example response:
  ```
  "Thanks for the feedback—next session we'll double
   down on first touch."
  ```
- No UI for coaches to add/edit responses

---

## 8. Session Feedback (Coach → Athlete)

Separate system for coaches to provide detailed feedback to athletes.

### Session Feedback Data Model

```typescript
interface SessionFeedback {
  id: string;
  sessionId: string;
  bookingId?: string;
  coachId: string;
  coachName: string;
  athleteId: string;
  athleteName: string;
  createdAt: string;

  // Private (coach only)
  privateNotes?: string;

  // Shared with parent/athlete
  publicSummary: string;
  skillsWorkedOn: string[];
  skillRatings: Array<{
    skill: string;
    rating: number;              // 1-10
    previousRating?: number;
  }>;
  improvements: string;
  homework: string;
  effortRating: number;          // 1-5
  overallPerformance: number;    // 1-5
  videoClipUrls?: string[];
  badgeAwarded?: string;

  // Visibility
  visibility: 'coach_only' | 'parent' | 'athlete';
}
```

### Visibility Rules

| Level | Coach | Athlete | Parent |
|-------|-------|---------|--------|
| coach_only | ✓ | ✗ | ✗ |
| athlete | ✓ | ✓ | ✗ |
| parent | ✓ | ✓ | ✓ |

---

## 9. Coach Notes on Athletes (Roster)

Private notes that coaches keep about athletes, separate from session feedback.

```typescript
interface RosterNote {
  id: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}
```

### Features
- Add note with date tracking
- Delete with confirmation
- Sorted newest first
- Private to coach only

### Example Notes

```
Tom Baker:
- "Strong dribbler, needs work on weak foot" (Dec 1)
- "Very motivated, responds well to challenges" (Jan 5)

James Wilson:
- "Team captain material, great leadership" (Oct 20)
- "Working towards academy trials in March" (Jan 10)
```

---

## 10. Notifications

### Review Notification

```typescript
notifyCoachNewReview({
  coachId: string;
  parentName: string;
  rating: number;
  reviewId: string;
});

// Creates notification:
{
  type: 'review',
  title: 'New Review',
  body: '⭐ [Parent] left a [rating]-star review',
  deepLink: '/review/{reviewId}',
}
```

### Session Feedback Notification

```typescript
notifyParentSessionFeedback({
  parentId: string;
  coachName: string;
  athleteName: string;
  sessionId: string;
});

// Creates notification:
{
  type: 'feedback',
  title: 'Session Feedback',
  body: '📝 Coach [name] added feedback for [athlete]'s session',
  deepLink: '/development/session/{sessionId}',
}
```

---

## 11. Mock Data

### Mock Reviews (5 total)

| Coach | Athlete | Rating | Comment |
|-------|---------|--------|---------|
| Sarah Mitchell | Tom Henderson | 5 | "...helped Tom develop his goalkeeping skills" |
| Mike Thompson | Tom Henderson | 5 | "...effective at teaching finishing techniques" |
| Mike Thompson | James Wilson | 5 | "Professional coach who knows how to get the best..." |
| Amy (coach4) | Emma Henderson | 5 | "...pushed my pace and shared a warmup PDF" |
| coach5 | Sophie Taylor | 4 | "The video review showing my positioning mistakes..." |

### Mock Feedback

Session feedback examples in progress service mock data.

---

## 12. Implementation Status

### Fully Implemented

- Review submission form
- Rating calculation
- Coach notification on review
- Session feedback form
- Skill rating updates
- Visibility filtering
- Coach notes on athletes
- Rating display on coach cards

### Placeholder Only

- Reviews tab on profile (empty state)
- Review cards display
- Coach response to reviews
- Review moderation
- Visibility controls
- Report/flag reviews
- "Helpful" voting

### Not Implemented

- Athlete reviews of coaches
- Coach reviews of athletes/parents (bilateral)
- Category rating aggregation
- Rating trends over time
- Review search/filtering
- Review pagination
- Spam detection
- Auto-moderation
- Review editing
- Review deletion
- Approval workflow

---

## 13. Non-Bilateral Issues

### Critical Gap: One-Way Reviews

```
Current:
    Parent ──────────────────► Coach
                review

Missing:
    Coach ────── X ───────────► Parent/Athlete
              feedback visible publicly
```

### Proposed: Two-Way Feedback

```typescript
// Add coach-to-athlete feedback visibility in profiles
interface AthleteFeedback {
  id: string;
  coachId: string;
  athleteId: string;
  parentId?: string;

  // Category ratings
  punctuality: 1 | 2 | 3 | 4 | 5;
  effort: 1 | 2 | 3 | 4 | 5;
  attitude: 1 | 2 | 3 | 4 | 5;
  coachability: 1 | 2 | 3 | 4 | 5;

  // Written feedback
  positives: string;
  areasToImprove: string;

  visibility: 'coach_only' | 'parent' | 'athlete';
  createdAt: string;
}
```

---

## 14. Files Reference

### Screens
- `/app/review/[bookingId].tsx`
- `/app/(tabs)/coach-profile.tsx`
- `/app/development/session/[sessionId].tsx`
- `/app/(tabs)/bookings/session-feedback.tsx`

### Components
- `/components/review/review-form.tsx`
- `/components/review/review-card.tsx`
- `/components/review/rating-stars.tsx`
- `/components/progress/session-feedback-card.tsx`
- `/components/session/session-notes-form.tsx`
- `/components/roster/athlete-notes.tsx`

### Services
- `/services/review-service.ts`
- `/services/progress-service.ts`
- `/services/notification-service.ts`

### Types
- `/constants/types.ts` - Review, SessionFeedback
- `/constants/mock-data.ts` - MOCK_REVIEWS

---

## 15. Data Separation Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    REVIEW ECOSYSTEM                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐          ┌─────────────────┐          │
│  │     REVIEWS     │          │ SESSION FEEDBACK │          │
│  │ (Parent→Coach)  │          │ (Coach→Athlete)  │          │
│  ├─────────────────┤          ├─────────────────┤          │
│  │ • Public rating │          │ • Private/shared │          │
│  │ • 1-5 stars     │          │ • Skill ratings  │          │
│  │ • Written       │          │ • Progress notes │          │
│  │ • Coach reply   │          │ • Homework       │          │
│  └─────────────────┘          └─────────────────┘          │
│                                                             │
│  ┌─────────────────┐                                       │
│  │  ROSTER NOTES   │                                       │
│  │ (Coach private) │                                       │
│  ├─────────────────┤                                       │
│  │ • Internal only │                                       │
│  │ • Quick notes   │                                       │
│  │ • Per athlete   │                                       │
│  └─────────────────┘                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```
