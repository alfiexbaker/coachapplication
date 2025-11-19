import {
  AthleteObjective,
  BookingSummary,
  ChatMessage,
  ChatThreadSummary,
  CoachProfile,
  PaymentReminder,
  SessionHistoryEntry,
} from './types';

const coachPhotos = [
  'https://images.unsplash.com/photo-1544717302-de2939b7ef71?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1508174432729-1d8663b438c1?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1521412644187-c49fa049e84d?auto=format&fit=crop&w=800&q=80',
];

export const coachProfiles: CoachProfile[] = [
  {
    id: 'coach-1',
    fullName: 'Maya Ellis',
    primarySport: 'Football',
    sports: ['Football'],
    city: 'Austin',
    state: 'TX',
    distanceMiles: 4.2,
    rating: { average: 4.9, reviewCount: 86 },
    priceRange: { minUsd: 90, maxUsd: 140, unitLabel: 'session' },
    nextAvailability: '2024-03-16T15:00:00Z',
    badges: [
      { id: 'verified', label: 'Background check', tone: 'success' },
      { id: 'pro', label: 'Pro experience' },
    ],
    sessionFormats: ['In-person', 'Small group'],
    shortBio:
      'UEFA B coach building first-touch confidence for wingers and attacking mids with film + GPS data.',
    profilePhotoUrl: coachPhotos[0],
    schoolName: "Maya's High Press Lab",
    footballFocuses: ['Dribbling', 'Finishing', 'Passing'],
    location: { lat: 30.27, lng: -97.74 },
  },
  {
    id: 'coach-2',
    fullName: 'Jordan Vega',
    primarySport: 'Football',
    sports: ['Football'],
    city: 'Dallas',
    state: 'TX',
    distanceMiles: 9.8,
    rating: { average: 4.8, reviewCount: 56 },
    priceRange: { minUsd: 95, maxUsd: 135, unitLabel: 'session' },
    nextAvailability: '2024-03-16T17:30:00Z',
    badges: [
      { id: 'verified', label: 'Background check', tone: 'success' },
      { id: 'ncaa', label: 'NWSL Cup', tone: 'default' },
    ],
    sessionFormats: ['In-person', 'Virtual'],
    shortBio:
      'Former NWSL outside back specializing in defensive IQ, pressing triggers, and transition defending.',
    profilePhotoUrl: coachPhotos[1],
    schoolName: 'North Texas Shield Collective',
    footballFocuses: ['Defending', 'Passing', 'Conditioning'],
    location: { lat: 32.78, lng: -96.8 },
  },
  {
    id: 'coach-3',
    fullName: 'Cam Winters',
    primarySport: 'Football',
    sports: ['Football'],
    city: 'Houston',
    state: 'TX',
    distanceMiles: 11.1,
    rating: { average: 5.0, reviewCount: 42 },
    priceRange: { minUsd: 110, maxUsd: 180, unitLabel: 'session' },
    nextAvailability: '2024-03-17T20:00:00Z',
    badges: [{ id: 'verified', label: 'Background check', tone: 'success' }],
    sessionFormats: ['In-person'],
    shortBio:
      'Goalkeeper academy director layering reaction drills with neuro training and off-season conditioning.',
    profilePhotoUrl: coachPhotos[2],
    schoolName: "Cam's Safe Hands Lab",
    footballFocuses: ['Goalkeeping', 'Conditioning', 'Passing'],
    location: { lat: 29.76, lng: -95.36 },
  },
];

export const upcomingBookings: BookingSummary[] = [
  {
    id: 'booking-1',
    coachName: 'Maya Ellis',
    childName: 'Eli',
    service: 'Elite Finishing Session',
    start: '2024-03-18T15:30:00Z',
    status: 'Confirmed',
    locationLabel: 'Austin Sports Academy',
  },
  {
    id: 'booking-2',
    coachName: 'Jordan Vega',
    childName: 'Ivy',
    service: 'Ball-Handling Intensive',
    start: '2024-03-21T00:30:00Z',
    status: 'Pending',
    locationLabel: 'Dallas Elite Gym',
  },
];

export const chatThreads: ChatThreadSummary[] = [
  {
    id: 'chat-thread-1',
    bookingId: 'booking-1',
    coachName: 'Maya Ellis',
    childName: 'Eli',
    serviceName: 'Elite Finishing Session',
    location: 'Austin Sports Academy · Pitch 2',
    scheduledFor: '2024-03-18T15:30:00Z',
    unreadCount: 2,
    safetyCopy: 'Chats unlock once a booking is confirmed. Moderation + read receipts keep families protected.',
    pinnedObjectives: ['Dribbling', 'Finishing'],
  },
  {
    id: 'chat-thread-2',
    bookingId: 'booking-2',
    coachName: 'Jordan Vega',
    childName: 'Eli',
    serviceName: 'Passing Masterclass',
    location: 'Dallas FC Complex',
    scheduledFor: '2024-03-20T10:00:00Z',
    unreadCount: 0,
    safetyCopy: '',
    pinnedObjectives: ['Passing'],
  },
  {
    id: 'chat-thread-3',
    bookingId: 'booking-3',
    coachName: 'Alex Chen',
    childName: 'Eli',
    serviceName: 'GK Positioning Clinic',
    location: 'Elite Sports Park',
    scheduledFor: '2024-03-22T16:00:00Z',
    unreadCount: 1,
    safetyCopy: '',
    pinnedObjectives: ['Goalkeeping'],
  },
];

export const primaryChatThread: ChatThreadSummary = chatThreads[0];

export const chatMessages: ChatMessage[] = [
  {
    id: 'msg-1',
    sender: 'coach',
    body: 'Hey team! Pumped to work with Eli again. Drop any updates from the last match?',
    createdAt: '2024-03-15T14:02:00Z',
    status: 'seen',
  },
  {
    id: 'msg-2',
    sender: 'parent',
    body: 'He’s still buzzing from districts. We want to sharpen first-touch + composure under pressure.',
    createdAt: '2024-03-15T14:05:00Z',
    status: 'seen',
  },
  {
    id: 'msg-3',
    sender: 'coach',
    body: 'Love it. I’ll set up a rondo ladder + finishing gauntlet. Sharing the prep doc now.',
    createdAt: '2024-03-15T14:08:00Z',
    status: 'seen',
    attachments: [
      {
        id: 'att-1',
        type: 'pdf',
        title: 'Session blueprint · Match sharpness',
        subtitle: 'PDF · 2.1 MB',
      },
    ],
  },
  {
    id: 'msg-4',
    sender: 'parent',
    body: 'Legend. Eli will hydrate + arrive 15 early. Need anything signed ahead of time?',
    createdAt: '2024-03-15T14:10:00Z',
    status: 'seen',
  },
  {
    id: 'msg-5',
    sender: 'coach',
    body: 'All set. I’ll push footage + progress tags here after the session so you can log it in the performance hub.',
    createdAt: '2024-03-15T14:11:00Z',
    status: 'delivered',
  },
  {
    id: 'msg-6',
    sender: 'parent',
    body: 'Perfect—thanks Maya!',
    createdAt: '2024-03-15T14:11:45Z',
    status: 'sent',
  },
];

export const activeObjectives: AthleteObjective[] = [
  {
    id: 'obj-1',
    label: 'Dribbling',
    status: 'active',
    updatedAt: '2024-03-14T16:00:00Z',
    note: 'Beat defenders 1v1 on the wing',
  },
  {
    id: 'obj-2',
    label: 'Passing',
    status: 'active',
    updatedAt: '2024-03-12T16:00:00Z',
    note: 'Switch the field under pressure',
  },
  {
    id: 'obj-3',
    label: 'Defending',
    status: 'upcoming',
    updatedAt: '2024-03-10T16:00:00Z',
    note: 'Body shape when jockeying',
  },
];

export const sessionHistory: SessionHistoryEntry[] = [
  {
    id: 'session-1',
    date: '2024-03-11T15:30:00Z',
    coachName: 'Maya Ellis',
    focus: 'Finishing',
    location: 'Austin Sports Academy · Pitch 2',
    highlight: 'Tied finishing gauntlet personal best (8/10).',
    resultBadge: 'Hat-trick ready',
    clipLabel: 'Finishing drill clips',
  },
  {
    id: 'session-2',
    date: '2024-03-04T15:30:00Z',
    coachName: 'Jordan Vega',
    focus: 'Defending',
    location: 'North Texas Shield Collective',
    highlight: 'Mastered 1v1 delay + angled pressing cues.',
  },
  {
    id: 'session-3',
    date: '2024-02-26T15:30:00Z',
    coachName: 'Cam Winters',
    focus: 'Conditioning',
    location: "Cam's Safe Hands Lab",
    highlight: 'VO2 drills logged, recovery HR down 8 bpm.',
  },
];

export const paymentReminders: PaymentReminder[] = [
  {
    id: 'payment-1',
    title: '4-pack of finishing sessions',
    amountUsd: 520,
    dueDate: '2024-03-20T15:00:00Z',
    status: 'pending',
    description: 'Auto-captures after the March 18th session unless cancelled 24h prior.',
  },
  {
    id: 'payment-2',
    title: 'Cam’s Safe Hands Lab drop-in',
    amountUsd: 150,
    dueDate: '2024-03-24T18:00:00Z',
    status: 'placeholder',
    description: 'Stripe Connect onboarding gated, but the slot is reserved.',
  },
  {
    id: 'payment-3',
    title: 'Shield Collective defensive clinic',
    amountUsd: 260,
    dueDate: '2024-03-12T15:00:00Z',
    status: 'paid',
    description: 'Captured with card ending in ··42. Receipt emailed.',
  },
];
