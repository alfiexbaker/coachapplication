import { useState, useEffect, useCallback } from 'react';
import { FlatList, Pressable, StyleSheet, View, Platform, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CompactBookingCard } from '@/components/bookings/compact-booking-card';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { upcomingBookings, getChildrenForParent } from '@/constants/mock-data';
import { BookingSummary } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('BookingsScreen');

type TabType = 'list' | 'create';
type SessionType = '1on1' | 'group';

// Web-compatible clickable wrapper
type ClickableProps = {
  onPress: () => void;
  style?: any;
  children: React.ReactNode;
};

function Clickable({ onPress, style, children }: ClickableProps) {
  if (Platform.OS === 'web') {
    return (
      <View
        onMouseUp={onPress as any}
        style={[style, { cursor: 'pointer' }]}>
        {children}
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={style}>
      {children}
    </TouchableOpacity>
  );
}

export default function BookingsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const [sessionBookings, setSessionBookings] = useState<BookingSummary[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('list');
  const [sessionType, setSessionType] = useState<SessionType>('1on1');

  // Form state for creating bookings
  const [athleteName, setAthleteName] = useState('');
  const [service, setService] = useState('');
  const [location, setLocation] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState('');

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

  // Reload bookings when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadSessionBookings();
    }, [loadSessionBookings])
  );

  // Create a new booking
  const createBooking = async () => {
    // Validation
    if (!athleteName.trim()) {
      Alert.alert('Error', 'Please enter athlete name');
      return;
    }
    if (!service.trim()) {
      Alert.alert('Error', 'Please enter service/session type');
      return;
    }
    if (!location.trim()) {
      Alert.alert('Error', 'Please enter location');
      return;
    }
    if (sessionType === 'group' && !maxParticipants.trim()) {
      Alert.alert('Error', 'Please enter max participants for group session');
      return;
    }

    try {
      // Generate new booking
      const newBooking = {
        id: `booking_${Date.now()}`,
        coachId: currentUser?.id || 'unknown',
        coachName: currentUser?.fullName || 'Unknown Coach',
        athleteId: `athlete_${Date.now()}`,
        athleteName: athleteName.trim(),
        service: sessionType === 'group' ? `${service} (Group - Max ${maxParticipants})` : service.trim(),
        scheduledAt: selectedDate.toISOString(),
        status: 'CONFIRMED',
        location: location.trim(),
        sessionType: sessionType,
        maxParticipants: sessionType === 'group' ? parseInt(maxParticipants) : 1,
      };

      // Load existing bookings
      const stored = await AsyncStorage.getItem('session_bookings');
      const existingBookings = stored ? JSON.parse(stored) : [];

      // Add new booking
      const updatedBookings = [...existingBookings, newBooking];
      await AsyncStorage.setItem('session_bookings', JSON.stringify(updatedBookings));

      logger.debug('Created new booking', newBooking);

      // Reset form
      setAthleteName('');
      setService('');
      setLocation('');
      setSelectedDate(new Date());
      setMaxParticipants('');

      // Reload bookings
      await loadSessionBookings();

      // Switch back to list tab
      setActiveTab('list');

      Alert.alert('Success', 'Booking created successfully!');
    } catch (error) {
      logger.error('Failed to create booking', error);
      Alert.alert('Error', 'Failed to create booking. Please try again.');
    }
  };

  // Merge mock bookings with session bookings
  const allBookings = [...upcomingBookings, ...sessionBookings];

  logger.debug('BookingsScreen rendered', {
    userRole,
    username: currentUser?.username,
    totalBookings: allBookings.length,
    sessionBookings: sessionBookings.length,
    mockBookings: upcomingBookings.length
  });

  // Filter bookings based on user role (following DATA_ARCHITECTURE.md principles)
  const filteredBookings = allBookings.filter((booking) => {
    if (userRole === 'COACH') {
      // Coaches see bookings where they are the coach
      return booking.coachId === currentUser?.id || booking.coach.name === currentUser?.fullName;
    } else if (userRole === 'USER') {
      // Athletes see their own bookings (where they are the athlete)
      return booking.clientId === currentUser?.id || booking.client.name === currentUser?.fullName;
    } else if (userRole === 'PARENT') {
      // Parents see bookings for their children (athleteId = child's ID)
      const children = getChildrenForParent(currentUser?.id || '');
      const childrenIds = children.map(c => c.id);
      return childrenIds.includes(booking.clientId || '');
    } else if (userRole === 'ADMIN') {
      // Admins see all bookings
      return true;
    }
    return true; // Default: show all
  });

  const hasBookings = filteredBookings.length > 0;

  logger.debug('Bookings filtered', {
    filteredCount: filteredBookings.length,
    hasBookings
  });

  console.log('🟢🟢🟢 [BookingsScreen] RENDERING with', filteredBookings.length, 'bookings');
  console.log('🟢 [BookingsScreen] Booking IDs:', filteredBookings.map(b => b.id));
  filteredBookings.forEach((booking, index) => {
    console.log(`🟢 [BookingsScreen] Booking ${index}:`, {
      id: booking.id,
      service: booking.service,
      coachName: booking.coachName,
      status: booking.status
    });
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <ThemedView style={styles.header}>
        <ThemedText type="title">Bookings</ThemedText>
      </ThemedView>

      {/* Tab Navigation for Coaches */}
      {userRole === 'COACH' && (
        <View style={styles.tabContainer}>
          <Clickable
            onPress={() => setActiveTab('list')}
            style={[
              styles.tab,
              activeTab === 'list' && { ...styles.activeTab, borderBottomColor: palette.tint },
            ]}>
            <Ionicons
              name="list-outline"
              size={20}
              color={activeTab === 'list' ? palette.tint : palette.icon}
            />
            <ThemedText
              style={[
                styles.tabText,
                activeTab === 'list' && { color: palette.tint, fontWeight: '700' },
              ]}>
              Bookings List
            </ThemedText>
          </Clickable>

          <Clickable
            onPress={() => setActiveTab('create')}
            style={[
              styles.tab,
              activeTab === 'create' && { ...styles.activeTab, borderBottomColor: palette.tint },
            ]}>
            <Ionicons
              name="add-circle-outline"
              size={20}
              color={activeTab === 'create' ? palette.tint : palette.icon}
            />
            <ThemedText
              style={[
                styles.tabText,
                activeTab === 'create' && { color: palette.tint, fontWeight: '700' },
              ]}>
              Create Booking
            </ThemedText>
          </Clickable>
        </View>
      )}

      {/* Quick Actions - Role-based */}
      {/* Fixed: was checking 'User' and 'Parent', now checking 'USER' and 'PARENT' */}
      {(userRole === 'USER' || userRole === 'PARENT') && (
        <View style={styles.quickActions}>
          <Clickable
            onPress={() => {
              logger.press('MyGoalsButton', { route: '/bookings/objectives' });
              router.push('/bookings/objectives');
            }}>
            <SurfaceCard style={styles.actionCard}>
              <Ionicons name="football-outline" size={24} color={palette.tint} />
              <ThemedText style={styles.actionText}>My Goals</ThemedText>
            </SurfaceCard>
          </Clickable>

          <Clickable
            onPress={() => {
              logger.press('ProgressButton', { route: '/bookings/statistics' });
              router.push('/bookings/statistics');
            }}>
            <SurfaceCard style={styles.actionCard}>
              <Ionicons name="stats-chart-outline" size={24} color={palette.tint} />
              <ThemedText style={styles.actionText}>Progress</ThemedText>
            </SurfaceCard>
          </Clickable>
        </View>
      )}
      {/* Quick Actions for Coaches - only show on list tab */}
      {userRole === 'COACH' && activeTab === 'list' && (
        <View style={styles.quickActions}>
          <Clickable
            onPress={() => {
              logger.press('CalendarButton', { route: '/(tabs)/availability' });
              router.push('/(tabs)/availability');
            }}>
            <SurfaceCard style={styles.actionCard}>
              <Ionicons name="calendar-outline" size={24} color={palette.tint} />
              <ThemedText style={styles.actionText}>Calendar</ThemedText>
            </SurfaceCard>
          </Clickable>

          <Clickable
            onPress={() => {
              logger.press('ProfileButton', { route: '/(tabs)/profile' });
              router.push('/(tabs)/profile');
            }}>
            <SurfaceCard style={styles.actionCard}>
              <Ionicons name="person-outline" size={24} color={palette.tint} />
              <ThemedText style={styles.actionText}>Profile</ThemedText>
            </SurfaceCard>
          </Clickable>
        </View>
      )}

      {/* Bookings List - Show for all users, or coaches on 'list' tab */}
      {(userRole !== 'COACH' || activeTab === 'list') && (
        <>
          {hasBookings ? (
            <FlatList
              data={filteredBookings}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <CompactBookingCard booking={item} />}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
            />
          ) : (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: palette.border }]}>
                <Ionicons name="calendar-outline" size={48} color={palette.muted} />
              </View>
              <ThemedText type="subtitle" style={styles.emptyTitle}>
                No upcoming sessions
              </ThemedText>
              <ThemedText style={styles.emptyDescription}>
                {userRole === 'COACH'
                  ? 'You have no upcoming coaching sessions scheduled'
                  : 'Book your first coaching session to get started'}
              </ThemedText>
              {/* Fixed: was checking 'User' and 'Parent', now checking 'USER' and 'PARENT' */}
              {(userRole === 'USER' || userRole === 'PARENT') && (
                <Clickable
                  onPress={() => {
                    logger.press('FindCoachButton', { route: '/(tabs)/index' });
                    router.push('/(tabs)/index');
                  }}
                  style={[styles.ctaButton, { backgroundColor: palette.tint }]}>
                  <ThemedText style={styles.ctaText} lightColor="#FFFFFF" darkColor="#000000">
                    Find a Coach
                  </ThemedText>
                </Clickable>
              )}
              {/* Fixed: was checking 'Coach', now checking 'COACH' */}
              {userRole === 'COACH' && (
                <Clickable
                  onPress={() => setActiveTab('create')}
                  style={[styles.ctaButton, { backgroundColor: palette.tint }]}>
                  <ThemedText style={styles.ctaText} lightColor="#FFFFFF" darkColor="#000000">
                    Create Your First Booking
                  </ThemedText>
                </Clickable>
              )}
            </View>
          )}
        </>
      )}

      {/* Create Booking Form - Only for coaches on 'create' tab */}
      {userRole === 'COACH' && activeTab === 'create' && (
        <ScrollView
          style={styles.formContainer}
          contentContainerStyle={styles.formContent}
          showsVerticalScrollIndicator={false}>
          {/* Session Type Selector */}
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Session Type
          </ThemedText>
          <View style={styles.sessionTypeContainer}>
            <Clickable
              onPress={() => setSessionType('1on1')}
              style={[
                styles.sessionTypeButton,
                {
                  backgroundColor: sessionType === '1on1' ? palette.tint : palette.card,
                  borderColor: sessionType === '1on1' ? palette.tint : palette.border,
                },
              ]}>
              <Ionicons
                name="person-outline"
                size={24}
                color={sessionType === '1on1' ? (scheme === 'light' ? '#FFFFFF' : '#000000') : palette.icon}
              />
              <ThemedText
                style={[
                  styles.sessionTypeText,
                  sessionType === '1on1' && {
                    color: scheme === 'light' ? '#FFFFFF' : '#000000',
                    fontWeight: '700',
                  },
                ]}>
                1:1 Session
              </ThemedText>
            </Clickable>

            <Clickable
              onPress={() => setSessionType('group')}
              style={[
                styles.sessionTypeButton,
                {
                  backgroundColor: sessionType === 'group' ? palette.tint : palette.card,
                  borderColor: sessionType === 'group' ? palette.tint : palette.border,
                },
              ]}>
              <Ionicons
                name="people-outline"
                size={24}
                color={sessionType === 'group' ? (scheme === 'light' ? '#FFFFFF' : '#000000') : palette.icon}
              />
              <ThemedText
                style={[
                  styles.sessionTypeText,
                  sessionType === 'group' && {
                    color: scheme === 'light' ? '#FFFFFF' : '#000000',
                    fontWeight: '700',
                  },
                ]}>
                Group Session
              </ThemedText>
            </Clickable>
          </View>

          {/* Form Fields */}
          <View style={styles.formFields}>
            <View style={styles.fieldContainer}>
              <ThemedText style={styles.label}>Athlete Name</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: palette.card,
                    borderColor: palette.border,
                    color: palette.text,
                  },
                ]}
                placeholder={sessionType === 'group' ? "Primary athlete or group name" : "Enter athlete name"}
                placeholderTextColor={palette.muted}
                value={athleteName}
                onChangeText={setAthleteName}
              />
            </View>

            <View style={styles.fieldContainer}>
              <ThemedText style={styles.label}>Service / Session Type</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: palette.card,
                    borderColor: palette.border,
                    color: palette.text,
                  },
                ]}
                placeholder="e.g., Technical Skills Training, Dribbling"
                placeholderTextColor={palette.muted}
                value={service}
                onChangeText={setService}
              />
            </View>

            {sessionType === 'group' && (
              <View style={styles.fieldContainer}>
                <ThemedText style={styles.label}>Max Participants</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: palette.card,
                      borderColor: palette.border,
                      color: palette.text,
                    },
                  ]}
                  placeholder="Enter maximum number of participants"
                  placeholderTextColor={palette.muted}
                  value={maxParticipants}
                  onChangeText={setMaxParticipants}
                  keyboardType="number-pad"
                />
              </View>
            )}

            <View style={styles.fieldContainer}>
              <ThemedText style={styles.label}>Location</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: palette.card,
                    borderColor: palette.border,
                    color: palette.text,
                  },
                ]}
                placeholder="Enter session location"
                placeholderTextColor={palette.muted}
                value={location}
                onChangeText={setLocation}
              />
            </View>

            <View style={styles.fieldContainer}>
              <ThemedText style={styles.label}>Date & Time</ThemedText>
              <Clickable
                onPress={() => setShowDatePicker(true)}
                style={[
                  styles.dateButton,
                  {
                    backgroundColor: palette.card,
                    borderColor: palette.border,
                  },
                ]}>
                <Ionicons name="calendar-outline" size={20} color={palette.icon} />
                <ThemedText style={styles.dateText}>
                  {selectedDate.toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}{' '}
                  at{' '}
                  {selectedDate.toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </ThemedText>
              </Clickable>
              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="datetime"
                  display="default"
                  onChange={(event, date) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (date) setSelectedDate(date);
                  }}
                />
              )}
            </View>
          </View>

          {/* Create Button */}
          <Clickable
            onPress={createBooking}
            style={[styles.createButton, { backgroundColor: palette.tint }]}>
            <Ionicons
              name="checkmark-circle-outline"
              size={24}
              color={scheme === 'light' ? '#FFFFFF' : '#000000'}
            />
            <ThemedText
              style={styles.createButtonText}
              lightColor="#FFFFFF"
              darkColor="#000000">
              Create Booking
            </ThemedText>
          </Clickable>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  actionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    padding: Spacing.lg,
    paddingTop: 0,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyDescription: {
    textAlign: 'center',
    opacity: 0.6,
    fontSize: 14,
  },
  ctaButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    marginTop: Spacing.md,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '700',
  },
  // Create Booking Form Styles
  formContainer: {
    flex: 1,
  },
  formContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  sessionTypeContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  sessionTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: 12,
    borderWidth: 2,
  },
  sessionTypeText: {
    fontSize: 15,
    fontWeight: '600',
  },
  formFields: {
    gap: Spacing.lg,
  },
  fieldContainer: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 15,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  dateText: {
    fontSize: 15,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderRadius: 12,
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  createButtonText: {
    fontSize: 17,
    fontWeight: '700',
  },
});
