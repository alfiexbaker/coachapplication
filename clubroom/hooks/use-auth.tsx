import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { CoachSignupData } from '@/components/auth/coach-signup-screen';
import type { User } from '@/constants/app-types';
import type { ChildReference, StaffMember } from '@/constants/types';
import type { UserRole, SimplifiedUserType } from '@/constants/user-types';
import type { OnboardingData, AccountType, UserProfile } from '@/services/auth-service';
import { authService } from '@/services/auth-service';
import { apiClient } from '@/services/api-client';
import { ensureCoachSessionsSeeded } from '@/services/coach-session-seed-service';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { generateId } from '@/utils/generate-id';
import { createLogger } from '@/utils/logger';
import { api as apiConfig } from '@/constants/config';

const logger = createLogger('useAuth');

export type { UserRole, SimplifiedUserType };

type DemoUser = Omit<User, 'role'> & {
  role: UserRole;
  username: string;
  password: string;
  fullName?: string;
  bio?: string;
  addressLine?: string;
  schoolId?: string;
  schoolName?: string;
  // Simplified user type fields
  type?: SimplifiedUserType;
  // For USER type - optional children (for booking on behalf of kids)
  children?: ChildReference[];
  hasChildren?: boolean;
  childrenCount?: number;
  // For USER type - athlete properties
  skillLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'ELITE';
  position?: string;
  // For COACH type - organization properties
  isOrganization?: boolean;
  organizationName?: string;
  staffMembers?: StaffMember[];
  // For COACH type - availability
  isLive?: boolean;
  liveStatusReason?: string;
  // Admin flag
  isSystemAdmin?: boolean;
};

// Map mock users to demo users with passwords
// Updated with simplified user type system fields
const DEMO_USERS: DemoUser[] = [
  // Coaches (Individual)
  {
    id: 'coach1',
    username: 'coach1',
    password: 'coach',
    role: 'COACH',
    type: 'COACH',
    fullName: 'Jess Okafor',
    email: 'jess.okafor@coach.com',
    postcode: 'SW1A 1AA',
    name: 'Jess Okafor',
    dateOfBirth: '1988-03-15',
    isOrganization: false,
    isLive: true,
  },
  {
    id: 'coach2',
    username: 'coach2',
    password: 'coach',
    role: 'COACH',
    type: 'COACH',
    fullName: 'Reuben Carr',
    email: 'reuben.carr@coach.com',
    postcode: 'SW1A 2AA',
    name: 'Reuben Carr',
    dateOfBirth: '1985-07-22',
    isOrganization: false,
    isLive: true,
  },
  {
    id: 'coach3',
    username: 'coach3',
    password: 'coach',
    role: 'COACH',
    type: 'COACH',
    fullName: 'Aiden Sharma',
    email: 'aiden.sharma@coach.com',
    postcode: 'SW2A 1BB',
    name: 'Aiden Sharma',
    dateOfBirth: '1990-11-08',
    isOrganization: false,
    isLive: false,
    liveStatusReason: 'On vacation until February',
  },
  {
    id: 'coach4',
    username: 'coach4',
    password: 'coach',
    role: 'COACH',
    type: 'COACH',
    fullName: 'Maya Collins',
    email: 'maya.collins@coach.com',
    postcode: 'SE16 4LT',
    name: 'Maya Collins',
    dateOfBirth: '1989-04-03',
    isOrganization: false,
    isLive: true,
  },
  {
    id: 'coach5',
    username: 'coach5',
    password: 'coach',
    role: 'COACH',
    type: 'COACH',
    fullName: 'Elliot Hayes',
    email: 'elliot.hayes@coach.com',
    postcode: 'NW8 6QX',
    name: 'Elliot Hayes',
    dateOfBirth: '1987-12-18',
    isOrganization: false,
    isLive: true,
  },
  {
    id: 'coach6',
    username: 'coach6',
    password: 'coach',
    role: 'COACH',
    type: 'COACH',
    fullName: 'Nina Duarte',
    email: 'nina.duarte@coach.com',
    postcode: 'E14 9PT',
    name: 'Nina Duarte',
    dateOfBirth: '1992-06-11',
    isOrganization: false,
    isLive: true,
  },
  {
    id: 'coach7',
    username: 'coach7',
    password: 'coach',
    role: 'COACH',
    type: 'COACH',
    fullName: 'Omar Patel',
    email: 'omar.patel@coach.com',
    postcode: 'N16 8JN',
    name: 'Omar Patel',
    dateOfBirth: '1986-02-09',
    isOrganization: false,
    isLive: true,
  },
  {
    id: 'coach8',
    username: 'coach8',
    password: 'coach',
    role: 'COACH',
    type: 'COACH',
    fullName: 'Harriet Lowe',
    email: 'harriet.lowe@coach.com',
    postcode: 'W3 8UP',
    name: 'Harriet Lowe',
    dateOfBirth: '1991-09-27',
    isOrganization: false,
    isLive: false,
    liveStatusReason: 'Limited slots while running club trials',
  },
  // Coach (Organization)
  {
    id: 'academy1',
    username: 'academy',
    password: 'academy',
    role: 'COACH',
    type: 'COACH',
    fullName: 'Southgate Academy',
    email: 'contact@southgateacademy.com',
    postcode: 'SW1A 5AA',
    name: 'Southgate Academy',
    dateOfBirth: '2015-01-01',
    isOrganization: true,
    organizationName: 'Southgate Academy',
    isLive: true,
    staffMembers: [
      {
        userId: 'coach1',
        userName: 'Jess Okafor',
        role: 'HEAD_COACH',
        permissions: [
          'MANAGE_BOOKINGS',
          'MANAGE_ROSTER',
          'AWARD_BADGES',
          'VIEW_EARNINGS',
          'POST_AS_COACH',
        ],
        joinedAt: '2020-03-15',
        isActive: true,
      },
      {
        userId: 'coach2',
        userName: 'Reuben Carr',
        role: 'COACH',
        permissions: ['MANAGE_BOOKINGS', 'AWARD_BADGES', 'POST_AS_COACH'],
        joinedAt: '2021-06-10',
        isActive: true,
      },
    ],
  },
  // Users (Athletes)
  {
    id: 'user1',
    username: 'user1',
    password: 'user',
    role: 'USER',
    type: 'USER',
    fullName: 'Alfie Barton',
    email: 'alfie.barton@email.com',
    postcode: 'SW1A 3CC',
    name: 'Alfie Barton',
    dateOfBirth: '2008-05-12',
    skillLevel: 'INTERMEDIATE',
    position: 'Midfielder',
    hasChildren: false,
    children: [],
  },
  {
    id: 'user2',
    username: 'user2',
    password: 'user',
    role: 'USER',
    type: 'USER',
    fullName: 'Maisie Barton',
    email: 'maisie.barton@email.com',
    postcode: 'SW1A 3CC',
    name: 'Maisie Barton',
    dateOfBirth: '2009-08-20',
    skillLevel: 'BEGINNER',
    position: 'Striker',
  },
  {
    id: 'user3',
    username: 'user3',
    password: 'user',
    role: 'USER',
    type: 'USER',
    fullName: 'Kai Mensah',
    email: 'kai.mensah@email.com',
    postcode: 'SW2A 4DD',
    name: 'Kai Mensah',
    dateOfBirth: '2007-01-05',
    skillLevel: 'ADVANCED',
    position: 'Goalkeeper',
  },
  // Users with children (can book for their kids)
  {
    id: 'user4',
    username: 'parent1',
    password: 'user',
    role: 'USER',
    type: 'USER',
    fullName: 'Chris Barton',
    email: 'chris.barton@email.com',
    postcode: 'SW1A 3CC',
    name: 'Chris Barton',
    dateOfBirth: '1980-02-11',
    children: [
      {
        childId: 'user1',
        childName: 'Alfie Barton',
        relationshipType: 'PARENT_CHILD',
        addedAt: '2020-01-01',
      },
      {
        childId: 'user2',
        childName: 'Maisie Barton',
        relationshipType: 'PARENT_CHILD',
        addedAt: '2020-01-01',
      },
      {
        childId: 'child_user1_a',
        childName: 'Freya Barton',
        relationshipType: 'PARENT_CHILD',
        addedAt: '2024-01-01',
      },
      {
        childId: 'child_user1_b',
        childName: 'Luca Barton',
        relationshipType: 'PARENT_CHILD',
        addedAt: '2024-01-01',
      },
    ],
  },
  {
    id: 'user5',
    username: 'parent2',
    password: 'user',
    role: 'USER',
    type: 'USER',
    fullName: 'Nadia Mensah',
    email: 'nadia.mensah@email.com',
    postcode: 'SW2A 4DD',
    name: 'Nadia Mensah',
    dateOfBirth: '1983-09-07',
    children: [
      {
        childId: 'user3',
        childName: 'Kai Mensah',
        relationshipType: 'PARENT_CHILD',
        addedAt: '2020-01-01',
      },
    ],
  },
  // User who is both an athlete AND has children
  {
    id: 'user6',
    username: 'athleteparent',
    password: 'user',
    role: 'USER',
    type: 'USER',
    fullName: 'Dan Mensah',
    email: 'dan.mensah@email.com',
    postcode: 'SW2A 4DD',
    name: 'Dan Mensah',
    dateOfBirth: '1990-06-15',
    skillLevel: 'BEGINNER', // Also an athlete
    position: 'Defender',
    children: [
      {
        childId: 'user3',
        childName: 'Kai Mensah',
        relationshipType: 'PARENT_CHILD',
        addedAt: '2020-01-01',
      },
    ],
  },
  {
    id: 'athlete_4',
    username: 'athlete4',
    password: 'user',
    role: 'USER',
    type: 'USER',
    fullName: 'Priya Kapoor',
    email: 'priya.kapoor@email.com',
    postcode: 'E2 8AA',
    name: 'Priya Kapoor',
    dateOfBirth: '2010-03-10',
    skillLevel: 'INTERMEDIATE',
    position: 'Defender',
  },
  {
    id: 'athlete_5',
    username: 'athlete5',
    password: 'user',
    role: 'USER',
    type: 'USER',
    fullName: 'Finley Reeves',
    email: 'finley.reeves@email.com',
    postcode: 'E2 8AA',
    name: 'Finley Reeves',
    dateOfBirth: '2011-09-02',
    skillLevel: 'BEGINNER',
    position: 'Midfielder',
  },
  {
    id: 'athlete_6',
    username: 'athlete6',
    password: 'user',
    role: 'USER',
    type: 'USER',
    fullName: 'Jayden Osei',
    email: 'jayden.osei@email.com',
    postcode: 'N7 0DP',
    name: 'Jayden Osei',
    dateOfBirth: '2010-07-13',
    skillLevel: 'INTERMEDIATE',
    position: 'Winger',
  },
  {
    id: 'athlete_7',
    username: 'athlete7',
    password: 'user',
    role: 'USER',
    type: 'USER',
    fullName: 'Marcus Osei',
    email: 'marcus.osei@email.com',
    postcode: 'N7 0DP',
    name: 'Marcus Osei',
    dateOfBirth: '2011-02-24',
    skillLevel: 'INTERMEDIATE',
    position: 'Defender',
  },
  {
    id: 'athlete_8',
    username: 'athlete8',
    password: 'user',
    role: 'USER',
    type: 'USER',
    fullName: 'Zara Hussain',
    email: 'zara.hussain@email.com',
    postcode: 'E10 4LA',
    name: 'Zara Hussain',
    dateOfBirth: '2010-11-03',
    skillLevel: 'INTERMEDIATE',
    position: 'Midfielder',
  },
  {
    id: 'athlete_9',
    username: 'athlete9',
    password: 'user',
    role: 'USER',
    type: 'USER',
    fullName: 'Ollie Nguyen',
    email: 'ollie.nguyen@email.com',
    postcode: 'SE10 9AB',
    name: 'Ollie Nguyen',
    dateOfBirth: '2010-04-21',
    skillLevel: 'INTERMEDIATE',
    position: 'Winger',
  },
  {
    id: 'athlete_10',
    username: 'athlete10',
    password: 'user',
    role: 'USER',
    type: 'USER',
    fullName: 'Tia Nguyen',
    email: 'tia.nguyen@email.com',
    postcode: 'SE10 9AB',
    name: 'Tia Nguyen',
    dateOfBirth: '2011-09-14',
    skillLevel: 'INTERMEDIATE',
    position: 'Attacking Midfielder',
  },
  {
    id: 'child_user1_a',
    username: 'user1kid1',
    password: 'user',
    role: 'USER',
    type: 'USER',
    fullName: 'Freya Barton',
    email: 'freya.barton@email.com',
    postcode: 'SW1A 3CC',
    name: 'Freya Barton',
    dateOfBirth: '2013-04-06',
    skillLevel: 'BEGINNER',
    position: 'Winger',
  },
  {
    id: 'child_user1_b',
    username: 'user1kid2',
    password: 'user',
    role: 'USER',
    type: 'USER',
    fullName: 'Luca Barton',
    email: 'luca.barton@email.com',
    postcode: 'SW1A 3CC',
    name: 'Luca Barton',
    dateOfBirth: '2012-10-23',
    skillLevel: 'INTERMEDIATE',
    position: 'Defender',
  },
  {
    id: 'user_no_kids',
    username: 'usernokids',
    password: 'user',
    role: 'USER',
    type: 'USER',
    fullName: 'Mason Clarke',
    email: 'mason.clarke@email.com',
    postcode: 'W8 4AP',
    name: 'Mason Clarke',
    dateOfBirth: '1995-08-19',
    skillLevel: 'BEGINNER',
    position: 'Midfielder',
  },
  {
    id: 'user_club_linked',
    username: 'clubmember',
    password: 'user',
    role: 'USER',
    type: 'USER',
    fullName: 'Leah Ford',
    email: 'leah.ford@email.com',
    postcode: 'N5 2RT',
    name: 'Leah Ford',
    dateOfBirth: '1991-01-31',
    children: [],
  },
  {
    id: 'parent_nokids',
    username: 'parentnokids',
    password: 'user',
    role: 'USER',
    type: 'USER',
    fullName: 'Ava Cole',
    email: 'ava.cole@email.com',
    postcode: 'E3 5QN',
    name: 'Ava Cole',
    dateOfBirth: '1988-07-05',
    hasChildren: false,
    children: [],
  },
  {
    id: 'parent_3',
    username: 'parent3',
    password: 'user',
    role: 'USER',
    type: 'USER',
    fullName: 'Anita Kapoor',
    email: 'anita.kapoor@email.com',
    postcode: 'E2 8AA',
    name: 'Anita Kapoor',
    dateOfBirth: '1984-04-18',
    children: [
      {
        childId: 'athlete_4',
        childName: 'Priya Kapoor',
        relationshipType: 'PARENT_CHILD',
        addedAt: '2021-01-01',
      },
    ],
  },
  {
    id: 'parent_4',
    username: 'parent4',
    password: 'user',
    role: 'USER',
    type: 'USER',
    fullName: 'Steve Reeves',
    email: 'steve.reeves@email.com',
    postcode: 'E2 8AA',
    name: 'Steve Reeves',
    dateOfBirth: '1981-12-04',
    children: [
      {
        childId: 'athlete_5',
        childName: 'Finley Reeves',
        relationshipType: 'PARENT_CHILD',
        addedAt: '2021-01-01',
      },
    ],
  },
  {
    id: 'parent_5',
    username: 'parent5',
    password: 'user',
    role: 'USER',
    type: 'USER',
    fullName: 'Vanessa Osei',
    email: 'vanessa.osei@email.com',
    postcode: 'N7 0DP',
    name: 'Vanessa Osei',
    dateOfBirth: '1986-06-29',
    children: [
      {
        childId: 'athlete_6',
        childName: 'Jayden Osei',
        relationshipType: 'PARENT_CHILD',
        addedAt: '2022-01-01',
      },
      {
        childId: 'athlete_7',
        childName: 'Marcus Osei',
        relationshipType: 'PARENT_CHILD',
        addedAt: '2022-01-01',
      },
    ],
  },
  {
    id: 'parent_6',
    username: 'parent6',
    password: 'user',
    role: 'USER',
    type: 'USER',
    fullName: 'Tariq Hussain',
    email: 'tariq.hussain@email.com',
    postcode: 'E10 4LA',
    name: 'Tariq Hussain',
    dateOfBirth: '1982-10-17',
    children: [
      {
        childId: 'athlete_8',
        childName: 'Zara Hussain',
        relationshipType: 'PARENT_CHILD',
        addedAt: '2022-06-01',
      },
    ],
  },
  {
    id: 'parent_7',
    username: 'parent7',
    password: 'user',
    role: 'USER',
    type: 'USER',
    fullName: 'Linh Nguyen',
    email: 'linh.nguyen@email.com',
    postcode: 'SE10 9AB',
    name: 'Linh Nguyen',
    dateOfBirth: '1987-01-14',
    children: [
      {
        childId: 'athlete_9',
        childName: 'Ollie Nguyen',
        relationshipType: 'PARENT_CHILD',
        addedAt: '2022-07-01',
      },
      {
        childId: 'athlete_10',
        childName: 'Tia Nguyen',
        relationshipType: 'PARENT_CHILD',
        addedAt: '2022-07-01',
      },
    ],
  },
  // Admin (System flag on a USER)
  {
    id: 'admin',
    username: 'admin',
    password: 'admin',
    role: 'ADMIN',
    type: 'USER',
    fullName: 'Admin User',
    email: 'admin@coach.com',
    postcode: 'SW1A 1AA',
    name: 'Admin User',
    dateOfBirth: '1985-01-01',
    isSystemAdmin: true,
    children: [],
  },
];

const API_DEV_USERS: DemoUser[] = [
  {
    id: 'usr_65972cc3-8f9b-7199-b867-7df5b7faf34b',
    username: 'coach1',
    password: 'coach',
    role: 'COACH',
    type: 'COACH',
    fullName: 'Amelia Shaw',
    name: 'Amelia Shaw',
    email: 'amelia.shaw@clubroom.demo',
    postcode: 'SW1A 1AA',
    dateOfBirth: '2001-07-12',
    isLive: true,
  },
  {
    id: 'usr_197727c3-a2c5-7868-8c57-72b09c97a1d6',
    username: 'parent1',
    password: 'user',
    role: 'USER',
    type: 'USER',
    fullName: 'Olivia Barton',
    name: 'Olivia Barton',
    email: 'olivia.barton@clubroom.demo',
    postcode: 'SW1A 1AA',
    dateOfBirth: '1987-03-18',
    hasChildren: true,
  },
  {
    id: 'usr_b5998f06-1720-7001-bb01-8d3c253de429',
    username: 'athlete1',
    password: 'user',
    role: 'USER',
    type: 'USER',
    fullName: 'Alex Barton',
    name: 'Alex Barton',
    email: 'alex.barton@clubroom.demo',
    postcode: 'SW1A 1AA',
    dateOfBirth: '2011-02-18',
  },
  {
    id: 'usr_ef3f51b6-47e4-7036-bfdd-d80b40324559',
    username: 'admin1',
    password: 'admin',
    role: 'ADMIN',
    type: 'USER',
    fullName: 'Clara Finch',
    name: 'Clara Finch',
    email: 'clara.finch@clubroom.demo',
    postcode: 'N5 2RT',
    dateOfBirth: '1984-04-17',
    isSystemAdmin: true,
  },
];

function resolveApiLoginEmail(identifier: string): string {
  const normalized = identifier.trim().toLowerCase();
  if (normalized.includes('@')) {
    return normalized;
  }
  const match = API_DEV_USERS.find((user) => user.username.toLowerCase() === normalized);
  return match?.email?.toLowerCase() ?? normalized;
}

function mapAuthProfileToDemoUser(user: UserProfile, password = ''): DemoUser {
  const fullName = `${user.firstName} ${user.lastName}`.trim();
  const normalizedRoles = user.roles ?? [];
  const derivedRole: UserRole =
    user.appRole === 'ADMIN'
      ? 'ADMIN'
      : user.appRole === 'COACH'
        ? 'COACH'
        : 'USER';

  return {
    id: user.id,
    username: user.email.split('@')[0]?.toLowerCase() || user.id,
    password,
    role: derivedRole,
    type: derivedRole === 'COACH' ? 'COACH' : 'USER',
    fullName,
    name: fullName,
    email: user.email,
    postcode: user.postcode || '',
    dateOfBirth: user.dateOfBirth || '1990-01-01',
    avatar: user.photoUrl,
    addressLine: user.addressLine,
    children: user.children,
    hasChildren: user.hasChildren ?? (user.childrenCount ?? 0) > 0,
    childrenCount: user.childrenCount,
    skillLevel: user.skillLevel,
    position: user.position,
    isOrganization: user.isOrganization,
    organizationName: user.organizationName,
    isLive: user.isLive,
    bio: user.bio,
    isSystemAdmin: normalizedRoles.includes('club_admin') || normalizedRoles.includes('security_admin'),
  };
}

function mapDemoUserToUserRecord(user: DemoUser): User {
  return {
    id: user.id,
    email: user.email || `${user.username}@demo.clubroom.app`,
    role: user.role,
    name: user.name || user.fullName || user.username,
    avatar: user.avatar,
    postcode: user.postcode || '',
    dateOfBirth: user.dateOfBirth || '1990-01-01',
  };
}

type AuthContextValue = {
  currentUser: DemoUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  registerCoach: (data: CoachSignupData) => Promise<boolean>;
  registerFromOnboarding: (data: OnboardingData) => Promise<boolean>;
  forgotPassword: (email: string) => Promise<void>;
  error: string | null;
  availableUsers: DemoUser[];
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<DemoUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isAuthenticatingRef = useRef(false);
  const [registeredUsers, setRegisteredUsers] = useState<DemoUser[]>(DEMO_USERS);
  const activeUsers = apiConfig.useMock ? registeredUsers : API_DEV_USERS;

  useEffect(() => {
    if (!apiConfig.useMock) {
      return;
    }

    let mounted = true;

    const syncUserDirectory = async () => {
      try {
        const storedUsers = await apiClient.get<User[]>(STORAGE_KEYS.USERS, []);
        const storedOnlyUsers = storedUsers.filter(
          (storedUser) =>
            !registeredUsers.some((registeredUser) => registeredUser.id === storedUser.id),
        );
        const nextUsers = [...registeredUsers.map(mapDemoUserToUserRecord), ...storedOnlyUsers];

        if (!mounted) {
          return;
        }

        await apiClient.set(STORAGE_KEYS.USERS, nextUsers);
      } catch (error) {
        logger.error('Failed to sync user directory', error);
      }
    };

    syncUserDirectory();

    return () => {
      mounted = false;
    };
  }, [registeredUsers]);

  // Check auth state on app start for session persistence
  useEffect(() => {
    let mounted = true;

    const checkPersistedAuth = async () => {
      try {
        const authState = await authService.checkAuth();
        if (mounted && authState.isAuthenticated && authState.user) {
          const restoredUser = apiConfig.useMock
            ? registeredUsers.find((u) => u.email?.toLowerCase() === authState.user!.email.toLowerCase())
            : mapAuthProfileToDemoUser(authState.user);
          if (restoredUser) {
            await ensureCoachSessionsSeeded();
            setCurrentUser(restoredUser);
            logger.success('Session restored from storage', { userId: restoredUser.id });
          }
        }
      } catch (err) {
        logger.error('Failed to restore auth state', err);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    checkPersistedAuth();

    return () => {
      mounted = false;
    };
  }, [registeredUsers]);

  const login = useCallback(
    async (username: string, password: string) => {
      if (isAuthenticatingRef.current) return false;
      isAuthenticatingRef.current = true;
      try {
        const normalizedUsername = username.trim().toLowerCase();
        logger.info('Login attempt', { username: normalizedUsername, mode: apiConfig.useMock ? 'mock' : 'api' });

        if (!apiConfig.useMock) {
          const email = resolveApiLoginEmail(normalizedUsername);
          const result = await authService.login(email, password.trim());
          if (!result.success) {
            logger.warn('API login failed', { email, error: result.error.message });
            setError(result.error.message);
            return false;
          }

          const mappedUser = mapAuthProfileToDemoUser(result.data.user, password.trim());
          setCurrentUser(mappedUser);
          setError(null);
          await ensureCoachSessionsSeeded();
          logger.success('API login successful', {
            email,
            role: mappedUser.role,
            userId: mappedUser.id,
          });
          return true;
        }

        const match = registeredUsers.find(
          (user) =>
            user.username.toLowerCase() === normalizedUsername && user.password === password.trim(),
        );

        if (match) {
          logger.success('Login successful', {
            username: match.username,
            role: match.role,
            userId: match.id,
          });
          setCurrentUser(match);
          setError(null);
          void ensureCoachSessionsSeeded().catch((seedError) => {
            logger.error('Failed to seed coach sessions after login', seedError);
          });

          const now = Date.now();
          const sessionUser = {
            id: match.id,
            fullName: match.fullName || match.name || match.username,
            email: match.email || `${match.username}@demo.clubroom.app`,
            role: match.role,
            joinedDate: new Date().toISOString(),
          };
          const sessionTokens = {
            accessToken: `demo_access_${match.id}_${now}`,
            refreshToken: `demo_refresh_${match.id}_${now}`,
            expiresAt: now + 7 * 24 * 60 * 60 * 1000,
          };

          void Promise.all([
            apiClient.set(STORAGE_KEYS.AUTH_USER, sessionUser),
            apiClient.set(STORAGE_KEYS.AUTH_TOKENS, sessionTokens),
            apiClient.set(STORAGE_KEYS.AUTH_TOKEN, sessionTokens.accessToken),
          ]).catch((persistError) => {
            logger.error('Failed to persist demo auth session', persistError);
          });

          return true;
        }

        logger.warn('Login failed: Invalid credentials', { username: normalizedUsername });
        setError('Invalid username or password.');
        return false;
      } finally {
        isAuthenticatingRef.current = false;
      }
    },
    [registeredUsers],
  );

  const registerCoach = useCallback(
    async (data: CoachSignupData) => {
      // Generate username from email
      const username = data.email.split('@')[0].toLowerCase();
      logger.info('Coach registration attempt', { username, email: data.email });

      if (!apiConfig.useMock) {
        const result = await authService.register({
          email: data.email,
          password: data.password,
          phone: data.phone,
          accountType: 'COACH',
          firstName: data.fullName.trim().split(/\s+/)[0] || data.fullName,
          lastName: data.fullName.trim().split(/\s+/).slice(1).join(' ') || 'Coach',
          inviteCode: data.inviteCode,
          isOrganization: false,
        });
        if (!result.success) {
          setError(result.error.message);
          return false;
        }

        const mappedUser = mapAuthProfileToDemoUser(result.data.user, data.password);
        setCurrentUser(mappedUser);
        setError(null);
        if (mappedUser.role === 'COACH') {
          await ensureCoachSessionsSeeded();
        }
        return true;
      }

      // Check if username already exists
      if (registeredUsers.find((user) => user.username === username)) {
        logger.warn('Registration failed: Account already exists', { username });
        setError('An account with this email already exists.');
        return false;
      }

      const newUser: DemoUser = {
        id: username,
        username,
        password: data.password,
        role: 'COACH',
        fullName: data.fullName,
        email: data.email,
        schoolId: data.schoolId,
        schoolName: data.schoolName,
        name: data.fullName,
        postcode: 'SW1A 1AA',
        dateOfBirth: '1990-01-01',
      };

      logger.success('Coach registered successfully', {
        username,
        schoolName: data.schoolName,
        role: newUser.role,
      });
      setRegisteredUsers((prev) => [...prev, newUser]);
      setCurrentUser(newUser);
      setError(null);
      if (newUser.role === 'COACH') {
        await ensureCoachSessionsSeeded();
      }
      return true;
    },
    [registeredUsers],
  );

  const registerFromOnboarding = useCallback(
    async (data: OnboardingData) => {
      // Generate username from email
      const username = data.email.split('@')[0].toLowerCase();
      logger.info('Onboarding registration attempt', {
        username,
        email: data.email,
        accountType: data.accountType,
      });

      if (!apiConfig.useMock) {
        const result = await authService.completeOnboarding(data);
        if (!result.success) {
          setError(result.error.message);
          return false;
        }

        const mappedUser = mapAuthProfileToDemoUser(result.data.user, data.password);
        setCurrentUser(mappedUser);
        setError(null);
        if (mappedUser.role === 'COACH') {
          await ensureCoachSessionsSeeded();
        }
        return true;
      }

      // Check if email already exists
      if (registeredUsers.find((user) => user.email?.toLowerCase() === data.email.toLowerCase())) {
        logger.warn('Registration failed: Account already exists', { email: data.email });
        setError('An account with this email already exists.');
        return false;
      }

      // Map AccountType to UserRole
      const roleMap: Record<AccountType, UserRole> = {
        COACH: 'COACH',
        PARENT: 'USER',
        ATHLETE: 'USER',
      };

      const userId = generateId('user');
      const fullName = `${data.firstName} ${data.lastName}`;

      const newUser: DemoUser = {
        id: userId,
        username,
        password: data.password,
        role: roleMap[data.accountType],
        type: data.accountType === 'COACH' ? 'COACH' : 'USER',
        fullName,
        name: fullName,
        email: data.email,
        addressLine: data.addressLine,
        postcode: data.postcode || 'SW1A 1AA',
        dateOfBirth: data.dateOfBirth || '1990-01-01',
        // Athlete fields
        skillLevel: data.skillLevel,
        position: data.position,
        hasChildren: data.accountType === 'PARENT' ? true : data.hasChildren,
        childrenCount: data.accountType === 'PARENT' ? data.childrenCount : undefined,
        // Coach fields
        isOrganization: data.isOrganization,
        organizationName: data.organizationName,
        isLive: data.accountType === 'COACH' ? false : undefined,
        // Parents start with no child profiles; they add them after signup.
        children: data.accountType === 'PARENT' ? [] : data.hasChildren ? [] : undefined,
      };

      logger.success('User registered via onboarding', {
        userId,
        username,
        accountType: data.accountType,
        role: newUser.role,
      });

      setRegisteredUsers((prev) => [...prev, newUser]);
      setCurrentUser(newUser);
      setError(null);
      if (newUser.role === 'COACH') {
        await ensureCoachSessionsSeeded();
      }
      return true;
    },
    [registeredUsers],
  );

  const logout = useCallback(async () => {
    if (currentUser) {
      logger.info('User logged out', {
        username: currentUser.username,
        role: currentUser.role,
        userId: currentUser.id,
      });
    } else {
      logger.warn('Logout called but no user was logged in');
    }

    // Clear user state
    setCurrentUser(null);
    setError(null);

    // Clear persisted auth tokens and session data
    try {
      await authService.logout();
    } catch (error) {
      logger.error('Failed to clear auth tokens', error);
    }

    try {
      await apiClient.remove('session_bookings');
      logger.info('Session data cleared');
    } catch (error) {
      logger.error('Failed to clear session data', error);
    }

    // Reset navigation back to the login screen
    router.replace(Routes.ROOT);
  }, [currentUser]);

  const forgotPassword = useCallback(async (email: string) => {
    logger.info('Forgot password requested', { email });
    await authService.forgotPassword(email);
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      isAuthenticated: currentUser != null,
      isLoading,
      login,
      logout,
      registerCoach,
      registerFromOnboarding,
      forgotPassword,
      error,
      availableUsers: activeUsers,
    }),
    [
      activeUsers,
      currentUser,
      error,
      isLoading,
      login,
      logout,
      registerCoach,
      registerFromOnboarding,
      forgotPassword,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
