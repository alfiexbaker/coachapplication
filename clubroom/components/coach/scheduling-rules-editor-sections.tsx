/**
 * SchedulingRulesEditor — Sub-components.
 */
import { memo } from 'react';
import { View, StyleSheet, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated from 'react-native-reanimated';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Divider } from '@/components/ui/primitives/Divider';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import type { StepperConfig } from './scheduling-rules-editor-config';

/* ─── StepperRow ─── */
interface StepperRowProps {
  config: StepperConfig;
  value: number;
  onChange: (newValue: number) => void;
}
export const StepperRow = memo(function StepperRow({ config, value, onChange }: StepperRowProps) {
  const { colors: palette } = useTheme();
  const atMin = value <= config.min;
  const atMax = value >= config.max;
  const iconBg = palette[config.iconBgKey];

  const handleDecrement = () => {
    if (atMin) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(Math.max(config.min, value - config.step));
  };
  const handleIncrement = () => {
    if (atMax) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(Math.min(config.max, value + config.step));
  };

  return (
    <View style={styles.stepperRow}>
      <View style={styles.stepperInfo}>
        <View style={[styles.stepperIcon, { backgroundColor: withAlpha(iconBg, 0.07) }]}>
          <Ionicons name={config.icon} size={18} color={iconBg} />
        </View>
        <View style={styles.stepperLabels}>
          <ThemedText type="defaultSemiBold" style={styles.stepperLabel}>{config.label}</ThemedText>
          <ThemedText style={[styles.stepperHelper, { color: palette.muted }]}>{config.helper}</ThemedText>
        </View>
      </View>
      <View style={[styles.stepperControls, { borderColor: palette.border }]}>
        <Clickable onPress={handleDecrement} disabled={atMin} style={[styles.stepperButton, { opacity: atMin ? 0.3 : 1 }]} accessibilityLabel={`Decrease ${config.label}`}>
          <Ionicons name="remove" size={18} color={palette.text} />
        </Clickable>
        <View style={[styles.stepperValue, { borderColor: palette.border }]}>
          <ThemedText type="defaultSemiBold" style={styles.stepperValueText}>{config.formatValue(value)}</ThemedText>
        </View>
        <Clickable onPress={handleIncrement} disabled={atMax} style={[styles.stepperButton, { opacity: atMax ? 0.3 : 1 }]} accessibilityLabel={`Increase ${config.label}`}>
          <Ionicons name="add" size={18} color={palette.text} />
        </Clickable>
      </View>
    </View>
  );
});

/* ─── ToggleRow ─── */
interface ToggleRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  helper: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  trackColor: string;
}
export const ToggleRow = memo(function ToggleRow({ icon, iconColor, label, helper, value, onValueChange, trackColor }: ToggleRowProps) {
  const { colors: palette } = useTheme();
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleInfo}>
        <View style={[styles.toggleIcon, { backgroundColor: withAlpha(iconColor, 0.09) }]}>
          <Ionicons name={icon} size={16} color={iconColor} />
        </View>
        <View style={styles.toggleLabels}>
          <ThemedText type="defaultSemiBold" style={styles.toggleLabel}>{label}</ThemedText>
          <ThemedText style={[styles.toggleHelper, { color: palette.muted }]}>{helper}</ThemedText>
        </View>
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: palette.border, true: trackColor }} thumbColor={palette.surface} />
    </View>
  );
});

/* ─── InfoBanner ─── */
export const InfoBanner = memo(function InfoBanner() {
  const { colors: palette } = useTheme();
  return (
    <View style={[styles.infoBanner, { backgroundColor: withAlpha(palette.tint, 0.03) }]}>
      <Ionicons name="information-circle" size={20} color={palette.tint} />
      <ThemedText style={[styles.infoText, { color: palette.muted }]}>Changes are saved automatically as you adjust each setting.</ThemedText>
    </View>
  );
});

/* ─── SavedToast ─── */
interface SavedToastProps { visible: boolean; animatedStyle: { opacity: number }; }
export const SavedToast = memo(function SavedToast({ visible, animatedStyle }: SavedToastProps) {
  const { colors: palette } = useTheme();
  if (!visible) return null;
  return (
    <Animated.View style={[styles.toast, { backgroundColor: palette.success }, animatedStyle]}>
      <Ionicons name="checkmark-circle" size={16} color={palette.onSuccess} />
      <ThemedText style={[styles.toastText, { color: palette.onSuccess }]}>Saved</ThemedText>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  stepperRow: { paddingVertical: Spacing.sm, gap: Spacing.sm },
  stepperInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  stepperIcon: { width: 32, height: 32, borderRadius: Radii.lg, alignItems: 'center', justifyContent: 'center' },
  stepperLabels: { flex: 1 },
  stepperLabel: { ...Typography.bodySmall },
  stepperHelper: { ...Typography.caption, lineHeight: 16, marginTop: Spacing.micro },
  stepperControls: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', borderWidth: 1, borderRadius: Radii.sm, overflow: 'hidden' },
  stepperButton: { width: 40, height: 36, alignItems: 'center', justifyContent: 'center' },
  stepperValue: { minWidth: 64, height: 36, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderRightWidth: 1, paddingHorizontal: Spacing.xs },
  stepperValueText: { ...Typography.bodySmall, textAlign: 'center' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.xs },
  toggleInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1, marginRight: Spacing.sm },
  toggleIcon: { width: 28, height: 28, borderRadius: Radii.lg, alignItems: 'center', justifyContent: 'center' },
  toggleLabels: { flex: 1 },
  toggleLabel: { ...Typography.bodySmall },
  toggleHelper: { ...Typography.caption, lineHeight: 16, marginTop: 1 },
  infoBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.sm, borderRadius: Radii.sm },
  infoText: { ...Typography.small, flex: 1, lineHeight: 18 },
  toast: { position: 'absolute', top: -44, right: 0, flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, borderRadius: Radii.sm, zIndex: 10 },
  toastText: { ...Typography.smallSemiBold },
});
