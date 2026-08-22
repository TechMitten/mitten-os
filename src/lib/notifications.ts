import { useDesktopStore } from '@/stores/desktop-store';

export type NotificationType = 'info' | 'warning' | 'error' | 'success';

export function notify(
  title: string,
  message: string,
  type: NotificationType = 'info'
) {
  useDesktopStore.getState().addNotification({ title, message, type });
}
