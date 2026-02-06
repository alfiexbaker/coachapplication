import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SurfaceCard } from '@/components/primitives/surface-card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing, Typography , withAlpha } from '@/constants/theme';
import { inviteCodes, schools } from '@/constants/mock-data';
import { InviteCode, School } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function InviteCodesScreen() {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  const [codes, setCodes] = useState<InviteCode[]>(inviteCodes);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [newCodeText, setNewCodeText] = useState('');
  const [maxUses, setMaxUses] = useState('20');

  const generateCode = () => {
    if (!selectedSchool) return;

    const code = newCodeText.trim().toUpperCase() || generateRandomCode();
    const newCode: InviteCode = {
      id: `invite-${Date.now()}`,
      code,
      schoolId: selectedSchool.id,
      schoolName: selectedSchool.name,
      createdBy: 'admin-1',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
      maxUses: parseInt(maxUses) || 20,
      currentUses: 0,
      status: 'active',
    };

    setCodes([newCode, ...codes]);
    setShowCreateModal(false);
    setNewCodeText('');
    setMaxUses('20');
    setSelectedSchool(null);
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const deactivateCode = (codeId: string) => {
    setCodes(
      codes.map((code) =>
        code.id === codeId
          ? {
              ...code,
              status: code.status === 'active' ? ('exhausted' as const) : ('active' as const),
            }
          : code
      )
    );
  };

  const copyToClipboard = (code: string) => {
    // In production, use Clipboard.setString(code)
    alert(`Code copied: ${code}`);
  };

  const renderInviteCode = ({ item }: { item: InviteCode }) => {
    const isExpired = new Date(item.expiresAt) < new Date();
    const isExhausted = item.currentUses >= item.maxUses;
    const statusColor =
      item.status === 'active' && !isExpired && !isExhausted
        ? palette.success
        : item.status === 'expired' || isExpired
          ? palette.error
          : palette.muted;

    return (
      <SurfaceCard style={styles.codeCard}>
        <View style={styles.codeHeader}>
          <View style={styles.codeTop}>
            <Pressable
              onPress={() => copyToClipboard(item.code)}
              style={[styles.codeBadge, { backgroundColor: withAlpha(statusColor, 0.12) }]}>
              <ThemedText style={[styles.codeText, { color: statusColor }]}>{item.code}</ThemedText>
            </Pressable>
            <View style={[styles.statusBadge, { backgroundColor: withAlpha(statusColor, 0.12) }]}>
              <ThemedText style={[styles.statusText, { color: statusColor }]}>
                {item.status === 'active' && !isExpired && !isExhausted
                  ? 'Active'
                  : isExhausted
                    ? 'Exhausted'
                    : 'Expired'}
              </ThemedText>
            </View>
          </View>
          <ThemedText type="subtitle" style={styles.schoolName}>
            {item.schoolName}
          </ThemedText>
        </View>

        <View style={styles.codeStats}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statLabel}>Uses</ThemedText>
            <ThemedText style={styles.statValue}>
              {item.currentUses} / {item.maxUses}
            </ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={styles.statLabel}>Expires</ThemedText>
            <ThemedText style={styles.statValue}>
              {new Date(item.expiresAt).toLocaleDateString()}
            </ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={styles.statLabel}>Created</ThemedText>
            <ThemedText style={styles.statValue}>
              {new Date(item.createdAt).toLocaleDateString()}
            </ThemedText>
          </View>
        </View>

        <Pressable
          onPress={() => deactivateCode(item.id)}
          style={[styles.actionButton, { backgroundColor: palette.border }]}>
          <ThemedText style={styles.actionButtonText}>
            {item.status === 'active' ? 'Deactivate' : 'Reactivate'}
          </ThemedText>
        </Pressable>
      </SurfaceCard>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.header}>
        <View>
          <ThemedText type="title">Invite Codes</ThemedText>
          <ThemedText style={styles.subtitle}>{codes.length} codes generated</ThemedText>
        </View>
        <Pressable
          onPress={() => setShowCreateModal(true)}
          style={[styles.createButton, { backgroundColor: palette.tint }]}>
          <ThemedText style={styles.createButtonText} lightColor={Colors.light.onPrimary} darkColor={Colors.dark.text}>
            + New Code
          </ThemedText>
        </Pressable>
      </View>

      <FlatList
        data={codes}
        renderItem={renderInviteCode}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Create Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}>
        <SafeAreaView
          style={[styles.modalContainer, { backgroundColor: palette.background }]}
          edges={['top']}>
          <View style={styles.modalHeader}>
            <ThemedText type="title">Generate Invite Code</ThemedText>
            <Pressable onPress={() => setShowCreateModal(false)}>
              <ThemedText style={styles.closeButton}>Close</ThemedText>
            </Pressable>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.fieldGroup}>
              <ThemedText style={styles.label}>Select School</ThemedText>
              {schools.map((school) => (
                <Pressable
                  key={school.id}
                  onPress={() => setSelectedSchool(school)}
                  style={[
                    styles.schoolOption,
                    {
                      backgroundColor:
                        selectedSchool?.id === school.id ? palette.tint : palette.card,
                      borderColor: palette.border,
                    },
                  ]}>
                  <ThemedText
                    style={[
                      styles.schoolOptionText,
                      selectedSchool?.id === school.id && { fontWeight: '600' },
                    ]}
                    lightColor={selectedSchool?.id === school.id ? Colors.light.onPrimary : undefined}
                    darkColor={selectedSchool?.id === school.id ? Colors.dark.text : undefined}>
                    {school.name}
                  </ThemedText>
                  <ThemedText
                    style={styles.schoolOptionSubtext}
                    lightColor={
                      selectedSchool?.id === school.id
                        ? 'rgba(255,255,255,0.8)'
                        : 'rgba(0,0,0,0.6)'
                    }
                    darkColor={
                      selectedSchool?.id === school.id
                        ? 'rgba(0,0,0,0.6)'
                        : 'rgba(255,255,255,0.6)'
                    }>
                    {school.city}, {school.state} • {school.activeCoachesCount} coaches
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText style={styles.label}>Code (optional - leave blank to auto-generate)</ThemedText>
              <TextInput
                value={newCodeText}
                onChangeText={(text) => setNewCodeText(text.toUpperCase())}
                autoCapitalize="characters"
                placeholder="MYSCHOOL2024"
                placeholderTextColor={palette.muted}
                style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card }]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <ThemedText style={styles.label}>Max Uses</ThemedText>
              <TextInput
                value={maxUses}
                onChangeText={setMaxUses}
                keyboardType="number-pad"
                placeholder="20"
                placeholderTextColor={palette.muted}
                style={[styles.input, { borderColor: palette.border, backgroundColor: palette.card }]}
              />
            </View>

            <Pressable
              onPress={generateCode}
              disabled={!selectedSchool}
              style={[
                styles.generateButton,
                {
                  backgroundColor: selectedSchool ? palette.tint : palette.border,
                  opacity: selectedSchool ? 1 : 0.5,
                },
              ]}>
              <ThemedText style={styles.generateButtonText} lightColor={Colors.light.onPrimary} darkColor={Colors.dark.text}>
                Generate Code
              </ThemedText>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  subtitle: {
    opacity: 0.6,
    marginTop: Spacing.xs,
  },
  createButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  createButtonText: {
    fontWeight: '600',
  },
  listContent: {
    padding: Spacing.lg,
    paddingTop: 0,
    gap: Spacing.md,
  },
  codeCard: {
    gap: Spacing.md,
  },
  codeHeader: {
    gap: Spacing.xs,
  },
  codeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },
  codeText: {
    fontFamily: 'monospace',
    ...Typography.subheading,
    letterSpacing: 1,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xxs,
    borderRadius: Radii.pill,
  },
  statusText: {
    ...Typography.caption,
    textTransform: 'uppercase',
  },
  schoolName: {
    textAlign: 'left',
  },
  codeStats: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  statItem: {
    gap: Spacing.micro,
  },
  statLabel: {
    ...Typography.caption,
    opacity: 0.6,
  },
  statValue: {
    fontWeight: '600',
  },
  actionButton: {
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    alignItems: 'center',
  },
  actionButtonText: {
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  closeButton: {
    ...Typography.display,
    opacity: 0.6,
  },
  modalContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  fieldGroup: {
    gap: Spacing.sm,
  },
  label: {
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    ...Typography.subheading,
  },
  schoolOption: {
    padding: Spacing.md,
    borderRadius: Radii.md,
    borderWidth: 1,
    gap: Spacing.xxs,
  },
  schoolOptionText: {
    fontWeight: '500',
  },
  schoolOptionSubtext: {
    ...Typography.caption,
    opacity: 0.8,
  },
  generateButton: {
    paddingVertical: Spacing.md,
    borderRadius: Radii.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  generateButtonText: {
    ...Typography.subheading,
  },
});
