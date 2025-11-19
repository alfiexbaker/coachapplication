# Software Design Document (SDD)
## Clubroom - Football Social Network & Development Platform

**Version:** 1.0
**Last Updated:** 2025-11-19
**Project Vision:** The Uber of football coaching - A social network and development hub connecting players, coaches, parents, and schools.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [User Roles & Personas](#user-roles--personas)
3. [Core Feature Modules](#core-feature-modules)
4. [Technical Architecture](#technical-architecture)
5. [Data Models](#data-models)
6. [API Endpoints](#api-endpoints)
7. [Security & Privacy](#security--privacy)
8. [Scalability Considerations](#scalability-considerations)

---

## Project Overview

### What is Clubroom?

Clubroom is a **football social networking and development platform** that combines:
- **Social Features**: Profiles, feeds, posts, group chats
- **Booking System**: Find and book coaches/schools
- **Development Tracking**: Analytics, progress graphs, session history
- **Payment Platform**: Coaches set prices, manage earnings, withdraw funds
- **Team Management**: Coaches invite players, manage squads
- **School Presence**: Schools can create profiles, post training opportunities

### Think:
- **LinkedIn** (professional profiles, connections)
- **Instagram** (social feed, posts, stories)
- **Strava** (performance tracking, analytics)
- **ClassDojo** (parent-child management)
- **Uber** (marketplace, payments, ratings)

---

## User Roles & Personas

### 1. **Player** (Child/Athlete)
**Age:** 6-18 years old
**Needs:**
- Find coaches and training sessions
- Track their development (skills, stats, achievements)
- View session history and notes from coaches
- See their progress graphs and analytics
- Connect with teammates
- Join group chats (team, class)
- Follow schools and coaches
- Participate in the social feed

**Key Screens:**
- Discovery (find coaches/schools)
- Development Hub (stats, graphs, achievements, levels)
- Bookings (upcoming sessions)
- Messages (DMs + group chats)
- Social Feed (posts from network)
- Profile (stats, achievements, bio)

---

### 2. **Parent/Guardian**
**Needs:**
- Manage multiple children's accounts
- Book sessions for their kids
- Monitor development and progress
- Communicate with coaches
- Handle payments
- View session notes and feedback
- Track attendance
- Switch between child profiles

**Key Screens:**
- Dashboard (all children overview)
- Child switcher
- Bookings (for all children)
- Messages (with coaches)
- Payments & billing
- Development reports (per child)
- Discovery (find coaches for kids)

---

### 3. **Coach**
**Needs:**
- Manage calendar and availability
- Track income and earnings
- View upcoming sessions
- Add session notes after training
- Message players/parents
- Manage team roster
- Invite players to team
- Set pricing for different session types
- Withdraw earnings
- Post training opportunities
- Share content to feed
- Track client retention and growth

**Key Screens:**
- Calendar (manage availability, view bookings)
- Income Dashboard (earnings, analytics, withdraw)
- Sessions (upcoming, add notes post-session)
- Team Management (roster, invites)
- Messages (DMs + team group chats)
- Profile (public-facing, reviews, achievements)
- Settings (pricing, payment setup, notifications)
- Social Feed (post content, engage)

---

### 4. **School/Academy**
**Needs:**
- Official verified profile
- Post training programs and tryouts
- Manage multiple coaches (staff)
- Calendar for facilities/pitches
- Accept bookings for group sessions
- Post news and updates
- Build follower base
- Showcase achievements and alumni
- Revenue tracking

**Key Screens:**
- School Dashboard
- Staff Management (add/remove coaches)
- Calendar & Bookings
- Posts & News
- Profile (public page with followers)
- Analytics (reach, engagement, bookings)
- Settings (verification, billing)

---

## Core Feature Modules

### Module 1: **Authentication & User Management**

#### Features:
- **Multi-role sign up** (Player, Parent, Coach, School)
- **Email/password** authentication
- **OAuth** (Google, Apple Sign-In)
- **Phone verification** (SMS OTP)
- **Email verification**
- **Password reset**
- **Biometric login** (Face ID, Touch ID)
- **Session management** (tokens, refresh)
- **Role switching** (Parent switching between kids)

#### Child Account Management (Parent Feature):
- Add multiple children
- Each child gets a sub-account
- Parent controls privacy settings
- Parent approves connections/follows

---

### Module 2: **User Profiles**

#### Player Profile:
- **Basic Info**: Name, age, photo, location, club
- **Bio**: About me, playing position, favorite team
- **Stats Overview**: Total sessions, hours trained, level
- **Achievements/Badges**: Milestones unlocked
- **Skills Matrix**: Visual graph of abilities (passing, shooting, dribbling)
- **Session History**: List of all past training
- **Connections**: Following (coaches, schools, teammates)
- **Privacy Controls**: Public/private profile

#### Coach Profile:
- **Basic Info**: Name, photo, location, certifications
- **Bio**: Experience, coaching philosophy
- **Badges**: DBS check, FA Level 1/2/3, verified
- **Pricing**: Session rates (1-on-1, small group, team)
- **Availability**: Calendar preview
- **Reviews & Ratings**: Star rating, testimonials
- **Stats**: Total sessions coached, years experience
- **Specialties**: Age groups, skill focus
- **Team/Squad**: Current roster
- **Social Proof**: Follower count, post engagement

#### School Profile:
- **Basic Info**: Name, logo, location, contact
- **Verification Badge**: Official school status
- **About**: History, mission, facilities
- **Programs Offered**: Age groups, training types
- **Staff**: List of coaches
- **Achievements**: Trophies, league positions, alumni success
- **Media Gallery**: Photos, videos
- **Upcoming Events**: Open tryouts, camps
- **Reviews & Ratings**
- **Followers Count**

---

### Module 3: **Social Feed**

#### Core Functionality:
- **Home Feed**: Algorithmic feed of posts from network
- **Post Types**:
  - Text posts
  - Photos/videos
  - Session highlights (auto-generated from training)
  - Achievement unlocks
  - Booking announcements
  - Event invites
- **Interactions**:
  - Like/react
  - Comment
  - Share/repost
  - Save for later
- **Filtering**: View by all, coaches only, schools only, friends
- **Hashtags & Mentions**: Tagging system

#### Post Creation:
- Rich text editor
- Photo/video upload (max 10 images, 60s video)
- Tag location
- Tag people
- Privacy settings (public, followers, private)

#### Who Can Post:
- Players (with parent approval if under 13)
- Coaches
- Schools

---

### Module 4: **Discovery & Search**

#### Search Functionality:
- **People Search**: Find players, coaches, schools
- **Location-based**: Postcode, radius, map view
- **Filters**:
  - Coach filters: Price, rating, specialty, availability, certification
  - School filters: Distance, programs, age groups
  - Player filters: Age, position, club (for coaches recruiting)
- **Sort**: Distance, price, rating, newest

#### Browse Categories:
- Top-rated coaches
- Schools near you
- Upcoming group sessions
- Recommended for you (ML-based)

#### Coach/School Detail View:
- Full profile
- Availability calendar
- Pricing breakdown
- Reviews
- Book now CTA
- Message button
- Follow button

---

### Module 5: **Bookings & Appointments**

#### Booking Flow (Player/Parent Perspective):
1. **Discover**: Find coach/school
2. **View Availability**: Interactive calendar
3. **Select Session Type**: 1-on-1, small group, team training
4. **Choose Date/Time**: Available slots
5. **Add Details**: Player(s), focus areas, notes
6. **Payment**: Pay now or later (if agreed)
7. **Confirmation**: Booking confirmed, added to calendar

#### Coach View:
- **Upcoming Sessions**: List/calendar view
- **Booking Requests**: Accept/decline pending requests
- **Calendar Management**: Set available/blocked times
- **Recurring Availability**: Weekly schedule template
- **Session Types**: Define offerings (1-on-1 £50/hr, Group £30/hr, etc.)

#### Session States:
- Pending (awaiting coach approval)
- Confirmed
- In Progress
- Completed (requires notes)
- Cancelled
- No-show

#### Post-Session:
- Coach adds notes (performance, focus areas, improvements)
- Coach rates player effort (optional)
- Player/parent can review and rate coach
- Notes visible in Development Hub

---

### Module 6: **Development Hub**

#### Purpose:
Track player progression over time with data visualization and insights.

#### Features:

**1. Overview Dashboard:**
- Total sessions completed
- Total hours trained
- Current level (e.g., Bronze → Silver → Gold → Elite)
- Streak counter (consecutive weeks with sessions)
- Next milestone progress

**2. Skills Matrix:**
- Visual radar/spider chart showing abilities:
  - Passing
  - Shooting
  - Dribbling
  - Defending
  - Positioning
  - Fitness
- Skills updated by coaches via post-session notes
- Track improvement over time (before/after comparison)

**3. Session History:**
- Chronological list of all past sessions
- Each entry shows:
  - Date, coach, duration
  - Focus areas worked on
  - Coach's notes and ratings
  - Skills improved
  - Attachments (videos, drills)
- Filter by date, coach, skill focus

**4. Analytics & Graphs:**
- **Line Charts**: Sessions per month, hours per week
- **Bar Charts**: Skills comparison, time spent per focus area
- **Pie Charts**: Session type breakdown (1-on-1 vs group)
- **Heatmaps**: Training frequency calendar
- **Progress Photos**: Upload before/after skill videos

**5. Achievements & Badges:**
- Unlock badges for milestones:
  - First session
  - 10 sessions completed
  - 50 hours trained
  - Skill master (max out a skill)
  - Consistency streak (30 days)
- Gamification to encourage participation

**6. Goals & Objectives:**
- Set personal goals (e.g., "Improve passing to 8/10 by June")
- Coach can assign objectives
- Track completion %

**7. Export Reports:**
- Generate PDF report of progress
- Share with parents, clubs, schools

---

### Module 7: **Messaging**

#### Message Types:

**1. Direct Messages (1-on-1):**
- Player ↔ Coach
- Parent ↔ Coach
- Coach ↔ Coach
- Player ↔ Player (with parent approval)
- Text, images, videos, voice notes
- File attachments (PDFs, documents)

**2. Group Chats:**
- **Team Chats**: Coach creates, adds team members
- **Class Chats**: School/academy creates for a training group
- **Parent Groups**: Parents of same team
- Up to 100 members
- Admin controls (coach/school as admin)
- Mute, leave, notifications settings

**3. System Messages:**
- Booking confirmations
- Payment receipts
- Session reminders (24hr, 1hr before)
- Achievement unlocks

#### Features:
- WhatsApp-style interface
- Read receipts
- Typing indicators
- Message reactions (emoji)
- Reply to specific messages (threads)
- Pin important messages
- Search messages
- Push notifications
- Rich media preview

#### Moderation:
- Report inappropriate messages
- Block users
- Parent can monitor child's messages (setting)
- Auto-moderation for profanity (for minors)

---

### Module 8: **Calendar & Availability**

#### Coach Calendar:
- **Weekly/Monthly View**: Visual grid of all bookings
- **Drag-to-Block**: Mark unavailable times
- **Recurring Availability**: Set weekly template (e.g., Mon-Fri 4-8pm)
- **Override**: Block specific dates (holidays)
- **Color Coding**: Different session types in different colors
- **Sync**: Export to Google Calendar, Apple Calendar (iCal)
- **Multi-location**: Set different locations for different slots

#### Player/Parent Calendar:
- View all upcoming bookings
- Reminders/notifications
- Add to device calendar

#### School Calendar:
- Facility/pitch booking management
- Multiple coaches' availability
- Group session scheduling

---

### Module 9: **Payments & Finance**

#### Player/Parent (Paying Side):

**Payment Methods:**
- Credit/debit card (Stripe)
- Apple Pay
- Google Pay
- Wallet system (preload credit)

**Payment Flows:**
- Pay per session (at booking)
- Pay later (invoice system)
- Subscription packages (e.g., 10 sessions for £450)
- Split payment (multiple parents sharing cost)

**Billing History:**
- View all transactions
- Download receipts
- Refund status

---

#### Coach (Earning Side):

**Income Dashboard:**
- **Today's Earnings**: Real-time counter
- **This Week/Month**: Bar chart
- **Total Lifetime Earnings**
- **Pending Balance**: Awaiting payout
- **Available Balance**: Ready to withdraw
- **Upcoming Earnings**: Confirmed future sessions

**Pricing Management:**
- Set base rates for session types
- Dynamic pricing (surge pricing for peak hours)
- Discount codes/promotions
- Package deals

**Withdrawals:**
- Connect bank account (Stripe Connect)
- Instant payout (fee applies) or standard (1-3 days)
- Minimum withdrawal threshold
- Transaction history

**Analytics:**
- Revenue trends
- Average session price
- Client retention rate
- Busiest days/times
- Revenue by session type

**Platform Fees:**
- Clubroom takes 15% commission
- Transparent fee breakdown

---

#### School (Earning Side):
- Similar to coach, but with:
  - Multi-coach revenue tracking
  - Facility rental revenue
  - Group session pricing
  - Staff payout management

---

### Module 10: **Team Management** (Coach Feature)

#### Features:
- **Create Team**: Name, age group, logo
- **Invite Players**: Send invite via email/in-app
- **Roster Management**:
  - Add/remove players
  - Assign positions
  - Captain designation
- **Team Stats**: Aggregate player analytics
- **Team Chat**: Dedicated group chat
- **Team Calendar**: Group training sessions
- **Team Feed**: Private feed for announcements
- **Attendance Tracking**: Mark who attended sessions
- **Team Achievements**: Track wins, tournaments

#### Player Perspective:
- View team roster
- Team chat
- Team events calendar
- Team feed

---

### Module 11: **Session Notes & Feedback**

#### Coach Adds Notes (Post-Session):
- **Text Notes**: Free-form feedback
- **Skills Ratings**: Update skill levels (1-10 scale)
- **Focus Areas**: What was worked on
- **Improvements Seen**: Highlight progress
- **Homework**: Drills to practice
- **Attachments**: Videos, PDFs
- **Effort Rating**: 1-5 stars
- **Attendance**: Present/late/absent

#### Player/Parent Views Notes:
- Appears in Development Hub
- Push notification when notes added
- Can comment/ask questions
- Share with school/club

---

### Module 12: **Schools & Academies**

#### School Features:
- **Verified Profiles**: Blue checkmark for official schools
- **Multiple Coaches**: Add staff members (with roles)
- **Programs & Courses**: List offerings (U10s training, goalkeeper academy, etc.)
- **Event Posting**: Tryouts, open days, camps
- **News Feed**: Announcements, match results, achievements
- **Facility Showcase**: Photos of pitches, gyms, changing rooms
- **Enrollment System**: Accept applications
- **Waitlists**: Manage demand
- **Public Page**: Discoverable by all users
- **Follower System**: Users can follow schools
- **Notifications**: Blast messages to followers

#### School Admin Panel:
- Manage coaches (add/remove/permissions)
- View all bookings across facility
- Revenue dashboard (all coaches combined)
- Analytics (website visits, conversion rate)
- Settings (branding, contact info, verification)

---

### Module 13: **Notifications & Alerts**

#### Push Notifications:
- Booking confirmed/cancelled
- Session reminder (24hr, 1hr)
- New message
- Coach added notes
- Achievement unlocked
- New follower
- Someone liked/commented on your post
- Payment received (coach)
- Payment due (parent)
- Team invite

#### In-App Notifications:
- Notification center with tabs:
  - All
  - Bookings
  - Social
  - Payments
  - Messages

#### Email Notifications:
- Weekly summary
- Monthly progress report (for players)
- Billing reminders
- Marketing (opt-in)

#### SMS Notifications:
- Session reminders (opt-in)
- Payment confirmations

---

### Module 14: **Reviews & Ratings**

#### Who Can Review:
- Players/parents review coaches (post-session)
- Coaches review players (professionalism, effort)
- Players/parents review schools

#### Rating System:
- 5-star rating
- Written review (optional)
- Categories:
  - Overall
  - Communication
  - Skill development
  - Punctuality
  - Value for money

#### Display:
- Average rating on profile
- Total review count
- Recent reviews (sorted by date/rating)
- Response from coach/school

#### Moderation:
- Report inappropriate reviews
- Verified bookings only (prevent fake reviews)

---

### Module 15: **Admin Panel** (Platform Admin)

#### Features:
- User management (suspend, delete, verify)
- Content moderation (review reported posts/messages)
- Analytics dashboard (platform-wide metrics)
- Revenue tracking (total GMV, commission earned)
- Coach verification (DBS checks, certifications)
- School verification
- Support tickets
- Feature flags (enable/disable features)
- Promotions & marketing campaigns

---

## Technical Architecture

### Frontend (React Native + Expo)

**Current Stack:**
- React Native (Expo)
- Expo Router (file-based routing)
- TypeScript
- React Native Reanimated (animations)

**To Add:**
- **State Management**: Zustand or Redux Toolkit
- **API Client**: React Query + Axios
- **Real-time**: Socket.io client for messaging
- **Forms**: React Hook Form + Zod validation
- **Charts**: Victory Native (for analytics graphs)
- **Calendar**: React Native Calendars
- **Media**: Expo Image Picker, Expo Camera
- **Payments**: Stripe React Native SDK
- **Push Notifications**: Expo Notifications + Firebase Cloud Messaging
- **Maps**: React Native Maps or Mapbox
- **Video Player**: Expo AV

---

### Backend (To Build)

**Recommended Stack:**
- **Framework**: Node.js + Express or NestJS (TypeScript)
- **Database**: PostgreSQL (relational data)
- **Caching**: Redis (sessions, real-time data)
- **File Storage**: AWS S3 or Cloudflare R2
- **Real-time**: Socket.io or Pusher
- **Authentication**: JWT + Refresh Tokens
- **Payments**: Stripe Connect (marketplace)
- **Email**: SendGrid or AWS SES
- **SMS**: Twilio
- **Push Notifications**: Firebase Cloud Messaging
- **Search**: Algolia or Elasticsearch (for user/coach search)
- **Background Jobs**: Bull Queue (for analytics, notifications)

**Alternative (BaaS):**
- **Supabase** (PostgreSQL + Auth + Storage + Realtime)
- **Firebase** (Firestore + Auth + Storage + FCM)

---

### Database Schema (High-Level)

#### Core Tables:

**Users**
- id, role (player/parent/coach/school)
- email, phone, password_hash
- name, avatar, bio
- location (lat/lng, postcode)
- created_at, verified

**Profiles** (extends Users)
- player_profile (age, position, club, level)
- coach_profile (certifications, pricing, specialties)
- parent_profile (children_ids[])
- school_profile (verified, staff_ids[])

**Connections**
- follower_id, following_id (for social graph)

**Posts**
- id, author_id, content, media_urls[]
- likes_count, comments_count
- created_at

**Post_Likes**
- post_id, user_id

**Comments**
- id, post_id, author_id, content

**Bookings**
- id, player_id, coach_id, session_type
- date, start_time, end_time
- status, price, location
- created_at

**Sessions** (completed bookings)
- booking_id, notes, skills_updated
- coach_rating, player_rating
- attendance

**Messages**
- id, conversation_id, sender_id
- content, media_url, type
- read, created_at

**Conversations**
- id, type (dm/group), participants[]
- last_message_at

**Transactions**
- id, payer_id, payee_id, booking_id
- amount, fee, status (pending/completed/refunded)
- stripe_payment_intent_id

**Payouts**
- id, coach_id, amount, status
- stripe_payout_id, created_at

**Availability**
- id, coach_id, day_of_week
- start_time, end_time, recurring

**Availability_Exceptions**
- coach_id, date, blocked (true/false)

**Reviews**
- id, booking_id, reviewer_id, reviewee_id
- rating, comment, created_at

**Teams**
- id, coach_id, name, players[]

**Achievements**
- id, player_id, badge_type, unlocked_at

**Notifications**
- id, user_id, type, content
- read, created_at

**Skills_History**
- id, player_id, skill_name, value (1-10)
- recorded_at, session_id

---

## API Endpoints (REST)

### Auth
- `POST /auth/register` - Sign up
- `POST /auth/login` - Login
- `POST /auth/refresh` - Refresh token
- `POST /auth/logout` - Logout
- `POST /auth/forgot-password` - Send reset email
- `POST /auth/reset-password` - Reset password
- `POST /auth/verify-email` - Verify email

### Users
- `GET /users/:id` - Get profile
- `PATCH /users/:id` - Update profile
- `GET /users/search` - Search users
- `POST /users/:id/follow` - Follow user
- `DELETE /users/:id/follow` - Unfollow

### Posts
- `GET /posts` - Get feed
- `POST /posts` - Create post
- `GET /posts/:id` - Get post
- `DELETE /posts/:id` - Delete post
- `POST /posts/:id/like` - Like post
- `POST /posts/:id/comment` - Comment on post

### Coaches
- `GET /coaches` - Search coaches
- `GET /coaches/:id` - Get coach profile
- `GET /coaches/:id/availability` - Get availability
- `POST /coaches/:id/availability` - Set availability (coach only)
- `GET /coaches/:id/reviews` - Get reviews

### Bookings
- `POST /bookings` - Create booking
- `GET /bookings` - Get my bookings
- `GET /bookings/:id` - Get booking details
- `PATCH /bookings/:id` - Update booking
- `DELETE /bookings/:id` - Cancel booking
- `POST /bookings/:id/notes` - Add session notes (coach)

### Development
- `GET /development/:playerId` - Get development data
- `GET /development/:playerId/sessions` - Session history
- `GET /development/:playerId/skills` - Skills over time
- `GET /development/:playerId/achievements` - Achievements

### Messages
- `GET /conversations` - Get all conversations
- `GET /conversations/:id/messages` - Get messages
- `POST /conversations/:id/messages` - Send message
- `POST /conversations` - Start conversation
- `POST /conversations/:id/read` - Mark as read

### Payments
- `POST /payments/create-intent` - Create payment (Stripe)
- `POST /payments/confirm` - Confirm payment
- `GET /payments/history` - Transaction history
- `POST /payouts/request` - Request withdrawal (coach)
- `GET /payouts/history` - Payout history

### Teams
- `POST /teams` - Create team
- `GET /teams/:id` - Get team
- `POST /teams/:id/invite` - Invite player
- `PATCH /teams/:id` - Update team

### Schools
- `GET /schools` - Search schools
- `GET /schools/:id` - Get school profile
- `POST /schools/:id/programs` - Add program (school admin)
- `GET /schools/:id/events` - Get events

### Notifications
- `GET /notifications` - Get notifications
- `PATCH /notifications/:id/read` - Mark as read
- `POST /notifications/register-token` - Register push token

---

## Security & Privacy

### Authentication:
- JWT access tokens (15min expiry)
- Refresh tokens (30 days, stored httpOnly cookie)
- Password hashing (bcrypt)
- Rate limiting on auth endpoints

### Authorization:
- Role-based access control (RBAC)
- Resource ownership checks
- Parent can access child accounts

### Data Privacy:
- GDPR compliant (right to delete, export)
- Child safety (COPPA compliant for under 13)
- Parent approval for child connections
- DBS checks for coaches (UK)
- Private profiles option

### Payment Security:
- PCI compliant (Stripe handles card data)
- No card details stored on our servers
- 3D Secure for payments

### Content Moderation:
- Report system
- Auto-moderation (profanity filter)
- Manual review queue
- User blocking

---

## Scalability Considerations

### Phase 1 (0-10k users):
- Monolithic backend
- Single PostgreSQL instance
- S3 for media
- Single server

### Phase 2 (10k-100k users):
- Microservices (messaging, payments separate)
- Read replicas for database
- CDN for media (CloudFront)
- Load balancer
- Redis caching

### Phase 3 (100k+ users):
- Kubernetes orchestration
- Database sharding
- Multi-region deployment
- Elasticsearch for search
- Message queue (RabbitMQ)

---

## Success Metrics (KPIs)

### User Engagement:
- Daily Active Users (DAU)
- Monthly Active Users (MAU)
- Session duration
- Posts per user per week
- Messages sent per day

### Marketplace Health:
- Bookings per week
- Average booking value
- Coach utilization rate (% of available slots booked)
- Repeat booking rate
- Cancellation rate

### Financial:
- Gross Merchandise Value (GMV)
- Platform revenue (15% commission)
- Average transaction size
- Payout volume

### Growth:
- Sign-up conversion rate
- User retention (Day 1, 7, 30)
- Viral coefficient (invites sent)
- Coach acquisition rate
- School partnerships

---

## Conclusion

Clubroom is a **comprehensive football social platform** that combines marketplace dynamics (booking, payments) with social networking (feed, profiles, messaging) and educational tracking (development hub, analytics).

**Core Value Propositions:**
- **For Players**: Track development, find great coaches, connect with peers
- **For Parents**: Manage kids' training, monitor progress, pay easily
- **For Coaches**: Grow business, manage clients, earn income
- **For Schools**: Reach more students, showcase programs, manage staff

**Differentiators:**
- Development tracking with data visualization
- Social features (not just transactional)
- Team management built-in
- School integration
- All-in-one platform (no switching between apps)

---

**Next Steps:**
1. Review and approve SDD
2. Prioritize features by sprint
3. Design database schema in detail
4. Create API specification (OpenAPI/Swagger)
5. Begin Sprint 1 development

