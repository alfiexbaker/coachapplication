"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthProvider = AuthProvider;
exports.useAuth = useAuth;
const jsx_runtime_1 = require("react/jsx-runtime");
const expo_router_1 = require("expo-router");
const routes_1 = require("@/navigation/routes");
const react_1 = require("react");
const auth_service_1 = require("@/services/auth-service");
const api_client_1 = require("@/services/api-client");
const coach_session_seed_service_1 = require("@/services/coach-session-seed-service");
const storage_keys_1 = require("@/constants/storage-keys");
const logger_1 = require("@/utils/logger");
const logger = (0, logger_1.createLogger)('useAuth');
// Map mock users to demo users with passwords
// Updated with simplified user type system fields
const DEMO_USERS = [
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
            {
                childId: 'user1',
                childName: 'Tom Henderson',
                relationshipType: 'PARENT_CHILD',
                addedAt: '2020-01-01',
            },
            {
                childId: 'user2',
                childName: 'Emma Henderson',
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
        fullName: 'Lisa Wilson',
        email: 'lisa.wilson@email.com',
        postcode: 'SW2A 4DD',
        name: 'Lisa Wilson',
        dateOfBirth: '1983-09-07',
        children: [
            {
                childId: 'user3',
                childName: 'James Wilson',
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
        fullName: 'Mike Wilson',
        email: 'mike.wilson@email.com',
        postcode: 'SW2A 4DD',
        name: 'Mike Wilson',
        dateOfBirth: '1990-06-15',
        skillLevel: 'BEGINNER', // Also an athlete
        position: 'Defender',
        children: [
            {
                childId: 'user3',
                childName: 'James Wilson',
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
        fullName: 'Maya Patel',
        email: 'maya.patel@email.com',
        postcode: 'E2 8AA',
        name: 'Maya Patel',
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
        fullName: 'Ethan Cole',
        email: 'ethan.cole@email.com',
        postcode: 'E2 8AA',
        name: 'Ethan Cole',
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
        fullName: 'Leo Grant',
        email: 'leo.grant@email.com',
        postcode: 'N7 0DP',
        name: 'Leo Grant',
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
        fullName: 'Noah Grant',
        email: 'noah.grant@email.com',
        postcode: 'N7 0DP',
        name: 'Noah Grant',
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
        fullName: 'Ava Khan',
        email: 'ava.khan@email.com',
        postcode: 'E10 4LA',
        name: 'Ava Khan',
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
        fullName: 'Liam Ward',
        email: 'liam.ward@email.com',
        postcode: 'SE10 9AB',
        name: 'Liam Ward',
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
        fullName: 'Zoe Ward',
        email: 'zoe.ward@email.com',
        postcode: 'SE10 9AB',
        name: 'Zoe Ward',
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
        fullName: 'Priya Patel',
        email: 'priya.patel@email.com',
        postcode: 'E2 8AA',
        name: 'Priya Patel',
        dateOfBirth: '1984-04-18',
        children: [
            {
                childId: 'athlete_4',
                childName: 'Maya Patel',
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
        fullName: 'Daniel Cole',
        email: 'daniel.cole@email.com',
        postcode: 'E2 8AA',
        name: 'Daniel Cole',
        dateOfBirth: '1981-12-04',
        children: [
            {
                childId: 'athlete_5',
                childName: 'Ethan Cole',
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
        fullName: 'Rachel Grant',
        email: 'rachel.grant@email.com',
        postcode: 'N7 0DP',
        name: 'Rachel Grant',
        dateOfBirth: '1986-06-29',
        children: [
            {
                childId: 'athlete_6',
                childName: 'Leo Grant',
                relationshipType: 'PARENT_CHILD',
                addedAt: '2022-01-01',
            },
            {
                childId: 'athlete_7',
                childName: 'Noah Grant',
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
        fullName: 'Omar Khan',
        email: 'omar.khan@email.com',
        postcode: 'E10 4LA',
        name: 'Omar Khan',
        dateOfBirth: '1982-10-17',
        children: [
            {
                childId: 'athlete_8',
                childName: 'Ava Khan',
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
        fullName: 'Hannah Ward',
        email: 'hannah.ward@email.com',
        postcode: 'SE10 9AB',
        name: 'Hannah Ward',
        dateOfBirth: '1987-01-14',
        children: [
            {
                childId: 'athlete_9',
                childName: 'Liam Ward',
                relationshipType: 'PARENT_CHILD',
                addedAt: '2022-07-01',
            },
            {
                childId: 'athlete_10',
                childName: 'Zoe Ward',
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
function mapDemoUserToUserRecord(user) {
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
const AuthContext = (0, react_1.createContext)(undefined);
function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = (0, react_1.useState)(null);
    const [error, setError] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [registeredUsers, setRegisteredUsers] = (0, react_1.useState)(DEMO_USERS);
    (0, react_1.useEffect)(() => {
        let mounted = true;
        const syncUserDirectory = async () => {
            try {
                const storedUsers = await api_client_1.apiClient.get(storage_keys_1.STORAGE_KEYS.USERS, []);
                const storedOnlyUsers = storedUsers.filter((storedUser) => !registeredUsers.some((registeredUser) => registeredUser.id === storedUser.id));
                const nextUsers = [...registeredUsers.map(mapDemoUserToUserRecord), ...storedOnlyUsers];
                if (!mounted) {
                    return;
                }
                await api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.USERS, nextUsers);
            }
            catch (error) {
                logger.error('Failed to sync user directory', error);
            }
        };
        syncUserDirectory();
        return () => {
            mounted = false;
        };
    }, [registeredUsers]);
    // Check auth state on app start for session persistence
    (0, react_1.useEffect)(() => {
        let mounted = true;
        const checkPersistedAuth = async () => {
            try {
                const authState = await auth_service_1.authService.checkAuth();
                if (mounted && authState.isAuthenticated && authState.user) {
                    // Try to find matching demo user for backwards compatibility
                    const demoMatch = registeredUsers.find((u) => u.email?.toLowerCase() === authState.user.email.toLowerCase());
                    if (demoMatch) {
                        await (0, coach_session_seed_service_1.ensureCoachSessionsSeeded)();
                        setCurrentUser(demoMatch);
                        logger.success('Session restored from storage', { userId: demoMatch.id });
                    }
                }
            }
            catch (err) {
                logger.error('Failed to restore auth state', err);
            }
            finally {
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
    const login = (0, react_1.useCallback)((username, password) => {
        const normalizedUsername = username.trim().toLowerCase();
        logger.info('Login attempt', { username: normalizedUsername });
        const match = registeredUsers.find((user) => user.username.toLowerCase() === normalizedUsername && user.password === password.trim());
        if (match) {
            logger.success('Login successful', {
                username: match.username,
                role: match.role,
                userId: match.id,
            });
            setCurrentUser(match);
            setError(null);
            void (0, coach_session_seed_service_1.ensureCoachSessionsSeeded)().catch((seedError) => {
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
                api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.AUTH_USER, sessionUser),
                api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.AUTH_TOKENS, sessionTokens),
                api_client_1.apiClient.set(storage_keys_1.STORAGE_KEYS.AUTH_TOKEN, sessionTokens.accessToken),
            ]).catch((persistError) => {
                logger.error('Failed to persist demo auth session', persistError);
            });
            return true;
        }
        logger.warn('Login failed: Invalid credentials', { username: normalizedUsername });
        setError('Invalid username or password.');
        return false;
    }, [registeredUsers]);
    const registerCoach = (0, react_1.useCallback)((data) => {
        // Generate username from email
        const username = data.email.split('@')[0].toLowerCase();
        logger.info('Coach registration attempt', { username, email: data.email });
        // Check if username already exists
        if (registeredUsers.find((user) => user.username === username)) {
            logger.warn('Registration failed: Account already exists', { username });
            setError('An account with this email already exists.');
            return false;
        }
        const newUser = {
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
    }, [registeredUsers]);
    const registerFromOnboarding = (0, react_1.useCallback)((data) => {
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
        const roleMap = {
            COACH: 'COACH',
            PARENT: 'USER',
            ATHLETE: 'USER',
        };
        const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const fullName = `${data.firstName} ${data.lastName}`;
        const newUser = {
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
            role: newUser.role,
        });
        setRegisteredUsers((prev) => [...prev, newUser]);
        setCurrentUser(newUser);
        setError(null);
        return true;
    }, [registeredUsers]);
    const logout = (0, react_1.useCallback)(async () => {
        if (currentUser) {
            logger.info('User logged out', {
                username: currentUser.username,
                role: currentUser.role,
                userId: currentUser.id,
            });
        }
        else {
            logger.warn('Logout called but no user was logged in');
        }
        // Clear user state
        setCurrentUser(null);
        setError(null);
        // Clear persisted auth tokens and session data
        try {
            await auth_service_1.authService.logout();
        }
        catch (error) {
            logger.error('Failed to clear auth tokens', error);
        }
        try {
            await api_client_1.apiClient.remove('session_bookings');
            logger.info('Session data cleared');
        }
        catch (error) {
            logger.error('Failed to clear session data', error);
        }
        // Reset navigation back to the login screen
        expo_router_1.router.dismissAll();
        expo_router_1.router.replace(routes_1.Routes.ROOT);
    }, [currentUser]);
    const forgotPassword = async (email) => {
        logger.info('Forgot password requested', { email });
        await auth_service_1.authService.forgotPassword(email);
    };
    const value = (0, react_1.useMemo)(() => ({
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
    }), [
        currentUser,
        error,
        isLoading,
        registeredUsers,
        login,
        logout,
        registerCoach,
        registerFromOnboarding,
    ]);
    return (0, jsx_runtime_1.jsx)(AuthContext.Provider, { value: value, children: children });
}
function useAuth() {
    const context = (0, react_1.useContext)(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
