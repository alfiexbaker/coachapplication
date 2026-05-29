import { View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { withAlpha } from '@/constants/theme';
import { Routes } from '@/navigation/routes';
import { useTheme } from '@/hooks/useTheme';

import { Row } from '@/components/primitives';
import { styles } from './development-section-styles';

export { CompletionCard } from './development-completion-card';
export { AttentionSection } from './development-attention-section';
export { RecentSessionsSection } from './development-recent-sessions-section';
export { BadgesShortcut } from './development-badges-shortcut';

// ---------------------------------------------------------------------------
// QuickActions row
// ---------------------------------------------------------------------------

function QuickActionsInner() {
  const { colors: palette } = useTheme();
  const actions = [
    {
      icon: 'calendar-number' as const,
      label: 'Bookings',
      route: Routes.BOOKINGS,
      color: palette.error,
    },
    {
      icon: 'chatbubbles' as const,
      label: 'Messages',
      route: Routes.MESSAGES,
      color: palette.tint,
    },
    {
      icon: 'calendar' as const,
      label: 'Schedule',
      route: Routes.SCHEDULE,
      color: palette.success,
    },
    { icon: 'people' as const, label: 'Athletes', route: Routes.ATHLETES, color: palette.icon },
    {
      icon: 'construct-outline' as const,
      label: 'Staffing',
      route: Routes.MANAGE_BOOKINGS,
      color: palette.warning,
    },
  ];
  return (
    <Row style={styles.quickRow}>
      {actions.map((a) => (
        <Clickable
          key={a.label}
          onPress={() => {
            if (Platform.OS !== 'web') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(a.route as Href);
          }}
          style={styles.quickItem}
        >
          <View style={[styles.quickIcon, { backgroundColor: withAlpha(a.color, 0.09) }]}>
            <Ionicons name={a.icon} size={20} color={a.color} />
          </View>
          <ThemedText style={[styles.quickLabel, { color: palette.text }]}>{a.label}</ThemedText>
        </Clickable>
      ))}
    </Row>
  );
}

export const QuickActions = QuickActionsInner;
