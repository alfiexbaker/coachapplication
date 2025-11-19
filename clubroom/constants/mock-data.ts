import { BookingSummary, ChatMessage, ChatThreadSummary, CoachProfile } from './types';

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
    primarySport: 'Soccer',
    sports: ['Soccer'],
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
    shortBio: 'USSF A License coach with MLS academy pedigree focusing on elite attacking play.',
    profilePhotoUrl: coachPhotos[0],
    location: { lat: 30.27, lng: -97.74 },
  },
  {
    id: 'coach-2',
    fullName: 'Jordan Vega',
    primarySport: 'Basketball',
    sports: ['Basketball'],
    city: 'Dallas',
    state: 'TX',
    distanceMiles: 9.8,
    rating: { average: 4.8, reviewCount: 56 },
    priceRange: { minUsd: 75, maxUsd: 120, unitLabel: 'session' },
    nextAvailability: '2024-03-16T17:30:00Z',
    badges: [
      { id: 'verified', label: 'Background check', tone: 'success' },
      { id: 'ncaa', label: 'NCAA Champ' },
    ],
    sessionFormats: ['In-person', 'Virtual'],
    shortBio: 'Former D1 guard bringing precision ball-handling progressions and leadership training.',
    profilePhotoUrl: coachPhotos[1],
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
    shortBio: 'QB mechanics coach using film breakdown and wearable sensors for HS + collegiate talent.',
    profilePhotoUrl: coachPhotos[2],
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

export const primaryChatThread: ChatThreadSummary = {
  id: 'chat-thread-1',
  bookingId: 'booking-1',
  coachName: 'Maya Ellis',
  childName: 'Eli',
  serviceName: 'Elite Finishing Session',
  location: 'Austin Sports Academy · Pitch 2',
  scheduledFor: '2024-03-18T15:30:00Z',
  unreadCount: 2,
  safetyCopy: 'Chats unlock once a booking is confirmed. Moderation + read receipts keep families protected.',
};

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
