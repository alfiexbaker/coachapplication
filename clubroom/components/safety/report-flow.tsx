/**
 * ReportFlow — Modal for reporting a user.
 *
 * Presents a list of report types (radio buttons), an optional description
 * text input, and a submit button. Shows a success confirmation after submit.
 */

import { useState, useCallback } from 'react';
import { Modal, View } from 'react-native';

import { createModalStyles, createButtonStyles, createInputStyles } from '@/constants/styles';
import { reportService } from '@/services/report-service';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/useTheme';

import {
  type ReportType,
  ReportFormContent,
  ReportSuccessView,
} from './report-flow-sections';

// ─── Types ──────────────────────────────────────────────────────

interface ReportFlowProps {
  visible: boolean;
  onClose: () => void;
  reportedUserId: string;
  context: 'profile' | 'message' | 'review';
}

// ─── Component ──────────────────────────────────────────────────

export function ReportFlow({
  visible,
  onClose,
  reportedUserId,
  context,
}: ReportFlowProps) {
  const { colors: palette } = useTheme();
  const { currentUser } = useAuth();
  const ModalStyles = createModalStyles(palette);
  const ButtonStyles = createButtonStyles(palette);
  const InputStyles = createInputStyles(palette);

  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!selectedType || !currentUser) return;

    setSubmitting(true);
    const result = await reportService.submitReport({
      reportedUserId,
      reportedByUserId: currentUser.id,
      type: selectedType,
      description: description.trim() || undefined,
      context,
    });
    if (result.success) {
      setSubmitted(true);
    }
    setSubmitting(false);
  }, [selectedType, currentUser, reportedUserId, description, context]);

  const handleClose = useCallback(() => {
    setSelectedType(null);
    setDescription('');
    setSubmitting(false);
    setSubmitted(false);
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={ModalStyles.overlay}>
        <View style={[ModalStyles.container, { backgroundColor: palette.surface }]}>
          <View style={ModalStyles.handle} />

          {submitted ? (
            <ReportSuccessView
              onClose={handleClose}
              palette={palette}
              ButtonStyles={ButtonStyles}
            />
          ) : (
            <ReportFormContent
              context={context}
              selectedType={selectedType}
              description={description}
              submitting={submitting}
              onSelectType={setSelectedType}
              onChangeDescription={setDescription}
              onSubmit={handleSubmit}
              onClose={handleClose}
              palette={palette}
              ModalStyles={ModalStyles}
              ButtonStyles={ButtonStyles}
              InputStyles={InputStyles}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
