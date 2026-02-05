/**
 * Block Date Screen
 *
 * Allows coaches to block specific dates from their availability.
 *
 * USER STORY:
 * "As a coach, I want to block specific dates when I'm unavailable
 * so parents don't try to book sessions on those days."
 */

import { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { PageHeader } from '@/components/primitives/page-header';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/use-auth';
import { availabilityService } from '@/services/availability-service';
import { createLogger } from '@/utils/logger';

const logger = createLogger('BlockDate');

const REASON_OPTIONS = [
  { key: 'holiday', label: 'Holiday/Vacation', icon: 'airplane-outline' },
  { key: 'personal', label: 'Personal Day', icon: 'person-outline' },
  { key: 'illness', label: 'Illness', icon: 'medical-outline' },
  { key: 'training', label: 'Coach Training', icon: 'school-outline' },
  { key: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

export default function BlockDateScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const { currentUser } = useAuth();

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [reason, setReason] = useState('personal');
  const [customReason, setCustomReason] = useState('');
  const [saving, setSaving] = useState(false);

  // Generate next 30 days for selection
  const generateDates = () => {
    const dates: Date[] = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const dates = generateDates();

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.toDateString() === d2.toDateString();
  };

  const handleSave = async () => {
    if (!currentUser?.id) return;

    const reasonText = reason === 'other' ? customReason : REASON_OPTIONS.find(r => r.key === reason)?.label;

    if (reason === 'other' && !customReason.trim()) {
      Alert.alert('Reason Required', 'Please enter a reason for blocking this date');
      return;
    }

    setSaving(true);
    try {
      await availabilityService.saveOverride({
        coachId: currentUser.id,
        date: selectedDate.toISOString().split('T')[0],
        isBlocked: true,
        reason: reasonText,
      });

      Alert.alert('Date Blocked', `${formatDate(selectedDate)} has been blocked`, [
        { text: 'OK', onPress: () => router.back() },
      ]);

      logger.success('DateBlocked', { date: selectedDate.toISOString(), reason: reasonText });
    } catch (error) {
      logger.error('Failed to block date', error);
      Alert.alert('Error', 'Failed to block date');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <PageHeader title="Block Date" showBack onBackPress={() => router.back()} />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
        {/* Date Selection */}
        <SurfaceCard style={styles.section}>
          <ThemedText type="subtitle">Select Date to Block</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.dateGrid}>
              {dates.map((date, index) => {
                const isSelected = isSameDay(date, selectedDate);
                const isToday = isSameDay(date, new Date());
                return (
                  <Pressable
                    key={index}
                    style={[
                      styles.dateCard,
                      {
                        borderColor: isSelected ? palette.error : palette.border,
                        backgroundColor: isSelected ? `${palette.error}15` : palette.surface,
                      },
                    ]}
                    onPress={() => setSelectedDate(date)}
                  >
                    <ThemedText style={[styles.dateDay, { color: palette.muted }]}>
                      {date.toLocaleDateString('en-GB', { weekday: 'short' })}
                    </ThemedText>
                    <ThemedText
                      type="defaultSemiBold"
                      style={[styles.dateNum, isSelected && { color: palette.error }]}
                    >
                      {date.getDate()}
                    </ThemedText>
                    <ThemedText style={[styles.dateMonth, { color: palette.muted }]}>
                      {date.toLocaleDateString('en-GB', { month: 'short' })}
                    </ThemedText>
                    {isToday && (
                      <View style={[styles.todayDot, { backgroundColor: palette.tint }]} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </SurfaceCard>

        {/* Reason Selection */}
        <SurfaceCard style={styles.section}>
          <ThemedText type="subtitle">Reason (shown to clients)</ThemedText>
          <View style={styles.reasonGrid}>
            {REASON_OPTIONS.map((option) => {
              const isSelected = reason === option.key;
              return (
                <Pressable
                  key={option.key}
                  style={[
                    styles.reasonCard,
                    {
                      borderColor: isSelected ? palette.tint : palette.border,
                      backgroundColor: isSelected ? `${palette.tint}10` : palette.surface,
                    },
                  ]}
                  onPress={() => setReason(option.key)}
                >
                  <Ionicons
                    name={option.icon as any}
                    size={24}
                    color={isSelected ? palette.tint : palette.muted}
                  />
                  <ThemedText
                    style={[styles.reasonLabel, isSelected ? { color: palette.tint } : undefined]}
                  >
                    {option.label}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>

          {reason === 'other' && (
            <TextInput
              style={[styles.input, { borderColor: palette.border, color: palette.text }]}
              placeholder="Enter reason..."
              placeholderTextColor={palette.muted}
              value={customReason}
              onChangeText={setCustomReason}
            />
          )}
        </SurfaceCard>

        {/* Preview */}
        <SurfaceCard style={[styles.section, { backgroundColor: `${palette.error}08` }]}>
          <View style={styles.previewHeader}>
            <Ionicons name="close-circle" size={20} color={palette.error} />
            <ThemedText type="defaultSemiBold">Preview</ThemedText>
          </View>
          <ThemedText style={{ color: palette.muted }}>
            {formatDate(selectedDate)} will be blocked
          </ThemedText>
          <ThemedText style={{ color: palette.muted }}>
            Reason: {reason === 'other' ? (customReason || 'Not specified') : REASON_OPTIONS.find(r => r.key === reason)?.label}
          </ThemedText>
        </SurfaceCard>
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.footer, { backgroundColor: palette.background, borderTopColor: palette.border }]}>
        <Pressable
          style={[styles.saveButton, { backgroundColor: saving ? palette.muted : palette.error }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="close-circle" size={22} color="#fff" />
              <ThemedText style={styles.saveButtonText}>Block This Date</ThemedText>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  contentInner: { padding: Spacing.md, paddingBottom: 100, gap: Spacing.md },
  section: { padding: Spacing.md, gap: Spacing.sm },
  dateGrid: { flexDirection: 'row', gap: Spacing.sm, paddingVertical: Spacing.xs },
  dateCard: {
    width: 70,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 2,
  },
  dateDay: { fontSize: 11, fontWeight: '500' },
  dateNum: { fontSize: 20, fontWeight: '700' },
  dateMonth: { fontSize: 11 },
  todayDot: { width: 6, height: 6, borderRadius: 3, marginTop: 4 },
  reasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  reasonCard: {
    width: '48%',
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  reasonLabel: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  input: {
    borderWidth: 1.5,
    borderRadius: Radii.md,
    padding: Spacing.md,
    fontSize: 16,
    marginTop: Spacing.sm,
  },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  footer: { padding: Spacing.md, borderTopWidth: 1 },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
  },
  saveButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
