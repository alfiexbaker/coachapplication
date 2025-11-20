import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { CoachSignupData } from '@/components/auth/coach-signup-screen';

export type UserRole = 'User' | 'Parent' | 'Coach' | 'Admin';

type DemoUser = {
  username: string;
  password: string;
  role: UserRole;
  fullName?: string;
  email?: string;
  schoolId?: string;
  schoolName?: string;
};

const DEMO_USERS: DemoUser[] = [
  { username: 'user', password: 'user1234', role: 'User' },
  { username: 'parent', password: 'parent1234', role: 'Parent' },
  { username: 'coach', password: 'coach1234', role: 'Coach' },
  { username: 'admin', password: 'admin1234', role: 'Admin' },
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
