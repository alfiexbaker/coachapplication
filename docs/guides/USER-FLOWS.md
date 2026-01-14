# User Flows

> Complete user journey maps for all major features and interactions.

---

## Overview

This guide documents the key user flows for both Parents (USER role) and Coaches (COACH role), showing the screens, actions, and data flow for each journey.

---

## Parent Flows

### 1. Discover and Book a Coach

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DISCOVER & BOOK FLOW                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │  Discover   │───▶│   Coach     │───▶│   Select    │             │
│  │   Tab       │    │  Profile    │    │   Child     │             │
│  │             │    │             │    │             │             │
│  │ • Search    │    │ • Bio       │    │ • List of   │             │
│  │ • Filter    │    │ • Reviews   │    │   children  │             │
│  │ • Browse    │    │ • Gallery   │    │ • Add new   │             │
│  └─────────────┘    └─────────────┘    └─────────────┘             │
│                                              │                      │
│                                              ▼                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │  Confirm    │◀───│   Select    │◀───│   Select    │             │
│  │  & Pay      │    │   Focus     │    │   Time      │             │
│  │             │    │             │    │             │             │
│  │ • Review    │    │ • Skills    │    │ • Calendar  │             │
│  │ • Payment   │    │ • Session   │    │ • Available │             │
│  │ • Confirm   │    │   type      │    │   slots     │             │
│  └─────────────┘    └─────────────┘    └─────────────┘             │
│        │                                                            │
│        ▼                                                            │
│  ┌─────────────┐                                                   │
│  │  Booking    │                                                   │
│  │  Confirmed  │                                                   │
│  │             │                                                   │
│  │ • Details   │                                                   │
│  │ • Calendar  │                                                   │
│  │ • Chat      │                                                   │
│  └─────────────┘                                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Screens:**
1. `/(tabs)/discover` - Search and filter coaches
2. `/coach/[id]` - View coach profile
3. `/book-coach` - Booking wizard
4. `/booking/[id]` - Booking confirmation

---

### 2. Respond to Session Invite

```
┌─────────────────────────────────────────────────────────────────────┐
│                      SESSION INVITE FLOW                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │   Push      │───▶│  Invites    │───▶│  Invite     │             │
│  │  Notif      │    │   List      │    │  Detail     │             │
│  │             │    │             │    │             │             │
│  │ "New        │    │ • Pending   │    │ • Coach     │             │
│  │  invite     │    │ • Expired   │    │ • Athletes  │             │
│  │  from..."   │    │             │    │ • Times     │             │
│  └─────────────┘    └─────────────┘    └─────────────┘             │
│                                              │                      │
│                           ┌──────────────────┼──────────────────┐   │
│                           ▼                  ▼                  ▼   │
│                    ┌─────────────┐    ┌─────────────┐    ┌────────┐│
│                    │   Accept    │    │   Decline   │    │ Let it ││
│                    │             │    │             │    │ Expire ││
│                    │ • Select    │    │ • Optional  │    │        ││
│                    │   time      │    │   reason    │    │        ││
│                    │ • Pay       │    │             │    │        ││
│                    └─────────────┘    └─────────────┘    └────────┘│
│                           │                                        │
│                           ▼                                        │
│                    ┌─────────────┐                                 │
│                    │  Booking    │                                 │
│                    │  Created    │                                 │
│                    └─────────────┘                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Screens:**
1. Push notification / `/(tabs)/discover`
2. `/session-invites` - List of invites
3. `/session-invites/[id]` - Invite details

---

### 3. Join a Club

```
┌─────────────────────────────────────────────────────────────────────┐
│                         JOIN CLUB FLOW                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                    ┌─────────────┐                                  │
│        ┌──────────▶│  Club Hub   │◀──────────┐                     │
│        │           │    Tab      │           │                     │
│        │           └─────────────┘           │                     │
│        │                  │                  │                     │
│        │    ┌─────────────┼─────────────┐    │                     │
│        │    ▼             ▼             ▼    │                     │
│  ┌───────────┐    ┌─────────────┐    ┌───────────┐                 │
│  │  Browse   │    │   Enter     │    │  Accept   │                 │
│  │  Public   │    │   Invite    │    │  Direct   │                 │
│  │  Clubs    │    │   Code      │    │  Invite   │                 │
│  └───────────┘    └─────────────┘    └───────────┘                 │
│        │                  │                  │                     │
│        └──────────────────┼──────────────────┘                     │
│                           ▼                                        │
│                    ┌─────────────┐                                 │
│                    │   Join      │                                 │
│                    │  Confirmed  │                                 │
│                    └─────────────┘                                 │
│                           │                                        │
│                           ▼                                        │
│                    ┌─────────────┐                                 │
│                    │  Club Home  │                                 │
│                    │             │                                 │
│                    │ • Feed      │                                 │
│                    │ • Events    │                                 │
│                    │ • Squads    │                                 │
│                    │ • Members   │                                 │
│                    └─────────────┘                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Screens:**
1. `/(tabs)/club-hub` - Club directory
2. `/club/join` - Enter invite code
3. `/club/[id]` - Club home page

---

### 4. View Child's Progress

```
┌─────────────────────────────────────────────────────────────────────┐
│                       VIEW PROGRESS FLOW                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │  Profile    │───▶│  Select     │───▶│  Progress   │             │
│  │   Tab       │    │   Child     │    │  Dashboard  │             │
│  │             │    │             │    │             │             │
│  │ • Children  │    │ • Tom       │    │ • Skills    │             │
│  │ • Settings  │    │ • Lucy      │    │ • Goals     │             │
│  │             │    │             │    │ • Stats     │             │
│  └─────────────┘    └─────────────┘    └─────────────┘             │
│                                              │                      │
│                           ┌──────────────────┼──────────────────┐   │
│                           ▼                  ▼                  ▼   │
│                    ┌─────────────┐    ┌─────────────┐    ┌────────┐│
│                    │   Skill     │    │   Goals     │    │ Videos ││
│                    │   Detail    │    │   Detail    │    │        ││
│                    │             │    │             │    │        ││
│                    │ • History   │    │ • Progress  │    │ • From ││
│                    │ • Trend     │    │ • Mileston  │    │  coach ││
│                    │ • Compare   │    │             │    │        ││
│                    └─────────────┘    └─────────────┘    └────────┘│
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Screens:**
1. `/(tabs)/profile` - Profile tab
2. `/children/[id]` - Child profile
3. `/children/[id]/progress` - Progress dashboard

---

## Coach Flows

### 1. Set Up Availability

```
┌─────────────────────────────────────────────────────────────────────┐
│                     SET AVAILABILITY FLOW                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │  Schedule   │───▶│  Weekly     │───▶│  Add Time   │             │
│  │    Tab      │    │  Template   │    │   Slots     │             │
│  │             │    │             │    │             │             │
│  │ • Calendar  │    │ • Mon-Sun   │    │ • Start     │             │
│  │ • Upcoming  │    │ • Toggle    │    │ • End       │             │
│  │             │    │   days      │    │ • Repeat    │             │
│  └─────────────┘    └─────────────┘    └─────────────┘             │
│                                              │                      │
│                                              ▼                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │  Calendar   │◀───│   Set       │◀───│  Configure  │             │
│  │  Updated    │    │  Overrides  │    │  Settings   │             │
│  │             │    │             │    │             │             │
│  │ • Slots     │    │ • Block     │    │ • Duration  │             │
│  │   visible   │    │   dates     │    │ • Buffer    │             │
│  │ • Bookable  │    │ • Custom    │    │ • Notice    │             │
│  └─────────────┘    └─────────────┘    └─────────────┘             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Screens:**
1. `/(tabs)/schedule` - Schedule tab
2. `/availability` - Availability settings
3. `/availability/template` - Weekly template
4. `/availability/overrides` - Date exceptions

---

### 2. Send Session Invite

```
┌─────────────────────────────────────────────────────────────────────┐
│                     SEND INVITE FLOW                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │  Clients    │───▶│  Select     │───▶│  Select     │             │
│  │    Tab      │    │  Athletes   │    │  Session    │             │
│  │             │    │             │    │   Type      │             │
│  │ • List      │    │ • Single    │    │ • 1-on-1    │             │
│  │ • Search    │    │ • Multiple  │    │ • Group     │             │
│  │             │    │   (group)   │    │ • Assess    │             │
│  └─────────────┘    └─────────────┘    └─────────────┘             │
│                                              │                      │
│                                              ▼                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │  Invite     │◀───│   Add       │◀───│  Propose    │             │
│  │   Sent      │    │  Message    │    │   Times     │             │
│  │             │    │             │    │             │             │
│  │ • Track     │    │ • Optional  │    │ • Multiple  │             │
│  │   status    │    │   note      │    │   options   │             │
│  │             │    │             │    │             │             │
│  └─────────────┘    └─────────────┘    └─────────────┘             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Screens:**
1. `/(tabs)/clients` - Clients tab
2. `/session-invite/new` - Create invite wizard

---

### 3. Complete Session & Assess

```
┌─────────────────────────────────────────────────────────────────────┐
│                    COMPLETE SESSION FLOW                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │  Session    │───▶│  Mark       │───▶│   Rate      │             │
│  │   Today     │    │  Complete   │    │   Skills    │             │
│  │             │    │             │    │             │             │
│  │ • Details   │    │ • Confirm   │    │ • 1-10      │             │
│  │ • Athletes  │    │   end       │    │   scale     │             │
│  │             │    │             │    │ • Each      │             │
│  │             │    │             │    │   skill     │             │
│  └─────────────┘    └─────────────┘    └─────────────┘             │
│                                              │                      │
│                                              ▼                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐             │
│  │  Session    │◀───│   Upload    │◀───│   Add       │             │
│  │  Complete   │    │   Video?    │    │   Notes     │             │
│  │             │    │             │    │             │             │
│  │ • Summary   │    │ • Optional  │    │ • Strengths │             │
│  │ • Payment   │    │ • Annotate  │    │ • Areas to  │             │
│  │   confirmed │    │             │    │   improve   │             │
│  └─────────────┘    └─────────────┘    └─────────────┘             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Screens:**
1. `/booking/[id]` - Booking detail
2. `/booking/[id]/complete` - Complete wizard
3. `/booking/[id]/assess` - Skill assessment

---

### 4. Manage Club

```
┌─────────────────────────────────────────────────────────────────────┐
│                      MANAGE CLUB FLOW                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐    ┌─────────────┐                                │
│  │  Club Hub   │───▶│  Club Home  │                                │
│  │    Tab      │    │             │                                │
│  │             │    │ • Feed      │                                │
│  │ • My clubs  │    │ • Members   │                                │
│  │ • Create    │    │ • Events    │                                │
│  │   new       │    │ • Squads    │                                │
│  └─────────────┘    └─────────────┘                                │
│                           │                                        │
│        ┌──────────────────┼──────────────────┬─────────────────┐   │
│        ▼                  ▼                  ▼                 ▼   │
│  ┌───────────┐    ┌─────────────┐    ┌───────────┐    ┌──────────┐│
│  │  Create   │    │   Manage    │    │  Create   │    │  Post to ││
│  │  Event    │    │   Members   │    │  Squad    │    │  Feed    ││
│  │           │    │             │    │           │    │          ││
│  │ • Type    │    │ • Roles     │    │ • Name    │    │ • Text   ││
│  │ • Date    │    │ • Remove    │    │ • Members │    │ • Photo  ││
│  │ • RSVP    │    │ • Invite    │    │ • Coaches │    │ • Target ││
│  └───────────┘    └─────────────┘    └───────────┘    └──────────┘│
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Screens:**
1. `/(tabs)/club-hub` - Club hub tab
2. `/club/[id]` - Club home
3. `/club/[id]/members` - Member management
4. `/club/[id]/events/new` - Create event
5. `/club/[id]/squads/new` - Create squad

---

## Common Flows

### Authentication

```
┌───────────┐    ┌───────────┐    ┌───────────┐    ┌───────────┐
│  Welcome  │───▶│  Sign Up  │───▶│  Role     │───▶│  Setup    │
│  Screen   │    │  / Login  │    │  Select   │    │  Profile  │
└───────────┘    └───────────┘    └───────────┘    └───────────┘
                       │                                 │
                       │                                 ▼
                       │                          ┌───────────┐
                       └─────────────────────────▶│   Home    │
                            (existing user)       │   Tab     │
                                                  └───────────┘
```

### Notifications

```
┌───────────┐    ┌───────────┐    ┌───────────┐
│   Push    │───▶│  Notif    │───▶│  Related  │
│  Notif    │    │  Center   │    │  Screen   │
└───────────┘    └───────────┘    └───────────┘
```

### Messaging

```
┌───────────┐    ┌───────────┐    ┌───────────┐
│  Messages │───▶│  Thread   │───▶│  Compose  │
│   Tab     │    │  View     │    │  Message  │
└───────────┘    └───────────┘    └───────────┘
```

---

## Screen Reference

### Tab Screens

| Tab | Parent View | Coach View |
|-----|-------------|------------|
| Home/Discover | ParentDiscoverScreen | CoachHomeScreen |
| Schedule/Calendar | ParentScheduleScreen | CoachScheduleScreen |
| Club Hub | ClubHubScreen | ClubHubScreen |
| Messages | MessagesScreen | MessagesScreen |
| Profile | ParentProfileScreen | CoachProfileScreen |

### Modal Screens

| Purpose | Route |
|---------|-------|
| Booking Wizard | `/book/[coachId]/*` |
| Session Complete | `/booking/[id]/complete` |
| Create Event | `/club/[id]/events/new` |
| Send Invite | `/session-invite/new` |
| Award Badge | `/badge/award` |

---

## Navigation Patterns

### Tab Navigation

```typescript
// Navigate within tabs
router.push('/(tabs)/discover');
router.push('/(tabs)/schedule');
```

### Stack Navigation

```typescript
// Push to stack
router.push('/coach/[id]');
router.push('/booking/[id]');

// Go back
router.back();
```

### Modal Presentation

```typescript
// Present as modal
router.push({
  pathname: '/booking/[id]/complete',
  params: { id: bookingId }
});
```

### Deep Linking

```
clubroom://coach/coach_123
clubroom://booking/booking_456
clubroom://club/join?code=BBFC2024
```
