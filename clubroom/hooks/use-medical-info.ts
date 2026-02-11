import { useCallback, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';

import { safetyService } from '@/services/safety-service';
import { createLogger } from '@/utils/logger';
import type { MedicalInfo, Consent, ConsentType } from '@/constants/types';
import { useScreen } from '@/hooks/use-screen';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

const logger = createLogger('MedicalInfoScreen');

interface MedicalInfoData {
  loadedAt: string;
}

export function useMedicalInfo() {
  const { id } = useLocalSearchParams<{ id: string }>();

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

  const loadInfo = useCallback(async () => {
    if (!id) {
      return err(serviceError('VALIDATION', 'Missing child id for medical profile.'));
    }

    try {
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
  }, [id]);

  const {
    status,
    error,
    refreshing,
    onRefresh,
    retry,
  } = useScreen<MedicalInfoData>({
    load: loadInfo,
    deps: [id],
    isEmpty: () => false,
    refetchOnFocus: true,
  });

  const handleConsentToggle = useCallback((type: ConsentType, granted: boolean) => {
    setConsents((prev) =>
      prev.map((c) =>
        c.type === type
          ? { ...c, granted, grantedBy: granted ? 'Current User' : '', grantedAt: granted ? new Date().toISOString() : undefined }
          : c
      )
    );
  }, []);

  const handleSave = useCallback(async () => {
    if (!id) return;
    setSaving(true);
    try {
      const medicalUpdate: Partial<MedicalInfo> = {
        conditions, allergies, medications, restrictions,
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

      for (const consent of consents) {
        const consentResult = await safetyService.updateConsent(
          id,
          consent.type,
          consent.granted,
          consent.grantedBy
        );
        if (!consentResult.success) {
          logger.error('Failed to update consent', consentResult.error);
          return;
        }
      }

      router.back();
    } catch (error) {
      logger.error('Failed to save medical info:', error);
    } finally {
      setSaving(false);
    }
  }, [id, conditions, allergies, medications, restrictions, doctorName, doctorPhone, insuranceProvider, insuranceNumber, notes, consents]);

  const addItem = useCallback((setter: React.Dispatch<React.SetStateAction<string[]>>) => (item: string) => {
    setter((prev) => [...prev, item]);
  }, []);

  const removeItem = useCallback((setter: React.Dispatch<React.SetStateAction<string[]>>) => (index: number) => {
    setter((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return {
    loading: status === 'loading', saving,
    status,
    error: status === 'error' ? (error as ServiceError | null) : null,
    refreshing,
    onRefresh,
    retry,
    conditions, allergies, medications, restrictions,
    doctorName, setDoctorName, doctorPhone, setDoctorPhone,
    insuranceProvider, setInsuranceProvider, insuranceNumber, setInsuranceNumber,
    notes, setNotes, consents,
    handleConsentToggle, handleSave,
    addCondition: addItem(setConditions), removeCondition: removeItem(setConditions),
    addAllergy: addItem(setAllergies), removeAllergy: removeItem(setAllergies),
    addMedication: addItem(setMedications), removeMedication: removeItem(setMedications),
    addRestriction: addItem(setRestrictions), removeRestriction: removeItem(setRestrictions),
  };
}
