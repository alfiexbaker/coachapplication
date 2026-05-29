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
import { AccessibleListCell } from '@/components/ui/list-accessibility';

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

  const handleOpenModal = () => setShowCreateModal(true);
  const handleCloseModal = () => setShowCreateModal(false);

  const renderItem = ({ item }: { item: InviteCode }) => (
    <InviteCodeCard
      item={item}
      onDeactivate={deactivateCode}
      onCopy={(code) => void copyToClipboard(code)}
    />
  );

  const keyExtractor = (item: InviteCode) => item.id;
  const getItemLayout = (_: ArrayLike<InviteCode> | null | undefined, index: number) => ({
    length: 176,
    offset: 176 * index,
    index,
  });

  const headerSubtitle =
    status === 'loading'
      ? 'Loading invite codes'
      : status === 'error'
        ? 'Invite codes unavailable'
        : `${codes.length} codes generated`;
  const canCreateCode = status !== 'loading' && status !== 'error';

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.background }]}
      edges={['top', 'bottom']}
    >
      <Row justify="between" align="center" style={styles.header}>
        <Column>
          <ThemedText type="title">Invite Codes</ThemedText>
          <ThemedText style={[styles.subtitle, { color: palette.muted }]}>
            {headerSubtitle}
          </ThemedText>
        </Column>
        {canCreateCode ? (
          <Clickable
            onPress={handleOpenModal}
            style={[styles.createButton, { backgroundColor: palette.tint }]}
            accessibilityLabel="Create new invite code"
          >
            <ThemedText style={[styles.createButtonText, { color: palette.onPrimary }]}>
              + New Code
            </ThemedText>
          </Clickable>
        ) : null}
      </Row>

      {status === 'loading' ? (
        <LoadingState variant="list" />
      ) : status === 'error' ? (
        <ErrorState message={error?.message ?? 'Failed to load invite codes.'} onRetry={retry} />
      ) : codes.length === 0 ? (
        <EmptyState
          icon="key-outline"
          title="No Invite Codes"
          message="Generate your first invite code to start onboarding schools."
          actionLabel="Create Code"
          onPressAction={handleOpenModal}
        />
      ) : (
        <FlatList
          CellRendererComponent={AccessibleListCell}
          accessibilityRole="list"
          data={codes}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {canCreateCode ? (
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
      ) : null}
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
