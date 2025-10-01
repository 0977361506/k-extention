/**
 * Alert Replacement Utility for Chrome Extension
 * Modern notification system to replace all alert() calls
 */

// Import notification manager
import './NotificationManager.js';

// Global notification instance
const notify = window.KToolNotification;

/**
 * Replace all alert() calls with modern notifications
 */

// Override native alert
const originalAlert = window.alert;
window.alert = function(message) {
  console.warn('alert() called - converting to modern notification:', message);
  
  // Parse message to determine type
  let type = 'info';
  let title = 'Thông báo';
  let cleanMessage = message;
  
  if (message.startsWith('✅') || message.includes('thành công') || message.includes('successfully')) {
    type = 'success';
    title = 'Thành công';
    cleanMessage = message.replace(/^✅\s*/, '');
  } else if (message.startsWith('❌') || message.includes('lỗi') || message.includes('error') || message.includes('failed')) {
    type = 'error';
    title = 'Lỗi';
    cleanMessage = message.replace(/^❌\s*/, '');
  } else if (message.startsWith('⚠️') || message.includes('cảnh báo') || message.includes('warning')) {
    type = 'warning';
    title = 'Cảnh báo';
    cleanMessage = message.replace(/^⚠️\s*/, '');
  }
  
  notify.show({
    type,
    title,
    message: cleanMessage,
    duration: type === 'error' ? 8000 : 5000
  });
};

// Utility functions for different types of notifications
export const NotificationUtils = {
  // Success notifications
  success: (title, message) => {
    notify.success(title, message);
  },
  
  // Error notifications
  error: (title, message) => {
    notify.error(title, message);
  },
  
  // Warning notifications
  warning: (title, message) => {
    notify.warning(title, message);
  },
  
  // Info notifications
  info: (title, message) => {
    notify.info(title, message);
  },
  
  // Document operations
  documentSaved: (title = 'Tài liệu đã được lưu') => {
    notify.success(title, 'Nội dung đã được cập nhật thành công.');
  },
  
  documentCreated: (title = 'Trang đã được tạo') => {
    notify.success(title, 'Trang mới đã được tạo thành công.');
  },
  
  documentError: (error, action = 'thao tác') => {
    notify.error(
      `Lỗi ${action}`,
      `Đã xảy ra lỗi: ${error}. Vui lòng thử lại.`
    );
  },
  
  // API operations
  apiSuccess: (operation = 'Thao tác') => {
    notify.success(
      `${operation} thành công`,
      'Dữ liệu đã được xử lý thành công.'
    );
  },
  
  apiError: (error, operation = 'thao tác') => {
    notify.error(
      `Lỗi ${operation}`,
      `API error: ${error}. Vui lòng kiểm tra kết nối và thử lại.`
    );
  },
  
  // Validation errors
  validationError: (field, message) => {
    notify.warning(
      'Dữ liệu không hợp lệ',
      `${field}: ${message}`
    );
  },
  
  // Loading states
  showLoading: (message = 'Đang xử lý...') => {
    return notify.info('Đang tải', message, 0); // 0 duration = manual dismiss
  },
  
  hideLoading: (id) => {
    if (id) notify.remove(id);
  },
  
  // Confirmation with actions
  confirm: (title, message, onConfirm, onCancel) => {
    return notify.show({
      type: 'warning',
      title,
      message,
      duration: 0, // Manual dismiss
      actions: [
        {
          label: 'Xác nhận',
          variant: 'primary',
          action: onConfirm
        },
        {
          label: 'Hủy',
          action: onCancel || (() => {})
        }
      ]
    });
  },
  
  // AI operations
  aiProcessing: () => {
    return notify.info(
      'AI đang xử lý',
      'Đang phân tích và tạo nội dung...',
      0
    );
  },
  
  aiSuccess: (operation = 'chỉnh sửa') => {
    notify.success(
      'AI hoàn thành',
      `${operation} đã được thực hiện thành công.`
    );
  },
  
  aiError: (error) => {
    notify.error(
      'Lỗi AI',
      `Không thể xử lý yêu cầu: ${error}`
    );
  },
  
  // Network operations
  networkError: () => {
    notify.error(
      'Lỗi kết nối',
      'Không thể kết nối đến server. Vui lòng kiểm tra internet và thử lại.'
    );
  },
  
  // Permission errors
  permissionError: (action = 'thao tác này') => {
    notify.warning(
      'Không có quyền',
      `Bạn không có quyền thực hiện ${action}.`
    );
  },
  
  // Settings
  settingsSaved: () => {
    notify.success(
      'Cài đặt đã lưu',
      'Các thay đổi đã được áp dụng thành công.'
    );
  },
  
  settingsError: (error) => {
    notify.error(
      'Lỗi cài đặt',
      `Không thể lưu cài đặt: ${error}`
    );
  }
};

// Make it globally available
window.KToolNotificationUtils = NotificationUtils;

export default NotificationUtils;
