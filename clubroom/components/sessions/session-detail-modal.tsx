import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { SessionOffering } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { getChildrenForParent } from '@/constants/mock-data';

interface SessionDetailModalProps {
  visible: boolean;
  offering: SessionOffering | null;
  onClose: () => void;
  onUpdate?: () => void; // Callback after booking/cancel
}

export function SessionDetailModal({ visible, offering, onClose, onUpdate }: SessionDetailModalProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [weeksToBook, setWeeksToBook] = useState(1);

  if (!offering) return null;

  const isCoach = currentUser?.role === 'COACH';
  const isMyOffering = offering.coachId === currentUser?.id;
  const registeredCount = offering.registrations.filter(r => r.status === 'confirmed').length;
  const isFull = registeredCount >= offering.maxParticipants;
  const isRegistered = offering.registrations.some(
    r => r.userId === currentUser?.id && r.status === 'confirmed'
  );

  const children = currentUser?.role === 'PARENT' ? getChildrenForParent(currentUser.id) : [];
  const hasMultipleKids = children.length > 1;

  const handleBook = async () => {
    if (isFull) {
      Alert.alert('Session Full', 'This session is currently full.');
      return;
    }

    // For parents with multiple kids, require kid selection
    if (hasMultipleKids && !selectedChildId) {
      Alert.alert('Select Child', 'Please select which child to book for.');
      return;
    }

    try {
      const userId = hasMultipleKids ? selectedChildId : (currentUser?.id || '');
      const userName = hasMultipleKids
        ? children.find(c => c.id === selectedChildId)?.name || 'Unknown'
        : currentUser?.fullName || 'Unknown';

      const newRegistration = {
        id: `reg_${Date.now()}`,
        userId,
        userName,
        bookedAt: new Date().toISOString(),
        status: 'confirmed' as const,
      };

      // Update offering with new registration
      const stored = await AsyncStorage.getItem('session_offerings');
      const offerings: SessionOffering[] = stored ? JSON.parse(stored) : [];
      const updatedOfferings = offerings.map(o => {
        if (o.id === offering.id) {
          const updatedRegistrations = [...o.registrations, newRegistration];
          return {
            ...o,
            registrations: updatedRegistrations,
            status: updatedRegistrations.length >= o.maxParticipants ? 'full' as const : o.status,
          };
        }
        return o;
      });

      await AsyncStorage.setItem('session_offerings', JSON.stringify(updatedOfferings));

      Alert.alert('Success', offering.isRecurring
        ? `Booked for the next ${weeksToBook} week${weeksToBook > 1 ? 's' : ''}!`
        : 'Session booked successfully!');

      onUpdate?.();
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to book session. Please try again.');
    }
  };

  const formatSchedule = () => {
    if (offering.isRecurring && offering.dayOfWeek !== undefined && offering.timeOfDay) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return `Every ${days[offering.dayOfWeek]} at ${offering.timeOfDay}`;
    }
    const date = new Date(offering.scheduledAt);
    return date.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: palette.border }]}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={palette.text} />
          </Pressable>
          <ThemedText type="title" style={styles.headerTitle}>Session Details</ThemedText>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Session Info */}
          <SurfaceCard style={styles.card}>
            <ThemedText type="subtitle" style={styles.title}>{offering.title}</ThemedText>

            {!isMyOffering && (
              <View style={styles.coachRow}>
                <Ionicons name="person-circle-outline" size={20} color={palette.icon} />
                <ThemedText>Coach: {offering.coachName}</ThemedText>
              </View>
            )}

            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={20} color={palette.icon} />
              <ThemedText>{formatSchedule()}</ThemedText>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={20} color={palette.icon} />
              <ThemedText>{offering.location}</ThemedText>
            </View>

            {offering.description && (
              <>
                <View style={styles.divider} />
                <ThemedText style={styles.description}>{offering.description}</ThemedText>
              </>
            )}

            <View style={styles.metaRow}>
              {offering.sessionType === 'group' && (
                <View style={[styles.badge, { backgroundColor: `${palette.accent}15` }]}>
                  <ThemedText style={[styles.badgeText, { color: palette.accent }]}>
                    Group ({registeredCount}/{offering.maxParticipants})
                  </ThemedText>
                </View>
              )}
              {offering.ageMin && offering.ageMax && (
                <View style={[styles.badge, { backgroundColor: palette.border }]}>
                  <ThemedText style={styles.badgeText}>
                    Ages {offering.ageMin}-{offering.ageMax}
                  </ThemedText>
                </View>
              )}
              {offering.footballSkill && (
                <View style={[styles.badge, { backgroundColor: `${palette.tint}15` }]}>
                  <ThemedText style={[styles.badgeText, { color: palette.tint }]}>
                    {offering.footballSkill}
                  </ThemedText>
                </View>
              )}
              {offering.priceUsd !== undefined && (
                <ThemedText type="defaultSemiBold" style={styles.price}>
                  ${offering.priceUsd}
                </ThemedText>
              )}
            </View>
          </SurfaceCard>

          {/* Coach View: Registrations */}
          {isMyOffering && (
            <SurfaceCard style={styles.card}>
              <ThemedText type="subtitle">Registered Athletes ({registeredCount})</ThemedText>
              {offering.registrations.length === 0 ? (
                <ThemedText style={styles.emptyText}>No registrations yet</ThemedText>
              ) : (
                offering.registrations
                  .filter(r => r.status === 'confirmed')
                  .map(reg => (
                    <View key={reg.id} style={[styles.registration, { borderBottomColor: palette.border }]}>
                      <Ionicons name="person" size={20} color={palette.icon} />
                      <ThemedText style={styles.regName}>{reg.userName}</ThemedText>
                      <ThemedText style={styles.regDate}>
                        {new Date(reg.bookedAt).toLocaleDateString()}
                      </ThemedText>
                    </View>
                  ))
              )}
            </SurfaceCard>
          )}

          {/* Athlete View: Booking Options */}
          {!isCoach && !isRegistered && (
            <>
              {hasMultipleKids && (
                <SurfaceCard style={styles.card}>
                  <ThemedText type="subtitle">Book for:</ThemedText>
                  {children.map(child => (
                    <Pressable
                      key={child.id}
                      onPress={() => setSelectedChildId(child.id)}
                      style={[
                        styles.childOption,
                        {
                          backgroundColor: selectedChildId === child.id ? `${palette.tint}15` : palette.card,
                          borderColor: selectedChildId === child.id ? palette.tint : palette.border,
                        },
                      ]}>
                      <Ionicons
                        name={selectedChildId === child.id ? 'radio-button-on' : 'radio-button-off'}
                        size={20}
                        color={selectedChildId === child.id ? palette.tint : palette.icon}
                      />
                      <ThemedText>{child.name} (Age {child.age})</ThemedText>
                    </Pressable>
                  ))}
                </SurfaceCard>
              )}

              {offering.isRecurring && (
                <SurfaceCard style={styles.card}>
                  <ThemedText type="subtitle">Book for how many weeks?</ThemedText>
                  <View style={styles.weeksSelector}>
                    {[1, 2, 3, 4].map(weeks => (
                      <Pressable
                        key={weeks}
                        onPress={() => setWeeksToBook(weeks)}
                        style={[
                          styles.weekButton,
                          {
                            backgroundColor: weeksToBook === weeks ? palette.tint : palette.card,
                            borderColor: weeksToBook === weeks ? palette.tint : palette.border,
                          },
                        ]}>
                        <ThemedText
                          style={[
                            styles.weekButtonText,
                            weeksToBook === weeks && { color: scheme === 'light' ? '#FFFFFF' : '#000000' },
                          ]}>
                          {weeks} week{weeks > 1 ? 's' : ''}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </SurfaceCard>
              )}
            </>
          )}

          {!isCoach && isRegistered && (
            <SurfaceCard style={[styles.card, { backgroundColor: `${palette.success}15` }]}>
              <View style={styles.registeredBanner}>
                <Ionicons name="checkmark-circle" size={24} color={palette.success} />
                <ThemedText style={[styles.registeredText, { color: palette.success }]}>
                  You're registered for this session!
                </ThemedText>
              </View>
            </SurfaceCard>
          )}
        </ScrollView>

        {/* Footer Actions */}
        {!isCoach && !isRegistered && (
          <View style={[styles.footer, { borderTopColor: palette.border }]}>
            <Pressable
              onPress={handleBook}
              disabled={isFull}
              style={[
                styles.bookButton,
                {
                  backgroundColor: isFull ? palette.muted : palette.tint,
                },
              ]}>
              <ThemedText
                style={[styles.bookButtonText, { color: scheme === 'light' ? '#FFFFFF' : '#000000' }]}>
                {isFull ? 'Session Full' : 'Book Now'}
              </ThemedText>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  card: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  title: {
    fontSize: 20,
  },
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: '#00000020',
    marginVertical: Spacing.xs,
  },
  description: {
    fontSize: 14,
    opacity: 0.8,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radii.pill,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  price: {
    marginLeft: 'auto',
    fontSize: 18,
  },
  emptyText: {
    fontSize: 14,
    opacity: 0.6,
    fontStyle: 'italic',
  },
  registration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  regName: {
    flex: 1,
    fontWeight: '600',
  },
  regDate: {
    fontSize: 12,
    opacity: 0.6,
  },
  childOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: 12,
    borderWidth: 2,
    marginTop: Spacing.xs,
  },
  weeksSelector: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  weekButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  weekButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  registeredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  registeredText: {
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 1,
  },
  bookButton: {
    paddingVertical: Spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
  },
  bookButtonText: {
    fontSize: 17,
    fontWeight: '700',
  },
});
