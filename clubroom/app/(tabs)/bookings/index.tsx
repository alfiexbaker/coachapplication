import { useState, useCallback } from 'react';
import { StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import {
  upcomingBookings,
  getChildrenForParent,
} from '@/constants/mock-data';
import { BookingSummary, SessionOffering, FootballObjective } from '@/constants/types';
import { SessionDetailModal } from '@/components/sessions/session-detail-modal';
import { createLogger } from '@/utils/logger';

// Extracted components
import { QuickActions } from '@/components/bookings/QuickActions';
import { BookingsList, TimeFilter } from '@/components/bookings/BookingsList';
import { CreateSessionForm, SessionType, RecurrenceType } from '@/components/bookings/CreateSessionForm';
import { CoachTabNavigation, TabType } from '@/components/bookings/CoachTabNavigation';

const logger = createLogger('BookingsScreen');

export default function BookingsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const [sessionBookings, setSessionBookings] = useState<BookingSummary[]>([]);
  const [sessionOfferings, setSessionOfferings] = useState<SessionOffering[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('list');
  const [sessionType, setSessionType] = useState<SessionType>('1on1');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('upcoming');
  const [selectedOffering, setSelectedOffering] = useState<SessionOffering | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Form state for creating session offerings
  const [sessionTitle, setSessionTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState('');
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('none');
  const [price, setPrice] = useState('');
  const [ageMin, setAgeMin] = useState('');
  const [ageMax, setAgeMax] = useState('');
  const [footballSkill, setFootballSkill] = useState<FootballObjective | ''>('');

  const userRole = currentUser?.role;

  // Load session bookings from AsyncStorage
  const loadSessionBookings = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('session_bookings');
      if (stored) {
        const bookings = JSON.parse(stored);
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
    } catch (error) {
      logger.error('Failed to load session bookings', error);
    }
  }, []);

  // Load session offerings from AsyncStorage
  const loadSessionOfferings = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('session_offerings');
      if (stored) {
        const offerings = JSON.parse(stored);
        setSessionOfferings(offerings);
        logger.debug('Loaded session offerings', { count: offerings.length });
      }
    } catch (error) {
      logger.error('Failed to load session offerings', error);
    }
  }, []);

  // Reload bookings when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadSessionBookings();
      loadSessionOfferings();
    }, [loadSessionBookings, loadSessionOfferings])
  );

  // Create a new session offering
  const createSessionOffering = async () => {
    // Validation
    if (!sessionTitle.trim()) {
      Alert.alert('Error', 'Please enter session title');
      return;
    }
    if (!location.trim()) {
      Alert.alert('Error', 'Please enter location');
      return;
    }

    // Validate max participants is a valid integer
    const maxParticipantsNum = sessionType === 'group' ? parseInt(maxParticipants) : 1;
    if (sessionType === 'group') {
      if (!maxParticipants.trim()) {
        Alert.alert('Error', 'Please enter max participants for group session');
        return;
      }
      if (isNaN(maxParticipantsNum) || maxParticipantsNum < 2) {
        Alert.alert('Error', 'Max participants must be a number greater than 1');
        return;
      }
    }

    try {
      // Parse optional fields
      const priceNum = price.trim() ? parseFloat(price) : undefined;
      const ageMinNum = ageMin.trim() ? parseInt(ageMin) : undefined;
      const ageMaxNum = ageMax.trim() ? parseInt(ageMax) : undefined;

      // Generate new session offering
      const newOffering: SessionOffering = {
        id: `offering_${Date.now()}`,
        coachId: currentUser?.id || 'unknown',
        coachName: currentUser?.fullName || 'Unknown Coach',
        title: sessionTitle.trim(),
        description: description.trim() || undefined,
        sessionType: sessionType,
        maxParticipants: maxParticipantsNum,
        location: location.trim(),
        scheduledAt: selectedDate.toISOString(),
        isRecurring: recurrenceType === 'weekly',
        recurrenceType: recurrenceType,
        dayOfWeek: recurrenceType === 'weekly' ? selectedDate.getDay() : undefined,
        timeOfDay: recurrenceType === 'weekly'
          ? selectedDate.toTimeString().slice(0, 5)
          : undefined,
        status: 'active',
        registrations: [],
        createdAt: new Date().toISOString(),
        priceUsd: priceNum,
        ageMin: ageMinNum,
        ageMax: ageMaxNum,
        footballSkill: footballSkill || undefined,
      };

      // Load existing offerings
      const stored = await AsyncStorage.getItem('session_offerings');
      const existingOfferings = stored ? JSON.parse(stored) : [];

      // Add new offering
      const updatedOfferings = [...existingOfferings, newOffering];
      await AsyncStorage.setItem('session_offerings', JSON.stringify(updatedOfferings));

      logger.debug('Created new session offering', newOffering);

      // Reset form
      setSessionTitle('');
      setDescription('');
      setLocation('');
      setSelectedDate(new Date());
      setMaxParticipants('');
      setRecurrenceType('none');
      setPrice('');
      setAgeMin('');
      setAgeMax('');
      setFootballSkill('');

      // Reload offerings
      await loadSessionOfferings();

      // Switch back to list tab
      setActiveTab('list');

      Alert.alert('Success', 'Session offering created');
    } catch (error) {
      logger.error('Failed to create session offering', error);
      Alert.alert('Error', 'Failed to create session offering. Please try again.');
    }
  };

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
      if (userRole === 'USER') {
        return booking.clientId === currentUser?.id || booking.client?.name === currentUser?.fullName;
      } else if (userRole === 'PARENT') {
        const children = getChildrenForParent(currentUser?.id || '');
        const childrenIds = children.map(c => c.id);
        return childrenIds.includes(booking.clientId || '');
      }
      return true;
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
    loadSessionOfferings();
    loadSessionBookings();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <ThemedView style={styles.header}>
        <ThemedText type="title">Bookings</ThemedText>
      </ThemedView>

      {/* Tab Navigation for Coaches */}
      {userRole === 'COACH' && (
        <CoachTabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      )}

      {/* Quick Actions - Role-based */}
      <QuickActions
        userRole={userRole}
        onRateCoachPress={handleRateCoachPress}
        onFindCoachPress={handleFindCoachPress}
        onCalendarPress={handleCalendarPress}
        onSettingsPress={handleSettingsPress}
        showCoachActions={activeTab === 'list'}
      />

      {/* Bookings List - Show for all users, or coaches on 'list' tab */}
      {(userRole !== 'COACH' || activeTab === 'list') && (
        <BookingsList
          items={displayItems}
          timeFilter={timeFilter}
          onTimeFilterChange={setTimeFilter}
          userRole={userRole}
          onOfferingPress={handleOfferingPress}
          onFindCoachPress={handleFindCoachPress}
          onCreateSessionPress={() => setActiveTab('create')}
        />
      )}

      {/* Create Booking Form - Only for coaches on 'create' tab */}
      {userRole === 'COACH' && activeTab === 'create' && (
        <CreateSessionForm
          sessionType={sessionType}
          onSessionTypeChange={setSessionType}
          recurrenceType={recurrenceType}
          onRecurrenceTypeChange={setRecurrenceType}
          sessionTitle={sessionTitle}
          onSessionTitleChange={setSessionTitle}
          description={description}
          onDescriptionChange={setDescription}
          maxParticipants={maxParticipants}
          onMaxParticipantsChange={setMaxParticipants}
          location={location}
          onLocationChange={setLocation}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          showDatePicker={showDatePicker}
          onShowDatePickerChange={setShowDatePicker}
          showTimePicker={showTimePicker}
          onShowTimePickerChange={setShowTimePicker}
          price={price}
          onPriceChange={setPrice}
          ageMin={ageMin}
          onAgeMinChange={setAgeMin}
          ageMax={ageMax}
          onAgeMaxChange={setAgeMax}
          footballSkill={footballSkill}
          onFootballSkillChange={setFootballSkill}
          onSubmit={createSessionOffering}
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
  },
});
