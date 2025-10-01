/**
 * Global type definitions for KTool extension
 */

declare global {
  interface Window {
    KToolNotification?: {
      show: (message: string, type?: 'success' | 'error' | 'warning' | 'info', options?: any) => void;
      showWithAction: (message: string, type: string, actionText: string, actionCallback: () => void) => void;
      clear: () => void;
    };
    KToolTheme?: {
      setTheme: (theme: 'light' | 'dark' | 'auto') => void;
      getTheme: () => string;
      getCurrentTheme: () => 'light' | 'dark';
      toggle: () => void;
      init: () => void;
    };
  }
}

export {};
