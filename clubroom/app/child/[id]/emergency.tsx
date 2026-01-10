import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { SurfaceCard } from '@/components/primitives/surface-card';
import { Clickable } from '@/components/primitives/clickable';
import { Button } from '@/components/primitives/button';
import { Badge } from '@/components/primitives/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { EmergencyInfo, EmergencyContact } from '@/constants/types';
import { safetyService } from '@/services/safety-service';

type ContactCardProps = {
  contact: EmergencyContact;
  onEdit: () => void;
  onDelete: () => void;
  onSetPrimary: () => void;
};

function ContactCard({ contact, onEdit, onDelete, onSetPrimary }: ContactCardProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];

  return (
    <SurfaceCard style={styles.contactCard}>
      <View style={styles.contactHeader}>
        <View style={[styles.contactAvatar, { backgroundColor: `${palette.tint}15` }]}>
          <Ionicons name="person" size={20} color={palette.tint} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.contactNameRow}>
            <ThemedText type="defaultSemiBold">{contact.name}</ThemedText>
            {contact.isPrimary && <Badge label="Primary" tone="success" />}
          </View>
          <ThemedText style={{ color: palette.muted, fontSize: 13 }}>
            {contact.relationship}
          </ThemedText>
        </View>
      </View>

      <View style={styles.contactDetails}>
        <View style={styles.contactDetailRow}>
          <Ionicons name="call" size={16} color={palette.muted} />
          <ThemedText style={{ color: palette.text }}>{contact.phone}</ThemedText>
        </View>
        {contact.email && (
          <View style={styles.contactDetailRow}>
            <Ionicons name="mail" size={16} color={palette.muted} />
            <ThemedText style={{ color: palette.text }}>{contact.email}</ThemedText>
          </View>
        )}
      </View>

      <View style={styles.contactFlags}>
        {contact.canPickup && (
          <View style={[styles.flagBadge, { backgroundColor: `${palette.success}10` }]}>
            <Ionicons name="checkmark-circle" size={14} color={palette.success} />
            <ThemedText style={{ fontSize: 12, color: palette.success }}>Can pick up</ThemedText>
          </View>
        )}
      </View>

      <View style={[styles.contactActions, { borderTopColor: palette.border }]}>
        {!contact.isPrimary && (
          <Clickable onPress={onSetPrimary} style={styles.contactActionButton}>
            <Ionicons name="star-outline" size={18} color={palette.tint} />
            <ThemedText style={{ color: palette.tint, fontSize: 13 }}>Set Primary</ThemedText>
          </Clickable>
        )}
        <Clickable onPress={onEdit} style={styles.contactActionButton}>
          <Ionicons name="create-outline" size={18} color={palette.tint} />
          <ThemedText style={{ color: palette.tint, fontSize: 13 }}>Edit</ThemedText>
        </Clickable>
        <Clickable onPress={onDelete} style={styles.contactActionButton}>
          <Ionicons name="trash-outline" size={18} color={palette.error} />
          <ThemedText style={{ color: palette.error, fontSize: 13 }}>Remove</ThemedText>
        </Clickable>
      </View>
    </SurfaceCard>
  );
}

type ContactFormProps = {
  contact?: EmergencyContact;
  onSave: (contact: Omit<EmergencyContact, 'id'>) => void;
  onCancel: () => void;
};

function ContactForm({ contact, onSave, onCancel }: ContactFormProps) {
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [name, setName] = useState(contact?.name ?? '');
  const [relationship, setRelationship] = useState(contact?.relationship ?? '');
  const [phone, setPhone] = useState(contact?.phone ?? '');
  const [email, setEmail] = useState(contact?.email ?? '');
  const [canPickup, setCanPickup] = useState(contact?.canPickup ?? true);
  const [isPrimary, setIsPrimary] = useState(contact?.isPrimary ?? false);

  const handleSave = () => {
    if (!name.trim() || !relationship.trim() || !phone.trim()) return;
    onSave({
      name: name.trim(),
      relationship: relationship.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      canPickup,
      isPrimary,
    });
  };

  const isValid = name.trim() && relationship.trim() && phone.trim();

  return (
    <SurfaceCard style={styles.formCard}>
      <View style={styles.formHeader}>
        <ThemedText type="defaultSemiBold">
          {contact ? 'Edit Contact' : 'Add Emergency Contact'}
        </ThemedText>
        <Clickable onPress={onCancel}>
          <Ionicons name="close" size={24} color={palette.muted} />
        </Clickable>
      </View>

      <View style={styles.fieldContainer}>
        <ThemedText style={styles.fieldLabel}>Full Name *</ThemedText>
        <TextInput
          style={[styles.input, { borderColor: palette.border, color: palette.text }]}
          placeholder="Contact's full name"
          placeholderTextColor={palette.muted}
          value={name}
          onChangeText={setName}
        />
      </View>

      <View style={styles.fieldContainer}>
        <ThemedText style={styles.fieldLabel}>Relationship *</ThemedText>
        <TextInput
          style={[styles.input, { borderColor: palette.border, color: palette.text }]}
          placeholder="e.g., Mother, Father, Grandparent"
          placeholderTextColor={palette.muted}
          value={relationship}
          onChangeText={setRelationship}
        />
      </View>

      <View style={styles.fieldContainer}>
        <ThemedText style={styles.fieldLabel}>Phone Number *</ThemedText>
        <TextInput
          style={[styles.input, { borderColor: palette.border, color: palette.text }]}
          placeholder="+44 7700 900000"
          placeholderTextColor={palette.muted}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.fieldContainer}>
        <ThemedText style={styles.fieldLabel}>Email (optional)</ThemedText>
        <TextInput
          style={[styles.input, { borderColor: palette.border, color: palette.text }]}
          placeholder="email@example.com"
          placeholderTextColor={palette.muted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.toggleRow}>
        <View style={{ flex: 1 }}>
          <ThemedText type="defaultSemiBold">Can Pick Up Child</ThemedText>
          <ThemedText style={{ color: palette.muted, fontSize: 13 }}>
            Authorized to collect child after sessions
          </ThemedText>
        </View>
        <Clickable onPress={() => setCanPickup(!canPickup)}>
          <View
            style={[
              styles.toggle,
              { backgroundColor: canPickup ? palette.success : palette.border },
            ]}
          >
            <View
              style={[
                styles.toggleKnob,
                {
                  backgroundColor: '#fff',
                  transform: [{ translateX: canPickup ? 18 : 2 }],
                },
              ]}
            />
          </View>
        </Clickable>
      </View>

      {!contact && (
        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <ThemedText type="defaultSemiBold">Set as Primary Contact</ThemedText>
            <ThemedText style={{ color: palette.muted, fontSize: 13 }}>
              First contact called in emergencies
            </ThemedText>
          </View>
          <Clickable onPress={() => setIsPrimary(!isPrimary)}>
            <View
              style={[
                styles.toggle,
                { backgroundColor: isPrimary ? palette.success : palette.border },
              ]}
            >
              <View
                style={[
                  styles.toggleKnob,
                  {
                    backgroundColor: '#fff',
                    transform: [{ translateX: isPrimary ? 18 : 2 }],
                  },
                ]}
              />
            </View>
          </Clickable>
        </View>
      )}

      <Button onPress={handleSave} disabled={!isValid}>
        {contact ? 'Save Changes' : 'Add Contact'}
      </Button>
    </SurfaceCard>
  );
}

export default function EmergencyContactsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const palette = Colors[scheme];
  const [info, setInfo] = useState<EmergencyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);

  const loadInfo = useCallback(async () => {
    if (!id) return;
    try {
      const data = await safetyService.getEmergencyInfo(id);
      setInfo(data);
    } catch (error) {
      console.error('Failed to load emergency info:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadInfo();
  }, [loadInfo]);

  const handleAddContact = async (contact: Omit<EmergencyContact, 'id'>) => {
    if (!id) return;
    try {
      await safetyService.addContact(id, contact);
      await loadInfo();
      setShowForm(false);
    } catch (error) {
      console.error('Failed to add contact:', error);
    }
  };

  const handleUpdateContact = async (contact: Omit<EmergencyContact, 'id'>) => {
    if (!id || !editingContact) return;
    try {
      await safetyService.updateContact(id, editingContact.id, contact);
      await loadInfo();
      setEditingContact(null);
    } catch (error) {
      console.error('Failed to update contact:', error);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!id) return;
    try {
      await safetyService.removeContact(id, contactId);
      await loadInfo();
    } catch (error) {
      console.error('Failed to delete contact:', error);
    }
  };

  const handleSetPrimary = async (contactId: string) => {
    if (!id) return;
    try {
      await safetyService.updateContact(id, contactId, { isPrimary: true });
      await loadInfo();
    } catch (error) {
      console.error('Failed to set primary contact:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.tint} />
        </View>
      </SafeAreaView>
    );
  }

  const contacts = info?.contacts ?? [];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Clickable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={palette.text} />
          </Clickable>
          <View style={{ flex: 1 }}>
            <ThemedText type="title">Emergency Contacts</ThemedText>
          </View>
          {!showForm && !editingContact && contacts.length > 0 && (
            <Clickable
              onPress={() => setShowForm(true)}
              style={[styles.addButton, { backgroundColor: palette.tint }]}
            >
              <Ionicons name="add" size={20} color="#fff" />
            </Clickable>
          )}
        </View>

        <ThemedText style={{ color: palette.muted }}>
          Emergency contacts will be notified in case of any incidents during sessions.
        </ThemedText>

        {showForm || editingContact ? (
          <ContactForm
            contact={editingContact ?? undefined}
            onSave={editingContact ? handleUpdateContact : handleAddContact}
            onCancel={() => {
              setShowForm(false);
              setEditingContact(null);
            }}
          />
        ) : contacts.length > 0 ? (
          <View style={styles.contactsList}>
            {contacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onEdit={() => setEditingContact(contact)}
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
            onPressAction={() => setShowForm(true)}
          />
        )}

        {contacts.length > 0 && !showForm && !editingContact && (
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color={palette.tint} />
            <ThemedText style={[styles.infoText, { color: palette.muted }]}>
              The primary contact will be called first in case of an emergency. Make sure at least
              one contact is authorized to pick up your child.
            </ThemedText>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
    marginLeft: -Spacing.xs,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactsList: {
    gap: Spacing.md,
  },
  contactCard: {
    gap: Spacing.sm,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  contactDetails: {
    gap: Spacing.xs,
    marginLeft: 56,
  },
  contactDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  contactFlags: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginLeft: 56,
  },
  flagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radii.pill,
  },
  contactActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    marginTop: Spacing.xs,
    paddingTop: Spacing.sm,
  },
  contactActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  formCard: {
    gap: Spacing.md,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldContainer: {
    gap: Spacing.xs,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1.5,
    borderRadius: Radii.md,
    padding: Spacing.sm,
    fontSize: 15,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  infoBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
});
