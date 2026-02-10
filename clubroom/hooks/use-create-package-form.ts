/**
 * useCreatePackageForm — State, validation, and submission for package form.
 */
import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { packageService, CreatePackageParams } from '@/services/package-service';
import type { SessionPackage, FootballObjective } from '@/constants/types';

interface UseCreatePackageFormOptions {
  editPackage?: SessionPackage;
  onSuccess?: (pkg: SessionPackage) => void;
  onError?: (error: string) => void;
}

export function useCreatePackageForm({ editPackage, onSuccess, onError }: UseCreatePackageFormOptions) {
  const { currentUser } = useAuth();
  const isEditing = !!editPackage;

  const [name, setName] = useState(editPackage?.name || '');
  const [description, setDescription] = useState(editPackage?.description || '');
  const [sessionCount, setSessionCount] = useState(editPackage?.sessionCount || 5);
  const [price, setPrice] = useState(editPackage?.price?.toString() || '');
  const [discountPercent, setDiscountPercent] = useState(editPackage?.discountPercent?.toString() || '');
  const [validDays, setValidDays] = useState(editPackage?.validDays || 60);
  const [selectedFocus, setSelectedFocus] = useState<FootballObjective[]>((editPackage?.focus as FootballObjective[]) || []);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const priceNum = parseFloat(price) || 0;
  const pricePerSession = sessionCount > 0 ? priceNum / sessionCount : 0;

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Package name is required';
    if (!price || parseFloat(price) <= 0) newErrors.price = 'Valid price is required';
    const discountNum = parseFloat(discountPercent) || 0;
    if (discountNum < 0 || discountNum > 50) newErrors.discountPercent = 'Discount must be 0-50%';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, price, discountPercent]);

  const toggleFocus = useCallback((focus: FootballObjective) => {
    setSelectedFocus((prev) =>
      prev.includes(focus) ? prev.filter((f) => f !== focus) : prev.length < 3 ? [...prev, focus] : prev,
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!validate() || !currentUser?.id) return;
    setSubmitting(true);
    try {
      if (isEditing && editPackage) {
        const updatedResult = await packageService.updatePackage(editPackage.id, {
          name: name.trim(), description: description.trim() || undefined,
          sessionCount, price: parseFloat(price), discountPercent: parseFloat(discountPercent) || 0,
          validDays, focus: selectedFocus,
        });
        if (!updatedResult.success) {
          onError?.(updatedResult.error.message);
          return;
        }
        if (updatedResult.data) onSuccess?.(updatedResult.data);
        else onError?.('Failed to update package');
      } else {
        const params: CreatePackageParams = {
          coachId: currentUser.id, coachName: currentUser.fullName || currentUser.name || 'Coach',
          name: name.trim(), description: description.trim() || undefined,
          sessionCount, price: parseFloat(price), discountPercent: parseFloat(discountPercent) || 0,
          validDays, focus: selectedFocus,
        };
        const createResult = await packageService.createPackage(params);
        if (!createResult.success) {
          onError?.(createResult.error.message);
          return;
        }
        onSuccess?.(createResult.data);
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'An error occurred');
    } finally { setSubmitting(false); }
  }, [validate, currentUser, isEditing, editPackage, name, description, sessionCount, price, discountPercent, validDays, selectedFocus, onSuccess, onError]);

  return {
    isEditing, name, setName, description, setDescription,
    sessionCount, setSessionCount, price, setPrice,
    discountPercent, setDiscountPercent, validDays, setValidDays,
    selectedFocus, toggleFocus, submitting, errors,
    priceNum, pricePerSession, handleSubmit,
  };
}
