import type { Href } from 'expo-router';

import { Routes } from '@/navigation/routes';
import { hasChildren, isAdmin, isCoach } from '@/utils/user-helpers';

type DemoWalkthroughUser = {
  role?: string;
  type?: 'USER' | 'COACH';
  children?: { childId: string; childName: string }[];
  skillLevel?: string;
  isOrganization?: boolean;
  isLive?: boolean;
  isSystemAdmin?: boolean;
};

export interface DemoWalkthroughStep {
  id: string;
  title: string;
  description: string;
  route: Href;
}

export interface DemoWalkthrough {
  id: string;
  title: string;
  subtitle: string;
  steps: DemoWalkthroughStep[];
}

interface DemoWalkthroughOptions {
  user: DemoWalkthroughUser | null | undefined;
  hasChildProfiles?: boolean;
}

export function buildPrimaryDemoWalkthrough(
  options: DemoWalkthroughOptions,
): DemoWalkthrough | null {
  const { user, hasChildProfiles = false } = options;
  if (!user) {
    return null;
  }

  if (isAdmin(user)) {
    return {
      id: 'admin_ops',
      title: 'Admin walkthrough',
      subtitle: 'Check seeded users, invite controls, and system notifications from one support path.',
      steps: [
        {
          id: 'admin_users',
          title: 'Review seeded user coverage',
          description: 'Confirm coach, athlete, and parent roles are present for the walkthrough.',
          route: Routes.HOME_INDEX,
        },
        {
          id: 'admin_invites',
          title: 'Open invite controls',
          description: 'Use the internal invite-code surface for setup and support checks.',
          route: Routes.ADMIN_INVITE_CODES,
        },
        {
          id: 'admin_notifications',
          title: 'Check notification delivery',
          description: 'Verify the seeded operational messages are visible in-app.',
          route: Routes.NOTIFICATIONS,
        },
      ],
    };
  }

  if (isCoach(user)) {
    return {
      id: 'coach_delivery',
      title: 'Coach walkthrough',
      subtitle: 'Move through delivery, completion, and money context without hidden steps.',
      steps: [
        {
          id: 'coach_bookings',
          title: 'Open live bookings',
          description: 'Find a seeded booking and walk the delivery or completion state.',
          route: Routes.BOOKINGS,
        },
        {
          id: 'coach_earnings',
          title: 'Check earnings context',
          description: 'Review org work versus independent work using the current money language.',
          route: Routes.EARNINGS,
        },
        {
          id: 'coach_manage',
          title: 'Review operations surfaces',
          description: 'Jump into staffing and oversight tools when the coach also works inside a club.',
          route: Routes.MANAGE,
        },
      ],
    };
  }

  if (hasChildren(user) || hasChildProfiles) {
    return {
      id: 'family_ops',
      title: 'Family walkthrough',
      subtitle: 'Follow the parent story from family overview to recurring and booking trust.',
      steps: [
        {
          id: 'family_dashboard',
          title: 'Open family overview',
          description: 'Review the seeded children, upcoming sessions, and trust framing.',
          route: Routes.FAMILY,
        },
        {
          id: 'family_recurring',
          title: 'Open recurring plans',
          description: 'Check that weekly plans and generated sessions stay connected.',
          route: Routes.FAMILY_RECURRING,
        },
        {
          id: 'family_bookings',
          title: 'Inspect a live booking',
          description: 'Open booking detail to verify support ownership and delivery outcome copy.',
          route: Routes.BOOKINGS,
        },
      ],
    };
  }

  return {
    id: 'athlete_progress',
    title: 'Athlete walkthrough',
    subtitle: 'Use the seeded development path to move from sessions into goals and badges.',
    steps: [
      {
        id: 'athlete_bookings',
        title: 'Open upcoming sessions',
        description: 'Start with the seeded booking list and next-session context.',
        route: Routes.BOOKINGS,
      },
      {
        id: 'athlete_goals',
        title: 'Review goals',
        description: 'Check that current goals and progress entries tell a coherent training story.',
        route: Routes.GOALS,
      },
      {
        id: 'athlete_badges',
        title: 'Review badges and proof',
        description: 'Confirm the development loop closes with visible progress and recognition.',
        route: Routes.BADGES,
      },
    ],
  };
}

export function buildOwnerDemoWalkthrough(clubId: string): DemoWalkthrough {
  return {
    id: 'owner_ops',
    title: 'Owner walkthrough',
    subtitle: 'Run the seeded org story from risk view into staffing, standards, and finance.',
    steps: [
      {
        id: 'owner_dashboard',
        title: 'Stay on org snapshot',
        description: 'Use this screen as the live top-level view of staffing, support, and finance risk.',
        route: Routes.clubDashboard(clubId),
      },
      {
        id: 'owner_staffing',
        title: 'Open staffing console',
        description: 'Resolve unassigned sessions and verify reassignment behavior on live work.',
        route: Routes.MANAGE_BOOKINGS,
      },
      {
        id: 'owner_standards',
        title: 'Open head coach oversight',
        description: 'Check overdue completion, follow-up, and watch-athlete supervision.',
        route: Routes.MANAGE_HEAD_COACH,
      },
      {
        id: 'owner_finance',
        title: 'Open reconciler view',
        description: 'Review current org obligations without pretending payout rails already exist.',
        route: Routes.EARNINGS,
      },
    ],
  };
}
