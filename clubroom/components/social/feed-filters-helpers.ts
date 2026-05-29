import type { FeedFilter } from './feed-filters';

export const FEED_FILTERS: { key: FeedFilter; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: 'grid-outline' },
  { key: 'session_announcement', label: 'Sessions', icon: 'fitness-outline' },
  { key: 'announcement', label: 'Announcements', icon: 'megaphone-outline' },
  { key: 'achievement', label: 'Achievements', icon: 'trophy-outline' },
  { key: 'photo', label: 'Photos', icon: 'images-outline' },
  { key: 'video', label: 'Videos', icon: 'videocam-outline' },
  { key: 'event', label: 'Events', icon: 'calendar-outline' },
];
