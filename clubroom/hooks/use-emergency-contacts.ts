import { useState } from 'react';
import { useRequiredParam } from '@/hooks/use-required-param';

import { safetyService } from '@/services/safety-service';
import { childService } from '@/services/child-service';
import { createLogger } from '@/utils/logger';
import type { EmergencyInfo, EmergencyContact } from '@/constants/types';
import { useScreen } from '@/hooks/use-screen';
import { useAuth } from '@/hooks/use-auth';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('EmergencyContactsScreen');

interface EmergencyContactsData {
  info: EmergencyInfo;
}

export function useEmergencyContacts() {
  const idParam = useRequiredParam('id');
  const id = idParam.valid ? idParam.value : undefined;
  const { currentUser } = useAuth();

  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<EmergencyContact | null>(null);

  const loadInfo = async () => {
    if (!id) {
      return err(serviceError('VALIDATION', 'Missing child id for emergency contacts.'));
    }

    try {
      const accessResult = await childService.canManageChildProfile(id, currentUser);
      if (!accessResult.success) {
        return accessResult;
      }
      if (!accessResult.data) {
        return err(
          serviceError(
            'UNAUTHORIZED',
            'You do not have permission to manage this player’s emergency contacts.',
          ),
        );
      }

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
  };

  const canManageEmergencyContacts = async () => {
    if (!id) return false;

    const accessResult = await childService.canManageChildProfile(id, currentUser);
    if (!accessResult.success || !accessResult.data) {
      logger.warn('Blocked emergency contact update without current authority', {
        childId: id,
        userId: currentUser?.id,
      });
      return false;
    }

    return true;
  };

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<EmergencyContactsData>({
    load: loadInfo,
    deps: [id, currentUser?.id, currentUser?.children?.map((child) => child.childId).join(',')],
    isEmpty: () => false,
    refetchOnFocus: true,
    loadingStrategy: 'section-skeleton',
    dataKey: id
      ? `child-emergency:${currentUser?.id ?? 'anonymous'}:${id}`
      : 'child-emergency:missing',
  });

  const info = data?.info ?? null;

  const handleAddContact = async (contact: Omit<EmergencyContact, 'id'>) => {
    if (!id) return;
    try {
      if (!(await canManageEmergencyContacts())) return;

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
  };

  const handleUpdateContact = async (contact: Omit<EmergencyContact, 'id'>) => {
    if (!id || !editingContact) return;
    try {
      if (!(await canManageEmergencyContacts())) return;

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
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!id) return;
    try {
      if (!(await canManageEmergencyContacts())) return;

      const result = await safetyService.removeContact(id, contactId);
      if (!result.success) {
        logger.error('Failed to remove contact', result.error);
        return;
      }
      onRefresh();
    } catch (error) {
      logger.error('Failed to remove contact:', error);
    }
  };

  const handleSetPrimary = async (contactId: string) => {
    if (!id) return;
    try {
      if (!(await canManageEmergencyContacts())) return;

      const result = await safetyService.updateContact(id, contactId, { isPrimary: true });
      if (!result.success) {
        logger.error('Failed to set primary contact', result.error);
        return;
      }
      onRefresh();
    } catch (error) {
      logger.error('Failed to set primary contact:', error);
    }
  };

  const contacts = info?.contacts ?? [];

  const openForm = () => setShowForm(true);
  const closeForm = () => {
    setShowForm(false);
    setEditingContact(null);
  };
  const startEdit = (contact: EmergencyContact) => setEditingContact(contact);

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
