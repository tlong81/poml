type NotificationPosition = 'top' | 'bottom';
type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'debug';

interface NotificationOptions {
  duration?: number; // Duration in milliseconds, 0 means persistent
  position?: NotificationPosition; // Position on the screen
}

function notify(type: 'success' | 'error' | 'warning' | 'info' | 'debug', message: string, objects?: any, options?: NotificationOptions): void {
  // first: log / debug / error / warn to console
  // second: serialize the object at best effort, if too long, truncate it
  // third: if in background service worker, send to ui; if in content script, send to ui; if in ui, show popup
}
