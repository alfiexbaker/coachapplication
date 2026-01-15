import { router } from 'expo-router';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { CoachSignupData } from '@/components/auth/coach-signup-screen';
import { MOCK_USERS, getUserById } from '@/constants/mock-data';
import type { User } from '@/constants/app-types';
import type { ChildReference, StaffMember } from '@/constants/types';
import type { OnboardingData, AccountType } from '@/services/auth-service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useAuth');

export type UserRole = 'USER' | 'COACH' | 'ADMIN';
export type SimplifiedUserType = 'USER' | 'COACH';

type DemoUser = Omit<User, 'role'> & {
  role: UserRole;
  username: string;
  password: string;
  fullName?: string;
  schoolId?: string;
  schoolName?: string;
  // Simplified user type fields
  type?: SimplifiedUserType;
  // For USER type - optional children (for booking on behalf of kids)
  children?: ChildReference[];
  hasChildren?: boolean;
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
    fullName: 'Sarah Mitchell',
    email: 'sarah.mitchell@coach.com',
    postcode: 'SW1A 1AA',
    name: 'Sarah Mitchell',
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
    fullName: 'Mike Thompson',
    email: 'mike.thompson@coach.com',
    postcode: 'SW1A 2AA',
    name: 'Mike Thompson',
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
    fullName: 'David Roberts',
    email: 'david.roberts@coach.com',
    postcode: 'SW2A 1BB',
    name: 'David Roberts',
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
    fullName: 'Elite Sports Academy',
    email: 'contact@elitesportsacademy.com',
    postcode: 'SW1A 5AA',
    name: 'Elite Sports Academy',
    dateOfBirth: '2015-01-01',
    isOrganization: true,
    organizationName: 'Elite Sports Academy',
    isLive: true,
    staffMembers: [
      {
        userId: 'coach1',
        userName: 'Sarah Mitchell',
        role: 'HEAD_COACH',
        permissions: ['MANAGE_BOOKINGS', 'MANAGE_ROSTER', 'AWARD_BADGES', 'VIEW_EARNINGS', 'POST_AS_COACH'],
        joinedAt: '2020-03-15',
        isActive: true,
      },
      {
        userId: 'coach2',
        userName: 'Mike Thompson',
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
    fullName: 'Tom Henderson',
    email: 'tom.henderson@email.com',
    postcode: 'SW1A 3CC',
    name: 'Tom Henderson',
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
    fullName: 'Emma Henderson',
    email: 'emma.henderson@email.com',
    postcode: 'SW1A 3CC',
    name: 'Emma Henderson',
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
    fullName: 'James Wilson',
    email: 'james.wilson@email.com',
    postcode: 'SW2A 4DD',
    name: 'James Wilson',
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
    fullName: 'John Henderson',
    email: 'john.henderson@email.com',
    postcode: 'SW1A 3CC',
    name: 'John Henderson',
    dateOfBirth: '1980-02-11',
    children: [
      { childId: 'user1', childName: 'Tom Henderson', relationshipType: 'PARENT_CHILD', addedAt: '2020-01-01' },
      { childId: 'user2', childName: 'Emma Henderson', relationshipType: 'PARENT_CHILD', addedAt: '2020-01-01' },
    ],
  },
  {
    id: 'user5',
    username: 'parent2',
    password: 'user',
    role: 'USER',
    type: 'USER',
    fullName: 'Lisa Wilson',
    email: 'lisa.wilson@email.com',
    postcode: 'SW2A 4DD',
    name: 'Lisa Wilson',
    dateOfBirth: '1983-09-07',
    children: [
      { childId: 'user3', childName: 'James Wilson', relationshipType: 'PARENT_CHILD', addedAt: '2020-01-01' },
    ],
  },
  // User who is both an athlete AND has children
  {
    id: 'user6',
    username: 'athleteparent',
    password: 'user',
    role: 'USER',
    type: 'USER',
    fullName: 'Mike Wilson',
    email: 'mike.wilson@email.com',
    postcode: 'SW2A 4DD',
    name: 'Mike Wilson',
    dateOfBirth: '1990-06-15',
    skillLevel: 'BEGINNER', // Also an athlete
    position: 'Defender',
    children: [
      { childId: 'user3', childName: 'James Wilson', relationshipType: 'PARENT_CHILD', addedAt: '2020-01-01' },
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

type AuthContextValue = {
  currentUser: DemoUser | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => Promise<void>;
  registerCoach: (data: CoachSignupData) => boolean;
  registerFromOnboarding: (data: OnboardingData) => boolean;
  error: string | null;
  availableUsers: DemoUser[];
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<DemoUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [registeredUsers, setRegisteredUsers] = useState<DemoUser[]>(DEMO_USERS);

  const login = (username: string, password: string) => {
    const normalizedUsername = username.trim().toLowerCase();
    logger.info('Login attempt', { username: normalizedUsername });

    const match = registeredUsers.find(
      (user) => user.username.toLowerCase() === normalizedUsername && user.password === password.trim()
    );

    if (match) {
      const userRecord = getUserById(match.id);
      const mergedUser = userRecord ? { ...match, ...userRecord } : match;
      logger.success('Login successful', {
        username: mergedUser.username,
        role: mergedUser.role,
        userId: mergedUser.id
      });
      setCurrentUser(mergedUser);
      setError(null);
      return true;
    }

    logger.warn('Login failed: Invalid credentials', { username: normalizedUsername });
    setError('Invalid username or password.');
    return false;
  };

  const registerCoach = (data: CoachSignupData) => {
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
      role: 'COACH', // Fixed: was 'Coach', now 'COACH' to match UserRole type
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
      role: newUser.role
    });
    setRegisteredUsers([...registeredUsers, newUser]);
    setCurrentUser(newUser);
    setError(null);
    return true;
  };

  const registerFromOnboarding = (data: OnboardingData) => {
    // Generate username from email
    const username = data.email.split('@')[0].toLowerCase();
    logger.info('Onboarding registration attempt', { username, email: data.email, accountType: data.accountType });

    // Check if email already exists
    if (registeredUsers.find((user) => user.email?.toLowerCase() === data.email.toLowerCase())) {
      logger.warn('Registration failed: Account already exists', { email: data.email });
      setError('An account with this email already exists.');
      return false;
    }

    // Map AccountType to UserRole
    const roleMap: Record<AccountType, UserRole> = {
      'COACH': 'COACH',
      'PARENT': 'USER',
      'ATHLETE': 'USER',
    };

    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
      postcode: data.postcode || 'SW1A 1AA',
      dateOfBirth: data.dateOfBirth || '1990-01-01',
      // Athlete fields
      skillLevel: data.skillLevel,
      position: data.position,
      hasChildren: data.hasChildren,
      // Coach fields
      isOrganization: data.isOrganization,
      organizationName: data.organizationName,
      isLive: data.accountType === 'COACH' ? false : undefined,
      // Children array if hasChildren flag is set
      children: data.hasChildren ? [] : undefined,
    };

    logger.success('User registered via onboarding', {
      userId,
      username,
      accountType: data.accountType,
      role: newUser.role
    });

    setRegisteredUsers([...registeredUsers, newUser]);
    setCurrentUser(newUser);
    setError(null);
    return true;
  };

  const logout = async () => {
    if (currentUser) {
      logger.info('User logged out', {
        username: currentUser.username,
        role: currentUser.role,
        userId: currentUser.id
      });
    } else {
      logger.warn('Logout called but no user was logged in');
    }

    // Clear user state
    setCurrentUser(null);
    setError(null);

    // Clear any persisted session data
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      await AsyncStorage.removeItem('session_bookings');
      logger.info('Session data cleared');
    } catch (error) {
      logger.error('Failed to clear session data', error);
    }

    // Reset navigation back to the login screen
    router.dismissAll();
    router.replace('/');
  };

  const value = useMemo(
    () => ({
      currentUser,
      isAuthenticated: currentUser != null,
      login,
      logout,
      registerCoach,
      registerFromOnboarding,
      error,
      availableUsers: registeredUsers,
    }),
    [currentUser, error, registeredUsers]
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
