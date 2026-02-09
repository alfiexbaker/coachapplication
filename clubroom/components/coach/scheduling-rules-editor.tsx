/**
 * SchedulingRulesEditor — Composition root.
 * Inline component with stepper inputs for coach scheduling rules.
 * Auto-saves on each change with 500ms debounce.
 */
import { View, StyleSheet, ActivityIndicator } from 'react-native';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Divider } from '@/components/ui/primitives/Divider';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useSchedulingRulesEditor } from '@/hooks/use-scheduling-rules-editor';
import type { CoachSchedulingRules } from '@/constants/types';
import { STEPPER_FIELDS } from './scheduling-rules-editor-config';
import { StepperRow, ToggleRow, InfoBanner, SavedToast } from './scheduling-rules-editor-sections';

interface SchedulingRulesEditorProps {
  coachId: string;
  onSaved?: (rules: CoachSchedulingRules) => void;
}

export function SchedulingRulesEditor({ coachId, onSaved }: SchedulingRulesEditorProps) {
  const { colors: palette } = useTheme();
  const { loading, rules, toastVisible, toastAnimatedStyle, handleStepperChange, handleToggle } = useSchedulingRulesEditor(coachId, onSaved);

  if (loading) {
    return <View style={styles.loadingWrap}><ActivityIndicator size="small" color={palette.tint} /></View>;
  }

  if (!rules) {
    return <View style={styles.loadingWrap}><ThemedText style={{ color: palette.muted }}>Unable to load rules</ThemedText></View>;
  }

  const visibleSteppers = STEPPER_FIELDS.filter((f) => {
    if (f.key === 'rescheduleDeadlineHours' && !rules.allowRescheduling) return false;
    return true;
  });

  return (
    <View style={styles.root}>
      <SavedToast visible={toastVisible} animatedStyle={toastAnimatedStyle} />
      <InfoBanner />

      <SurfaceCard style={styles.card}>
        {visibleSteppers.map((config, idx) => (
          <View key={config.key}>
            {idx > 0 && <Divider spacing={Spacing.xs} />}
            <StepperRow config={config} value={rules[config.key] as number} onChange={(v) => handleStepperChange(config.key, v)} />
          </View>
        ))}
      </SurfaceCard>

      <SurfaceCard style={styles.card}>
        <ToggleRow icon="today-outline" iconColor={palette.success} label="Same-Day Bookings"
          helper="Allow athletes to book sessions for today" value={rules.allowSameDayBookings}
          onValueChange={(v) => handleToggle('allowSameDayBookings', v)} trackColor={palette.success} />
        <Divider spacing={Spacing.xs} />
        <ToggleRow icon="swap-horizontal-outline" iconColor={palette.tint} label="Allow Rescheduling"
          helper="Let athletes change their booking time" value={rules.allowRescheduling}
          onValueChange={(v) => handleToggle('allowRescheduling', v)} trackColor={palette.tint} />
      </SurfaceCard>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.md },
  loadingWrap: { padding: Spacing.lg, alignItems: 'center', justifyContent: 'center' },
  card: { padding: Spacing.sm },
});
