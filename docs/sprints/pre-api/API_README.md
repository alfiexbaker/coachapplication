# API README — All Paths, Data, DB Schema

> Single document covering every domain, every endpoint, every table.
> **Database**: PostgreSQL (relational, strong consistency, JSONB for flexible fields)
> **Cache**: Redis (sessions, tokens, real-time presence)
> **Storage**: S3-compatible (photos, videos, documents)
> **Auth**: JWT (access + refresh tokens)
> **Real-time**: Socket.io (messages, notifications, live updates)
> **Payment**: Cash only for MVP. Stripe Connect planned for later.

---

## Database Design Principles

1. **One Postgres instance** — no microservice DB splitting for MVP
2. **UUID primary keys** — `id UUID DEFAULT gen_random_uuid()`
3. **Soft deletes** — `deleted_at TIMESTAMP NULL` on all major tables
4. **Audit fields** — `created_at`, `updated_at` on every table
5. **JSONB for flexibility** — settings, preferences, metadata
6. **Foreign keys everywhere** — referential integrity enforced at DB level
7. **Indexes on all FK columns** — performance for joins
8. **Enums as Postgres enums** — type safety at DB level

---

## Domain 1: AUTH & USERS

### What it does
Users register, log in, get JWT tokens. Two types: USER (parents/athletes) and COACH.

### How it's controlled
- Registration creates a user record + hashed password
- Login returns access token (15min) + refresh token (30 days)
- Access token required on every API call (Bearer header)
- Refresh token rotated on each use (one-time use)
- Password hashed with bcrypt (12 rounds)

### Endpoints

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/api/auth/register` | None | `{email, password, name, type, postcode, dateOfBirth}` | `{user, tokens}` |
| POST | `/api/auth/login` | None | `{email, password}` | `{user, tokens}` |
| POST | `/api/auth/refresh` | Refresh token | `{refreshToken}` | `{tokens}` |
| POST | `/api/auth/logout` | Access token | None | `204` |
| POST | `/api/auth/forgot-password` | None | `{email}` | `204` |
| POST | `/api/auth/reset-password` | None | `{token, newPassword}` | `204` |
| GET | `/api/users/me` | Access token | None | `{user}` |
| PATCH | `/api/users/me` | Access token | Partial user fields | `{user}` |
| POST | `/api/users/me/avatar` | Access token | Multipart image | `{avatarUrl}` |

### DB Tables

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('USER', 'COACH')),
  avatar_url TEXT,
  bio TEXT,
  phone VARCHAR(20),
  date_of_birth DATE,
  postcode VARCHAR(10),
  is_system_admin BOOLEAN DEFAULT FALSE,
  -- USER-specific
  skill_level VARCHAR(20), -- BEGINNER, INTERMEDIATE, ADVANCED, ELITE
  position VARCHAR(50),
  -- COACH-specific
  is_organization BOOLEAN DEFAULT FALSE,
  organization_name VARCHAR(255),
  organization_logo_url TEXT,
  is_live BOOLEAN DEFAULT FALSE,
  live_status_reason TEXT,
  primary_sport VARCHAR(50) DEFAULT 'Football',
  specialties JSONB DEFAULT '[]', -- string[]
  session_formats JSONB DEFAULT '[]', -- string[]
  price_min_gbp DECIMAL(10,2),
  price_max_gbp DECIMAL(10,2),
  price_unit_label VARCHAR(50) DEFAULT 'per hour',
  city VARCHAR(100),
  travel_radius_miles INTEGER,
  website VARCHAR(255),
  social_links JSONB DEFAULT '{}',
  verification_level VARCHAR(20) DEFAULT 'NONE',
  rating_average DECIMAL(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP, -- NULL = unused, set on use
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_type ON users(type);
CREATE INDEX idx_users_postcode ON users(postcode);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
```

---

## Domain 2: CHILDREN & FAMILY

### What it does
Parents manage children. Multiple guardians can share access. Emergency contacts and medical info per child.

### How it's controlled
- Only the parent who created a child (or guardians with permission) can view/edit
- Coaches see child info only for children they have bookings with
- Emergency/medical info visible to coaches during active sessions only

### Endpoints

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/api/children` | Parent | None | `{children[]}` |
| POST | `/api/children` | Parent | `{name, dateOfBirth, relationship, skillLevel?, position?}` | `{child}` |
| PATCH | `/api/children/:id` | Parent/Guardian | Partial fields | `{child}` |
| DELETE | `/api/children/:id` | Parent | None | `204` |
| GET | `/api/children/:id/emergency` | Parent/Guardian/Coach* | None | `{emergencyInfo}` |
| PUT | `/api/children/:id/emergency` | Parent/Guardian | `{contacts[], medical, consents[]}` | `{emergencyInfo}` |
| GET | `/api/family` | Parent | None | `{familyAccount}` |
| POST | `/api/family/guardians/invite` | Primary guardian | `{email, role, permissions[], relationship}` | `{invite}` |
| POST | `/api/family/guardians/accept` | Invited user | `{inviteId}` | `{guardian}` |

*Coach access: only during active booking window, read-only emergency info.

### DB Tables

```sql
CREATE TABLE children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  date_of_birth DATE,
  relationship VARCHAR(20) NOT NULL, -- son, daughter, ward, other
  avatar_url TEXT,
  skill_level VARCHAR(20),
  position VARCHAR(50),
  primary_sport VARCHAR(50) DEFAULT 'Football',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  relationship VARCHAR(50) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  is_primary BOOLEAN DEFAULT FALSE,
  can_pickup BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE medical_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID UNIQUE REFERENCES children(id) ON DELETE CASCADE,
  conditions JSONB DEFAULT '[]',
  allergies JSONB DEFAULT '[]',
  medications JSONB DEFAULT '[]',
  doctor_name VARCHAR(255),
  doctor_phone VARCHAR(20),
  restrictions JSONB DEFAULT '[]',
  notes TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL, -- PHOTO, VIDEO, SOCIAL_MEDIA, EMERGENCY_TREATMENT
  granted BOOLEAN NOT NULL,
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMP,
  UNIQUE(child_id, type)
);

CREATE TABLE family_guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL, -- derived from primary parent's ID
  user_id UUID REFERENCES users(id),
  role VARCHAR(20) NOT NULL, -- PRIMARY, GUARDIAN, VIEWER
  permissions JSONB DEFAULT '[]',
  relationship VARCHAR(50),
  is_primary BOOLEAN DEFAULT FALSE,
  child_access JSONB DEFAULT '[]', -- empty = all children
  invited_by UUID REFERENCES users(id),
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_children_parent ON children(parent_id);
CREATE INDEX idx_emergency_child ON emergency_contacts(child_id);
```

---

## Domain 3: COACH PROFILES & CREDENTIALS

### What it does
Coach public profiles, certifications, experiences, languages. Discovery and search.

### How it's controlled
- Coaches edit their own profile
- Public profiles visible to all authenticated users
- Search filtered by sport, location, price, rating, availability
- Verification status managed by admin (or self-service for basic)

### Endpoints

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/api/coaches` | Any | `?sport=&postcode=&radius=&priceMin=&priceMax=&rating=&specialty=` | `{coaches[], total}` |
| GET | `/api/coaches/:id` | Any | None | `{coach, certifications, experiences}` |
| PATCH | `/api/coaches/:id/profile` | Coach (self) | Partial fields | `{coach}` |
| POST | `/api/coaches/:id/certifications` | Coach (self) | `{name, issuer, issueDate, expiryDate?}` | `{certification}` |
| DELETE | `/api/coaches/:id/certifications/:certId` | Coach (self) | None | `204` |
| POST | `/api/coaches/:id/experiences` | Coach (self) | `{title, organization, startDate, endDate?, description?}` | `{experience}` |
| GET | `/api/coaches/:id/reviews` | Any | `?page=&limit=` | `{reviews[], average, total}` |

### DB Tables

```sql
CREATE TABLE coach_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  issuer VARCHAR(255) NOT NULL,
  issue_date DATE NOT NULL,
  expiry_date DATE,
  credential_url TEXT,
  document_url TEXT, -- uploaded proof
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE coach_experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  organization VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  description TEXT,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE coach_languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  proficiency VARCHAR(20) NOT NULL -- Native, Fluent, Conversational, Basic
);

CREATE INDEX idx_certifications_coach ON coach_certifications(coach_id);
CREATE INDEX idx_experiences_coach ON coach_experiences(coach_id);

-- Search index (PostGIS for location-based search)
-- ALTER TABLE users ADD COLUMN location GEOGRAPHY(POINT, 4326);
-- CREATE INDEX idx_users_location ON users USING GIST(location);
```

---

## Domain 4: AVAILABILITY & SCHEDULING

### What it does
Coaches define when they're available. Parents see available slots when booking. Rules control buffer time, notice period, etc.

### How it's controlled
- Coach sets recurring templates (e.g., "Mon 4-7pm every week")
- Coach sets one-off overrides (e.g., "block Dec 25")
- Scheduling rules enforce constraints on what parents can book
- Available slots computed server-side from templates minus bookings minus overrides

### Endpoints

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/api/coaches/:id/availability` | Any | `?start=&end=&duration=` | `{slots[]}` |
| GET | `/api/coaches/:id/availability/templates` | Coach (self) | None | `{templates[]}` |
| POST | `/api/coaches/:id/availability/templates` | Coach (self) | `{dayOfWeek, startTime, endTime, maxConcurrent, bufferMinutes, location?}` | `{template}` |
| PUT | `/api/coaches/:id/availability/templates/:id` | Coach (self) | Full template | `{template}` |
| DELETE | `/api/coaches/:id/availability/templates/:id` | Coach (self) | None | `204` |
| POST | `/api/coaches/:id/availability/overrides` | Coach (self) | `{date, isBlocked, reason?, customSlots?}` | `{override}` |
| GET | `/api/coaches/:id/scheduling-rules` | Coach (self) | None | `{rules}` |
| PUT | `/api/coaches/:id/scheduling-rules` | Coach (self) | `{bufferMinutes, minAdvanceHours, maxAdvanceDays, ...}` | `{rules}` |
| GET | `/api/coaches/:id/cancellation-policy` | Any | None | `{policy}` |
| PUT | `/api/coaches/:id/cancellation-policy` | Coach (self) | `{name, tiers[], minimumNoticeHours}` | `{policy}` |

### DB Tables

```sql
CREATE TABLE availability_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES users(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_recurring BOOLEAN DEFAULT TRUE,
  max_concurrent INTEGER DEFAULT 1,
  buffer_minutes INTEGER DEFAULT 15,
  location VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE availability_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_blocked BOOLEAN DEFAULT TRUE,
  reason TEXT,
  custom_slots JSONB, -- [{startTime, endTime, location}]
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(coach_id, date)
);

CREATE TABLE scheduling_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  buffer_minutes INTEGER DEFAULT 15,
  min_advance_booking_hours INTEGER DEFAULT 24,
  max_advance_booking_days INTEGER DEFAULT 30,
  allow_same_day BOOLEAN DEFAULT FALSE,
  allow_rescheduling BOOLEAN DEFAULT TRUE,
  reschedule_deadline_hours INTEGER DEFAULT 12,
  max_concurrent INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE cancellation_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL DEFAULT 'Standard',
  description TEXT,
  minimum_notice_hours INTEGER DEFAULT 24,
  allow_cancellations BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE cancellation_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID REFERENCES cancellation_policies(id) ON DELETE CASCADE,
  hours_before INTEGER NOT NULL, -- e.g., 24 = "24+ hours before"
  refund_percentage INTEGER NOT NULL CHECK (refund_percentage BETWEEN 0 AND 100),
  description TEXT,
  sort_order INTEGER NOT NULL
);

CREATE INDEX idx_templates_coach ON availability_templates(coach_id);
CREATE INDEX idx_overrides_coach_date ON availability_overrides(coach_id, date);
```

---

## Domain 5: BOOKINGS & SESSION INVITES

### What it does
Core booking flow. Parents book sessions. Coaches send invites. Counter-offers negotiate timing. Cash payment at session.

### How it's controlled
- Parent creates booking → status PENDING → coach confirms → CONFIRMED
- OR coach sends invite → parent accepts → booking auto-created as CONFIRMED
- Counter-offers bounce between coach/parent until agreed
- Session time passes → status becomes AWAITING_COMPLETION → coach completes → COMPLETED
- Cancellation follows policy rules

### Endpoints

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/api/bookings` | Any | `?status=&coachId=&athleteId=&from=&to=` | `{bookings[]}` |
| GET | `/api/bookings/:id` | Owner/Coach | None | `{booking}` |
| POST | `/api/bookings` | Parent | `{coachId, athleteIds[], scheduledAt, duration, location, objectives[]}` | `{booking}` |
| PATCH | `/api/bookings/:id` | Owner/Coach | `{status?, scheduledAt?, ...}` | `{booking}` |
| POST | `/api/bookings/:id/cancel` | Owner/Coach | `{reason?}` | `{booking, refundInfo}` |
| POST | `/api/bookings/:id/complete` | Coach | `{attendance[], notes[]}` | `{booking}` |
| POST | `/api/session-invites` | Coach | `{athleteIds[], parentId, proposedSlots[], sessionType, focus, notes?}` | `{invite}` |
| GET | `/api/session-invites` | Any | `?role=coach&role=parent&status=` | `{invites[]}` |
| POST | `/api/session-invites/:id/respond` | Parent | `{response: ACCEPTED/DECLINED/COUNTERED, selectedSlot?, counterSlots?, message?}` | `{invite, booking?}` |
| POST | `/api/counter-offers` | Parent/Coach | `{bookingId, proposedTime, message?}` | `{counterOffer}` |
| POST | `/api/counter-offers/:id/respond` | Parent/Coach | `{response: ACCEPTED/REJECTED, reason?}` | `{counterOffer, booking?}` |

### DB Tables

```sql
CREATE TYPE booking_status AS ENUM (
  'PENDING', 'CONFIRMED', 'AWAITING_COMPLETION', 'COMPLETED', 'CANCELLED'
);

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES users(id),
  booked_by_id UUID REFERENCES users(id), -- parent or athlete
  status booking_status NOT NULL DEFAULT 'PENDING',
  scheduled_at TIMESTAMP NOT NULL,
  duration INTEGER NOT NULL, -- minutes
  location VARCHAR(255),
  location_label VARCHAR(255),
  service_type VARCHAR(50), -- 1-on-1, small-group, team
  objectives JSONB DEFAULT '[]',
  notes TEXT,
  price_gbp DECIMAL(10,2), -- display only, cash payment
  session_invite_id UUID, -- NULL if direct booking
  recurring_booking_id UUID, -- NULL if not recurring
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Many-to-many: bookings can have multiple athletes
CREATE TABLE booking_athletes (
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL, -- child ID or self-booking user ID
  athlete_name VARCHAR(255) NOT NULL,
  PRIMARY KEY (booking_id, athlete_id)
);

-- Attendance records (filled on completion)
CREATE TABLE session_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL,
  status VARCHAR(20) NOT NULL, -- ATTENDED, NO_SHOW, LATE
  effort_rating SMALLINT CHECK (effort_rating BETWEEN 1 AND 5),
  focus_areas JSONB DEFAULT '[]',
  improvement_note TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TYPE invite_status AS ENUM (
  'PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'COUNTERED'
);

CREATE TABLE session_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES users(id),
  parent_id UUID REFERENCES users(id),
  athlete_ids JSONB NOT NULL, -- UUID[]
  proposed_slots JSONB NOT NULL, -- TimeSlot[]
  session_type VARCHAR(50),
  focus VARCHAR(255),
  notes TEXT,
  price_gbp DECIMAL(10,2),
  status invite_status NOT NULL DEFAULT 'PENDING',
  selected_slot JSONB, -- chosen TimeSlot on accept
  counter_proposal JSONB, -- TimeSlot[] on counter
  counter_note TEXT,
  booking_id UUID REFERENCES bookings(id), -- set on accept
  expires_at TIMESTAMP NOT NULL,
  responded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE counter_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  proposed_by VARCHAR(10) NOT NULL, -- PARENT or COACH
  proposer_id UUID REFERENCES users(id),
  original_time JSONB NOT NULL,
  proposed_time JSONB NOT NULL,
  message TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  rejection_reason TEXT,
  expires_at TIMESTAMP NOT NULL,
  responded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_bookings_coach ON bookings(coach_id);
CREATE INDEX idx_bookings_booker ON bookings(booked_by_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_scheduled ON bookings(scheduled_at);
CREATE INDEX idx_invites_coach ON session_invites(coach_id);
CREATE INDEX idx_invites_parent ON session_invites(parent_id);
CREATE INDEX idx_invites_status ON session_invites(status);
```

---

## Domain 6: SESSION NOTES & DEVELOPMENT

### What it does
Post-session notes, badge awards, drill assignments, goals, skill progression. The "development spine" of the platform.

### How it's controlled
- Coach writes notes after completing a session
- Notes can be private (coach-only) or shared with parents
- Badges awarded by coaches, visible per athlete settings
- Goals set by coach, athlete, or parent
- Skill tree progression updated by coach after sessions

### Endpoints

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/api/bookings/:id/notes` | Coach | `{athleteId, effortRating, focusAreas[], improvements[], homework[], parentVisibleNotes?, privateNotes?}` | `{note}` |
| GET | `/api/athletes/:id/notes` | Coach/Parent | `?from=&to=` | `{notes[]}` |
| POST | `/api/badges/award` | Coach | `{athleteId, badgeId, reason, sessionId?, note?, visibility}` | `{award}` |
| GET | `/api/athletes/:id/badges` | Any | None | `{awards[]}` |
| POST | `/api/drills` | Coach | `{title, description, category, videoUrl?, duration, difficulty}` | `{drill}` |
| POST | `/api/drills/:id/assign` | Coach | `{athleteId, dueDate, notes?}` | `{assignment}` |
| GET | `/api/athletes/:id/drills` | Coach/Parent/Athlete | None | `{assignments[]}` |
| PATCH | `/api/drill-assignments/:id` | Athlete/Parent | `{isCompleted, feedback?}` | `{assignment}` |
| POST | `/api/goals` | Coach/Parent/Athlete | `{athleteId, title, category, targetDate?, milestones[]}` | `{goal}` |
| PATCH | `/api/goals/:id` | Owner | `{progress?, status?}` | `{goal}` |
| PATCH | `/api/goals/:id/milestones/:milestoneId` | Owner | `{isCompleted}` | `{milestone}` |

### DB Tables

```sql
CREATE TABLE session_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES users(id),
  athlete_id UUID NOT NULL,
  effort_rating SMALLINT CHECK (effort_rating BETWEEN 1 AND 5),
  focus_areas JSONB DEFAULT '[]',
  improvements JSONB DEFAULT '[]',
  homework JSONB DEFAULT '[]',
  private_notes TEXT,
  parent_visible_notes TEXT,
  skill_updates JSONB DEFAULT '[]', -- [{skill, previousLevel, newLevel}]
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE badge_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES users(id), -- custom badges per coach
  label VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50), -- leadership, consistency, technique, mindset, teamwork, resilience
  tier SMALLINT DEFAULT 1, -- 1=bronze, 2=silver, 3=gold
  point_value INTEGER DEFAULT 10,
  is_system BOOLEAN DEFAULT FALSE -- platform-wide badges
);

CREATE TABLE badge_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_id UUID REFERENCES badge_definitions(id),
  athlete_id UUID NOT NULL,
  coach_id UUID REFERENCES users(id),
  booking_id UUID REFERENCES bookings(id),
  reason TEXT NOT NULL,
  note TEXT,
  visibility VARCHAR(20) DEFAULT 'athlete', -- coach_only, athlete, supporters
  seen_by_parent BOOLEAN DEFAULT FALSE,
  awarded_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE drills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(20) NOT NULL,
  video_url TEXT,
  thumbnail_url TEXT,
  duration INTEGER, -- minutes
  difficulty VARCHAR(20) NOT NULL,
  equipment JSONB DEFAULT '[]',
  tags JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE drill_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drill_id UUID REFERENCES drills(id),
  athlete_id UUID NOT NULL,
  assigned_by UUID REFERENCES users(id),
  due_date DATE,
  notes TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  athlete_feedback TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(20) NOT NULL, -- SPEED, TECHNIQUE, FITNESS, TACTICAL, MENTAL, OTHER
  target_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  progress INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  created_by_role VARCHAR(10) NOT NULL, -- COACH, ATHLETE, PARENT
  created_by_id UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE goal_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  sort_order INTEGER NOT NULL
);

CREATE INDEX idx_notes_booking ON session_notes(booking_id);
CREATE INDEX idx_notes_athlete ON session_notes(athlete_id);
CREATE INDEX idx_badges_athlete ON badge_awards(athlete_id);
CREATE INDEX idx_drills_coach ON drills(coach_id);
CREATE INDEX idx_assignments_athlete ON drill_assignments(athlete_id);
CREATE INDEX idx_goals_athlete ON goals(athlete_id);
```

---

## Domain 7: CLUBS & SQUADS

### What it does
Clubs organise coaches and families. Squads group athletes within clubs. Club feed, branding, member management.

### How it's controlled
- Club owner creates club, invites members via codes
- Club roles: OWNER, ADMIN, HEAD_COACH, COACH, MEMBER
- Squad coaches manage their squad roster
- Feed posts scoped by audience (club, squad, staff)
- Branding (logo, colours) set by admin

### Endpoints

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/api/clubs` | Coach | `{name, city, tagline?}` | `{club}` |
| GET | `/api/clubs/:id` | Member | None | `{club, membership}` |
| PATCH | `/api/clubs/:id` | Admin | Partial fields | `{club}` |
| PUT | `/api/clubs/:id/branding` | Admin | `{badge?, photoUrl?, primaryColor?, secondaryColor?, tagline?}` | `{club}` |
| POST | `/api/clubs/:id/join` | Any | `{inviteCode}` | `{membership}` |
| GET | `/api/clubs/:id/members` | Member | None | `{members[]}` |
| PATCH | `/api/clubs/:id/members/:userId` | Admin | `{role}` | `{membership}` |
| POST | `/api/clubs/:id/squads` | Admin/Coach | `{name, level, ageMin?, ageMax?, primaryCoach}` | `{squad}` |
| GET | `/api/clubs/:id/squads` | Member | None | `{squads[]}` |
| GET | `/api/squads/:id` | Member | None | `{squad, members[]}` |
| POST | `/api/squads/:id/members` | Coach | `{athleteId, parentId, position?, jerseyNumber?}` | `{member}` |
| GET | `/api/clubs/:id/calendar` | Member | `?from=&to=` | `{sessions[], matches[], events[]}` |
| GET | `/api/clubs/:id/feed` | Member | `?page=&limit=&audience=` | `{posts[]}` |
| POST | `/api/clubs/:id/feed` | Coach/Admin | `{title, body, postType, audience, imageUrl?, attachments?}` | `{post}` |

### DB Tables

```sql
CREATE TABLE clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  city VARCHAR(100),
  country VARCHAR(50) DEFAULT 'UK',
  badge_url TEXT,
  photo_url TEXT,
  tagline VARCHAR(255),
  primary_color VARCHAR(7), -- hex
  secondary_color VARCHAR(7),
  owner_id UUID REFERENCES users(id),
  invite_code VARCHAR(20) UNIQUE NOT NULL,
  member_count INTEGER DEFAULT 0,
  coach_count INTEGER DEFAULT 0,
  squad_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE club_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  join_source VARCHAR(10) NOT NULL DEFAULT 'invite',
  can_post_as_club BOOLEAN DEFAULT FALSE,
  squad_ids JSONB DEFAULT '[]',
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(club_id, user_id)
);

CREATE TABLE squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  level VARCHAR(50),
  primary_coach_id UUID REFERENCES users(id),
  meet_location VARCHAR(255),
  age_min INTEGER,
  age_max INTEGER,
  tags JSONB DEFAULT '[]',
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE squad_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID REFERENCES squads(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL, -- child ID
  athlete_name VARCHAR(255) NOT NULL,
  parent_id UUID REFERENCES users(id),
  parent_name VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  position VARCHAR(50),
  jersey_number INTEGER,
  joined_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE club_feed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id),
  author_name VARCHAR(255) NOT NULL,
  title VARCHAR(255),
  body TEXT NOT NULL,
  post_type VARCHAR(20) DEFAULT 'general', -- announcement, photo, event, general, achievement, session, match
  audience VARCHAR(20) NOT NULL DEFAULT 'club', -- club, squad, staff
  post_as VARCHAR(10) DEFAULT 'self', -- club, self
  image_url TEXT,
  attachments JSONB DEFAULT '[]',
  is_pinned BOOLEAN DEFAULT FALSE,
  -- Auto-generated post references
  match_id UUID,
  badge_award_id UUID,
  session_id UUID,
  event_id UUID,
  reaction_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_memberships_club ON club_memberships(club_id);
CREATE INDEX idx_memberships_user ON club_memberships(user_id);
CREATE INDEX idx_squads_club ON squads(club_id);
CREATE INDEX idx_squad_members_squad ON squad_members(squad_id);
CREATE INDEX idx_feed_club ON club_feed_posts(club_id, created_at DESC);
```

---

## Domain 8: MATCHES & EVENTS

### What it does
Match fixtures with lineup selection. Club events with RSVP and attendance. Results auto-post to feed.

### How it's controlled
- Coach creates match/event scoped to their club/squad
- Parents respond to match invites (available/unavailable)
- Coach selects lineup from available players
- Results recorded post-match, auto-generate feed post
- Event RSVP with guest count

### Endpoints

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/api/matches` | Coach | `{clubId, squadId?, title, opponent, matchType, isHome, date, kickoffTime, venue, maxPlayers}` | `{match}` |
| GET | `/api/matches` | Coach/Parent | `?clubId=&squadId=&status=&from=&to=` | `{matches[]}` |
| GET | `/api/matches/:id` | Member | None | `{match, players[]}` |
| POST | `/api/matches/:id/respond` | Parent | `{athleteId, status: AVAILABLE/UNAVAILABLE, note?}` | `{player}` |
| PATCH | `/api/matches/:id/lineup` | Coach | `{players: [{athleteId, status: SELECTED/RESERVE, position?, jerseyNumber?}]}` | `{match}` |
| POST | `/api/matches/:id/result` | Coach | `{home, away}` | `{match, feedPost}` |
| POST | `/api/events` | Coach/Admin | `{clubId, title, description, eventType, date, startTime, venue, targetAudience, maxAttendees?, price?, rsvpRequired}` | `{event}` |
| GET | `/api/events` | Member | `?clubId=&from=&to=` | `{events[]}` |
| POST | `/api/events/:id/rsvp` | Member | `{status: GOING/MAYBE/NOT_GOING, guestCount?}` | `{rsvp}` |
| POST | `/api/events/:id/checkin` | Coach/Self | `{userId, method}` | `{attendance}` |

### DB Tables

```sql
CREATE TYPE match_status AS ENUM ('SCHEDULED', 'LINEUP_SET', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  squad_id UUID REFERENCES squads(id),
  coach_id UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  match_type VARCHAR(20) NOT NULL, -- FRIENDLY, LEAGUE, CUP, TOURNAMENT
  opponent VARCHAR(255) NOT NULL,
  is_home BOOLEAN NOT NULL,
  date DATE NOT NULL,
  kickoff_time TIME NOT NULL,
  meet_time TIME,
  venue VARCHAR(255) NOT NULL,
  address TEXT,
  max_players INTEGER DEFAULT 16,
  status match_status DEFAULT 'SCHEDULED',
  result_home INTEGER,
  result_away INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE match_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL,
  athlete_name VARCHAR(255) NOT NULL,
  parent_id UUID REFERENCES users(id),
  status VARCHAR(20) NOT NULL DEFAULT 'INVITED', -- INVITED, AVAILABLE, UNAVAILABLE, SELECTED, RESERVE
  parent_note TEXT,
  position VARCHAR(50),
  jersey_number INTEGER,
  responded_at TIMESTAMP,
  UNIQUE(match_id, athlete_id)
);

CREATE TYPE event_status AS ENUM ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED');

CREATE TABLE club_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_type VARCHAR(20) NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  venue VARCHAR(255) NOT NULL,
  address TEXT,
  is_virtual BOOLEAN DEFAULT FALSE,
  meeting_link TEXT,
  target_audience VARCHAR(20) DEFAULT 'ALL',
  squad_ids JSONB DEFAULT '[]',
  max_attendees INTEGER,
  price_gbp DECIMAL(10,2) DEFAULT 0,
  rsvp_required BOOLEAN DEFAULT TRUE,
  rsvp_deadline TIMESTAMP,
  status event_status DEFAULT 'DRAFT',
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES club_events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  user_name VARCHAR(255) NOT NULL,
  user_role VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL, -- GOING, MAYBE, NOT_GOING
  guest_count INTEGER DEFAULT 0,
  note TEXT,
  responded_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX idx_matches_club ON matches(club_id);
CREATE INDEX idx_matches_date ON matches(date);
CREATE INDEX idx_match_players_match ON match_players(match_id);
CREATE INDEX idx_events_club ON club_events(club_id);
CREATE INDEX idx_rsvps_event ON event_rsvps(event_id);
```

---

## Domain 9: MESSAGING

### What it does
Direct messaging between coaches and parents/athletes. Thread-based. Group threads for clubs/squads.

### How it's controlled
- Threads created when first message sent (or on booking creation)
- Messages stored in DB, delivered via Socket.io
- Read receipts tracked per user per thread
- Group threads scoped to club/squad membership

### Endpoints

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/api/threads` | Any | `?kind=direct&kind=group` | `{threads[]}` |
| POST | `/api/threads` | Any | `{participantIds[], relatedBookingId?}` | `{thread}` |
| GET | `/api/threads/:id/messages` | Participant | `?before=&limit=` | `{messages[]}` |
| POST | `/api/threads/:id/messages` | Participant | `{content, attachments?}` | `{message}` |
| PATCH | `/api/threads/:id/read` | Participant | None | `204` |

### Socket.io Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `message:new` | Server → Client | `{message}` |
| `message:read` | Server → Client | `{threadId, userId, readAt}` |
| `typing:start` | Client → Server | `{threadId}` |
| `typing:stop` | Client → Server | `{threadId}` |
| `typing:update` | Server → Client | `{threadId, userId, isTyping}` |

### DB Tables

```sql
CREATE TABLE threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind VARCHAR(10) NOT NULL DEFAULT 'direct', -- direct, group
  group_type VARCHAR(20), -- club, squad, class, announcement (for group threads)
  club_id UUID REFERENCES clubs(id), -- for group threads
  squad_id UUID REFERENCES squads(id),
  related_booking_id UUID REFERENCES bookings(id),
  title VARCHAR(255), -- for group threads
  last_message_at TIMESTAMP,
  last_message_snippet TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE thread_participants (
  thread_id UUID REFERENCES threads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMP,
  is_muted BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (thread_id, user_id)
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES threads(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id),
  sender_name VARCHAR(255),
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'sent', -- sent, delivered, seen
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_thread ON messages(thread_id, created_at DESC);
CREATE INDEX idx_participants_user ON thread_participants(user_id);
```

---

## Domain 10: NOTIFICATIONS

### What it does
In-app notifications for all platform events. Push notifications planned for later.

### How it's controlled
- Server generates notifications on events (booking created, invite received, badge awarded, etc.)
- Stored in DB, delivered in-app
- User controls per-type preferences and quiet hours
- Deep links navigate to relevant screen

### Endpoints

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/api/notifications` | Any | `?unreadOnly=&type=&limit=&before=` | `{notifications[], unreadCount}` |
| PATCH | `/api/notifications/:id/read` | Owner | None | `204` |
| POST | `/api/notifications/read-all` | Owner | None | `204` |
| GET | `/api/notifications/preferences` | Owner | None | `{preferences}` |
| PUT | `/api/notifications/preferences` | Owner | `{typePreferences, quietHours}` | `{preferences}` |

### DB Tables

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}', -- arbitrary metadata
  deep_link VARCHAR(255), -- app route to navigate to
  related_entity_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  in_app BOOLEAN DEFAULT TRUE,
  push BOOLEAN DEFAULT TRUE,
  email BOOLEAN DEFAULT FALSE,
  sms BOOLEAN DEFAULT FALSE,
  type_preferences JSONB DEFAULT '{}',
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  muted_coaches JSONB DEFAULT '[]',
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE is_read = FALSE;
```

---

## Domain 11: REVIEWS

### What it does
Parents rate coaches after sessions. Coaches can respond publicly. Reviews visible on coach profiles.

### How it's controlled
- Review created only after a COMPLETED booking (verified booking badge)
- One review per booking
- Coach can respond once
- Public by default, can be set private
- Flagged reviews hidden pending admin review

### Endpoints

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/api/reviews` | Parent | `{coachId, bookingId, rating, title?, content, isPublic}` | `{review}` |
| GET | `/api/coaches/:id/reviews` | Any | `?page=&limit=&sort=` | `{reviews[], averageRating, totalCount}` |
| POST | `/api/reviews/:id/respond` | Coach | `{response}` | `{review}` |
| POST | `/api/reviews/:id/flag` | Any | `{reason}` | `204` |

### DB Tables

```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES users(id),
  parent_id UUID REFERENCES users(id),
  athlete_id UUID,
  booking_id UUID REFERENCES bookings(id),
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title VARCHAR(255),
  content TEXT NOT NULL,
  is_public BOOLEAN DEFAULT TRUE,
  response TEXT,
  responded_at TIMESTAMP,
  is_verified_booking BOOLEAN DEFAULT TRUE,
  status VARCHAR(20) DEFAULT 'PUBLISHED',
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,
  UNIQUE(booking_id) -- one review per booking
);

CREATE INDEX idx_reviews_coach ON reviews(coach_id, created_at DESC);
```

---

## Domain 12: ROSTER & FOLLOW

### What it does
Coach maintains roster of athletes they've worked with. Users follow coaches for feed updates.

### How it's controlled
- Roster auto-populated from completed bookings
- Coach can add notes, tags, status per athlete
- Follow is user-initiated, no approval needed

### Endpoints

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/api/coaches/:id/roster` | Coach (self) | `?status=&search=&tag=` | `{entries[]}` |
| GET | `/api/coaches/:id/roster/:athleteId` | Coach (self) | None | `{entry, bookingHistory[], notes[]}` |
| PATCH | `/api/coaches/:id/roster/:athleteId` | Coach (self) | `{status?, tags?, notes?}` | `{entry}` |
| POST | `/api/follows` | Any | `{followingId}` | `{follow}` |
| DELETE | `/api/follows/:followingId` | Owner | None | `204` |
| GET | `/api/users/:id/followers` | Any | None | `{followers[]}` |
| GET | `/api/users/:id/following` | Any | None | `{following[]}` |

### DB Tables

```sql
CREATE TABLE roster_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES users(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL,
  athlete_name VARCHAR(255) NOT NULL,
  parent_id UUID REFERENCES users(id),
  parent_name VARCHAR(255),
  parent_email VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  tags JSONB DEFAULT '[]',
  primary_focus VARCHAR(100),
  total_sessions INTEGER DEFAULT 0,
  last_session_date DATE,
  next_session_date DATE,
  notification_preference VARCHAR(10) DEFAULT 'ALL',
  start_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(coach_id, athlete_id)
);

CREATE TABLE roster_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roster_entry_id UUID REFERENCES roster_entries(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID REFERENCES users(id) ON DELETE CASCADE,
  notify_on_post BOOLEAN DEFAULT TRUE,
  notify_on_session BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

CREATE INDEX idx_roster_coach ON roster_entries(coach_id);
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);
```

---

## Domain 13: VIDEOS & MEDIA

### What it does
Coaches upload session videos, annotate with timestamps, share with athletes/parents.

### How it's controlled
- Videos uploaded to S3, metadata stored in DB
- Annotations stored as JSONB on video record
- Visibility controlled per video (private/shared/public)
- Shared videos visible to specified user IDs

### Endpoints

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/api/videos/upload-url` | Coach | `{fileName, contentType}` | `{uploadUrl, videoId}` |
| POST | `/api/videos` | Coach | `{title, description?, athleteIds[], bookingId?, visibility}` | `{video}` |
| GET | `/api/videos` | Any | `?coachId=&athleteId=&bookingId=` | `{videos[]}` |
| GET | `/api/videos/:id` | Viewer | None | `{video}` |
| POST | `/api/videos/:id/annotations` | Coach | `{timestamp, label, note?, type}` | `{annotation}` |
| PATCH | `/api/videos/:id/share` | Coach | `{userIds[]}` | `{video}` |

### DB Tables

```sql
CREATE TABLE session_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES users(id),
  booking_id UUID REFERENCES bookings(id),
  athlete_ids JSONB DEFAULT '[]',
  title VARCHAR(255) NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL, -- S3 URL
  thumbnail_url TEXT,
  duration INTEGER, -- seconds
  file_size BIGINT,
  annotations JSONB DEFAULT '[]',
  visibility VARCHAR(20) DEFAULT 'PRIVATE',
  shared_with JSONB DEFAULT '[]', -- user IDs
  upload_status VARCHAR(20) DEFAULT 'UPLOADING',
  view_count INTEGER DEFAULT 0,
  tags JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_videos_coach ON session_videos(coach_id);
```

---

## Domain 14: HEALTH & INJURIES

### What it does
Track athlete injuries and recovery. Shared with coaches for session planning.

### How it's controlled
- Parent/athlete logs injury
- Optional sharing with coach
- Recovery notes tracked over time
- Active injuries flagged to coach before sessions

### Endpoints

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/api/injuries` | Parent/Athlete | `{athleteId, bodyPart, description, severity, occurredAt, sharedWithCoach}` | `{injury}` |
| GET | `/api/athletes/:id/injuries` | Parent/Coach* | `?status=` | `{injuries[]}` |
| PATCH | `/api/injuries/:id` | Owner | `{status?, recoveryPercent?}` | `{injury}` |
| POST | `/api/injuries/:id/notes` | Owner/Coach | `{note, recoveryPercent?}` | `{recoveryNote}` |

*Coach sees only if `sharedWithCoach = true`.

### DB Tables

```sql
CREATE TABLE injuries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL,
  reported_by UUID REFERENCES users(id),
  body_part VARCHAR(30) NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL, -- MINOR, MODERATE, SEVERE
  occurred_at TIMESTAMP NOT NULL,
  expected_recovery DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, RECOVERING, HEALED
  recovery_percent INTEGER DEFAULT 0,
  shared_with_coach BOOLEAN DEFAULT FALSE,
  healed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE recovery_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  injury_id UUID REFERENCES injuries(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  recovery_percent INTEGER,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_injuries_athlete ON injuries(athlete_id);
```

---

## Domain 15: ACADEMY (extends Club)

### What it does
Academies are enhanced clubs with branding, staff permissions, approval-based membership, and programme tiers.

### How it's controlled
- Same tables as clubs with additional fields
- `is_academy BOOLEAN` flag on clubs table
- Extended branding fields (banner, slug, description)
- Approval workflow for join requests
- Staff permissions more granular than basic club roles

### Endpoints

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/api/academies` | Coach | `{name, slug, description, email?, postcode, city, sports[], isPublic, requiresApproval}` | `{academy}` |
| GET | `/api/academies/:id` | Any (if public) | None | `{academy}` |
| PUT | `/api/academies/:id/branding` | Admin | `{logoUrl?, bannerUrl?, primaryColor?, secondaryColor?}` | `{academy}` |
| POST | `/api/academies/:id/staff/invite` | Admin | `{email, role, permissions[]}` | `{invite}` |
| GET | `/api/academies/:id/staff` | Admin | None | `{staff[]}` |
| POST | `/api/academies/:id/join-request` | Any | `{message?}` | `{request}` |
| PATCH | `/api/academies/:id/join-requests/:id` | Admin | `{status: APPROVED/DECLINED}` | `{request}` |

### DB Changes

```sql
-- Add to clubs table
ALTER TABLE clubs ADD COLUMN is_academy BOOLEAN DEFAULT FALSE;
ALTER TABLE clubs ADD COLUMN slug VARCHAR(100) UNIQUE;
ALTER TABLE clubs ADD COLUMN description TEXT;
ALTER TABLE clubs ADD COLUMN banner_url TEXT;
ALTER TABLE clubs ADD COLUMN email VARCHAR(255);
ALTER TABLE clubs ADD COLUMN phone VARCHAR(20);
ALTER TABLE clubs ADD COLUMN website VARCHAR(255);
ALTER TABLE clubs ADD COLUMN is_public BOOLEAN DEFAULT TRUE;
ALTER TABLE clubs ADD COLUMN requires_approval BOOLEAN DEFAULT FALSE;
ALTER TABLE clubs ADD COLUMN sports JSONB DEFAULT '["Football"]';
ALTER TABLE clubs ADD COLUMN specialties JSONB DEFAULT '[]';

-- Staff permissions table
CREATE TABLE academy_staff_permissions (
  membership_id UUID REFERENCES club_memberships(id) ON DELETE CASCADE,
  permission VARCHAR(30) NOT NULL,
  PRIMARY KEY (membership_id, permission)
);
```

---

## Infrastructure Notes

### Redis Usage
- **Session cache**: `session:{userId}` → user object (5 min TTL)
- **Token blacklist**: `blacklist:{jti}` → 1 (set on logout, TTL = token expiry)
- **Rate limiting**: `ratelimit:{ip}:{endpoint}` → counter
- **Socket.io adapter**: Redis adapter for multi-server real-time

### S3 Usage
- **Bucket**: `clubroom-media`
- **Paths**: `avatars/{userId}/`, `videos/{coachId}/{videoId}/`, `clubs/{clubId}/`, `documents/{userId}/`
- **Upload**: Pre-signed URLs from API, direct upload from client
- **CDN**: CloudFront in front of S3

### Migrations
- Use something like Prisma or raw SQL migrations
- One migration per sprint
- Always include rollback (down migration)

---

## Table Count Summary

| Domain | Tables | Key Table |
|--------|--------|-----------|
| Auth & Users | 2 | `users`, `refresh_tokens` |
| Children & Family | 5 | `children`, `emergency_contacts`, `medical_info`, `consents`, `family_guardians` |
| Coach Profiles | 3 | `coach_certifications`, `coach_experiences`, `coach_languages` |
| Availability | 4 | `availability_templates`, `availability_overrides`, `scheduling_rules`, `cancellation_policies` + `cancellation_tiers` |
| Bookings | 5 | `bookings`, `booking_athletes`, `session_attendance`, `session_invites`, `counter_offers` |
| Development | 6 | `session_notes`, `badge_definitions`, `badge_awards`, `drills`, `drill_assignments`, `goals` + `goal_milestones` |
| Clubs & Squads | 5 | `clubs`, `club_memberships`, `squads`, `squad_members`, `club_feed_posts` |
| Matches & Events | 4 | `matches`, `match_players`, `club_events`, `event_rsvps` |
| Messaging | 3 | `threads`, `thread_participants`, `messages` |
| Notifications | 2 | `notifications`, `notification_preferences` |
| Reviews | 1 | `reviews` |
| Roster & Follow | 3 | `roster_entries`, `roster_notes`, `follows` |
| Videos | 1 | `session_videos` |
| Health | 2 | `injuries`, `recovery_notes` |
| Academy | 1 | `academy_staff_permissions` (extends clubs) |
| **TOTAL** | **~47 tables** | |

---

## Domain 16: COACH BUSINESS (Trials, Public Profile, Projections)

### What it does
Public coach profiles that parents can Google. Trial/taster sessions to convert new families. Earnings projections and business analytics.

### How it's controlled
- Coach controls public profile visibility and slug URL
- Trial offerings limited to 1 per family (tracked by parent ID)
- Projections calculated server-side from confirmed + pending bookings + historical averages
- Public profiles accessible without authentication (read-only)

### Endpoints

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| GET | `/api/coaches/:slug/public` | None | None | `{publicProfile}` |
| PUT | `/api/coaches/:id/trial-offering` | Coach | `{enabled, trialPriceGbp, duration, limitPerFamily, description}` | `{offering}` |
| GET | `/api/coaches/:id/analytics/trials` | Coach | None | `{totalOffered, totalConverted, conversionRate, revenueFromConverts}` |
| GET | `/api/coaches/:id/analytics/projection` | Coach | None | `{confirmed, pending, projected, trend}` |

### DB Tables

```sql
ALTER TABLE users ADD COLUMN slug VARCHAR(100) UNIQUE;
ALTER TABLE users ADD COLUMN is_public_profile BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN cover_photo_url TEXT;

CREATE TABLE trial_offerings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT FALSE,
  trial_price_gbp DECIMAL(10,2) NOT NULL,
  normal_price_gbp DECIMAL(10,2) NOT NULL,
  duration INTEGER DEFAULT 30,
  limit_per_family INTEGER DEFAULT 1,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE trial_usages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_offering_id UUID REFERENCES trial_offerings(id),
  parent_id UUID REFERENCES users(id),
  booking_id UUID REFERENCES bookings(id),
  converted BOOLEAN DEFAULT FALSE,
  converted_booking_id UUID REFERENCES bookings(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_trial_usages_parent ON trial_usages(trial_offering_id, parent_id);
```

---

## Domain 17: VIDEO CHALLENGES & SESSION PLAN TEMPLATES

### What it does
Coaches create skill challenges for players to attempt at home. Pre-built session plan templates by age group and focus area. Drill library with categorised, searchable drills.

### How it's controlled
- System templates available to all coaches (platform-provided)
- Coach-created templates private to that coach
- Challenges scoped to squad or individual athletes
- Submissions include video upload to S3

### Endpoints

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| POST | `/api/challenges` | Coach | `{title, description, demoVideoUrl?, deadline, squadId?}` | `{challenge}` |
| GET | `/api/challenges` | Coach/Athlete | `?coachId=&squadId=&status=` | `{challenges[]}` |
| POST | `/api/challenges/:id/submit` | Athlete/Parent | `{videoUrl}` | `{submission}` |
| POST | `/api/challenges/:id/submissions/:subId/feedback` | Coach | `{feedback, badgeAwardId?}` | `{submission}` |
| GET | `/api/session-plan-templates` | Coach | `?ageGroup=&focus=&difficulty=` | `{templates[]}` |
| POST | `/api/session-plan-templates` | Coach | `{title, ageGroup, focus, duration, plan}` | `{template}` |
| GET | `/api/athletes/:id/progress-report` | Coach/Parent | `?period=` | `{report}` |

### DB Tables

```sql
CREATE TABLE video_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES users(id),
  club_id UUID REFERENCES clubs(id),
  squad_id UUID REFERENCES squads(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  demo_video_url TEXT,
  deadline DATE,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE challenge_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES video_challenges(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL,
  athlete_name VARCHAR(255),
  video_url TEXT NOT NULL,
  coach_feedback TEXT,
  badge_award_id UUID REFERENCES badge_awards(id),
  submitted_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE session_plan_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES users(id), -- NULL for system templates
  title VARCHAR(255) NOT NULL,
  age_group VARCHAR(20),
  focus VARCHAR(50),
  duration INTEGER,
  difficulty VARCHAR(20),
  plan JSONB NOT NULL, -- { warmup, mainActivities, cooldown, equipment, coachingPoints }
  is_system BOOLEAN DEFAULT FALSE,
  use_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_challenges_coach ON video_challenges(coach_id);
CREATE INDEX idx_submissions_challenge ON challenge_submissions(challenge_id);
CREATE INDEX idx_templates_age ON session_plan_templates(age_group);
```

---

## Updated Table Count Summary

| Domain | Tables | Key Table |
|--------|--------|-----------|
| Auth & Users | 2 | `users`, `refresh_tokens` |
| Children & Family | 5 | `children`, `emergency_contacts`, `medical_info`, `consents`, `family_guardians` |
| Coach Profiles | 3 | `coach_certifications`, `coach_experiences`, `coach_languages` |
| Availability | 5 | `availability_templates`, `availability_overrides`, `scheduling_rules`, `cancellation_policies`, `cancellation_tiers` |
| Bookings | 5 | `bookings`, `booking_athletes`, `session_attendance`, `session_invites`, `counter_offers` |
| Development | 7 | `session_notes`, `badge_definitions`, `badge_awards`, `drills`, `drill_assignments`, `goals`, `goal_milestones` |
| Clubs & Squads | 5 | `clubs`, `club_memberships`, `squads`, `squad_members`, `club_feed_posts` |
| Matches & Events | 4 | `matches`, `match_players`, `club_events`, `event_rsvps` |
| Messaging | 3 | `threads`, `thread_participants`, `messages` |
| Notifications | 2 | `notifications`, `notification_preferences` |
| Reviews | 1 | `reviews` |
| Roster & Follow | 3 | `roster_entries`, `roster_notes`, `follows` |
| Videos | 1 | `session_videos` |
| Health | 2 | `injuries`, `recovery_notes` |
| Academy | 1 | `academy_staff_permissions` (extends clubs) |
| Coach Business | 2 | `trial_offerings`, `trial_usages` (+ ALTER on users) |
| Challenges & Plans | 3 | `video_challenges`, `challenge_submissions`, `session_plan_templates` |
| **TOTAL** | **~54 tables** | |

---

*This is the single API contract document. Backend team builds to this spec. Frontend swaps mock services to call these endpoints. One Postgres database, one Redis instance, one S3 bucket.*
