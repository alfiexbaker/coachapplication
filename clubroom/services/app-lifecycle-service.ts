import { AppState, type AppStateStatus } from 'react-native';

import { createLogger } from '@/utils/logger';
import { emitTyped, ServiceEvents } from '@/services/event-bus';

const logger = createLogger('AppLifecycle');

class AppLifecycleService {
  private subscription: ReturnType<typeof AppState.addEventListener> | null = null;
  private appState: AppStateStatus = AppState.currentState;

  public init(): void {
    if (this.subscription) return;

    this.subscription = AppState.addEventListener('change', this.handleChange);
    logger.info('App lifecycle listener initialized', { state: this.appState });
  }

  private handleChange = (nextAppState: AppStateStatus): void => {
    const previousState = this.appState;
    this.appState = nextAppState;

    logger.debug('App state changed', { from: previousState, to: nextAppState });

    if (previousState === 'background' && nextAppState === 'active') {
      emitTyped(ServiceEvents.APP_FOREGROUNDED, { timestamp: Date.now() });
    }

    if (previousState === 'active' && nextAppState === 'background') {
      emitTyped(ServiceEvents.APP_BACKGROUNDED, { timestamp: Date.now() });
    }

    if (nextAppState === 'active') {
      emitTyped(ServiceEvents.APP_ACTIVE, { timestamp: Date.now() });
    }
  };

  public getCurrentState(): AppStateStatus {
    return this.appState;
  }

  public cleanup(): void {
    this.subscription?.remove();
    this.subscription = null;
    logger.debug('App lifecycle listener removed');
  }
}

export const appLifecycleService = new AppLifecycleService();
