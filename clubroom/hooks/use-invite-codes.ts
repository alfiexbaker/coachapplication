/**
 * useInviteCodes — State + CRUD logic for the Invite Codes admin screen.
 *
 * Manages invite code list, create modal, and code generation.
 */

import { useState, useCallback } from 'react';
import * as Clipboard from 'expo-clipboard';

import { useToast } from '@/components/ui/toast';
import type { InviteCode, School } from '@/constants/types';
import { INVITE_CODE_SEEDS } from '@/constants/invite-code-seeds';
import { useScreen, type ScreenStatus } from '@/hooks/use-screen';
import { apiClient } from '@/services/api-client';
import { err, ok, serviceError, type ServiceError } from '@/types/result';

const INVITE_CODES_STORAGE_KEY = 'clubroom.invite_codes';

function generateRandomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export interface UseInviteCodesResult {
  codes: InviteCode[];
  status: ScreenStatus;
  error: ServiceError | null;
  refreshing: boolean;
  showCreateModal: boolean;
  selectedSchool: School | null;
  newCodeText: string;
  maxUses: string;
  onRefresh: () => void;
  retry: () => void;
  setShowCreateModal: (show: boolean) => void;
  setSelectedSchool: (school: School | null) => void;
  setNewCodeText: (text: string) => void;
  setMaxUses: (uses: string) => void;
  generateCode: () => void;
  deactivateCode: (codeId: string) => void;
  copyToClipboard: (code: string) => void;
}

export function useInviteCodes(): UseInviteCodesResult {
  const { showToast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [newCodeText, setNewCodeText] = useState('');
  const [maxUses, setMaxUses] = useState('20');

  const loadCodes = useCallback(async () => {
    try {
      const storedCodes = await apiClient.get<InviteCode[]>(
        INVITE_CODES_STORAGE_KEY,
        INVITE_CODE_SEEDS,
      );
      return ok(storedCodes);
    } catch (loadError) {
      return err(serviceError('UNKNOWN', 'Failed to load invite codes.', loadError));
    }
  }, []);

  const { data, status, error, refreshing, onRefresh, retry } = useScreen<InviteCode[]>({
    load: loadCodes,
    deps: [],
    isEmpty: (value) => value.length === 0,
    refetchOnFocus: true,
    loadingStrategy: 'warm-first',
    dataKey: 'admin-invite-codes',
  });

  const codes = data ?? [];

  const generateCode = useCallback(() => {
    if (!selectedSchool) return;

    const code = newCodeText.trim().toUpperCase() || generateRandomCode();
    const newCode: InviteCode = {
      id: `invite-${Date.now()}`,
      code,
      schoolId: selectedSchool.id,
      schoolName: selectedSchool.name,
      createdBy: 'admin-1',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      maxUses: parseInt(maxUses) || 20,
      currentUses: 0,
      status: 'active',
    };

    const next = [newCode, ...codes];
    void apiClient.set(INVITE_CODES_STORAGE_KEY, next);
    onRefresh();
    setShowCreateModal(false);
    setNewCodeText('');
    setMaxUses('20');
    setSelectedSchool(null);
  }, [selectedSchool, newCodeText, maxUses, codes, onRefresh]);

  const deactivateCode = useCallback(
    (codeId: string) => {
      const next = codes.map((code) =>
        code.id === codeId
          ? {
              ...code,
              status: code.status === 'active' ? ('exhausted' as const) : ('active' as const),
            }
          : code,
      );
      void apiClient.set(INVITE_CODES_STORAGE_KEY, next);
      onRefresh();
    },
    [codes, onRefresh],
  );

  const copyToClipboard = useCallback(
    async (code: string) => {
      try {
        await Clipboard.setStringAsync(code);
        showToast('Invite code copied', 'success');
      } catch {
        showToast('Could not copy invite code', 'error');
      }
    },
    [showToast],
  );

  return {
    codes,
    status,
    error,
    refreshing,
    showCreateModal,
    selectedSchool,
    newCodeText,
    maxUses,
    onRefresh,
    retry,
    setShowCreateModal,
    setSelectedSchool,
    setNewCodeText,
    setMaxUses,
    generateCode,
    deactivateCode,
    copyToClipboard,
  };
}
