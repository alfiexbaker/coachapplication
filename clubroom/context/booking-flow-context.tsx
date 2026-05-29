import React, { createContext, useState, use } from 'react';
import { bookingService, BookingDraft } from '@/services/booking-service';

interface BookingFlowContextValue {
  draft: BookingDraft;
  updateDraft: (patch: Partial<BookingDraft>) => void;
  reset: () => void;
  save: () => Promise<void>;
}

const BookingFlowContext = createContext<BookingFlowContextValue | undefined>(undefined);

export function BookingFlowProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<BookingDraft>(() => bookingService.getDraft());

  const updateDraft = (patch: Partial<BookingDraft>) => {
    const currentDraft = bookingService.getDraft();
    bookingService.updateDraft(patch);
    const nextDraft = bookingService.getDraft();

    if (nextDraft === currentDraft) {
      return;
    }

    setDraft(nextDraft);
  };

  const reset = () => {
    bookingService.resetDraft();
    setDraft(bookingService.getDraft());
  };

  const save = async () => {
    await bookingService.createFromDraft();
    setDraft(bookingService.getDraft());
  };

  const value = ({
    draft,
    updateDraft,
    reset,
    save,
  });

  return <BookingFlowContext.Provider value={value}>{children}</BookingFlowContext.Provider>;
}

export function useBookingFlow() {
  const ctx = use(BookingFlowContext);

  if (!ctx) {
    throw new Error('useBookingFlow must be used inside BookingFlowProvider');
  }

  return ctx;
}
