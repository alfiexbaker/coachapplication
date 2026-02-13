/**
 * CoachWelcome — Individual onboarding screens.
 */
import { memo } from 'react';
import { Alert, Share, View, TextInput, StyleSheet, ScrollView } from 'react-native';
import { Row } from '@/components/primitives/row';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Components, Radii, Spacing, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { SPECIALTIES, DAYS, PERIODS, VALUE_PROPS, SCREEN_WIDTH } from './coach-welcome-data';

/* ─── Screen 1: Value Proposition ─── */
export const ValuePropScreen = memo(function ValuePropScreen() {
  const { colors: palette } = useTheme();
  return (
    <View style={[styles.page, { width: SCREEN_WIDTH }]}>
      <View style={styles.pageContent}>
        <Ionicons name="fitness-outline" size={64} color={palette.tint} />
        <ThemedText style={[Typography.display, { color: palette.text, textAlign: 'center' }]}>
          Your coaching business starts here
        </ThemedText>
        <View style={styles.valuePropsContainer}>
          {VALUE_PROPS.map((prop) => (
            <Row key={prop.text} align="center" gap="sm">
              <View
                style={[styles.valuePropIcon, { backgroundColor: withAlpha(palette.tint, 0.06) }]}
              >
                <Ionicons name={prop.icon} size={Components.icon.lg} color={palette.tint} />
              </View>
              <ThemedText style={[Typography.body, { color: palette.text, flex: 1 }]}>
                {prop.text}
              </ThemedText>
            </Row>
          ))}
        </View>
      </View>
    </View>
  );
});

/* ─── Screen 2: Profile Setup ─── */
interface ProfileSetupScreenProps {
  headline: string;
  onHeadlineChange: (v: string) => void;
  bio: string;
  onBioChange: (v: string) => void;
  selectedSpecialties: string[];
  onToggleSpecialty: (s: string) => void;
}
export const ProfileSetupScreen = memo(function ProfileSetupScreen({
  headline,
  onHeadlineChange,
  bio,
  onBioChange,
  selectedSpecialties,
  onToggleSpecialty,
}: ProfileSetupScreenProps) {
  const { colors: palette } = useTheme();
  return (
    <View style={[styles.page, { width: SCREEN_WIDTH }]}>
      <ScrollView
        style={styles.scrollInner}
        contentContainerStyle={styles.pageContent}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={[Typography.title, { color: palette.text, textAlign: 'center' }]}>
          Set up your profile
        </ThemedText>
        <View
          style={[
            styles.photoPlaceholder,
            { backgroundColor: palette.surfaceSecondary, borderColor: palette.border },
          ]}
        >
          <Ionicons name="camera-outline" size={Components.icon.xl} color={palette.muted} />
          <ThemedText style={[Typography.small, { color: palette.muted }]}>Add Photo</ThemedText>
        </View>
        <View style={styles.inputGroup}>
          <ThemedText style={[Typography.caption, { color: palette.muted }]}>HEADLINE</ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
                color: palette.text,
              },
            ]}
            placeholder="e.g. FA Level 2 Football Coach"
            placeholderTextColor={palette.muted}
            value={headline}
            onChangeText={onHeadlineChange}
          />
        </View>
        <View style={styles.inputGroup}>
          <ThemedText style={[Typography.caption, { color: palette.muted }]}>BIO</ThemedText>
          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: palette.surface,
                borderColor: palette.border,
                color: palette.text,
              },
            ]}
            placeholder="Tell parents about your coaching experience..."
            placeholderTextColor={palette.muted}
            value={bio}
            onChangeText={onBioChange}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
        <View style={styles.inputGroup}>
          <ThemedText style={[Typography.caption, { color: palette.muted }]}>
            SPECIALTIES
          </ThemedText>
          <Row wrap gap="xs">
            {SPECIALTIES.map((specialty) => {
              const selected = selectedSpecialties.includes(specialty);
              return (
                <Clickable
                  key={specialty}
                  onPress={() => onToggleSpecialty(specialty)}
                  style={[
                    styles.tag,
                    {
                      backgroundColor: selected ? palette.tint : palette.surface,
                      borderColor: selected ? palette.tint : palette.border,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      Typography.small,
                      { color: selected ? palette.onPrimary : palette.text },
                    ]}
                  >
                    {specialty}
                  </ThemedText>
                </Clickable>
              );
            })}
          </Row>
        </View>
      </ScrollView>
    </View>
  );
});

/* ─── Screen 3: Set Rate ─── */
interface RateScreenProps {
  rate: string;
  onRateChange: (v: string) => void;
}
export const RateScreen = memo(function RateScreen({ rate, onRateChange }: RateScreenProps) {
  const { colors: palette } = useTheme();
  return (
    <View style={[styles.page, { width: SCREEN_WIDTH }]}>
      <View style={styles.pageContent}>
        <Ionicons name="cash-outline" size={48} color={palette.tint} />
        <ThemedText style={[Typography.title, { color: palette.text, textAlign: 'center' }]}>
          Set your hourly rate
        </ThemedText>
        <SurfaceCard style={styles.rateCard} tactile={false}>
          <Row align="center" gap="xs">
            <ThemedText style={[Typography.display, { color: palette.muted }]}>
              {'\u00A3'}
            </ThemedText>
            <TextInput
              style={[styles.rateInput, { color: palette.text }]}
              placeholder="40"
              placeholderTextColor={palette.muted}
              value={rate}
              onChangeText={onRateChange}
              keyboardType="numeric"
              maxLength={4}
            />
            <ThemedText style={[Typography.body, { color: palette.muted }]}>/hr</ThemedText>
          </Row>
        </SurfaceCard>
        <Row
          align="center"
          gap="xs"
          style={[styles.rateHint, { backgroundColor: withAlpha(palette.tint, 0.03) }]}
        >
          <Ionicons
            name="information-circle-outline"
            size={Components.icon.md}
            color={palette.tint}
          />
          <ThemedText style={[Typography.small, { color: palette.muted, flex: 1 }]}>
            Coaches near you charge {'\u00A3'}30-55/hr
          </ThemedText>
        </Row>
      </View>
    </View>
  );
});

/* ─── Screen 4: Availability ─── */
interface AvailabilityScreenProps {
  availability: Record<string, boolean>;
  onToggle: (day: string, period: string) => void;
}
export const AvailabilityScreen = memo(function AvailabilityScreen({
  availability,
  onToggle,
}: AvailabilityScreenProps) {
  const { colors: palette } = useTheme();
  return (
    <View style={[styles.page, { width: SCREEN_WIDTH }]}>
      <View style={styles.pageContent}>
        <ThemedText style={[Typography.title, { color: palette.text, textAlign: 'center' }]}>
          Quick availability
        </ThemedText>
        <ThemedText style={[Typography.small, { color: palette.muted, textAlign: 'center' }]}>
          Tap slots when you can coach. You can fine-tune later.
        </ThemedText>
        <View style={styles.availabilityGrid}>
          <Row gap="xs" align="center">
            <View style={styles.availLabelCell} />
            {PERIODS.map((period) => (
              <View key={period} style={styles.availHeaderCell}>
                <ThemedText style={[Typography.caption, { color: palette.muted }]}>
                  {period}
                </ThemedText>
              </View>
            ))}
          </Row>
          {DAYS.map((day) => (
            <Row key={day} gap="xs" align="center">
              <View style={styles.availLabelCell}>
                <ThemedText style={[Typography.bodySemiBold, { color: palette.text }]}>
                  {day}
                </ThemedText>
              </View>
              {PERIODS.map((period) => {
                const key = `${day}_${period}`;
                const active = availability[key];
                return (
                  <Clickable
                    key={key}
                    onPress={() => onToggle(day, period)}
                    style={[
                      styles.availCell,
                      {
                        backgroundColor: active
                          ? withAlpha(palette.success, 0.12)
                          : palette.surface,
                        borderColor: active ? palette.success : palette.border,
                      },
                    ]}
                  >
                    {active && (
                      <Ionicons
                        name="checkmark"
                        size={Components.icon.md}
                        color={palette.success}
                      />
                    )}
                  </Clickable>
                );
              })}
            </Row>
          ))}
        </View>
      </View>
    </View>
  );
});

/* ─── Screen 5: Ready ─── */
export const ReadyScreen = memo(function ReadyScreen() {
  const { colors: palette } = useTheme();
  const profileUrl = 'https://clubroom.app/coach/you';

  const handleShareProfile = async () => {
    try {
      await Share.share({
        title: 'My Clubroom coaching profile',
        message: `Book sessions with me on Clubroom: ${profileUrl}`,
      });
    } catch {
      Alert.alert('Unable to share', 'Try again in a moment.');
    }
  };

  return (
    <View style={[styles.page, { width: SCREEN_WIDTH }]}>
      <View style={styles.pageContent}>
        <Ionicons name="checkmark-circle" size={80} color={palette.success} />
        <ThemedText style={[Typography.display, { color: palette.text, textAlign: 'center' }]}>
          You&apos;re ready!
        </ThemedText>
        <ThemedText style={[Typography.body, { color: palette.muted, textAlign: 'center' }]}>
          Share your profile link with parents so they can book you directly.
        </ThemedText>
        <SurfaceCard style={styles.shareLinkCard} tactile={false}>
          <Row align="center" gap="sm">
            <Ionicons name="link-outline" size={Components.icon.lg} color={palette.tint} />
            <View style={styles.shareLinkText}>
              <ThemedText style={[Typography.small, { color: palette.muted }]}>
                Your profile link
              </ThemedText>
              <ThemedText style={[Typography.bodySemiBold, { color: palette.text }]}>
                clubroom.app/coach/you
              </ThemedText>
            </View>
          </Row>
          <Clickable
            onPress={handleShareProfile}
            accessibilityLabel="Share coach profile link"
            style={[styles.shareButton, { backgroundColor: palette.tint }]}
          >
            <Ionicons name="share-outline" size={Components.icon.md} color={palette.onPrimary} />
            <ThemedText style={[Typography.bodySemiBold, { color: palette.onPrimary }]}>
              Share Link
            </ThemedText>
          </Clickable>
        </SurfaceCard>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  page: { flex: 1 },
  scrollInner: { flex: 1 },
  pageContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  valuePropsContainer: { width: '100%', gap: Spacing.sm, marginTop: Spacing.md },
  valuePropRow: {
    /* layout moved to Row */
  },
  valuePropIcon: {
    width: 48,
    height: 48,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: Radii['2xl'],
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs / 2,
  },
  inputGroup: { width: '100%', gap: Spacing.xs },
  input: {
    height: Components.input.height,
    borderRadius: Components.input.borderRadius,
    borderWidth: 1,
    paddingHorizontal: Components.input.paddingHorizontal,
    ...Typography.body,
  },
  textArea: {
    height: 100,
    borderRadius: Components.input.borderRadius,
    borderWidth: 1,
    paddingHorizontal: Components.input.paddingHorizontal,
    paddingVertical: Spacing.sm,
    ...Typography.body,
  },
  tagsContainer: {
    /* layout moved to Row */
  },
  tag: {
    paddingHorizontal: Components.chip.paddingHorizontal,
    paddingVertical: Components.chip.paddingVertical,
    borderRadius: Components.chip.borderRadius,
    borderWidth: 1,
  },
  rateCard: { width: '100%', alignItems: 'center', paddingVertical: Spacing.lg },
  rateInputRow: {
    /* layout moved to Row */
  },
  rateInput: { ...Typography.display, minWidth: 100, textAlign: 'center' },
  rateHint: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    width: '100%',
  },
  availabilityGrid: { width: '100%', gap: Spacing.xs },
  availRow: {
    /* layout moved to Row */
  },
  availLabelCell: { width: 44, alignItems: 'center' },
  availHeaderCell: { flex: 1, alignItems: 'center', paddingVertical: Spacing.xs },
  availCell: {
    flex: 1,
    height: Components.button.height,
    borderRadius: Radii.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareLinkCard: { width: '100%', gap: Spacing.sm },
  shareLinkRow: {
    /* layout moved to Row */
  },
  shareLinkText: { flex: 1, gap: Spacing.micro },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: Components.button.height,
    borderRadius: Radii.button,
    gap: Spacing.xs,
  },
});
