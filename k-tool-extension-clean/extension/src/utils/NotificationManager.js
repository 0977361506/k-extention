/**
 * Modern Notification System for Chrome Extension
 * No React hooks - Pure JavaScript
 */

class NotificationManager {
  constructor() {
    this.notifications = [];
    this.container = null;
    this.init();
  }

  init() {
    // Create container if not exists
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'ktool-notification-container';
      this.container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 2147483647;
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-width: 400px;
        pointer-events: none;
      `;
      document.body.appendChild(this.container);
    }
  }

  show(optionsOrMessage, type, duration) {
    // Handle both new API (options object) and simple API (message, type, duration)
    if (typeof optionsOrMessage === 'string') {
      return this.showSimple(optionsOrMessage, type, duration);
    }
    
    // Original options object API
    const options = optionsOrMessage;
    const {
      type: optionType = 'info',
      title,
      message = '',
      duration: optionDuration = 5000,
      actions = []
    } = options;

    const id = 'notification_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    const notification = {
      id,
      type: optionType,
      title: title || this.getDefaultTitle(optionType),
      message,
      duration: optionDuration,
      actions,
      element: this.createNotificationElement({ 
        id, 
        type: optionType, 
        title: title || this.getDefaultTitle(optionType), 
        message, 
        actions, 
        duration: optionDuration 
      })
    };

    this.notifications.push(notification);
    this.container.appendChild(notification.element);

    // Animate in
    setTimeout(() => {
      notification.element.style.transform = 'translateX(0)';
      notification.element.style.opacity = '1';
    }, 10);

    // Auto remove
    if (optionDuration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, optionDuration);
    }

    return id;
  }

  createNotificationElement({ id, type, title, message, actions, duration }) {
    const element = document.createElement('div');
    element.className = `ktool-notification ktool-notification-${type}`;
    element.style.cssText = `
      background: var(--bg-elevated, #ffffff);
      border: 1px solid var(--border-primary, #e2e8f0);
      border-radius: 12px;
      box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05));
      overflow: hidden;
      pointer-events: auto;
      transform: translateX(100%);
      opacity: 0;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      max-width: 100%;
    `;

    // Type-specific styling
    const typeStyles = {
      success: {
        borderLeft: '4px solid var(--success-500, #10b981)',
        background: 'linear-gradient(135deg, var(--success-50, #ecfdf5), var(--neutral-50, #f8fafc))'
      },
      error: {
        borderLeft: '4px solid var(--error-500, #ef4444)',
        background: 'linear-gradient(135deg, var(--error-50, #fef2f2), var(--neutral-50, #f8fafc))'
      },
      warning: {
        borderLeft: '4px solid var(--warning-500, #f59e0b)',
        background: 'linear-gradient(135deg, var(--warning-50, #fffbeb), var(--neutral-50, #f8fafc))'
      },
      info: {
        borderLeft: '4px solid var(--primary-500, #0ea5e9)',
        background: 'linear-gradient(135deg, var(--primary-50, #f0f9ff), var(--neutral-50, #f8fafc))'
      }
    };

    Object.assign(element.style, typeStyles[type] || typeStyles.info);

    const iconMap = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    element.innerHTML = `
      <div style="padding: 16px 20px;">
        <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 8px;">
          <span style="font-size: 20px; flex-shrink: 0; margin-top: 2px;">${iconMap[type] || iconMap.info}</span>
          <h4 style="font-size: 16px; font-weight: 600; color: var(--text-primary, #1e293b); margin: 0; flex: 1; line-height: 1.4;">${title}</h4>
          <button class="ktool-notification-close" style="
            background: none;
            border: none;
            font-size: 18px;
            color: var(--neutral-400, #94a3b8);
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            flex-shrink: 0;
            transition: all 0.2s ease;
          ">✕</button>
        </div>
        ${message ? `<p style="font-size: 14px; color: var(--text-secondary, #475569); margin: 0; line-height: 1.5; padding-left: 32px;">${message}</p>` : ''}
        ${actions.length > 0 ? `
          <div style="display: flex; gap: 8px; margin-top: 12px; padding-left: 32px;">
            ${actions.map((action, index) => `
              <button class="ktool-notification-action" data-action="${index}" style="
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                border: 1px solid transparent;
                ${action.variant === 'primary' ? `
                  background: var(--primary-500, #0ea5e9);
                  color: white;
                ` : `
                  background: var(--neutral-100, #f1f5f9);
                  color: var(--neutral-700, #334155);
                  border-color: var(--neutral-200, #e2e8f0);
                `}
              ">${action.label}</button>
            `).join('')}
          </div>
        ` : ''}
      </div>
      <div style="
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: var(--neutral-200, #e2e8f0);
        overflow: hidden;
      ">
        <div class="ktool-notification-progress" style="
          height: 100%;
          background: var(--${type === 'success' ? 'success' : type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'primary'}-500, #0ea5e9);
          animation: progressAnimation ${duration || 5000}ms linear forwards;
          border-radius: 0 3px 3px 0;
        "></div>
      </div>
    `;

    // Add event listeners
    const closeBtn = element.querySelector('.ktool-notification-close');
    closeBtn.addEventListener('click', () => this.remove(id));

    actions.forEach((action, index) => {
      const actionBtn = element.querySelector(`.ktool-notification-action[data-action="${index}"]`);
      if (actionBtn) {
        actionBtn.addEventListener('click', () => {
          action.action();
          this.remove(id);
        });
        
        // Add hover effects
        actionBtn.addEventListener('mouseenter', () => {
          if (action.variant === 'primary') {
            actionBtn.style.background = 'var(--primary-600, #0284c7)';
          } else {
            actionBtn.style.background = 'var(--neutral-200, #e2e8f0)';
          }
          actionBtn.style.transform = 'translateY(-1px)';
        });
        
        actionBtn.addEventListener('mouseleave', () => {
          if (action.variant === 'primary') {
            actionBtn.style.background = 'var(--primary-500, #0ea5e9)';
          } else {
            actionBtn.style.background = 'var(--neutral-100, #f1f5f9)';
          }
          actionBtn.style.transform = 'translateY(0)';
        });
      }
    });

    // Add hover effect to close button
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.background = 'var(--neutral-100, #f1f5f9)';
      closeBtn.style.color = 'var(--neutral-600, #475569)';
    });
    
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = 'none';
      closeBtn.style.color = 'var(--neutral-400, #94a3b8)';
    });

    return element;
  }

  remove(id) {
    const notification = this.notifications.find(n => n.id === id);
    if (!notification) return;

    // Animate out
    notification.element.style.transform = 'translateX(100%)';
    notification.element.style.opacity = '0';

    setTimeout(() => {
      if (notification.element.parentNode) {
        notification.element.parentNode.removeChild(notification.element);
      }
      this.notifications = this.notifications.filter(n => n.id !== id);
    }, 300);
  }

  success(title, message, duration = 4000) {
    return this.show({ type: 'success', title, message, duration });
  }

  error(title, message, duration = 6000) {
    return this.show({ type: 'error', title, message, duration });
  }

  warning(title, message, duration = 5000) {
    return this.show({ type: 'warning', title, message, duration });
  }

  info(title, message, duration = 4000) {
    return this.show({ type: 'info', title, message, duration });
  }

  // Simplified show method that accepts message and type as parameters (for backward compatibility)
  showSimple(message, type = 'info', duration = 5000) {
    return this.show({
      type,
      title: this.getDefaultTitle(type),
      message,
      duration
    });
  }

  getDefaultTitle(type) {
    const titles = {
      success: 'Thành công',
      error: 'Lỗi',
      warning: 'Cảnh báo',
      info: 'Thông báo'
    };
    return titles[type] || titles.info;
  }

  clear() {
    this.notifications.forEach(notification => {
      this.remove(notification.id);
    });
  }
}

// Global instance
window.KToolNotification = window.KToolNotification || new NotificationManager();

// Add CSS animations
if (!document.querySelector('#ktool-notification-styles')) {
  const style = document.createElement('style');
  style.id = 'ktool-notification-styles';
  style.textContent = `
    @keyframes progressAnimation {
      from { width: 100%; }
      to { width: 0%; }
    }
    
    .ktool-notification:hover {
      transform: translateY(-2px) !important;
      box-shadow: var(--shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)) !important;
    }
    
    @media (max-width: 480px) {
      .ktool-notification-container {
        left: 10px !important;
        right: 10px !important;
        top: 10px !important;
        max-width: none !important;
      }
    }
  `;
  document.head.appendChild(style);
}

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NotificationManager;
}
