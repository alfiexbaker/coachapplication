/**
 * Hook: useAcademyBranding
 *
 * Manages academy branding screen state: load academy, form state, save branding.
 * Used by app/academy/[id]/branding.tsx
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';

import { useAuth } from '@/hooks/use-auth';
import { academyService, UpdateBrandingInput } from '@/services/academy-service';
import type { Academy, AcademyMembership } from '@/constants/types';
import { createLogger } from '@/utils/logger';

const logger = createLogger('useAcademyBranding');

export const COLOR_OPTIONS = [
  '#1E40AF', '#7C3AED', '#059669', '#DC2626',
  '#EA580C', '#0891B2', '#4F46E5', '#0F172A',
] as const;

export function useAcademyBranding(id: string | undefined) {
  const { currentUser } = useAuth();

  const [academy, setAcademy] = useState<Academy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#1E40AF');
  const [secondaryColor, setSecondaryColor] = useState('#60A5FA');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [canEdit, setCanEdit] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [academyData, staffData] = await Promise.all([
        academyService.getAcademy(id),
        academyService.getStaff(id),
      ]);
      setAcademy(academyData);
      if (academyData) {
        setLogoUrl(academyData.logoUrl || '');
        setBannerUrl(academyData.bannerUrl || '');
        setPrimaryColor(academyData.primaryColor || '#1E40AF');
        setSecondaryColor(academyData.secondaryColor || '#60A5FA');
        setEmail(academyData.email || '');
        setPhone(academyData.phone || '');
        setWebsite(academyData.website || '');
        setAddress(academyData.address || '');
      }
      if (currentUser?.id) {
        const membership = staffData.find((m) => m.userId === currentUser.id);
        setCanEdit(membership?.role === 'OWNER' || !!membership?.permissions.includes('MANAGE_SETTINGS'));
      }
    } catch (error) {
      logger.error('Failed to load academy:', error);
    } finally {
      setLoading(false);
    }
  }, [id, currentUser?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = useCallback(async () => {
    if (!academy) return;
    setSaving(true);
    try {
      const branding: UpdateBrandingInput = {
        logoUrl: logoUrl || undefined, bannerUrl: bannerUrl || undefined,
        primaryColor, secondaryColor,
        email: email || undefined, phone: phone || undefined,
        website: website || undefined, address: address || undefined,
      };
      await academyService.updateBranding(academy.id, branding);
      Alert.alert('Success', 'Branding updated successfully');
      router.back();
    } catch (error) {
      logger.error('Failed to save branding:', error);
      Alert.alert('Error', 'Failed to update branding');
    } finally {
      setSaving(false);
    }
  }, [academy, logoUrl, bannerUrl, primaryColor, secondaryColor, email, phone, website, address]);

  return {
    academy, loading, saving, canEdit,
    logoUrl, bannerUrl, primaryColor, secondaryColor,
    email, phone, website, address,
    setLogoUrl, setBannerUrl, setPrimaryColor, setSecondaryColor,
    setEmail, setPhone, setWebsite, setAddress,
    handleSave,
  };
}
