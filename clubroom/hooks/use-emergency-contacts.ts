import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';

import { safetyService } from '@/services/safety-service';
import { createLogger } from '@/utils/logger';
import type { EmergencyInfo, EmergencyContact } from '@/constants/types';

const logger = createLogger('EmergencyContactsScreen');

export function useEmergencyContacts() {
  const { id } = useLocalSearchParams<{ id: string }>();

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
      logger.error('Failed to load emergency info:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadInfo();
  }, [loadInfo]);

  const handleAddContact = useCallback(async (contact: Omit<EmergencyContact, 'id'>) => {
    if (!id) return;
    try {
      await safetyService.addContact(id, contact);
      await loadInfo();
      setShowForm(false);
    } catch (error) {
      logger.error('Failed to add contact:', error);
    }
  }, [id, loadInfo]);

  const handleUpdateContact = useCallback(async (contact: Omit<EmergencyContact, 'id'>) => {
    if (!id || !editingContact) return;
    try {
      await safetyService.updateContact(id, editingContact.id, contact);
      await loadInfo();
      setEditingContact(null);
    } catch (error) {
      logger.error('Failed to update contact:', error);
    }
  }, [id, editingContact, loadInfo]);

  const handleDeleteContact = useCallback(async (contactId: string) => {
    if (!id) return;
    try {
      await safetyService.removeContact(id, contactId);
      await loadInfo();
    } catch (error) {
      logger.error('Failed to delete contact:', error);
    }
  }, [id, loadInfo]);

  const handleSetPrimary = useCallback(async (contactId: string) => {
    if (!id) return;
    try {
      await safetyService.updateContact(id, contactId, { isPrimary: true });
      await loadInfo();
    } catch (error) {
      logger.error('Failed to set primary contact:', error);
    }
  }, [id, loadInfo]);

  const contacts = info?.contacts ?? [];

  const openForm = useCallback(() => setShowForm(true), []);
  const closeForm = useCallback(() => {
    setShowForm(false);
    setEditingContact(null);
  }, []);
  const startEdit = useCallback((contact: EmergencyContact) => setEditingContact(contact), []);

  return {
    loading, contacts, showForm, editingContact,
    handleAddContact, handleUpdateContact, handleDeleteContact, handleSetPrimary,
    openForm, closeForm, startEdit,
  };
}
