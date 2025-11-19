import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type UserRole = 'User' | 'Parent' | 'Coach' | 'Admin';

type DemoUser = {
  username: string;
  password: string;
  role: UserRole;
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
  error: string | null;
  availableUsers: DemoUser[];
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<DemoUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const login = (username: string, password: string) => {
    const normalizedUsername = username.trim().toLowerCase();
    const match = DEMO_USERS.find(
      (user) => user.username.toLowerCase() === normalizedUsername && user.password === password.trim()
    );

    if (match) {
      setCurrentUser(match);
      setError(null);
      return true;
    }

    setError('Invalid username or password.');
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    setError(null);
  };

  const value = useMemo(
    () => ({
      currentUser,
      isAuthenticated: currentUser != null,
      login,
      logout,
      error,
      availableUsers: DEMO_USERS,
    }),
    [currentUser, error]
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
