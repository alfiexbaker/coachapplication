import { useState, type Dispatch, type SetStateAction } from 'react';
import { useLocalSearchParams, router } from 'expo-router';

import { safetyService } from '@/services/safety-service';
import { childService } from '@/services/child-service';
import { createLogger } from '@/utils/logger';
import type { MedicalInfo, Consent, ConsentType } from '@/constants/types';
import { useScreen } from '@/hooks/use-screen';
import { useAuth } from '@/hooks/use-auth';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

import { runAsyncTryCatchFinally } from '@/utils/async-control';

const logger = createLogger('MedicalInfoScreen');

interface MedicalInfoData {
  loadedAt: string;
}

const addItem = (setter: Dispatch<SetStateAction<string[]>>) => (item: string) => {
  setter((previous) => [...previous, item]);
};

const removeItem = (setter: Dispatch<SetStateAction<string[]>>) => (index: number) => {
  setter((previous) => previous.filter((_, itemIndex) => itemIndex !== index));
};

export function useMedicalInfo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentUser } = useAuth();

  const [saving, setSaving] = useState(false);

  const [conditions, setConditions] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [medications, setMedications] = useState<string[]>([]);
  const [restrictions, setRestrictions] = useState<string[]>([]);
  const [doctorName, setDoctorName] = useState('');
  const [doctorPhone, setDoctorPhone] = useState('');
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [insuranceNumber, setInsuranceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [consents, setConsents] = useState<Consent[]>([]);

  const loadInfo = async () => {
    if (!id) {
      return err(serviceError('VALIDATION', 'Missing child id for medical profile.'));
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
            'You do not have permission to manage this player’s health information.',
          ),
        );
      }

      const result = await safetyService.getEmergencyInfo(id);
      if (!result.success) {
        logger.error('Failed to load medical info', result.error);
        return err(result.error);
      }
      const data = result.data;
      setConditions(data.medical.conditions);
      setAllergies(data.medical.allergies);
      setMedications(data.medical.medications);
      setRestrictions(data.medical.restrictions);
      setDoctorName(data.medical.doctorName ?? '');
      setDoctorPhone(data.medical.doctorPhone ?? '');
      setInsuranceProvider(data.medical.insuranceProvider ?? '');
      setInsuranceNumber(data.medical.insuranceNumber ?? '');
      setNotes(data.medical.notes ?? '');
      setConsents(data.consents);
      return ok<MedicalInfoData>({ loadedAt: new Date().toISOString() });
    } catch (error) {
      logger.error('Failed to load medical info:', error);
      return err(serviceError('UNKNOWN', 'Failed to load medical information.', error));
    }
  };

  const canManageMedicalInfo = async () => {
    if (!id) return false;

    const accessResult = await childService.canManageChildProfile(id, currentUser);
    if (!accessResult.success || !accessResult.data) {
      logger.warn('Blocked medical profile update without current authority', {
        childId: id,
        userId: currentUser?.id,
      });
      return false;
    }

    return true;
  };

  const { status, error, refreshing, onRefresh, retry } = useScreen<MedicalInfoData>({
    load: loadInfo,
    deps: [id, currentUser?.id, currentUser?.children?.map((child) => child.childId).join(',')],
    isEmpty: () => false,
    refetchOnFocus: true,
    loadingStrategy: 'section-skeleton',
    dataKey: id ? `child-medical:${currentUser?.id ?? 'anonymous'}:${id}` : 'child-medical:missing',
  });

  const handleConsentToggle = (type: ConsentType, granted: boolean) => {
    setConsents((prev) =>
      prev.map((c) =>
        c.type === type
          ? {
              ...c,
              granted,
              grantedBy: granted ? 'Current User' : '',
              grantedAt: granted ? new Date().toISOString() : undefined,
            }
          : c,
      ),
    );
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);

    return await runAsyncTryCatchFinally(
      async () => {
        if (!(await canManageMedicalInfo())) return;

        const medicalUpdate: Partial<MedicalInfo> = {
          conditions,
          allergies,
          medications,
          restrictions,
          doctorName: doctorName || undefined,
          doctorPhone: doctorPhone || undefined,
          insuranceProvider: insuranceProvider || undefined,
          insuranceNumber: insuranceNumber || undefined,
          notes: notes || undefined,
        };

        const updateMedicalResult = await safetyService.updateMedicalInfo(id, medicalUpdate);
        if (!updateMedicalResult.success) {
          logger.error('Failed to update medical info', updateMedicalResult.error);
          return;
        }

        const consentResults = await Promise.all(
          consents.map((consent) =>
            safetyService.updateConsent(id, consent.type, consent.granted, consent.grantedBy),
          ),
        );
        const failedConsentResult = consentResults.find((result) => !result.success);
        if (failedConsentResult) {
          logger.error('Failed to update consent', failedConsentResult.error);
          return;
        }

        router.back();
      },
      async (error) => {
        logger.error('Failed to save medical info:', error);
      },
      () => {
        setSaving(false);
      },
    );
  };

  return {
    loading: status === 'loading',
    saving,
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    refreshing,
    onRefresh,
    retry,
    conditions,
    allergies,
    medications,
    restrictions,
    doctorName,
    setDoctorName,
    doctorPhone,
    setDoctorPhone,
    insuranceProvider,
    setInsuranceProvider,
    insuranceNumber,
    setInsuranceNumber,
    notes,
    setNotes,
    consents,
    handleConsentToggle,
    handleSave,
    addCondition: addItem(setConditions),
    removeCondition: removeItem(setConditions),
    addAllergy: addItem(setAllergies),
    removeAllergy: removeItem(setAllergies),
    addMedication: addItem(setMedications),
    removeMedication: removeItem(setMedications),
    addRestriction: addItem(setRestrictions),
    removeRestriction: removeItem(setRestrictions),
  };
}
