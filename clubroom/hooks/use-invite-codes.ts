/**
 * useInviteCodes — State + CRUD logic for the Invite Codes admin screen.
 *
 * Manages invite code list, create modal, and code generation.
 */

import { useState, useCallback } from 'react';

import { inviteCodes } from '@/constants/mock-data';
import type { InviteCode, School } from '@/constants/types';

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
  showCreateModal: boolean;
  selectedSchool: School | null;
  newCodeText: string;
  maxUses: string;
  setShowCreateModal: (show: boolean) => void;
  setSelectedSchool: (school: School | null) => void;
  setNewCodeText: (text: string) => void;
  setMaxUses: (uses: string) => void;
  generateCode: () => void;
  deactivateCode: (codeId: string) => void;
  copyToClipboard: (code: string) => void;
}

export function useInviteCodes(): UseInviteCodesResult {
  const [codes, setCodes] = useState<InviteCode[]>(inviteCodes);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [newCodeText, setNewCodeText] = useState('');
  const [maxUses, setMaxUses] = useState('20');

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

    setCodes((prev) => [newCode, ...prev]);
    setShowCreateModal(false);
    setNewCodeText('');
    setMaxUses('20');
    setSelectedSchool(null);
  }, [selectedSchool, newCodeText, maxUses]);

  const deactivateCode = useCallback((codeId: string) => {
    setCodes((prev) =>
      prev.map((code) =>
        code.id === codeId
          ? {
              ...code,
              status: code.status === 'active' ? ('exhausted' as const) : ('active' as const),
            }
          : code
      )
    );
  }, []);

  const copyToClipboard = useCallback((code: string) => {
    // In production, use Clipboard.setString(code)
    alert(`Code copied: ${code}`);
  }, []);

  return {
    codes,
    showCreateModal,
    selectedSchool,
    newCodeText,
    maxUses,
    setShowCreateModal,
    setSelectedSchool,
    setNewCodeText,
    setMaxUses,
    generateCode,
    deactivateCode,
    copyToClipboard,
  };
}
