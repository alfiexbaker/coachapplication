import { useCallback, useState } from 'react';
import { useRequiredParam } from '@/hooks/use-required-param';

import { safetyService } from '@/services/safety-service';
import { createLogger } from '@/utils/logger';
import type { EmergencyInfo, EmergencyContact } from '@/constants/types';
import { useScreen } from '@/hooks/use-screen';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('EmergencyContactsScreen');

interface EmergencyContactsData {
  info: EmergencyInfo;
}

export function useEmergencyContacts() {
  const idParam = useRequiredParam('id');
  const id = idParam.valid ? idParam.value : undefined;

  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);

  const loadInfo = useCallback(async () => {
    if (!id) {
      return err(serviceError('VALIDATION', 'Missing child id for emergency contacts.'));
    }

    try {
      const result = await safetyService.getEmergencyInfo(id);
      if (!result.success) {
        logger.error('Failed to load emergency info', result.error);
        return err(result.error);
      }
      return ok<EmergencyContactsData>({ info: result.data });
    } catch (error) {
      logger.error('Failed to load emergency info:', error);
      return err(serviceError('UNKNOWN', 'Failed to load emergency contacts.', error));
    }
  }, [id]);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<EmergencyContactsData>({
    load: loadInfo,
    deps: [id],
    isEmpty: () => false,
    refetchOnFocus: true,
    loadingStrategy: 'section-skeleton',
    dataKey: id ? `child-emergency:${id}` : 'child-emergency:missing',
  });

  const info = data?.info ?? null;

  const handleAddContact = useCallback(
    async (contact: Omit<EmergencyContact, 'id'>) => {
      if (!id) return;
      try {
        const result = await safetyService.addContact(id, contact);
        if (!result.success) {
          logger.error('Failed to add contact', result.error);
          return;
        }
        onRefresh();
        setShowForm(false);
      } catch (error) {
        logger.error('Failed to add contact:', error);
      }
    },
    [id, onRefresh],
  );

  const handleUpdateContact = useCallback(
    async (contact: Omit<EmergencyContact, 'id'>) => {
      if (!id || !editingContact) return;
      try {
        const result = await safetyService.updateContact(id, editingContact.id, contact);
        if (!result.success) {
          logger.error('Failed to update contact', result.error);
          return;
        }
        onRefresh();
        setEditingContact(null);
      } catch (error) {
        logger.error('Failed to update contact:', error);
      }
    },
    [id, editingContact, onRefresh],
  );

  const handleDeleteContact = useCallback(
    async (contactId: string) => {
      if (!id) return;
      try {
        const result = await safetyService.removeContact(id, contactId);
        if (!result.success) {
          logger.error('Failed to delete contact', result.error);
          return;
        }
        onRefresh();
      } catch (error) {
        logger.error('Failed to delete contact:', error);
      }
    },
    [id, onRefresh],
  );

  const handleSetPrimary = useCallback(
    async (contactId: string) => {
      if (!id) return;
      try {
        const result = await safetyService.updateContact(id, contactId, { isPrimary: true });
        if (!result.success) {
          logger.error('Failed to set primary contact', result.error);
          return;
        }
        onRefresh();
      } catch (error) {
        logger.error('Failed to set primary contact:', error);
      }
    },
    [id, onRefresh],
  );

  const contacts = info?.contacts ?? [];

  const openForm = useCallback(() => setShowForm(true), []);
  const closeForm = useCallback(() => {
    setShowForm(false);
    setEditingContact(null);
  }, []);
  const startEdit = useCallback((contact: EmergencyContact) => setEditingContact(contact), []);

  return {
    loading: status === 'loading',
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    refreshing,
    onRefresh,
    retry,
    contacts,
    showForm,
    editingContact,
    handleAddContact,
    handleUpdateContact,
    handleDeleteContact,
    handleSetPrimary,
    openForm,
    closeForm,
    startEdit,
  };
}
