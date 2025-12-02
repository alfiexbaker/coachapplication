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
import { Chip } from '@/components/primitives/chip';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import {
  upcomingBookings,
  getChildrenForParent,
  getClubMembershipForUser,
  getClubById,
  getClubSessions,
} from '@/constants/mock-data';
import { BookingSummary, SessionOffering, FootballObjective } from '@/constants/types';
import { SessionOfferingCard } from '@/components/sessions/session-offering-card';
import { SessionDetailModal } from '@/components/sessions/session-detail-modal';
import { createLogger } from '@/utils/logger';
import { scale, scaleFont } from '@/utils/scale';

const logger = createLogger('BookingsScreen');

type TabType = 'list' | 'create';
type SessionType = '1on1' | 'group';
type RecurrenceType = 'none' | 'weekly';
type TimeFilter = 'upcoming' | 'past';

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
  const clubMembership = currentUser ? getClubMembershipForUser(currentUser.id) : undefined;
  const clubContext = clubMembership ? getClubById(clubMembership.clubId) : undefined;
  const defaultSquadId = clubMembership?.squadIds?.[0];
  const clubInternalSessions = clubContext ? getClubSessions(clubContext.id) : [];

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

      Alert.alert('Success', 'Session offering created successfully!');
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

  const hasItems = displayItems.length > 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <ThemedView style={styles.header}>
        <ThemedText type="title">Bookings</ThemedText>
      </ThemedView>

      {userRole === 'COACH' && (
        <SurfaceCard style={styles.clubHubCard}>
          <View style={styles.clubHubHeader}>
            <View style={{ flex: 1, gap: 6 }}>
              <View style={styles.clubHubTitleRow}>
                <ThemedText type="defaultSemiBold">Club hub</ThemedText>
                <Chip dense>{clubContext ? 'Active' : 'Joinable'}</Chip>
              </View>
              <ThemedText style={[styles.clubHubSummary, { color: palette.muted }]} numberOfLines={2}>
                {clubContext
                  ? `${clubContext.name} · ${clubMembership?.role.toLowerCase()} · ${clubInternalSessions.length} sessions`
                  : 'Create or join a club with an invite code—internal feed, chats, and sessions stay tucked away.'}
              </ThemedText>
              <View style={styles.clubMetaRow}>
                <View style={styles.metaChip}>
                  <Ionicons name="shield-checkmark" size={14} color={palette.icon} />
                  <ThemedText style={{ color: palette.muted }}>
                    {clubContext ? `${clubContext.memberCount} members` : 'Invite with codes'}
                  </ThemedText>
                </View>
                <View style={styles.metaChip}>
                  <Ionicons name="chatbubbles-outline" size={14} color={palette.icon} />
                  <ThemedText style={{ color: palette.muted }}>Feed + group chats</ThemedText>
                </View>
              </View>
            </View>
            <Clickable
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/club-hub',
                  params: defaultSquadId ? { squadId: defaultSquadId } : undefined,
                })
              }
              style={[styles.secondaryButton, { borderColor: palette.border }]}
            >
              <ThemedText style={{ color: palette.text }}>Open</ThemedText>
            </Clickable>
          </View>
        </SurfaceCard>
      )}

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
            }}
            style={[styles.actionPill, { borderColor: palette.border }]}>
            <Ionicons name="calendar-outline" size={18} color={palette.tint} />
            <ThemedText style={[styles.actionText, { color: palette.text }]}>Calendar</ThemedText>
          </Clickable>

          <Clickable
            onPress={() => {
              logger.press('SettingsButton', { route: '/(tabs)/settings' });
              router.push('/(tabs)/settings');
            }}
            style={[styles.actionPill, { borderColor: palette.border }]}>
            <Ionicons name="person-outline" size={18} color={palette.tint} />
            <ThemedText style={[styles.actionText, { color: palette.text }]}>Settings</ThemedText>
          </Clickable>
        </View>
      )}

      {/* Bookings List - Show for all users, or coaches on 'list' tab */}
      {(userRole !== 'COACH' || activeTab === 'list') && (
        <>
          {/* Time Filter Toggle */}
          <View style={styles.timeFilterContainer}>
            <Clickable
              onPress={() => setTimeFilter('upcoming')}
              style={[
                styles.filterButton,
                timeFilter === 'upcoming' && { ...styles.filterButtonActive, backgroundColor: palette.tint },
              ]}>
              <ThemedText
                style={[
                  styles.filterButtonText,
                  timeFilter === 'upcoming' && { color: scheme === 'light' ? '#FFFFFF' : '#000000', fontWeight: '700' },
                ]}>
                Upcoming
              </ThemedText>
            </Clickable>
            <Clickable
              onPress={() => setTimeFilter('past')}
              style={[
                styles.filterButton,
                timeFilter === 'past' && { ...styles.filterButtonActive, backgroundColor: palette.tint },
              ]}>
              <ThemedText
                style={[
                  styles.filterButtonText,
                  timeFilter === 'past' && { color: scheme === 'light' ? '#FFFFFF' : '#000000', fontWeight: '700' },
                ]}>
                Past
              </ThemedText>
            </Clickable>
          </View>

          {hasItems ? (
            <FlatList
              data={displayItems}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => {
                // Check if item is SessionOffering
                if ('registrations' in item) {
                  return (
                    <SessionOfferingCard
                      offering={item}
                      showCoach={userRole !== 'COACH'}
                      showCapacity={userRole === 'COACH'}
                      onPress={() => {
                        setSelectedOffering(item);
                        setShowDetailModal(true);
                      }}
                    />
                  );
                }
                // Old booking
                return <CompactBookingCard booking={item} />;
              }}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: palette.border }]}>
                <Ionicons name="calendar-outline" size={48} color={palette.muted} />
              </View>
              <ThemedText type="subtitle" style={styles.emptyTitle}>
                No {timeFilter} sessions
              </ThemedText>
              <ThemedText style={styles.emptyDescription}>
                {userRole === 'COACH'
                  ? timeFilter === 'upcoming'
                    ? 'Create your first session offering'
                    : 'No past sessions yet'
                  : timeFilter === 'upcoming'
                    ? 'Book your first coaching session to get started'
                    : 'No past sessions yet'}
              </ThemedText>
              {(userRole === 'USER' || userRole === 'PARENT') && timeFilter === 'upcoming' && (
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
              {userRole === 'COACH' && timeFilter === 'upcoming' && (
                <Clickable
                  onPress={() => setActiveTab('create')}
                  style={[styles.ctaButton, { backgroundColor: palette.tint }]}>
                  <ThemedText style={styles.ctaText} lightColor="#FFFFFF" darkColor="#000000">
                    Create Session Offering
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

          {/* Recurrence Type Selector */}
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Schedule Type
          </ThemedText>
          <View style={styles.sessionTypeContainer}>
            <Clickable
              onPress={() => setRecurrenceType('none')}
              style={[
                styles.sessionTypeButton,
                {
                  backgroundColor: recurrenceType === 'none' ? palette.tint : palette.card,
                  borderColor: recurrenceType === 'none' ? palette.tint : palette.border,
                },
              ]}>
              <Ionicons
                name="calendar-outline"
                size={24}
                color={recurrenceType === 'none' ? (scheme === 'light' ? '#FFFFFF' : '#000000') : palette.icon}
              />
              <ThemedText
                style={[
                  styles.sessionTypeText,
                  recurrenceType === 'none' && {
                    color: scheme === 'light' ? '#FFFFFF' : '#000000',
                    fontWeight: '700',
                  },
                ]}>
                One-time
              </ThemedText>
            </Clickable>

            <Clickable
              onPress={() => setRecurrenceType('weekly')}
              style={[
                styles.sessionTypeButton,
                {
                  backgroundColor: recurrenceType === 'weekly' ? palette.tint : palette.card,
                  borderColor: recurrenceType === 'weekly' ? palette.tint : palette.border,
                },
              ]}>
              <Ionicons
                name="repeat-outline"
                size={24}
                color={recurrenceType === 'weekly' ? (scheme === 'light' ? '#FFFFFF' : '#000000') : palette.icon}
              />
              <ThemedText
                style={[
                  styles.sessionTypeText,
                  recurrenceType === 'weekly' && {
                    color: scheme === 'light' ? '#FFFFFF' : '#000000',
                    fontWeight: '700',
                  },
                ]}>
                Weekly Recurring
              </ThemedText>
            </Clickable>
          </View>

          {/* Form Fields */}
          <View style={styles.formFields}>
            <View style={styles.fieldContainer}>
              <ThemedText style={styles.label}>Session Title *</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: palette.card,
                    borderColor: palette.border,
                    color: palette.text,
                  },
                ]}
                placeholder="e.g., Advanced Dribbling Skills, Goalkeeper Training"
                placeholderTextColor={palette.muted}
                value={sessionTitle}
                onChangeText={setSessionTitle}
              />
            </View>

            <View style={styles.fieldContainer}>
              <ThemedText style={styles.label}>Description (Optional)</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  styles.multilineInput,
                  {
                    backgroundColor: palette.card,
                    borderColor: palette.border,
                    color: palette.text,
                  },
                ]}
                placeholder="Add details about the session..."
                placeholderTextColor={palette.muted}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
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
                onPress={() => {
                  if (Platform.OS === 'android') {
                    // On Android, show date picker first
                    setShowDatePicker(true);
                  } else {
                    // On iOS/web, show combined datetime picker
                    setShowDatePicker(true);
                  }
                }}
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

              {/* Platform-specific date/time picker */}
              {Platform.OS === 'android' ? (
                <>
                  {/* Android: Separate date and time pickers */}
                  {showDatePicker && (
                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      display="default"
                      onChange={(event, date) => {
                        setShowDatePicker(false);
                        if (date && event.type === 'set') {
                          // Preserve the time from selectedDate
                          const updatedDate = new Date(date);
                          updatedDate.setHours(selectedDate.getHours());
                          updatedDate.setMinutes(selectedDate.getMinutes());
                          setSelectedDate(updatedDate);
                          // After date is selected, show time picker
                          setShowTimePicker(true);
                        }
                      }}
                    />
                  )}
                  {showTimePicker && (
                    <DateTimePicker
                      value={selectedDate}
                      mode="time"
                      display="default"
                      onChange={(event, date) => {
                        setShowTimePicker(false);
                        if (date && event.type === 'set') {
                          setSelectedDate(date);
                        }
                      }}
                    />
                  )}
                </>
              ) : (
                <>
                  {/* iOS/Web: Combined datetime picker */}
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
                </>
              )}
            </View>

            {/* Price */}
            <View style={styles.fieldContainer}>
              <ThemedText style={styles.label}>Price (USD) - Optional</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: palette.card,
                    borderColor: palette.border,
                    color: palette.text,
                  },
                ]}
                placeholder="e.g., 50"
                placeholderTextColor={palette.muted}
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
              />
            </View>

            {/* Age Range */}
            <View style={styles.fieldContainer}>
              <ThemedText style={styles.label}>Age Range - Optional</ThemedText>
              <View style={styles.ageRangeRow}>
                <TextInput
                  style={[
                    styles.input,
                    styles.ageInput,
                    {
                      backgroundColor: palette.card,
                      borderColor: palette.border,
                      color: palette.text,
                    },
                  ]}
                  placeholder="Min"
                  placeholderTextColor={palette.muted}
                  value={ageMin}
                  onChangeText={setAgeMin}
                  keyboardType="number-pad"
                />
                <ThemedText style={styles.ageSeparator}>to</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    styles.ageInput,
                    {
                      backgroundColor: palette.card,
                      borderColor: palette.border,
                      color: palette.text,
                    },
                  ]}
                  placeholder="Max"
                  placeholderTextColor={palette.muted}
                  value={ageMax}
                  onChangeText={setAgeMax}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {/* Football Skill Focus */}
            <View style={styles.fieldContainer}>
              <ThemedText style={styles.label}>Skill Focus - Optional</ThemedText>
              <View style={styles.skillPicker}>
                {(['Dribbling', 'Passing', 'Defending', 'Finishing', 'Goalkeeping', 'Conditioning'] as FootballObjective[]).map((skill) => (
                  <Clickable
                    key={skill}
                    onPress={() => setFootballSkill(footballSkill === skill ? '' : skill)}
                    style={[
                      styles.skillButton,
                      {
                        backgroundColor: footballSkill === skill ? palette.tint : palette.card,
                        borderColor: footballSkill === skill ? palette.tint : palette.border,
                      },
                    ]}>
                    <ThemedText
                      style={[
                        styles.skillButtonText,
                        footballSkill === skill && {
                          color: scheme === 'light' ? '#FFFFFF' : '#000000',
                          fontWeight: '700',
                        },
                      ]}>
                      {skill}
                    </ThemedText>
                  </Clickable>
                ))}
              </View>
            </View>
          </View>

          {/* Create Button */}
          <Clickable
            onPress={createSessionOffering}
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
              Create Session Offering
            </ThemedText>
          </Clickable>
        </ScrollView>
      )}

      {/* Session Detail Modal */}
      <SessionDetailModal
        visible={showDetailModal}
        offering={selectedOffering}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedOffering(null);
        }}
        onUpdate={() => {
          loadSessionOfferings();
          loadSessionBookings();
        }}
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
  clubHubCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    gap: 6,
  },
  clubHubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  clubHubTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clubHubSummary: {
    fontSize: scaleFont(14),
    lineHeight: 18,
  },
  clubMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#00000006',
  },
  secondaryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 10,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: scaleFont(14),
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  actionText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  actionPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  list: {
    padding: 16,
    paddingTop: 0,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: scale(16),
  },
  emptyIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    textAlign: 'center',
    fontSize: scaleFont(20),
    fontWeight: '700',
    letterSpacing: -0.4,
    lineHeight: scaleFont(26),
  },
  emptyDescription: {
    textAlign: 'center',
    opacity: 0.5,
    fontSize: scaleFont(15),
    lineHeight: scaleFont(22),
  },
  ctaButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  ctaText: {
    fontSize: scaleFont(17),
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  formContainer: {
    flex: 1,
  },
  formContent: {
    padding: 20,
    paddingTop: 14,
    gap: 24,
  },
  sectionTitle: {
    marginBottom: 8,
    fontSize: scaleFont(18),
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  sessionTypeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  sessionTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: scale(18),
    borderRadius: 12,
    borderWidth: 2,
  },
  sessionTypeText: {
    fontSize: scaleFont(16),
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  formFields: {
    gap: 20,
  },
  fieldContainer: {
    gap: 8,
  },
  label: {
    fontSize: scaleFont(15),
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: scaleFont(16),
    lineHeight: scaleFont(20),
  },
  multilineInput: {
    minHeight: scale(100),
    textAlignVertical: 'top',
    paddingTop: 16,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  dateText: {
    fontSize: scaleFont(16),
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 12,
    marginTop: 12,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  createButtonText: {
    fontSize: scaleFont(18),
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  timeFilterContainer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  filterButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  filterButtonText: {
    fontSize: scaleFont(15),
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  ageRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ageInput: {
    flex: 1,
  },
  ageSeparator: {
    fontSize: scaleFont(15),
    paddingHorizontal: 8,
    fontWeight: '600',
  },
  skillPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  skillButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
  },
  skillButtonText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
