/**
 * Module resolver and mock provider for the test runner.
 *
 * Solves two problems:
 * 1. TypeScript @/ path aliases don't carry to emitted JS — we rewrite them
 *    to point at the .tmp-tests output directory.
 * 2. Expo/React-Native packages can't load in Node — we provide lightweight
 *    mocks so service-layer tests run without the native runtime.
 *
 * Usage: node --require ./scripts/test-register.js --test .tmp-tests/...
 */

'use strict';

const Module = require('module');
const path = require('path');

const tmpTestsDir = path.resolve(__dirname, '..', '.tmp-tests');

// =============================================================================
// NATIVE MODULE MOCKS
// =============================================================================

const MOCKS = {
  // Expo Constants — used by constants/config.ts
  'expo-constants': {
    __esModule: true,
    default: {
      expoConfig: { extra: {} },
      manifest: {},
    },
  },

  // AsyncStorage — used by every service
  '@react-native-async-storage/async-storage': {
    __esModule: true,
    default: (() => {
      const store = new Map();
      return {
        getItem: async (key) => store.get(key) ?? null,
        setItem: async (key, value) => { store.set(key, value); },
        removeItem: async (key) => { store.delete(key); },
        multiGet: async (keys) => keys.map((k) => [k, store.get(k) ?? null]),
        multiSet: async (pairs) => { for (const [k, v] of pairs) store.set(k, v); },
        multiRemove: async (keys) => { for (const k of keys) store.delete(k); },
        clear: async () => { store.clear(); },
        getAllKeys: async () => [...store.keys()],
      };
    })(),
  },

  // React Native — stub for StyleSheet, View, etc.
  'react-native': {
    StyleSheet: { create: (s) => s, hairlineWidth: 1 },
    Platform: { OS: 'ios', select: (obj) => obj.ios || obj.default },
    View: 'View',
    Text: 'Text',
    Pressable: 'Pressable',
    ScrollView: 'ScrollView',
    Image: 'Image',
    Alert: { alert: () => {} },
    Share: { share: async () => ({ action: 'sharedAction' }) },
    Dimensions: { get: () => ({ width: 375, height: 812 }) },
  },

  // Expo modules that services may transitively import
  'expo-file-system': {
    documentDirectory: '/tmp/test/',
    readAsStringAsync: async () => '{}',
    writeAsStringAsync: async () => {},
    deleteAsync: async () => {},
    getInfoAsync: async () => ({ exists: false }),
  },
  'expo-file-system/legacy': {
    documentDirectory: '/tmp/test/',
    readAsStringAsync: async () => '{}',
    writeAsStringAsync: async () => {},
    deleteAsync: async () => {},
    getInfoAsync: async () => ({ exists: false }),
    EncodingType: { UTF8: 'utf8', Base64: 'base64' },
  },
  'expo-notifications': {
    getExpoPushTokenAsync: async () => ({ data: 'test-token' }),
    getPermissionsAsync: async () => ({ status: 'granted' }),
    requestPermissionsAsync: async () => ({ status: 'granted' }),
    setNotificationHandler: () => {},
    addNotificationReceivedListener: () => ({ remove: () => {} }),
    addNotificationResponseReceivedListener: () => ({ remove: () => {} }),
    scheduleNotificationAsync: async () => 'notif-id',
    cancelScheduledNotificationAsync: async () => {},
    cancelAllScheduledNotificationsAsync: async () => {},
  },
  'expo-haptics': {
    impactAsync: async () => {},
    notificationAsync: async () => {},
    selectionAsync: async () => {},
    ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
    NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  },
  'expo-clipboard': {
    setStringAsync: async () => {},
    getStringAsync: async () => '',
  },

  // NetInfo — used by useConnectionStatus and offline-queue
  '@react-native-community/netinfo': {
    __esModule: true,
    default: {
      addEventListener: () => () => {},
      fetch: async () => ({ isConnected: true, isInternetReachable: true }),
    },
  },
  'expo-linking': {
    openURL: async () => {},
    canOpenURL: async () => true,
    createURL: (path) => `clubroom://${path}`,
  },
  'expo-sharing': {
    isAvailableAsync: async () => true,
    shareAsync: async () => {},
  },
  'expo-calendar': {
    getCalendarsAsync: async () => [],
    createEventAsync: async () => 'event-id',
    requestCalendarPermissionsAsync: async () => ({ status: 'granted' }),
  },

  // Expo Router — used by hooks/use-auth.tsx and navigation
  'expo-router': {
    __esModule: true,
    router: {
      push: () => {},
      replace: () => {},
      back: () => {},
      navigate: () => {},
    },
    Stack: 'Stack',
    Tabs: 'Tabs',
    useRouter: () => ({
      push: () => {},
      replace: () => {},
      back: () => {},
      navigate: () => {},
    }),
    useLocalSearchParams: () => ({}),
    usePathname: () => '/',
    useSegments: () => [],
    Link: 'Link',
  },
};

// =============================================================================
// MODULE RESOLUTION HOOK
// =============================================================================

const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function (request, parent, isMain, options) {
  // Mock native modules
  if (MOCKS[request]) {
    return request;
  }

  // Rewrite @/ path aliases to compiled output dir
  if (request.startsWith('@/')) {
    const resolved = path.join(tmpTestsDir, request.slice(2));
    return originalResolveFilename.call(this, resolved, parent, isMain, options);
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

// Register mock modules in the require cache
for (const [name, mock] of Object.entries(MOCKS)) {
  const mod = new Module(name);
  mod.filename = name;
  mod.loaded = true;
  mod.exports = mock;
  Module._cache[name] = mod;
}
