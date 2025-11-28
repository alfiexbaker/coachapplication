import { NotificationItem } from '@/constants/types';
import { storageService } from './storage-service';

const STORAGE_KEY = 'clubroom.notifications';

export class NotificationService {
  async list(): Promise<NotificationItem[]> {
    return storageService.getItem<NotificationItem[]>(STORAGE_KEY, []);
  }

  async create(notification: NotificationItem) {
    const current = await this.list();
    const updated = [notification, ...current];
    await storageService.setItem(STORAGE_KEY, updated);
    return updated;
  }

  async markAsRead(id: string) {
    const current = await this.list();
    const updated = current.map((n) => (n.id === id ? { ...n, read: true } : n));
    await storageService.setItem(STORAGE_KEY, updated);
    return updated;
  }

  async markHandled(id: string) {
    const current = await this.list();
    const updated = current.map((n) => (n.id === id ? { ...n, read: true, handled: true } : n));
    await storageService.setItem(STORAGE_KEY, updated);
    return updated.find((n) => n.id === id);
  }

  async clearAll() {
    await storageService.setItem(STORAGE_KEY, []);
  }
}

export const notificationService = new NotificationService();
