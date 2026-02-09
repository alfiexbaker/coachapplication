import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { Clickable } from '@/components/primitives/clickable';
import { Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

export default function PrivacyPolicyScreen() {
  const { colors: palette } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <Clickable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={palette.text} />
        </Clickable>
        <ThemedText type="title" style={styles.headerTitle}>
          Privacy Policy
        </ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={[styles.lastUpdated, { color: palette.muted }]}>
          Last updated: 1 January 2025
        </ThemedText>

        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          1. Introduction
        </ThemedText>
        <ThemedText style={[styles.body, { color: palette.text }]}>
          Clubroom (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is committed to protecting your privacy.
          This Privacy Policy explains how we collect, use, disclose, and
          safeguard your information when you use our mobile application and
          related services (collectively, the &quot;Service&quot;). Please read this policy
          carefully.
        </ThemedText>

        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          2. Information We Collect
        </ThemedText>
        <ThemedText style={[styles.body, { color: palette.text }]}>
          We collect information you provide directly, including: your name, email
          address, phone number, and profile information; payment and billing
          details; child information provided by parents or guardians; coaching
          qualifications and verification documents; messages and communications
          within the platform; session feedback and reviews.
        </ThemedText>

        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          3. How We Use Your Information
        </ThemedText>
        <ThemedText style={[styles.body, { color: palette.text }]}>
          We use the information we collect to: provide and maintain the Service;
          process bookings and payments; facilitate communication between parents
          and coaches; verify coach identities and qualifications; send
          notifications about bookings and updates; improve and personalise your
          experience; comply with legal obligations and safeguarding requirements.
        </ThemedText>

        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          4. Data Sharing
        </ThemedText>
        <ThemedText style={[styles.body, { color: palette.text }]}>
          We may share your information with: coaches or parents as necessary to
          facilitate bookings; payment processors to handle transactions; service
          providers who assist in operating the platform; law enforcement or
          regulatory bodies when required by law; other parties with your explicit
          consent. We do not sell your personal information to third parties.
        </ThemedText>

        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          5. Children&apos;s Privacy
        </ThemedText>
        <ThemedText style={[styles.body, { color: palette.text }]}>
          Clubroom takes the privacy of children seriously. Child profiles are
          created and managed by parents or guardians. We collect only the minimum
          information necessary to facilitate coaching sessions, including medical
          and emergency contact details for safety purposes. This information is
          shared only with confirmed coaches for active bookings.
        </ThemedText>

        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          6. Data Security
        </ThemedText>
        <ThemedText style={[styles.body, { color: palette.text }]}>
          We implement appropriate technical and organisational measures to protect
          your personal data against unauthorised access, alteration, disclosure,
          or destruction. However, no method of transmission over the internet is
          completely secure, and we cannot guarantee absolute security.
        </ThemedText>

        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          7. Data Retention
        </ThemedText>
        <ThemedText style={[styles.body, { color: palette.text }]}>
          We retain your personal data for as long as your account is active or as
          needed to provide you with the Service. We may retain certain
          information as required by law or for legitimate business purposes, such
          as resolving disputes and enforcing our agreements.
        </ThemedText>

        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          8. Your Rights
        </ThemedText>
        <ThemedText style={[styles.body, { color: palette.text }]}>
          Under applicable data protection laws, you have the right to: access
          your personal data; correct inaccurate data; request deletion of your
          data; object to or restrict processing; data portability; withdraw
          consent at any time. To exercise these rights, please contact us at
          privacy@clubroom.app.
        </ThemedText>

        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          9. Cookies and Analytics
        </ThemedText>
        <ThemedText style={[styles.body, { color: palette.text }]}>
          We may use analytics tools to understand how the Service is used. These
          tools may collect information such as device type, operating system,
          usage patterns, and crash reports. This information is used solely to
          improve the Service and is not used for advertising purposes.
        </ThemedText>

        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          10. Changes to This Policy
        </ThemedText>
        <ThemedText style={[styles.body, { color: palette.text }]}>
          We may update this Privacy Policy from time to time. We will notify you
          of any material changes by posting the new policy within the app and
          updating the &quot;Last updated&quot; date. Your continued use of the Service
          after changes constitutes acceptance of the updated policy.
        </ThemedText>

        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          11. Contact Us
        </ThemedText>
        <ThemedText style={[styles.body, { color: palette.text }]}>
          If you have any questions about this Privacy Policy or our data
          practices, please contact us at privacy@clubroom.app.
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
