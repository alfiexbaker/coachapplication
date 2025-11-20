# Dashboard Requirements - User vs Coach

## User/Player Dashboard

### Core Philosophy
**Focus**: Discovery, booking, development tracking
**No Calendar**: Users only need to see their next session and booking list - not manage availability

### Navigation Tabs
1. **Home (Discover)** - Find coaches
2. **Bookings** - View upcoming/past sessions
3. **Development** - Track progress (future)
4. **Messages** - Chat with coaches
5. **Profile** - Settings and profile

### Home Screen (Discover)
- Hero section: "Next session" tile
  - Coach name, time, location
  - Quick actions: message coach, view details
  - Only shows if there's an upcoming booking
- Coach discovery
  - Search bar with filters
  - Coach cards (scrollable list)
  - Map preview (optional tap to expand)
  - Filters: location, price, specialty, rating
- Quick actions
  - "Find a coach" CTA
  - Achievement badges preview

### Bookings Screen
- **Upcoming Sessions**
  - List of confirmed bookings
  - Each card shows:
    - Coach photo & name
    - Date & time
    - Location
    - Objectives (if set)
    - Quick actions: message, reschedule, cancel
- **Past Sessions**
  - Session history with coach notes
  - Skill tags (Dribbling, Passing, etc.)
  - Achievement badges
  - Filter by skill focus
- **Objectives**
  - Quick edit objectives for upcoming sessions
  - View objective completion trends

### Development Screen (Future Phase)
- Skills radar chart
- Session count & hours
- Achievement badges
- Progress timeline
- Analytics graphs

### Messages Screen
- Thread list with coaches
- Quick filters: All / Needs reply / Upcoming session
- Message CTA on booking cards

### Profile Screen
- Basic info (name, age, position, photo)
- Stats overview (total sessions, hours, level)
- Settings: notifications, privacy, logout

---

## Coach Dashboard

### Core Philosophy
**Focus**: Calendar management, bookings, income, school identity
**Full Calendar**: Coaches need to manage availability and see all bookings

### Navigation Tabs
1. **Calendar** - Manage availability & view bookings
2. **Bookings** - Upcoming sessions & requests
3. **School** - School identity card (if applicable)
4. **Messages** - Chat with players/parents
5. **Profile** - Settings and public profile

### Home Screen (Calendar)
- **School Identity Card** (top)
  - Logo, tagline, facilities
  - Quick edit branding
  - Invite staff shortcut
- **Calendar View**
  - Week/Month toggle
  - Color-coded bookings by type (1-on-1, group, team)
  - Available slots (green)
  - Blocked time (gray)
  - Booked sessions (teal/orange/navy by service type)
- **Today's Summary**
  - Upcoming sessions count
  - Earnings today
  - Pending booking requests
- **Quick Actions**
  - "Set availability"
  - "Create service"
  - "Block time off"

### Bookings Screen
- **Booking Requests** (pending approval)
  - Player info, objectives, requested time
  - Accept/Decline actions
- **Upcoming Sessions**
  - List view (alternative to calendar)
  - Each card shows:
    - Player photo & name
    - Date & time
    - Objectives
    - Location
    - Quick actions: add notes, message, cancel
- **Past Sessions**
  - Mark attendance
  - Add session notes
  - Update skill ratings
- **Filters**
  - By status, player, service type

### School Screen
- School profile editor
- Branding: logo, cover photo, tagline
- Locations management (pitches, indoor facilities)
- Staff roster (invite assistant coaches)
- Services offered
- School-level availability

### Messages Screen
- Thread list grouped by family/team
- Pinned objectives for context
- Quick reactions (✔️ Confirmed, 🕒 Running late)
- Templates for common responses

### Profile Screen
- Public-facing profile editor
- Services management
  - Title, format, duration, price
  - Max athletes, location type
  - Equipment provided
- Availability builder
  - Weekly template grid
  - Drag-to-create blocks
  - Recurring rules
  - Override specific dates
- Pricing settings
- Payment setup (Stripe Connect - future)
- Certifications & badges
- Reviews & ratings (read-only)

---

## Key Differences Summary

| Feature | User/Player | Coach |
|---------|-------------|-------|
| **Calendar Tab** | ❌ No - only next session tile | ✅ Yes - full calendar management |
| **Availability Builder** | ❌ No | ✅ Yes - set weekly template |
| **Discovery** | ✅ Yes - find coaches | ❌ No - coaches don't book |
| **School Identity** | ❌ No | ✅ Yes - create/manage school |
| **Booking Requests** | ❌ No - auto-confirmed | ✅ Yes - approve/decline |
| **Session Notes** | ✅ View only | ✅ Add/edit post-session |
| **Development Hub** | ✅ Yes - track own progress | ✅ View per player |
| **Income Dashboard** | ❌ No | ✅ Yes - earnings, withdrawals |
| **Services Management** | ❌ No | ✅ Yes - create offerings |
| **Objectives** | ✅ Set & edit | ✅ View & recommend |

---

## Parent Role (Multi-Child)

### Differences from Player
- **Child Switcher** in top app bar
  - Toggle between multiple kids
  - Each child has separate bookings, objectives, history
- **Actions Hub Dashboard**
  - "Confirm attendance" cards
  - "Update objectives" reminders
  - Unread messages by child
- **Unified Bookings**
  - See all children's sessions in one view
  - Filter by child
- **Payment Center** (future)
  - Manage payment methods
  - View billing history
  - Upcoming charges

Otherwise, inherits User/Player navigation and screens.

---

## Admin Role (Platform)

### Platform Management
- User management (suspend, verify)
- Content moderation
- Coach verification (DBS checks)
- School verification
- Analytics dashboard
- Revenue tracking
- Support tickets

(Out of scope for initial dashboard separation - separate admin portal)
