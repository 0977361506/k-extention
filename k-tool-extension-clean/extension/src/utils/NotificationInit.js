/**
 * Auto-initialize notification system for Chrome Extension
 * This script should be loaded early in the extension lifecycle
 */

// Function to initialize notification system
function initializeNotificationSystem() {
  // Skip if already initialized
  if (window.KToolNotification) {
    return;
  }

  console.log('🔔 Initializing K-Tool Notification System...');

  // Create and inject NotificationManager
  const notificationScript = document.createElement('script');
  notificationScript.textContent = `
    // Notification Manager - Inline version for Chrome Extension
    ${require('./NotificationManager.js').toString()}
  `;
  document.head.appendChild(notificationScript);

  // Create and inject AlertReplacer
  const alertScript = document.createElement('script');
  alertScript.textContent = `
    // Alert Replacer - Inline version for Chrome Extension
    ${require('./AlertReplacer.js').toString()}
  `;
  document.head.appendChild(alertScript);

  // Initialize CSS for notifications
  if (!document.querySelector('#ktool-notification-global-styles')) {
    const style = document.createElement('style');
    style.id = 'ktool-notification-global-styles';
    style.textContent = `
      /* Global notification styles */
      .ktool-notification-container {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
      }
      
      @media (prefers-color-scheme: dark) {
        .ktool-notification {
          color-scheme: dark;
        }
      }
      
      /* Animation improvements */
      .ktool-notification {
        will-change: transform, opacity;
      }
      
      .ktool-notification:hover {
        will-change: transform, box-shadow;
      }
      
      /* Focus styles for accessibility */
      .ktool-notification-close:focus,
      .ktool-notification-action:focus {
        outline: 2px solid var(--primary-500, #0ea5e9);
        outline-offset: 2px;
      }
    `;
    document.head.appendChild(style);
  }

  console.log('✅ K-Tool Notification System initialized');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeNotificationSystem);
} else {
  initializeNotificationSystem();
}

// Also initialize when extension context changes
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'initNotifications') {
      initializeNotificationSystem();
      sendResponse({ success: true });
    }
  });
}

// Export for manual initialization
if (typeof module !== 'undefined' && module.exports) {
  module.exports = initializeNotificationSystem;
}

// Make globally available
window.initKToolNotifications = initializeNotificationSystem;
