import type { ClubActivity } from '@/constants/types';

export type ClubScheduleFilter =
  | 'all'
  | 'upcoming'
  | 'completed'
  | 'events'
  | 'training'
  | 'matches';

export interface ClubScheduleDayGroup {
  key: string;
  title: string;
  items: ClubActivity[];
}

function formatActivityPrice(price?: number, currency: string = 'GBP'): string {
  if (price == null || price <= 0) {
    return 'Free';
  }

  try {
    return price.toLocaleString('en-GB', {
      style: 'currency',
      currency,
      maximumFractionDigits: price % 1 === 0 ? 0 : 2,
    });
  } catch {
    return `${currency} ${price}`;
  }
}

export function getClubActivityPrimaryLabel(activity: ClubActivity): string {
  switch (activity.source) {
    case 'club_event':
      return activity.participationLabel;
    case 'group_session':
      return formatActivityPrice(activity.price, activity.currency);
    case 'match':
      return activity.homeAwayLabel ?? activity.typeLabel;
  }
}

export function getClubActivitySourceLabel(activity: ClubActivity): string {
  switch (activity.source) {
    case 'club_event':
      return 'Event';
    case 'group_session':
      return 'Training session';
    case 'match':
      return 'Match';
  }
}

function isUpcomingActivity(activity: ClubActivity, now: Date): boolean {
  if (activity.status === 'completed' || activity.status === 'cancelled') {
    return false;
  }
  return new Date(activity.startsAt).getTime() >= now.getTime();
}

function isCompletedActivity(activity: ClubActivity, now: Date): boolean {
  if (activity.status === 'completed') {
    return true;
  }
  return activity.status !== 'cancelled' && new Date(activity.startsAt).getTime() < now.getTime();
}

function sortActivitiesForFilter(
  activities: ClubActivity[],
  filter: ClubScheduleFilter,
  now: Date,
): ClubActivity[] {
  if (filter === 'completed') {
    return Array.from(activities).toSorted(
      (left, right) => new Date(right.startsAt).getTime() - new Date(left.startsAt).getTime(),
    );
  }

  if (filter === 'all') {
    const upcoming = activities
      .filter((activity) => isUpcomingActivity(activity, now))
      .toSorted(
        (left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
      );
    const completed = activities
      .filter((activity) => isCompletedActivity(activity, now))
      .toSorted(
        (left, right) => new Date(right.startsAt).getTime() - new Date(left.startsAt).getTime(),
      );
    const cancelled = activities
      .filter((activity) => activity.status === 'cancelled')
      .toSorted(
        (left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
      );
    return [...upcoming, ...completed, ...cancelled];
  }

  return Array.from(activities).toSorted(
    (left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
  );
}

export function filterClubScheduleActivities(
  activities: ClubActivity[],
  filter: ClubScheduleFilter,
  now: Date = new Date(),
): ClubActivity[] {
  const filtered = activities.filter((activity) => {
    switch (filter) {
      case 'all':
        return true;
      case 'upcoming':
        return isUpcomingActivity(activity, now);
      case 'completed':
        return isCompletedActivity(activity, now);
      case 'events':
        return activity.source === 'club_event';
      case 'training':
        return activity.source === 'group_session';
      case 'matches':
        return activity.source === 'match';
    }
  });

  return sortActivitiesForFilter(filtered, filter, now);
}

export function groupClubScheduleActivitiesByDay(
  activities: ClubActivity[],
): ClubScheduleDayGroup[] {
  const groups = new Map<string, ClubActivity[]>();

  activities.forEach((activity) => {
    const key = activity.startsAt.slice(0, 10);
    const existing = groups.get(key) ?? [];
    existing.push(activity);
    groups.set(key, existing);
  });

  return Array.from(groups.entries()).map(([key, items]) => ({
    key,
    title: new Date(`${key}T12:00:00`).toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }),
    items,
  }));
}
