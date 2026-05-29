import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { withAlpha } from '@/constants/theme';
import { Routes } from '@/navigation/routes';
import { useTheme } from '@/hooks/useTheme';
import { styles } from './development-section-styles';

interface BadgesShortcutProps {
  logger: { press: (event: string, data: Record<string, unknown>) => void };
}

export function BadgesShortcut({ logger }: BadgesShortcutProps) {
  const { colors: palette } = useTheme();
  return (
    <Clickable
      onPress={() => {
        logger.press('BadgesShortcut', { source: 'CoachDevelopment' });
        router.push(Routes.DEVELOPMENT_BADGES);
      }}
      style={[styles.badgesShortcut, { borderColor: palette.border }]}
    >
      <View style={[styles.badgesIcon, { backgroundColor: withAlpha(palette.success, 0.07) }]}>
        <Ionicons name="ribbon" size={20} color={palette.success} />
      </View>
      <View style={styles.rowContent}>
        <ThemedText type="defaultSemiBold" style={styles.athleteName}>
          Badges & Awards
        </ThemedText>
        <ThemedText style={[styles.subtleMeta, { color: palette.muted }]}>
          Award badges, view athlete achievements
        </ThemedText>
      </View>
      <Ionicons name="chevron-forward" size={16} color={palette.muted} />
    </Clickable>
  );
}
