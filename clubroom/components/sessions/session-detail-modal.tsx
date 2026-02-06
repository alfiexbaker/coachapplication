import { useEffect, useState, useMemo } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '@/services/api-client';
import { router } from 'expo-router';
import { Routes } from '@/navigation/routes';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Divider } from '@/components/ui/primitives/Divider';
import { Colors, Radii, Typography, Spacing, withAlpha } from '@/constants/theme';
import { SessionOffering } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { getChildrenForParent } from '@/constants/mock-data';
import { scale, scaleFont } from '@/utils/scale';
import { hasChildren } from '@/utils/user-helpers';
import { badgeService } from '@/services/badge-service';
import type { BadgeAward } from '@/constants/types';

// Helper to generate upcoming instances for a recurring session
function getUpcomingInstances(offering: SessionOffering, count: number = 8): Date[] {
  if (!offering.isRecurring || offering.dayOfWeek === undefined) return [];

  const instances: Date[] = [];
  const now = new Date();
  const endDate = offering.endDate ? new Date(offering.endDate) : null;
  const cancelledDates = new Set(offering.cancelledInstances || []);

  // Start from the original scheduled date or today
  let currentDate = new Date(offering.scheduledAt);
  if (currentDate < now) {
    // Move to the next occurrence
    currentDate = new Date(now);
    const targetDay = offering.dayOfWeek;
    const currentDay = currentDate.getDay();
    const daysUntilTarget = (targetDay - currentDay + 7) % 7;
    currentDate.setDate(currentDate.getDate() + (daysUntilTarget === 0 ? 0 : daysUntilTarget));
  }

  // Set the time from timeOfDay
  if (offering.timeOfDay) {
    const [hours, minutes] = offering.timeOfDay.split(':').map(Number);
    currentDate.setHours(hours, minutes, 0, 0);
  }

  // If today's time has passed, move to next week
  if (currentDate <= now) {
    const increment = offering.recurrenceType === 'biweekly' ? 14 : 7;
    currentDate.setDate(currentDate.getDate() + increment);
  }

  const increment = offering.recurrenceType === 'biweekly' ? 14 : 7;

  while (instances.length < count) {
    if (endDate && currentDate > endDate) break;

    const dateStr = currentDate.toISOString().split('T')[0];
    if (!cancelledDates.has(dateStr)) {
      instances.push(new Date(currentDate));
    }

    currentDate.setDate(currentDate.getDate() + increment);
  }

  return instances;
}

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
  const [showInstanceManagement, setShowInstanceManagement] = useState(false);

  useEffect(() => {
    if (visible && offering) {
      badgeService.listAwardsForSession(offering.id).then(setSessionAwards);
      setShowInstanceManagement(false);
    }
  }, [offering, visible]);

  // Get upcoming instances for recurring sessions
  const upcomingInstances = useMemo(() => {
    if (!offering) return [];
    return getUpcomingInstances(offering, 8);
  }, [offering]);

  // Cancel a specific instance
  const handleCancelInstance = async (instanceDate: Date) => {
    if (!offering) return;

    const dateStr = instanceDate.toISOString().split('T')[0];
    const formattedDate = instanceDate.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    Alert.alert(
      'Cancel Session',
      `Cancel the session on ${formattedDate}? Athletes will be notified.`,
      [
        { text: 'Keep Session', style: 'cancel' },
        {
          text: 'Cancel Session',
          style: 'destructive',
          onPress: async () => {
            try {
              const offerings = await apiClient.get<SessionOffering[]>('session_offerings', []);
              const updatedOfferings = offerings.map(o => {
                if (o.id === offering.id) {
                  const cancelledInstances = [...(o.cancelledInstances || []), dateStr];
                  return { ...o, cancelledInstances };
                }
                return o;
              });
              await apiClient.set('session_offerings', updatedOfferings);
              Alert.alert('Cancelled', `Session on ${formattedDate} has been cancelled.`);
              onUpdate?.();
            } catch {
              Alert.alert('Error', 'Failed to cancel session. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Cancel booking (parent/athlete action)
  const handleCancelBooking = async () => {
    if (!offering || !currentUser) return;

    const myRegistration = offering.registrations.find(
      r => r.userId === currentUser.id && r.status === 'confirmed'
    );

    if (!myRegistration) return;

    Alert.alert(
      'Cancel Booking',
      `Are you sure you want to cancel your booking for "${offering.title}"? The coach will be notified.`,
      [
        { text: 'Keep Booking', style: 'cancel' },
        {
          text: 'Cancel Booking',
          style: 'destructive',
          onPress: async () => {
            try {
              const offerings = await apiClient.get<SessionOffering[]>('session_offerings', []);
              const updatedOfferings = offerings.map(o => {
                if (o.id === offering.id) {
                  const updatedRegistrations = o.registrations.map(reg =>
                    reg.id === myRegistration.id
                      ? { ...reg, status: 'cancelled' as const }
                      : reg
                  );
                  return {
                    ...o,
                    registrations: updatedRegistrations,
                    status: o.status === 'full' ? 'active' as const : o.status,
                  };
                }
                return o;
              });
              await apiClient.set('session_offerings', updatedOfferings);
              Alert.alert('Booking Cancelled', 'Your booking has been cancelled. The coach has been notified.');
              onUpdate?.();
              onClose();
            } catch {
              Alert.alert('Error', 'Failed to cancel booking. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Cancel all future instances (end the series)
  const handleEndSeries = async () => {
    if (!offering) return;

    Alert.alert(
      'End Recurring Series',
      'This will cancel all future sessions. Athletes will be notified. Are you sure?',
      [
        { text: 'Keep Sessions', style: 'cancel' },
        {
          text: 'End Series',
          style: 'destructive',
          onPress: async () => {
            try {
              const offerings = await apiClient.get<SessionOffering[]>('session_offerings', []);
              const updatedOfferings = offerings.map(o => {
                if (o.id === offering.id) {
                  // Set end date to today to stop future occurrences
                  return {
                    ...o,
                    endDate: new Date().toISOString().split('T')[0],
                    status: 'cancelled' as const,
                  };
                }
                return o;
              });
              await apiClient.set('session_offerings', updatedOfferings);
              Alert.alert('Series Ended', 'All future sessions have been cancelled.');
              onUpdate?.();
              onClose();
            } catch {
              Alert.alert('Error', 'Failed to end series. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (!offering) return null;

  const isCoach = currentUser?.role === 'COACH';
  const isMyOffering = offering.coachId === currentUser?.id;
  const registeredCount = offering.registrations.filter(r => r.status === 'confirmed').length;
  const isFull = registeredCount >= offering.maxParticipants;
  const isRegistered = offering.registrations.some(
    r => r.userId === currentUser?.id && r.status === 'confirmed'
  );

  const children = currentUser && hasChildren(currentUser) ? getChildrenForParent(currentUser.id) : [];
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
      const offerings = await apiClient.get<SessionOffering[]>('session_offerings', []);
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

      await apiClient.set('session_offerings', updatedOfferings);

      Alert.alert('Success', offering.isRecurring
        ? `Booked for the next ${weeksToBook} week${weeksToBook > 1 ? 's' : ''}`
        : 'Session booked');

      onUpdate?.();
      onClose();
    } catch {
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
                <Divider spacing={14} />
                <ThemedText style={styles.description}>{offering.description}</ThemedText>
              </>
            )}

            <View style={styles.metaRow}>
              {offering.sessionType === 'group' && (
                <View style={[styles.badge, { backgroundColor: withAlpha(palette.accent, 0.09) }]}>
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
              <View style={[styles.badge, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
                <ThemedText style={[styles.badgeText, { color: palette.tint }]}>
                  {offering.footballSkill}
                </ThemedText>
              </View>
            )}
            {offering.priceUsd !== undefined && offering.priceUsd > 0 && (
              <ThemedText type="defaultSemiBold" style={styles.price}>
                £{offering.priceUsd}
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
                  router.push(Routes.DEVELOPMENT_BADGES)
                }
                style={styles.manageBadgesLink}
                accessibilityLabel="Open badges workspace"
                accessibilityHint="Link badges to this session"
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

          {/* Coach View: Instance Management for Recurring Sessions */}
          {isMyOffering && offering.isRecurring && (
            <SurfaceCard style={styles.card}>
              <Pressable
                style={styles.instanceHeader}
                onPress={() => setShowInstanceManagement(!showInstanceManagement)}
              >
                <View style={styles.instanceHeaderLeft}>
                  <Ionicons name="calendar" size={20} color={palette.tint} />
                  <ThemedText type="subtitle" style={styles.instanceTitle}>
                    Manage Sessions
                  </ThemedText>
                </View>
                <Ionicons
                  name={showInstanceManagement ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={palette.icon}
                />
              </Pressable>

              {showInstanceManagement && (
                <View style={styles.instanceContent}>
                  <ThemedText style={[styles.instanceSubtitle, { color: palette.muted }]}>
                    Upcoming sessions ({upcomingInstances.length})
                  </ThemedText>

                  {upcomingInstances.length === 0 ? (
                    <ThemedText style={styles.emptyText}>No upcoming sessions</ThemedText>
                  ) : (
                    upcomingInstances.map((instance, index) => (
                      <View
                        key={instance.toISOString()}
                        style={[styles.instanceRow, { borderBottomColor: palette.border }]}
                      >
                        <View style={styles.instanceInfo}>
                          <ThemedText style={styles.instanceDate}>
                            {instance.toLocaleDateString('en-GB', {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                            })}
                          </ThemedText>
                          <ThemedText style={[styles.instanceTime, { color: palette.muted }]}>
                            {instance.toLocaleTimeString('en-GB', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </ThemedText>
                        </View>
                        <Pressable
                          style={[styles.cancelInstanceButton, { borderColor: palette.error }]}
                          onPress={() => handleCancelInstance(instance)}
                        >
                          <Ionicons name="close" size={16} color={palette.error} />
                        </Pressable>
                      </View>
                    ))
                  )}

                  {/* End Series Button */}
                  <Pressable
                    style={[styles.endSeriesButton, { backgroundColor: withAlpha(palette.error, 0.06), borderColor: palette.error }]}
                    onPress={handleEndSeries}
                  >
                    <Ionicons name="stop-circle-outline" size={20} color={palette.error} />
                    <ThemedText style={[styles.endSeriesText, { color: palette.error }]}>
                      End Recurring Series
                    </ThemedText>
                  </Pressable>
                </View>
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
                          backgroundColor: selectedChildId === child.id ? withAlpha(palette.tint, 0.09) : palette.card,
                          borderColor: selectedChildId === child.id ? palette.tint : palette.border,
                        },
                      ]}>
                      <Ionicons
                        name={selectedChildId === child.id ? 'radio-button-on' : 'radio-button-off'}
                        size={20}
                        color={selectedChildId === child.id ? palette.tint : palette.icon}
                      />
                      <ThemedText>{child.name}</ThemedText>
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
                            weeksToBook === weeks && { color: palette.onPrimary },
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
            <SurfaceCard style={[styles.card, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
              <View style={styles.registeredBanner}>
                <Ionicons name="checkmark-circle" size={24} color={palette.success} />
                <View style={styles.registeredInfo}>
                  <ThemedText style={[styles.registeredText, { color: palette.success }]}>
                    Registered for this session
                  </ThemedText>
                  <Pressable
                    style={styles.cancelBookingLink}
                    onPress={handleCancelBooking}
                  >
                    <ThemedText style={[styles.cancelBookingText, { color: palette.error }]}>
                      Cancel Booking
                    </ThemedText>
                  </Pressable>
                </View>
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
                style={[styles.bookButtonText, { color: palette.onPrimary }]}>
                {isFull ? 'Session Full' : 'Book Now'}
              </ThemedText>
            </Pressable>
          </View>
        )}

        {/* Coach Footer Actions */}
        {isMyOffering && registeredCount > 0 && (
          <View style={[styles.footer, { borderTopColor: palette.border }]}>
            <Pressable
              onPress={() => {
                onClose();
                router.push(Routes.sessionComplete(offering.id));
              }}
              style={[
                styles.completeButton,
                { backgroundColor: palette.success },
              ]}>
              <Ionicons name="checkmark-circle" size={22} color={palette.onSuccess} />
              <ThemedText style={styles.completeButtonText}>
                Complete Session
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
    shadowColor: Colors.light.text,
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
    marginTop: Spacing.xxs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: Spacing.xxs,
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
    marginTop: Spacing.xs + Spacing.xxs,
  },
  awardsBlock: {
    gap: 8,
    marginTop: Spacing.xs + Spacing.xxs,
  },
  awardsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  awardChip: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: 10,
    paddingVertical: Spacing.xxs,
    gap: Spacing.xxs,
  },
  awardMeta: { ...Typography.caption, color: Colors.light.muted,
    lineHeight: 16 },
  manageBadgesLink: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  manageLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  badge: {
    paddingHorizontal: Spacing.xs + Spacing.xxs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.sm,
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
    gap: Spacing.xs + Spacing.xxs,
    paddingVertical: Spacing.xs + Spacing.xxs,
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
    gap: Spacing.xs + Spacing.xxs,
    padding: 16,
    borderRadius: Radii.md,
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
    borderRadius: Radii.md,
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
    alignItems: 'flex-start',
    gap: Spacing.xs + Spacing.xxs,
  },
  registeredInfo: {
    flex: 1,
    gap: Spacing.xxs,
  },
  registeredText: {
    fontSize: scaleFont(17),
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: scaleFont(23),
  },
  cancelBookingLink: {
    alignSelf: 'flex-start',
  },
  cancelBookingText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    borderTopWidth: 0,
    shadowColor: Colors.light.text,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  bookButton: {
    paddingVertical: 18,
    borderRadius: Radii.md,
    alignItems: 'center',
    shadowColor: Colors.light.text,
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
  // Instance Management Styles
  instanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  instanceHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  instanceTitle: {
    fontSize: scaleFont(16),
  },
  instanceContent: {
    marginTop: 16,
    gap: Spacing.xs + Spacing.xxs,
  },
  instanceSubtitle: {
    fontSize: scaleFont(13),
    fontWeight: '500',
  },
  instanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs + Spacing.xxs,
    borderBottomWidth: 1,
  },
  instanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  instanceDate: {
    fontSize: scaleFont(15),
    fontWeight: '600',
  },
  instanceTime: {
    fontSize: scaleFont(14),
  },
  cancelInstanceButton: {
    width: 32,
    height: 32,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endSeriesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginTop: 8,
  },
  endSeriesText: {
    fontSize: scaleFont(15),
    fontWeight: '600',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: Radii.md,
    shadowColor: Colors.light.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  completeButtonText: {
    color: Colors.light.onSuccess,
    fontSize: scaleFont(18),
    fontWeight: '700',
    letterSpacing: -0.4,
  },
});
