import { router } from 'expo-router';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { CoachSignupData } from '@/components/auth/coach-signup-screen';
import { MOCK_USERS, getUserById } from '@/constants/mock-data';
import type { User } from '@/constants/app-types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useAuth');

export type UserRole = 'USER' | 'PARENT' | 'COACH' | 'ADMIN';

type DemoUser = Omit<User, 'role'> & {
  role: UserRole | 'ADMIN';
  username: string;
  password: string;
  fullName?: string;
  schoolId?: string;
  schoolName?: string;
};

// Map mock users to demo users with passwords
// Map mock users to demo users with passwords
const DEMO_USERS: DemoUser[] = [
  // Coaches
  {
    id: 'coach1',
    username: 'coach1',
    password: 'coach',
    role: 'COACH',
    fullName: 'Sarah Mitchell',
    email: 'sarah.mitchell@coach.com',
    postcode: 'SW1A 1AA',
    name: 'Sarah Mitchell',
    dateOfBirth: '1988-03-15',
  },
  {
    id: 'coach2',
    username: 'coach2',
    password: 'coach',
    role: 'COACH',
    fullName: 'Mike Thompson',
    email: 'mike.thompson@coach.com',
    postcode: 'SW1A 2AA',
    name: 'Mike Thompson',
    dateOfBirth: '1985-07-22',
  },
  {
    id: 'coach3',
    username: 'coach3',
    password: 'coach',
    role: 'COACH',
    fullName: 'David Roberts',
    email: 'david.roberts@coach.com',
    postcode: 'SW2A 1BB',
    name: 'David Roberts',
    dateOfBirth: '1990-11-08',
  },
  // Users
  {
    id: 'user1',
    username: 'user1',
    password: 'user',
    role: 'USER',
    fullName: 'Tom Henderson',
    email: 'tom.henderson@email.com',
    postcode: 'SW1A 3CC',
    name: 'Tom Henderson',
    dateOfBirth: '2008-05-12',
  },
  {
    id: 'user2',
    username: 'user2',
    password: 'user',
    role: 'USER',
    fullName: 'Emma Henderson',
    email: 'emma.henderson@email.com',
    postcode: 'SW1A 3CC',
    name: 'Emma Henderson',
    dateOfBirth: '2009-08-20',
  },
  {
    id: 'user3',
    username: 'user3',
    password: 'user',
    role: 'USER',
    fullName: 'James Wilson',
    email: 'james.wilson@email.com',
    postcode: 'SW2A 4DD',
    name: 'James Wilson',
    dateOfBirth: '2007-01-05',
  },
  // Parents
  {
    id: 'parent1',
    username: 'parent1',
    password: 'parent',
    role: 'PARENT',
    fullName: 'John Henderson',
    email: 'john.henderson@email.com',
    postcode: 'SW1A 3CC',
    name: 'John Henderson',
    dateOfBirth: '1980-02-11',
  },
  {
    id: 'parent2',
    username: 'parent2',
    password: 'parent',
    role: 'PARENT',
    fullName: 'Lisa Wilson',
    email: 'lisa.wilson@email.com',
    postcode: 'SW2A 4DD',
    name: 'Lisa Wilson',
    dateOfBirth: '1983-09-07',
  },
  // Admin
  {
    id: 'admin',
    username: 'admin',
    password: 'admin',
    role: 'ADMIN',
    fullName: 'Admin User',
    email: 'admin@coach.com',
    postcode: 'SW1A 1AA',
    name: 'Admin User',
    dateOfBirth: '1985-01-01',
  },
];

type AuthContextValue = {
  currentUser: DemoUser | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => Promise<void>;
  registerCoach: (data: CoachSignupData) => boolean;
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
