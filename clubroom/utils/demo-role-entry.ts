type DemoRoleUser = {
  username: string;
  password: string;
  role: string;
  fullName?: string;
  name?: string;
  children?: unknown[];
  hasChildren?: boolean;
  isOrganization?: boolean;
  isSystemAdmin?: boolean;
};

export interface DemoRoleEntry {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  username: string;
  password: string;
  roleLabel: string;
}

interface RoleEntryDefinition {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  usernames: string[];
  match: (user: DemoRoleUser) => boolean;
}

const ROLE_ENTRY_DEFINITIONS: RoleEntryDefinition[] = [
  {
    id: 'coach_delivery',
    title: 'Coach Delivery',
    subtitle: 'Completion, notes, and follow-up',
    description: 'Start in the coach runtime with live delivery, manage, and earnings flows.',
    usernames: ['coach1'],
    match: (user) => user.role === 'COACH' && !user.isOrganization,
  },
  {
    id: 'family_parent',
    title: 'Family Parent',
    subtitle: 'Bookings, recurring plans, and trust',
    description: 'Enter as a parent with children, bookings, and family operations already seeded.',
    usernames: ['parent1'],
    match: (user) =>
      user.role === 'USER' &&
      (Boolean(user.hasChildren) || (user.children?.length ?? 0) > 0),
  },
  {
    id: 'athlete_progress',
    title: 'Athlete Progress',
    subtitle: 'Goals, badges, and development',
    description: 'Open the athlete-style path with seeded progress, feedback, and development context.',
    usernames: ['athlete1', 'user1'],
    match: (user) =>
      user.role === 'USER' &&
      !user.isSystemAdmin &&
      !user.isOrganization &&
      !user.hasChildren &&
      (user.children?.length ?? 0) === 0,
  },
  {
    id: 'admin_ops',
    title: 'Admin Ops',
    subtitle: 'Users, controls, and audit paths',
    description: 'Use the internal admin surface for seeded operational and moderation workflows.',
    usernames: ['admin1', 'admin'],
    match: (user) => user.role === 'ADMIN' || Boolean(user.isSystemAdmin),
  },
];

export function buildDemoRoleEntries(users: DemoRoleUser[]): DemoRoleEntry[] {
  return ROLE_ENTRY_DEFINITIONS.map((definition) => {
    const exactMatch = definition.usernames
      .map((username) => users.find((user) => user.username.toLowerCase() === username.toLowerCase()))
      .find(Boolean);
    const matchedUser = exactMatch ?? users.find(definition.match);

    if (!matchedUser) {
      return null;
    }

    return {
      id: definition.id,
      title: definition.title,
      subtitle: definition.subtitle,
      description: definition.description,
      username: matchedUser.username,
      password: matchedUser.password,
      roleLabel: matchedUser.role,
    } satisfies DemoRoleEntry;
  }).filter((entry): entry is DemoRoleEntry => Boolean(entry));
}
