/**
 * useCreateCodeForm — State management for promo code creation form.
 */
import { useState, useCallback } from 'react';
import { promoService } from '@/services/promo-service';
import type { PromoCode, CreatePromoCodeParams } from '@/constants/types';

export const PRESET_AMOUNTS = [5, 10, 15, 25, 50];
export const PRESET_MAX_USES = [10, 50, 100, 500, 1000];

interface UseCreateCodeFormProps {
  adminUserId: string;
  adminUserName?: string;
  onSuccess: (promoCode: PromoCode) => void;
  onError?: (error: string) => void;
}

export function useCreateCodeForm({
  adminUserId,
  adminUserName,
  onSuccess,
  onError,
}: UseCreateCodeFormProps) {
  const [code, setCode] = useState('');
  const [creditAmount, setCreditAmount] = useState('10');
  const [maxUses, setMaxUses] = useState('100');
  const [description, setDescription] = useState('');
  const [onePerUser, setOnePerUser] = useState(true);
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);

  const handleCodeChange = useCallback((text: string) => {
    const normalized = text
      .toUpperCase()
      .replace(/\s+/g, '')
      .replace(/[^A-Z0-9]/g, '');
    setCode(normalized);
    setCodeError(null);
    if (normalized && !promoService.isValidCodeFormat(normalized)) {
      setCodeError('Code must be 3-20 alphanumeric characters');
    }
  }, []);

  const handleAmountChange = useCallback(
    (text: string) => setCreditAmount(text.replace(/[^0-9.]/g, '')),
    [],
  );
  const handleMaxUsesChange = useCallback(
    (text: string) => setMaxUses(text.replace(/[^0-9]/g, '')),
    [],
  );

  const handleDateChange = useCallback((_event: unknown, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) setExpiryDate(selectedDate);
  }, []);

  const generateRandomCode = useCallback(() => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 8; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    setCode(result);
    setCodeError(null);
  }, []);

  const validateForm = useCallback((): boolean => {
    if (!code.trim()) {
      setError('Please enter a promo code');
      return false;
    }
    if (!promoService.isValidCodeFormat(code)) {
      setError('Code must be 3-20 alphanumeric characters');
      return false;
    }
    const amount = parseFloat(creditAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Credit amount must be greater than 0');
      return false;
    }
    if (amount > 1000) {
      setError('Credit amount cannot exceed 1000');
      return false;
    }
    const uses = parseInt(maxUses, 10);
    if (isNaN(uses) || uses <= 0) {
      setError('Max uses must be greater than 0');
      return false;
    }
    if (hasExpiry && expiryDate <= new Date()) {
      setError('Expiry date must be in the future');
      return false;
    }
    setError(null);
    return true;
  }, [code, creditAmount, maxUses, hasExpiry, expiryDate]);

  const handleSubmit = useCallback(async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    setError(null);
    try {
      const params: CreatePromoCodeParams = {
        code: code.trim(),
        creditAmount: parseFloat(creditAmount),
        maxUses: parseInt(maxUses, 10),
        description: description.trim() || undefined,
        onePerUser,
        expiresAt: hasExpiry ? expiryDate.toISOString() : undefined,
        createdBy: adminUserId,
        createdByName: adminUserName,
      };
      const result = await promoService.createPromoCode(params);
      if (!result.success) {
        setError(result.error.message);
        onError?.(result.error.message);
        return;
      }
      onSuccess(result.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create promo code';
      setError(msg);
      onError?.(msg);
    } finally {
      setSubmitting(false);
    }
  }, [
    validateForm,
    code,
    creditAmount,
    maxUses,
    description,
    onePerUser,
    hasExpiry,
    expiryDate,
    adminUserId,
    adminUserName,
    onSuccess,
    onError,
  ]);

  return {
    code,
    creditAmount,
    maxUses,
    description,
    onePerUser,
    hasExpiry,
    expiryDate,
    showDatePicker,
    submitting,
    error,
    codeError,
    handleCodeChange,
    handleAmountChange,
    handleMaxUsesChange,
    handleDateChange,
    generateRandomCode,
    handleSubmit,
    setDescription,
    setOnePerUser,
    setHasExpiry,
    setShowDatePicker,
    setCreditAmount,
    setMaxUses,
  };
}
