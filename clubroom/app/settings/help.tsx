import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SettingsFormScreen, SettingsRow, SettingsSection } from '@/components/settings';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { Spacing, Radii, Typography, withAlpha } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { useHelpScreen, FAQ_ITEMS } from '@/hooks/use-help-screen';

export default function HelpSettingsScreen() {
  const { colors } = useTheme();
  const {
    currentUser,
    expandedFAQ,
    toggleFAQ,
    handleContactSupport,
    handleReportProblem,
    handleSendFeedback,
    handleShareApp,
  } = useHelpScreen();

  return (
    <SettingsFormScreen title="Help & Support">
      <SettingsSection title="Get Help">
        <SettingsRow
          icon="chatbubbles"
          iconColor={colors.success}
          title="Contact Support"
          subtitle="Open an email to the support team"
          onPress={handleContactSupport}
        />
        <SettingsRow
          icon="flag"
          iconColor={colors.warning}
          title="Report a Problem"
          subtitle="Let us know about an issue"
          onPress={handleReportProblem}
        />
        <SettingsRow
          icon="bulb"
          title="Send Feedback"
          subtitle="Share your ideas and suggestions"
          onPress={handleSendFeedback}
        />
      </SettingsSection>

      <View style={styles.faqSection}>
        <ThemedText style={[styles.sectionTitle, { color: colors.muted }]}>
          FREQUENTLY ASKED QUESTIONS
        </ThemedText>
        <View style={styles.faqList}>
          {FAQ_ITEMS.map((item, index) => (
            <FAQCard
              key={index}
              item={item}
              expanded={expandedFAQ === index}
              onToggle={() => toggleFAQ(index)}
            />
          ))}
        </View>
      </View>

      <SettingsSection title="Share">
        <SettingsRow
          icon="share-social"
          title="Share Clubroom"
          subtitle="Send a quick intro to another coach or parent"
          onPress={handleShareApp}
        />
      </SettingsSection>

      <SurfaceCard style={styles.contactCard}>
        <Row align="center" gap="md">
          <View style={[styles.contactIcon, { backgroundColor: withAlpha(colors.accent, 0.09) }]}>
            <Ionicons name="mail" size={24} color={colors.accent} />
          </View>
          <View style={styles.contactInfo}>
            <ThemedText type="defaultSemiBold">Still need help?</ThemedText>
            <ThemedText style={[styles.contactText, { color: colors.muted }]}>
              Email us at support@clubroom.app
            </ThemedText>
            <ThemedText style={[styles.contactText, { color: colors.muted }]}>
              Support is handled by email in this build.
            </ThemedText>
          </View>
        </Row>
      </SurfaceCard>

      <View style={styles.debugInfo}>
        <ThemedText style={[styles.debugText, { color: colors.muted }]}>
          App Version: 1.0.0 | Support ref: {currentUser?.id || 'N/A'}
        </ThemedText>
      </View>
    </SettingsFormScreen>
  );
}

function FAQCard({
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
    <SurfaceCard style={styles.faqCard} onPress={onToggle}>
      <Row justify="space-between" align="center" gap="sm">
        <ThemedText type="defaultSemiBold" style={styles.faqQuestion}>
          {item.question}
        </ThemedText>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.muted} />
      </Row>
      {expanded && (
        <ThemedText style={[styles.faqAnswer, { color: colors.muted }]}>{item.answer}</ThemedText>
      )}
    </SurfaceCard>
  );
}

const styles = StyleSheet.create({
  faqSection: { gap: Spacing.sm },
  sectionTitle: {
    ...Typography.smallSemiBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  faqList: { gap: Spacing.sm },
  faqCard: { gap: Spacing.sm },
  faqQuestion: { flex: 1, ...Typography.body },
  faqAnswer: { ...Typography.bodySmall },
  contactCard: { gap: Spacing.md },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: Radii.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactInfo: { flex: 1, gap: Spacing.micro },
  contactText: { ...Typography.small },
  debugInfo: { alignItems: 'center', paddingTop: Spacing.md },
  debugText: { ...Typography.caption },
});
