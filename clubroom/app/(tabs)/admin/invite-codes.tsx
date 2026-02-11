/**
 * Invite Codes Screen — Admin list of invite codes with create modal.
 *
 * State + logic: hooks/use-invite-codes.ts
 * Card component: components/admin/invite-code-card.tsx
 * Modal component: components/admin/create-code-modal.tsx
 */

import { useCallback } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Clickable } from '@/components/primitives/clickable';
import { InviteCodeCard } from '@/components/admin/invite-code-card';
import { CreateCodeModal } from '@/components/admin/create-code-modal';
import { Row } from '@/components/primitives/row';
import { Column } from '@/components/primitives/column';
import { ThemedText } from '@/components/themed-text';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/screen-states';
import { Radii, Spacing, Typography } from '@/constants/theme';
import type { InviteCode } from '@/constants/types';
import { useInviteCodes } from '@/hooks/use-invite-codes';
import { useTheme } from '@/hooks/useTheme';

export default function InviteCodesScreen() {
  const { colors: palette } = useTheme();
  const {
    codes,
    status,
    error,
    refreshing,
    showCreateModal,
    selectedSchool,
    newCodeText,
    maxUses,
    onRefresh,
    retry,
    setShowCreateModal,
    setSelectedSchool,
    setNewCodeText,
    setMaxUses,
    generateCode,
    deactivateCode,
    copyToClipboard,
  } = useInviteCodes();

  const handleOpenModal = useCallback(() => setShowCreateModal(true), [setShowCreateModal]);
  const handleCloseModal = useCallback(() => setShowCreateModal(false), [setShowCreateModal]);

  const renderItem = useCallback(
    ({ item }: { item: InviteCode }) => (
      <InviteCodeCard item={item} onDeactivate={deactivateCode} onCopy={copyToClipboard} />
    ),
    [deactivateCode, copyToClipboard]
  );

  const keyExtractor = useCallback((item: InviteCode) => item.id, []);

  if (status === 'loading') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
        <LoadingState variant="list" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
        <ErrorState
          message={error?.message ?? 'Failed to load invite codes.'}
          onRetry={retry}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <Row justify="between" align="center" style={styles.header}>
        <Column>
          <ThemedText type="title">Invite Codes</ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            {codes.length} codes generated
          </ThemedText>
        </Column>
        <Clickable
          onPress={handleOpenModal}
          style={[styles.createButton, { backgroundColor: palette.tint }]}
          accessibilityLabel="Create new invite code"
        >
          <ThemedText style={[styles.createButtonText, { color: palette.onPrimary }]}>
            + New Code
          </ThemedText>
        </Clickable>
      </Row>

      {codes.length === 0 ? (
        <EmptyState
          icon="key-outline"
          title="No Invite Codes"
          message="Generate your first invite code to start onboarding schools."
          actionLabel="Create Code"
          onPressAction={handleOpenModal}
        />
      ) : (
        <FlatList
          data={codes}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      <CreateCodeModal
        visible={showCreateModal}
        selectedSchool={selectedSchool}
        newCodeText={newCodeText}
        maxUses={maxUses}
        onClose={handleCloseModal}
        onSelectSchool={setSelectedSchool}
        onChangeCodeText={setNewCodeText}
        onChangeMaxUses={setMaxUses}
        onGenerate={generateCode}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  subtitle: {
    ...Typography.bodySmall,
    marginTop: Spacing.xs,
  },
  createButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  createButtonText: {
    ...Typography.bodySemiBold,
  },
  listContent: {
    padding: Spacing.lg,
    paddingTop: 0,
    gap: Spacing.md,
  },
});
