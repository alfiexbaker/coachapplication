/**
 * Emergency Contacts Screen
 *
 * Manage emergency contacts for a child. CRUD operations with
 * primary contact designation and pickup authorization.
 */

import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Clickable } from '@/components/primitives/clickable';
import { Column } from '@/components/primitives/column';
import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/primitives/row';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingState, ErrorState } from '@/components/ui/screen-states';
import { EmergencyContactCard } from '@/components/child/emergency-contact-card';
import { EmergencyContactForm } from '@/components/child/emergency-contact-form';
import { Spacing, Radii, Typography } from '@/constants/theme';
import { useScreen } from '@/hooks/use-screen';
import { ok } from '@/types/result';
import { useEmergencyContacts } from '@/hooks/use-emergency-contacts';

export default function EmergencyContactsScreen() {
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

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <LoadingState variant="detail" />
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={['top', 'bottom']}
      >
        <ErrorState
          message={error?.message ?? 'Failed to load emergency contacts.'}
          onRetry={retry}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
      >
        <Row gap="sm" align="center">
          <Clickable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Clickable>
          <Column flex>
            <ThemedText type="title">Emergency Contacts</ThemedText>
          </Column>
          {!showForm && !editingContact && contacts.length > 0 && (
            <Clickable
              accessibilityLabel="Add emergency contact"
              onPress={openForm}
              style={[styles.addButton, { backgroundColor: colors.tint }]}
            >
              <Ionicons name="add" size={20} color={colors.onPrimary} />
            </Clickable>
          )}
        </Row>

        <ThemedText style={{ color: colors.muted }}>
          Emergency contacts will be notified in case of any incidents during sessions.
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
            title="No Emergency Contacts"
            message="Add at least one emergency contact who can be reached during sessions."
            actionLabel="Add Contact"
            onPressAction={openForm}
          />
        )}

        {contacts.length > 0 && !showForm && !editingContact && (
          <Row gap="sm" style={[styles.infoBox, { backgroundColor: colors.surfaceSecondary }]}>
            <Ionicons name="information-circle" size={20} color={colors.tint} />
            <ThemedText style={[Typography.small, { flex: 1, color: colors.muted }]}>
              The primary contact will be called first in case of an emergency. Make sure at least
              one contact is authorized to pick up your child.
            </ThemedText>
          </Row>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
