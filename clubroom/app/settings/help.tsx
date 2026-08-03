import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SettingsFormScreen, SettingsRow, SettingsSection } from '@/components/settings';
import { Clickable } from '@/components/primitives/clickable';
import { ThemedText } from '@/components/themed-text';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useHelpScreen, FAQ_ITEMS } from '@/hooks/use-help-screen';

export default function HelpSettingsScreen() {
  const { colors } = useTheme();
  const { expandedFAQ, toggleFAQ, handleContactSupport, handleSendFeedback } = useHelpScreen();

  return (
    <SettingsFormScreen title="Help & Support">
      <SettingsSection title="Support">
        <SettingsRow
          icon="mail"
          iconColor={colors.success}
          title="Email support"
          subtitle="Account and app help"
          onPress={handleContactSupport}
        />
        <SettingsRow
          icon="bulb-outline"
          title="Send feedback"
          subtitle="Ideas and product feedback"
          onPress={handleSendFeedback}
        />
      </SettingsSection>

      <SettingsSection title="Common questions">
        {FAQ_ITEMS.map((item, index) => (
          <View
            key={item.question}
            style={index > 0 ? [styles.faqDivider, { borderTopColor: colors.border }] : undefined}
          >
            <FAQRow
              item={item}
              expanded={expandedFAQ === index}
              onToggle={() => toggleFAQ(index)}
            />
          </View>
        ))}
      </SettingsSection>
    </SettingsFormScreen>
  );
}

function FAQRow({
  item,
  expanded,
  onToggle,
}: {
  item: (typeof FAQ_ITEMS)[number];
  expanded: boolean;
  onToggle: () => void;
}) {
  const { colors } = useTheme();
  return (
    <>
      <Clickable
        onPress={onToggle}
        accessibilityLabel={item.question}
        accessibilityHint={expanded ? 'Hide answer' : 'Show answer'}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        style={({ pressed }) => [styles.faqButton, { opacity: pressed ? 0.7 : 1 }]}
      >
        <ThemedText type="defaultSemiBold" style={styles.faqQuestion}>
          {item.question}
        </ThemedText>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.muted} />
      </Clickable>
      {expanded && (
        <ThemedText style={[styles.faqAnswer, { color: colors.muted }]}>{item.answer}</ThemedText>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  faqDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  faqButton: {
    minHeight: 56,
    padding: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  faqQuestion: { flex: 1, ...Typography.body },
  faqAnswer: {
    ...Typography.bodySmall,
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
});
