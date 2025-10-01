import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styles from './NotificationProvider.module.scss';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  actions?: Array<{
    label: string;
    action: () => void;
    variant?: 'primary' | 'secondary';
  }>;
}

interface NotificationContextType {
  showNotification: (notification: Omit<Notification, 'id'>) => void;
  hideNotification: (id: string) => void;
  success: (title: string, message?: string, duration?: number) => void;
  error: (title: string, message?: string, duration?: number) => void;
  warning: (title: string, message?: string, duration?: number) => void;
  info: (title: string, message?: string, duration?: number) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const showNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification = { ...notification, id };
    
    setNotifications(prev => [...prev, newNotification]);

    // Auto remove after duration
    const duration = notification.duration ?? 5000;
    if (duration > 0) {
      setTimeout(() => {
        hideNotification(id);
      }, duration);
    }
  }, []);

  const hideNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const success = useCallback((title: string, message?: string, duration = 4000) => {
    showNotification({ type: 'success', title, message, duration });
  }, [showNotification]);

  const error = useCallback((title: string, message?: string, duration = 6000) => {
    showNotification({ type: 'error', title, message, duration });
  }, [showNotification]);

  const warning = useCallback((title: string, message?: string, duration = 5000) => {
    showNotification({ type: 'warning', title, message, duration });
  }, [showNotification]);

  const info = useCallback((title: string, message?: string, duration = 4000) => {
    showNotification({ type: 'info', title, message, duration });
  }, [showNotification]);

  const value = {
    showNotification,
    hideNotification,
    success,
    error,
    warning,
    info
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {createPortal(
        <NotificationContainer 
          notifications={notifications} 
          onHide={hideNotification}
        />,
        document.body
      )}
    </NotificationContext.Provider>
  );
};

interface NotificationContainerProps {
  notifications: Notification[];
  onHide: (id: string) => void;
}

const NotificationContainer: React.FC<NotificationContainerProps> = ({ notifications, onHide }) => {
  if (notifications.length === 0) return null;

  return (
    <div className={styles.container}>
      {notifications.map(notification => (
        <NotificationItem 
          key={notification.id} 
          notification={notification}
          onHide={onHide}
        />
      ))}
    </div>
  );
};

interface NotificationItemProps {
  notification: Notification;
  onHide: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onHide }) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return 'ℹ️';
    }
  };

  return (
    <div className={`${styles.notification} ${styles[notification.type]}`}>
      <div className={styles.content}>
        <div className={styles.header}>
          <span className={styles.icon}>{getIcon()}</span>
          <h4 className={styles.title}>{notification.title}</h4>
          <button 
            className={styles.closeButton}
            onClick={() => onHide(notification.id)}
            aria-label="Đóng thông báo"
          >
            ✕
          </button>
        </div>
        
        {notification.message && (
          <p className={styles.message}>{notification.message}</p>
        )}
        
        {notification.actions && notification.actions.length > 0 && (
          <div className={styles.actions}>
            {notification.actions.map((action, index) => (
              <button
                key={index}
                className={`${styles.actionButton} ${styles[action.variant || 'secondary']}`}
                onClick={() => {
                  action.action();
                  onHide(notification.id);
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
      
      <div className={styles.progressBar}>
        <div className={styles.progress}></div>
      </div>
    </div>
  );
};

export default NotificationProvider;
