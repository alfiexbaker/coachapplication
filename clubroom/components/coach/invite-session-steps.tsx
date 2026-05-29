import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { styles } from './invite-session-step-styles';

export { SessionListStep } from './invite-session-list-step';
export type { SessionListStepProps } from './invite-session-list-step';
export { ConfirmStep } from './invite-session-confirm-step';
export type { ConfirmStepProps } from './invite-session-confirm-step';

// --- Choice Step ---
export const ChoiceStep = function ChoiceStep({
  onSelect,
}: {
  onSelect: (choice: 'existing' | 'new') => void;
}) {
  const { colors: palette } = useTheme();
  return (
    <View style={styles.choiceContainer}>
      <ThemedText style={[styles.choiceSubtitle, { color: palette.muted }]}>
        How would you like to invite athletes?
      </ThemedText>
      <Clickable
        style={[
          styles.choiceCard,
          { backgroundColor: palette.background, borderColor: palette.tint },
        ]}
        onPress={() => onSelect('existing')}
      >
        <View style={[styles.choiceIcon, { backgroundColor: withAlpha(palette.tint, 0.09) }]}>
          <Ionicons name="calendar" size={28} color={palette.tint} />
        </View>
        <View style={styles.choiceInfo}>
          <ThemedText type="defaultSemiBold" style={styles.choiceTitle}>
            Add to Existing Session
          </ThemedText>
          <ThemedText style={[styles.choiceDesc, { color: palette.muted }]}>
            Invite athletes to a session you&apos;ve already scheduled
          </ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={20} color={palette.muted} />
      </Clickable>
      <Clickable
        style={[
          styles.choiceCard,
          { backgroundColor: palette.background, borderColor: palette.success },
        ]}
        onPress={() => onSelect('new')}
      >
        <View style={[styles.choiceIcon, { backgroundColor: withAlpha(palette.success, 0.09) }]}>
          <Ionicons name="add-circle" size={28} color={palette.success} />
        </View>
        <View style={styles.choiceInfo}>
          <ThemedText type="defaultSemiBold" style={styles.choiceTitle}>
            Create New Session
          </ThemedText>
          <ThemedText style={[styles.choiceDesc, { color: palette.muted }]}>
            Start fresh with a new session and invite athletes
          </ThemedText>
        </View>
        <Ionicons name="chevron-forward" size={20} color={palette.muted} />
      </Clickable>
    </View>
  );
};
