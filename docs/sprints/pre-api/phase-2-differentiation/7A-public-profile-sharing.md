# 7A: Public Coach Profile + Sharing

**Phase**: 2 — Differentiation
**Origin**: Sprint 7, Tasks 1, 2, 7
**Estimated scope**: 3 tasks, SEO-ready profile + share mechanics

## Goal

Coaches have a public profile page parents can find via Google. Shareable booking link with QR code. Share button for parents to recommend coaches. This is what Spond will never offer.

## Tasks

### Task 1: Public Coach Profile Page

**File**: `app/coach/[coachId]/public.tsx`

A shareable, SEO-friendly page that works even for non-logged-in users:

```
┌─────────────────────────────────────┐
│ [Cover Photo - full width]          │
│                                     │
│ [Avatar]  Coach Marcus Williams     │
│           ⭐ 4.8 (23 reviews)      │
│           ✓ Verified · DBS Checked  │
│           📍 Hackney, London        │
│                                     │
│ [Book a Session]  [Message]         │
│                                     │
│ ABOUT · SPECIALTIES · QUALIFICATIONS│
│ AVAILABLE SESSIONS (inc. TRIAL)     │
│ REVIEWS · EXPERIENCE · PHOTOS      │
│                                     │
│ Similar Coaches (→ 7C)              │
│                                     │
│ Clubroom — Find football coaches    │
└─────────────────────────────────────┘
```

**Key features**:
- Works without login (read-only for visitors)
- "Book Now" requires login/signup
- SEO meta tags: title, description, structured data (Schema.org Coach)
- Shareable URL: `clubroom.app/coach/marcus-williams`
- Open Graph tags for social sharing (preview card on WhatsApp/Instagram)

### Task 2: Shareable Booking Link

**File**: `components/coach/share-profile.tsx`

Coach can copy/share their booking link from profile:

- Copy to clipboard
- Native share sheet (WhatsApp, Instagram Stories, SMS)
- QR code (downloadable PNG) for printing on flyers, business cards, pitch-side posters
- Coach slug auto-generated from name, editable

### Task 3: Share Coach Profile Button (Parent-Facing)

**File**: Add to `app/coach/[coachId]/index.tsx`

Share button visible on coach profile for parents sharing with friends:

- Native share sheet with coach's public profile link
- Custom share message: "Check out Coach Marcus on Clubroom — great football coach in Hackney!"
- Open Graph meta ensures preview card on WhatsApp/iMessage
- Also accessible from three-dot menu on coach card in search results

## New Types

```typescript
interface CoachPublicProfile {
  slug: string; // URL-safe: "marcus-williams"
  isPublic: boolean;
  seoTitle?: string;
  seoDescription?: string;
  coverPhotoUrl?: string;
}
```

## Acceptance Criteria

- [ ] Public coach profile page accessible without login
- [ ] SEO meta tags and Open Graph for social sharing
- [ ] Coach can copy/share booking link + QR code
- [ ] "Book Now" on public profile goes to booking flow (requires login)
- [ ] Share button on coach profile (parent-facing) opens native share sheet

## Files Changed

| File | Action |
|------|--------|
| `app/coach/[coachId]/public.tsx` | CREATE |
| `components/coach/share-profile.tsx` | CREATE |
| `app/coach/[id].tsx` | ENHANCE (849 lines exist) — add share button |

## Dependencies

- **Blocks**: Nothing
- **Blocked by**: 1A (api-client)
