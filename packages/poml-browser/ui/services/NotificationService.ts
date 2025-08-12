/**
 * Notification Service
 * Singleton service for reporting notifications from anywhere in the application
 * Works both inside and outside React components
 */

import { NotificationType, NotificationPosition } from '../contexts/NotificationContext';

export interface NotificationServiceOptions {
  title?: string;
  duration?: number;
  autoHide?: boolean;
  position?: NotificationPosition;
}

type NotificationHandler = (type: NotificationType, message: string, options?: NotificationServiceOptions) => string;

class NotificationService {
  private static instance: NotificationService;
  private handler: NotificationHandler | null = null;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Register the notification handler (called by the React provider)
   */
  public setHandler(handler: NotificationHandler): void {
    this.handler = handler;
  }

  /**
   * Remove the notification handler
   */
  public removeHandler(): void {
    this.handler = null;
  }

  /**
   * Show a success notification
   */
  public success(message: string, options?: NotificationServiceOptions): string {
    return this.notify('success', message, { position: 'top', ...options });
  }

  /**
   * Show an error notification
   */
  public error(message: string, options?: NotificationServiceOptions): string {
    return this.notify('error', message, { 
      autoHide: false,
      duration: 0,
      position: 'top',
      ...options 
    });
  }

  /**
   * Show a warning notification
   */
  public warning(message: string, options?: NotificationServiceOptions): string {
    return this.notify('warning', message, { position: 'top', ...options });
  }

  /**
   * Show an info notification
   */
  public info(message: string, options?: NotificationServiceOptions): string {
    return this.notify('info', message, { position: 'bottom', ...options });
  }

  /**
   * Show success notification at the bottom
   */
  public bottomSuccess(message: string, options?: Omit<NotificationServiceOptions, 'position'>): string {
    return this.notify('success', message, { position: 'bottom', ...options });
  }

  /**
   * Show error notification at the bottom
   */
  public bottomError(message: string, options?: Omit<NotificationServiceOptions, 'position'>): string {
    return this.notify('error', message, { 
      autoHide: false,
      duration: 0,
      position: 'bottom',
      ...options 
    });
  }

  /**
   * Show warning notification at the bottom
   */
  public bottomWarning(message: string, options?: Omit<NotificationServiceOptions, 'position'>): string {
    return this.notify('warning', message, { position: 'bottom', ...options });
  }

  /**
   * Show info notification at the top (override default)
   */
  public topInfo(message: string, options?: Omit<NotificationServiceOptions, 'position'>): string {
    return this.notify('info', message, { position: 'top', ...options });
  }

  /**
   * Generic notification method
   */
  private notify(type: NotificationType, message: string, options?: NotificationServiceOptions): string {
    if (!this.handler) {
      // Fallback to console if no handler is registered
      const logMethod = type === 'error' ? 'error' : 
                       type === 'warning' ? 'warn' : 
                       type === 'success' ? 'log' : 'info';
      console[logMethod](`[${type.toUpperCase()}]${options?.title ? ` ${options.title}:` : ''} ${message}`);
      return `console-${Date.now()}`;
    }

    return this.handler(type, message, options);
  }

  /**
   * Convenience method for handling async operations
   */
  public async withErrorHandling<T>(
    operation: () => Promise<T>, 
    errorMessage?: string,
    successMessage?: string
  ): Promise<T | null> {
    try {
      const result = await operation();
      if (successMessage) {
        this.success(successMessage);
      }
      return result;
    } catch (error) {
      const message = errorMessage || (error instanceof Error ? error.message : 'An error occurred');
      this.error(message);
      return null;
    }
  }

  /**
   * Convenience method for handling sync operations
   */
  public withSyncErrorHandling<T>(
    operation: () => T, 
    errorMessage?: string,
    successMessage?: string
  ): T | null {
    try {
      const result = operation();
      if (successMessage) {
        this.success(successMessage);
      }
      return result;
    } catch (error) {
      const message = errorMessage || (error instanceof Error ? error.message : 'An error occurred');
      this.error(message);
      return null;
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();

// Export convenience functions for direct usage
export const notify = {
  // Top notifications (default for success, error, warning)
  success: (message: string, options?: NotificationServiceOptions) => notificationService.success(message, options),
  error: (message: string, options?: NotificationServiceOptions) => notificationService.error(message, options),
  warning: (message: string, options?: NotificationServiceOptions) => notificationService.warning(message, options),
  info: (message: string, options?: NotificationServiceOptions) => notificationService.info(message, options),
  
  // Bottom notifications
  bottomSuccess: (message: string, options?: Omit<NotificationServiceOptions, 'position'>) => notificationService.bottomSuccess(message, options),
  bottomError: (message: string, options?: Omit<NotificationServiceOptions, 'position'>) => notificationService.bottomError(message, options),
  bottomWarning: (message: string, options?: Omit<NotificationServiceOptions, 'position'>) => notificationService.bottomWarning(message, options),
  topInfo: (message: string, options?: Omit<NotificationServiceOptions, 'position'>) => notificationService.topInfo(message, options),
};

export default notificationService;