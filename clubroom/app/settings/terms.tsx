import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Row } from '@/components/primitives/row';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export default function TermsOfServiceScreen() {
  const { colors: palette } = useTheme();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['top']}
    >
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <Row align="center" justify="space-between" style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <ThemedText type="title" style={styles.headerTitle}>
          Terms of Service
        </ThemedText>
        <View style={{ width: 24 }} />
      </Row>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ThemedText style={[styles.lastUpdated, { color: palette.muted }]}>
          Last updated: 1 January 2025
        </ThemedText>

        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          1. Acceptance of Terms
        </ThemedText>
        <ThemedText style={[styles.body, { color: palette.text }]}>
          By accessing or using the Clubroom application (&quot;Service&quot;), you agree to be
          bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms,
          you may not use the Service. We reserve the right to update these Terms at any time, and
          your continued use of the Service constitutes acceptance of any changes.
        </ThemedText>

        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          2. Eligibility
        </ThemedText>
        <ThemedText style={[styles.body, { color: palette.text }]}>
          You must be at least 18 years old to create an account. Parents and guardians may create
          accounts to manage bookings on behalf of minors. Coaches must be at least 18 years old and
          may be required to complete verification and background checks before offering services.
        </ThemedText>

        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          3. User Accounts
        </ThemedText>
        <ThemedText style={[styles.body, { color: palette.text }]}>
          You are responsible for maintaining the confidentiality of your account credentials and
          for all activities that occur under your account. You agree to notify us immediately of
          any unauthorised use of your account. We reserve the right to suspend or terminate
          accounts that violate these Terms.
        </ThemedText>

        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          4. Bookings and Payments
        </ThemedText>
        <ThemedText style={[styles.body, { color: palette.text }]}>
          All session bookings are subject to coach availability and confirmation. Payments are
          processed securely through our platform. Cancellation policies vary by coach and are
          displayed at the time of booking. Refunds are handled in accordance with the applicable
          cancellation policy.
        </ThemedText>

        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          5. Coach Responsibilities
        </ThemedText>
        <ThemedText style={[styles.body, { color: palette.text }]}>
          Coaches are independent service providers and are responsible for the quality and safety
          of their sessions. Coaches agree to maintain any required certifications, insurance, and
          to comply with all applicable laws and safeguarding requirements. Clubroom does not employ
          coaches and is not liable for their actions.
        </ThemedText>

        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          6. Prohibited Conduct
        </ThemedText>
        <ThemedText style={[styles.body, { color: palette.text }]}>
          You agree not to: use the Service for any unlawful purpose; harass, abuse, or harm other
          users; create fake or misleading profiles; attempt to circumvent the platform for direct
          payments; upload harmful or inappropriate content; or interfere with the operation of the
          Service.
        </ThemedText>

        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          7. Intellectual Property
        </ThemedText>
        <ThemedText style={[styles.body, { color: palette.text }]}>
          All content, features, and functionality of the Service are owned by Clubroom and are
          protected by copyright, trademark, and other intellectual property laws. You may not
          reproduce, distribute, or create derivative works without our prior written consent.
        </ThemedText>

        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          8. Limitation of Liability
        </ThemedText>
        <ThemedText style={[styles.body, { color: palette.text }]}>
          To the maximum extent permitted by law, Clubroom shall not be liable for any indirect,
          incidental, special, consequential, or punitive damages arising from your use of the
          Service. Our total liability shall not exceed the amount paid by you to Clubroom in the
          twelve months preceding the claim.
        </ThemedText>

        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          9. Termination
        </ThemedText>
        <ThemedText style={[styles.body, { color: palette.text }]}>
          We may terminate or suspend your access to the Service at any time, with or without cause,
          and with or without notice. Upon termination, your right to use the Service will
          immediately cease.
        </ThemedText>

        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          10. Governing Law
        </ThemedText>
        <ThemedText style={[styles.body, { color: palette.text }]}>
          These Terms shall be governed by and construed in accordance with the laws of England and
          Wales. Any disputes arising under these Terms shall be subject to the exclusive
          jurisdiction of the courts of England and Wales.
        </ThemedText>

        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          11. Contact Us
        </ThemedText>
        <ThemedText style={[styles.body, { color: palette.text }]}>
          If you have any questions about these Terms, please contact us at legal@clubroom.app.
        </ThemedText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    ...Typography.heading,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['3xl'],
    gap: Spacing.sm,
  },
  lastUpdated: {
    ...Typography.small,
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    ...Typography.subheading,
    marginTop: Spacing.sm,
  },
  body: {
    ...Typography.bodySmall,
  },
});
