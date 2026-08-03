/**
 * Emergency Contacts Screen
 *
 * Manage emergency contacts for a child. CRUD operations with
 * primary contact designation and pickup authorization.
 */

import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Column } from '@/components/primitives/column';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { EmptyState } from '@/components/ui/empty-state';
import { ChildScreenState } from '@/components/child/child-screen-state';
import { EmergencyContactCard } from '@/components/child/emergency-contact-card';
import { EmergencyContactForm } from '@/components/child/emergency-contact-form';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { useEmergencyContacts } from '@/hooks/use-emergency-contacts';
import { useRequiredParam } from '@/hooks/use-required-param';

export default function EmergencyContactsScreen() {
  const childIdParam = useRequiredParam('id');
  const { colors } = useScreen<null>({ load: async () => ok(null), isEmpty: () => false });
  const {
    loading,
    status,
    error,
    contacts,
    showForm,
    editingContact,
    refreshing,
    onRefresh,
    retry,
    handleAddContact,
    handleUpdateContact,
    handleDeleteContact,
    handleSetPrimary,
    openForm,
    closeForm,
    startEdit,
  } = useEmergencyContacts();
  const header = (
    <Row gap="sm" align="center" style={styles.header}>
      <Clickable
        accessibilityLabel="Go back"
        onPress={() => router.back()}
        style={styles.backButton}
      >
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </Clickable>
      <Column flex>
        <ThemedText type="title">Emergency Contacts</ThemedText>
      </Column>
      {status === 'success' && !showForm && !editingContact && contacts.length > 0 && (
        <Clickable
          accessibilityLabel="Add emergency contact"
          onPress={openForm}
          style={[styles.addButton, { backgroundColor: colors.tint }]}
        >
          <Ionicons name="add" size={20} color={colors.onPrimary} />
        </Clickable>
      )}
    </Row>
  );

  if (!childIdParam.valid) {
    return (
      <ChildScreenState
        colors={colors}
        status="error"
        errorMessage="Invalid emergency contacts link."
        onRetry={() => router.back()}
        header={header}
      />
    );
  }

  if (loading) {
    return (
      <ChildScreenState
        colors={colors}
        status="loading"
        errorMessage="Failed to load emergency contacts."
        onRetry={retry}
        header={header}
        loadingVariant="card"
      />
    );
  }

  if (status === 'error') {
    const accessDenied = error?.code === 'UNAUTHORIZED';
    return (
      <ChildScreenState
        colors={colors}
        status="error"
        errorMessage={error?.message ?? 'Failed to load emergency contacts.'}
        errorTitle={accessDenied ? 'Emergency contacts unavailable' : undefined}
        onRetry={accessDenied ? undefined : retry}
        header={header}
      />
    );
  }

  return (
    <ChildScreenState
      colors={colors}
      status="ready"
      errorMessage="Failed to load emergency contacts."
      onRetry={retry}
      header={header}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
      >
        <ThemedText style={{ color: colors.muted }}>
          Contacts used if there is an incident during a session.
        </ThemedText>

        {showForm || editingContact ? (
          <EmergencyContactForm
            contact={editingContact ?? undefined}
            onSave={editingContact ? handleUpdateContact : handleAddContact}
            onCancel={closeForm}
          />
        ) : contacts.length > 0 ? (
          <View style={{ gap: Spacing.md }}>
            {contacts.map((contact) => (
              <EmergencyContactCard
                key={contact.id}
                contact={contact}
                onEdit={() => startEdit(contact)}
                onDelete={() => handleDeleteContact(contact.id)}
                onSetPrimary={() => handleSetPrimary(contact.id)}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            icon="people"
            title="No emergency contacts"
            message="Add at least one contact for use during a session."
            actionLabel="Add Contact"
            onPressAction={openForm}
          />
        )}

        {contacts.length > 0 && !showForm && !editingContact && (
          <Row gap="sm" style={[styles.infoBox, { backgroundColor: colors.surfaceSecondary }]}>
            <Ionicons name="information-circle" size={20} color={colors.tint} />
            <ThemedText style={[Typography.small, { flex: 1, color: colors.muted }]}>
              The primary contact is called first. Mark anyone who can collect your child.
            </ThemedText>
          </Row>
        )}
      </ScrollView>
    </ChildScreenState>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  backButton: { padding: Spacing.xs, marginLeft: -Spacing.xs },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: Radii.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBox: { padding: Spacing.md, borderRadius: Radii.md, backgroundColor: 'transparent' },
});
