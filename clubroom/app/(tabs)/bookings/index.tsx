import { useState, useCallback } from 'react';
import { StyleSheet, ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/themed-text';
import { PageHeader } from '@/components/primitives/page-header';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import {
  upcomingBookings,
  getChildrenForParent,
} from '@/constants/mock-data';
import { BookingSummary, SessionOffering } from '@/constants/types';
import { SessionDetailModal } from '@/components/sessions/session-detail-modal';
import { createLogger } from '@/utils/logger';
import { hasChildren } from '@/utils/user-helpers';

// Extracted components
import { QuickActions } from '@/components/bookings/QuickActions';
import { BookingsList, TimeFilter } from '@/components/bookings/BookingsList';

const logger = createLogger('BookingsScreen');

export default function BookingsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const [sessionBookings, setSessionBookings] = useState<BookingSummary[]>([]);
  const [sessionOfferings, setSessionOfferings] = useState<SessionOffering[]>([]);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('upcoming');
  const [selectedOffering, setSelectedOffering] = useState<SessionOffering | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userRole = currentUser?.role;

  // Load all data
  const loadData = useCallback(async () => {
    setError(null);
    try {
      // Load session bookings from AsyncStorage
      const storedBookings = await AsyncStorage.getItem('session_bookings');
      if (storedBookings) {
        const bookings = JSON.parse(storedBookings);
        // Convert to BookingSummary format
        const summaries: BookingSummary[] = bookings.map((booking: any) => ({
          id: booking.id,
          coachName: booking.coachName,
          childName: booking.athleteName,
          service: booking.service,
          start: booking.scheduledAt,
          status: booking.status === 'CONFIRMED' ? 'Confirmed' : booking.status === 'PENDING' ? 'Pending' : 'Completed',
          locationLabel: booking.location,
          coach: {
            name: booking.coachName,
            photoUrl: 'https://i.pravatar.cc/100?u=' + booking.coachId,
          },
          client: {
            name: booking.athleteName,
            photoUrl: 'https://i.pravatar.cc/100?u=' + booking.athleteId,
          },
          coachId: booking.coachId,
          clientId: booking.athleteId,
        }));
        setSessionBookings(summaries);
        logger.debug('Loaded session bookings', { count: summaries.length });
      }

      // Load session offerings from AsyncStorage
      const storedOfferings = await AsyncStorage.getItem('session_offerings');
      if (storedOfferings) {
        const offerings = JSON.parse(storedOfferings);
        setSessionOfferings(offerings);
        logger.debug('Loaded session offerings', { count: offerings.length });
      }
    } catch (err) {
      logger.error('Failed to load bookings data', err);
      setError('Failed to load bookings. Pull down to refresh.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload bookings when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // For COACHES: show their session offerings
  // For ATHLETES/PARENTS: show sessions they're registered for
  const now = new Date();

  let displayItems: (SessionOffering | BookingSummary)[] = [];

  if (userRole === 'COACH') {
    // Coaches see their session offerings
    const myOfferings = sessionOfferings.filter(o => o.coachId === currentUser?.id);
    displayItems = timeFilter === 'upcoming'
      ? myOfferings.filter(o => new Date(o.scheduledAt) >= now || o.isRecurring)
      : myOfferings.filter(o => new Date(o.scheduledAt) < now && !o.isRecurring);
  } else {
    // Athletes/Parents see sessions they're registered for
    const myRegisteredOfferings = sessionOfferings.filter(offering =>
      offering.registrations.some(reg =>
        reg.userId === currentUser?.id && reg.status === 'confirmed'
      )
    );

    // Also show old bookings
    const allBookings = [...upcomingBookings, ...sessionBookings];
    const filteredBookings = allBookings.filter((booking) => {
      // Check if user has children - show their children's bookings too
      if (hasChildren(currentUser)) {
        const children = getChildrenForParent(currentUser?.id || '');
        const childrenIds = children.map(c => c.id);
        return childrenIds.includes(booking.clientId || '') ||
               booking.clientId === currentUser?.id ||
               booking.client?.name === currentUser?.fullName;
      }
      // Regular user - show their own bookings
      return booking.clientId === currentUser?.id || booking.client?.name === currentUser?.fullName;
    });

    displayItems = timeFilter === 'upcoming'
      ? [...myRegisteredOfferings.filter(o => new Date(o.scheduledAt) >= now || o.isRecurring), ...filteredBookings]
      : myRegisteredOfferings.filter(o => new Date(o.scheduledAt) < now && !o.isRecurring);
  }

  // Navigation handlers
  const handleRateCoachPress = () => {
    logger.press('RateCoachButton', { route: '/rate-coach' });
    // Navigate to rate coach selection screen
    router.push('/rate-coach');
  };

  const handleCalendarPress = () => {
    logger.press('CalendarButton', { route: '/(tabs)/availability' });
    router.push('/(tabs)/availability');
  };

  const handleSettingsPress = () => {
    logger.press('SettingsButton', { route: '/(tabs)/settings' });
    router.push('/(tabs)/settings');
  };

  const handleGroupSessionsPress = () => {
    logger.press('GroupSessionsButton', { route: '/group-sessions' });
    router.push('/group-sessions');
  };

  const handleCreateSessionPress = () => {
    logger.press('CreateSessionButton', { route: '/session/create' });
    router.push('/session/create');
  };

  const handleFindCoachPress = () => {
    logger.press('FindCoachButton', { route: '/(tabs)/index' });
    router.push('/(tabs)/index');
  };

  const handleOfferingPress = (offering: SessionOffering) => {
    setSelectedOffering(offering);
    setShowDetailModal(true);
  };

  const handleModalClose = () => {
    setShowDetailModal(false);
    setSelectedOffering(null);
  };

  const handleModalUpdate = () => {
    loadData();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <PageHeader
        title="Bookings"
        subtitle={userRole === 'COACH' ? 'Manage your sessions' : 'Your upcoming sessions'}
      />

      {/* Quick Actions - Role-based */}
      <QuickActions
        userRole={userRole}
        onRateCoachPress={handleRateCoachPress}
        onFindCoachPress={handleFindCoachPress}
        onCalendarPress={handleCalendarPress}
        onSettingsPress={handleSettingsPress}
        onGroupSessionsPress={handleGroupSessionsPress}
        showCoachActions={true}
      />

      {/* Loading State */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
        </View>
      )}

      {/* Error State */}
      {error && !loading && (
        <View style={[styles.errorContainer, { backgroundColor: `${palette.error}10`, borderColor: palette.error }]}>
          <ThemedText style={[styles.errorText, { color: palette.error }]}>{error}</ThemedText>
        </View>
      )}

      {/* Bookings List */}
      {!loading && (
        <BookingsList
          items={displayItems}
          timeFilter={timeFilter}
          onTimeFilterChange={setTimeFilter}
          userRole={userRole}
          onOfferingPress={handleOfferingPress}
          onFindCoachPress={handleFindCoachPress}
          onCreateSessionPress={handleCreateSessionPress}
        />
      )}

      {/* Session Detail Modal */}
      <SessionDetailModal
        visible={showDetailModal}
        offering={selectedOffering}
        onClose={handleModalClose}
        onUpdate={handleModalUpdate}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorContainer: {
    margin: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
