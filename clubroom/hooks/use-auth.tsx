import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';
import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { CoachSignupData } from '@/components/auth/coach-signup-screen';
import type { User } from '@/constants/app-types';
import type { ChildReference, StaffMember } from '@/constants/types';
import type { UserRole, SimplifiedUserType } from '@/constants/user-types';
import type { OnboardingData, AccountType } from '@/services/auth-service';
import { authService } from '@/services/auth-service';
import { apiClient } from '@/services/api-client';
import { ensureCoachSessionsSeeded } from '@/services/coach-session-seed-service';
import { STORAGE_KEYS } from '@/constants/storage-keys';
import { generateId } from '@/utils/generate-id';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useAuth');

export type { UserRole, SimplifiedUserType };

type DemoUser = Omit<User, 'role'> & {
  role: UserRole;
  username: string;
  password: string;
  fullName?: string;
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
  login: (username: string, password: string) => boolean;
  logout: () => Promise<void>;
  registerCoach: (data: CoachSignupData) => boolean;
  registerFromOnboarding: (data: OnboardingData) => boolean;
  forgotPassword: (email: string) => Promise<void>;
  error: string | null;
  availableUsers: DemoUser[];
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<DemoUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [registeredUsers, setRegisteredUsers] = useState<DemoUser[]>(DEMO_USERS);

  useEffect(() => {
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
          // Try to find matching demo user for backwards compatibility
          const demoMatch = registeredUsers.find(
            (u) => u.email?.toLowerCase() === authState.user!.email.toLowerCase(),
          );
          if (demoMatch) {
            await ensureCoachSessionsSeeded();
            setCurrentUser(demoMatch);
            logger.success('Session restored from storage', { userId: demoMatch.id });
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
    (username: string, password: string) => {
      const normalizedUsername = username.trim().toLowerCase();
      logger.info('Login attempt', { username: normalizedUsername });

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

        // Persist demo sessions without calling authService.login to avoid duplicate credential warnings.
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
    },
    [registeredUsers],
  );

  const registerCoach = useCallback(
    (data: CoachSignupData) => {
      // Generate username from email
      const username = data.email.split('@')[0].toLowerCase();
      logger.info('Coach registration attempt', { username, email: data.email });

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
      return true;
    },
    [registeredUsers],
  );

  const registerFromOnboarding = useCallback(
    (data: OnboardingData) => {
      // Generate username from email
      const username = data.email.split('@')[0].toLowerCase();
      logger.info('Onboarding registration attempt', {
        username,
        email: data.email,
        accountType: data.accountType,
      });

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
    router.dismissAll();
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
      availableUsers: registeredUsers,
    }),
    [
      currentUser,
      error,
      isLoading,
      registeredUsers,
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
