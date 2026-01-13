import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { SessionOffering } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { getChildrenForParent } from '@/constants/mock-data';
import { scale, scaleFont } from '@/utils/scale';
import { hasChildren } from '@/utils/user-helpers';
import { badgeService } from '@/services/badge-service';
import type { BadgeAward } from '@/constants/types';

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
  const [sessionAwards, setSessionAwards] = useState<BadgeAward[]>([]);

  useEffect(() => {
    if (visible && offering) {
      badgeService.listAwardsForSession(offering.id).then(setSessionAwards);
    }
  }, [offering, visible]);

  if (!offering) return null;

  const isCoach = currentUser?.role === 'COACH';
  const isMyOffering = offering.coachId === currentUser?.id;
  const registeredCount = offering.registrations.filter(r => r.status === 'confirmed').length;
  const isFull = registeredCount >= offering.maxParticipants;
  const isRegistered = offering.registrations.some(
    r => r.userId === currentUser?.id && r.status === 'confirmed'
  );

  const children = hasChildren(currentUser) ? getChildrenForParent(currentUser.id) : [];
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
        ? `Booked for the next ${weeksToBook} week${weeksToBook > 1 ? 's' : ''}`
        : 'Session booked');

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

          {sessionAwards.length > 0 && (
            <View style={styles.awardsBlock}>
              <ThemedText type="defaultSemiBold">Badges linked to this session</ThemedText>
              <View style={styles.awardsRow}>
                {sessionAwards.map((award) => (
                  <View key={award.id} style={[styles.awardChip, { borderColor: palette.border }]}>
                    <ThemedText type="defaultSemiBold">{award.badgeLabel}</ThemedText>
                    <ThemedText style={styles.awardMeta}>
                      Awarded {new Date(award.awardedAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                      {' '}by {award.awardedByName || award.coachName || 'Coach'}
                    </ThemedText>
                  </View>
                ))}
              </View>
              <Pressable
                onPress={() =>
                  router.push({ pathname: '/development/badges', params: { sessionId: offering.id } })
                }
                style={styles.manageBadgesLink}
                accessibilityLabel="Open badges workspace"
                accessibilityHint="Link badges to this session"
                accessibilityRole="button"
              >
                <View style={styles.manageLinkRow}>
                  <Ionicons name="link-outline" size={14} color={palette.tint} />
                  <Ionicons name="arrow-forward" size={14} color={palette.tint} />
                </View>
              </Pressable>
            </View>
          )}
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
                  Registered for this session
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: scaleFont(18),
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    marginBottom: 16,
    padding: 20,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  title: {
    fontSize: scaleFont(24),
    fontWeight: '700',
    letterSpacing: -0.6,
    lineHeight: scaleFont(32),
  },
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginTop: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  divider: {
    height: 1,
    backgroundColor: '#00000008',
    marginVertical: 14,
  },
  description: {
    fontSize: scaleFont(15),
    opacity: 0.7,
    lineHeight: scaleFont(22),
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  awardsBlock: {
    gap: 8,
    marginTop: 12,
  },
  awardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  awardChip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  awardMeta: {
    color: '#6B7280',
    fontSize: 12,
    lineHeight: 16,
  },
  manageBadgesLink: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  manageLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: scaleFont(13),
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  price: {
    marginLeft: 'auto',
    fontSize: scaleFont(24),
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  emptyText: {
    fontSize: scaleFont(15),
    opacity: 0.5,
    fontStyle: 'italic',
    marginTop: 10,
    lineHeight: scaleFont(21),
  },
  registration: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  regName: {
    flex: 1,
    fontWeight: '600',
    fontSize: scaleFont(15),
    lineHeight: scaleFont(21),
  },
  regDate: {
    fontSize: scaleFont(13),
    opacity: 0.5,
  },
  childOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginTop: 10,
  },
  weeksSelector: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  weekButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  weekButtonText: {
    fontSize: scaleFont(15),
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  registeredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  registeredText: {
    fontSize: scaleFont(17),
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: scaleFont(23),
  },
  footer: {
    padding: 20,
    borderTopWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  bookButton: {
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  bookButtonText: {
    fontSize: scaleFont(18),
    fontWeight: '700',
    letterSpacing: -0.4,
  },
});
