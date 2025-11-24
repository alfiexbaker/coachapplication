import { Booking } from '@/constants/app-types';
import { MOCK_BOOKINGS } from '@/constants/mock-data';
import { storageService } from './storage-service';

const STORAGE_KEY = 'clubroom.bookings';

export type BookingDraft = {
  sessionType?: string;
  participants?: number;
  duration?: number;
  date?: string;
  slot?: string;
  locationOption?: string;
  locationText?: string;
  notes?: string;
  childId?: string;
  price?: number;
  coachId?: string;
};

class BookingService {
  private draft: BookingDraft = {};

  getDraft() {
    return this.draft;
  }

  updateDraft(patch: Partial<BookingDraft>) {
    this.draft = { ...this.draft, ...patch };
  }

  resetDraft() {
    this.draft = {};
  }

  async list(): Promise<Booking[]> {
    return storageService.getItem<Booking[]>(STORAGE_KEY, MOCK_BOOKINGS);
  }

  async updateStatus(id: string, status: Booking['status']) {
    const bookings = await this.list();
    const updated = bookings.map((b) => (b.id === id ? { ...b, status } : b));
    await storageService.setItem(STORAGE_KEY, updated);
    return updated.find((b) => b.id === id);
  }

  async cancel(id: string, reason: string) {
    const bookings = await this.list();
    const updated = bookings.map((b) => (b.id === id ? { ...b, status: 'CANCELLED', cancellationReason: reason } : b));
    await storageService.setItem(STORAGE_KEY, updated);
    return updated.find((b) => b.id === id);
  }

  async createFromDraft(): Promise<Booking> {
    const draft = this.draft;
    const bookings = await this.list();
    const newBooking: Booking = {
      id: `draft_${Date.now()}`,
      coachId: draft.coachId || 'coach1',
      athleteId: 'user1',
      bookedById: 'parent1',
      status: 'PENDING',
      scheduledAt: `${draft.date || new Date().toISOString().split('T')[0]}T${draft.slot || '10:00'}`,
      duration: draft.duration || 60,
      location: draft.locationText || 'Coach preferred venue',
      notes: draft.notes || '',
      coachName: 'Sarah Mitchell',
      athleteName: 'Tom Henderson',
      service: draft.sessionType || '1-on-1',
      locationLabel: draft.locationOption || 'Coach preferred location',
      start: `${draft.date || new Date().toISOString().split('T')[0]}T${draft.slot || '10:00'}`,
    } as Booking;
    const updated = [newBooking, ...bookings];
    await storageService.setItem(STORAGE_KEY, updated);
    this.resetDraft();
    return newBooking;
  }
}

export const bookingService = new BookingService();
