import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { CoachSignupData } from '@/components/auth/coach-signup-screen';
import { MOCK_USERS, getUserById } from '@/constants/mock-data';
import type { User } from '@/constants/app-types';

export type UserRole = 'USER' | 'PARENT' | 'COACH' | 'ADMIN';

type DemoUser = {
  id: string;
  username: string;
  password: string;
  role: UserRole;
  fullName?: string;
  email?: string;
};

// Map mock users to demo users with passwords
const DEMO_USERS: DemoUser[] = [
  // Coaches
  { id: 'coach1', username: 'coach1', password: 'coach', role: 'COACH', fullName: 'Sarah Mitchell', email: 'sarah.mitchell@coach.com' },
  { id: 'coach2', username: 'coach2', password: 'coach', role: 'COACH', fullName: 'Mike Thompson', email: 'mike.thompson@coach.com' },
  { id: 'coach3', username: 'coach3', password: 'coach', role: 'COACH', fullName: 'David Roberts', email: 'david.roberts@coach.com' },
  // Users
  { id: 'user1', username: 'user1', password: 'user', role: 'USER', fullName: 'Tom Henderson', email: 'tom.henderson@email.com' },
  { id: 'user2', username: 'user2', password: 'user', role: 'USER', fullName: 'Emma Henderson', email: 'emma.henderson@email.com' },
  { id: 'user3', username: 'user3', password: 'user', role: 'USER', fullName: 'James Wilson', email: 'james.wilson@email.com' },
  // Parents
  { id: 'parent1', username: 'parent1', password: 'parent', role: 'PARENT', fullName: 'John Henderson', email: 'john.henderson@email.com' },
  { id: 'parent2', username: 'parent2', password: 'parent', role: 'PARENT', fullName: 'Lisa Wilson', email: 'lisa.wilson@email.com' },
  // Admin
  { id: 'admin', username: 'admin', password: 'admin', role: 'ADMIN', fullName: 'Admin User', email: 'admin@coach.com' },
];

type AuthContextValue = {
  currentUser: DemoUser | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => boolean;
  logout: () => void;
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
    console.log('[Auth] Login attempt:', { username: normalizedUsername });

    const match = registeredUsers.find(
      (user) => user.username.toLowerCase() === normalizedUsername && user.password === password.trim()
    );

    if (match) {
      console.log('[Auth] Login successful:', { username: match.username, role: match.role });
      setCurrentUser(match);
      setError(null);
      return true;
    }

    console.log('[Auth] Login failed: Invalid credentials');
    setError('Invalid username or password.');
    return false;
  };

  const registerCoach = (data: CoachSignupData) => {
    // Generate username from email
    const username = data.email.split('@')[0].toLowerCase();

    // Check if username already exists
    if (registeredUsers.find((user) => user.username === username)) {
      setError('An account with this email already exists.');
      return false;
    }

    const newUser: DemoUser = {
      username,
      password: data.password,
      role: 'Coach',
      fullName: data.fullName,
      email: data.email,
      schoolId: data.schoolId,
      schoolName: data.schoolName,
    };

    console.log('[Auth] Coach registered:', { username, schoolName: data.schoolName });
    setRegisteredUsers([...registeredUsers, newUser]);
    setCurrentUser(newUser);
    setError(null);
    return true;
  };

  const logout = () => {
    console.log('[Auth] Logout:', currentUser ? { username: currentUser.username, role: currentUser.role } : 'No user');
    setCurrentUser(null);
    setError(null);
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
