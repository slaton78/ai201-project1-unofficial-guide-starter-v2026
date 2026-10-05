/**
 * FUTURE INTERFACE ONLY — push notifications are not implemented in this prototype and the
 * app never requests notification permission. A real implementation (expo-notifications)
 * must be opt-in, explain value before the OS prompt, and respect quiet hours.
 */
export interface NotificationService {
  readonly available: boolean;
  requestPermission(): Promise<'granted' | 'denied' | 'unavailable'>;
  scheduleDailyReminder(localHour: number): Promise<void>;
  cancelAll(): Promise<void>;
}

export const notifications: NotificationService = {
  available: false,
  requestPermission: async () => 'unavailable',
  scheduleDailyReminder: async () => undefined,
  cancelAll: async () => undefined,
};
