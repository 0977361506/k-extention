/**
 * Storage Manager - Handles saving and loading content changes
 * Supports both callback-based saving and localStorage backup
 */
export class StorageManager {
  constructor() {
    this.STORAGE_KEY = 'confluence_editor_backup';
    this.AUTO_SAVE_INTERVAL = 30000; // 30 seconds
    this.autoSaveTimer = null;
  }

  /**
   * Save content with multiple strategies
   * @param {Object} content - Content to save
   * @param {Function} saveCallback - Optional callback for external save
   * @param {Object} options - Save options
   */
  async saveContent(content, saveCallback = null, options = {}) {
    const { 
      enableLocalStorage = true, 
      enableCallback = true,
      showNotification = true 
    } = options;

    const results = {
      localStorage: false,
      callback: false,
      errors: []
    };

    // 1. Save to localStorage as backup
    if (enableLocalStorage) {
      try {
        this.saveToLocalStorage(content);
        results.localStorage = true;
        console.log('✅ Content saved to localStorage');
      } catch (error) {
        console.error('❌ Failed to save to localStorage:', error);
        results.errors.push(`localStorage: ${error.message}`);
      }
    }

    // 2. Call external save callback
    if (enableCallback && saveCallback) {
      try {
        await this.callSaveCallback(saveCallback, content);
        results.callback = true;
        console.log('✅ Content saved via callback');
      } catch (error) {
        console.error('❌ Failed to save via callback:', error);
        results.errors.push(`callback: ${error.message}`);
      }
    }

    // 3. Show notification
    if (showNotification) {
      this.showSaveNotification(results);
    }

    return results;
  }

  /**
   * Save content to localStorage
   * @param {Object} content - Content to save
   */
  saveToLocalStorage(content) {
    const backupData = {
      content: content,
      timestamp: Date.now(),
      version: '1.0'
    };

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(backupData));
  }

  /**
   * Load content from localStorage
   * @returns {Object|null} Saved content or null
   */
  loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (!saved) return null;

      const backupData = JSON.parse(saved);
      
      // Check if backup is recent (within 24 hours)
      const age = Date.now() - backupData.timestamp;
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      if (age > maxAge) {
        console.log('🗑️ Removing old localStorage backup');
        localStorage.removeItem(this.STORAGE_KEY);
        return null;
      }

      console.log('📦 Loaded content from localStorage backup');
      return backupData.content;
    } catch (error) {
      console.error('❌ Failed to load from localStorage:', error);
      return null;
    }
  }

  /**
   * Clear localStorage backup
   */
  clearLocalStorage() {
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('🗑️ Cleared localStorage backup');
  }

  /**
   * Call external save callback
   * @param {Function} callback - Save callback function
   * @param {Object} content - Content to save
   */
  async callSaveCallback(callback, content) {
    if (typeof callback !== 'function') {
      throw new Error('Save callback is not a function');
    }

    // Handle both sync and async callbacks
    const result = callback(content);
    if (result && typeof result.then === 'function') {
      await result;
    }
  }

  /**
   * Show save notification
   * @param {Object} results - Save results
   */
  showSaveNotification(results) {
    const { localStorage, callback, errors } = results;
    
    if (localStorage && callback) {
      this.showNotification('✅ Đã lưu thay đổi thành công', 'success');
    } else if (localStorage || callback) {
      const method = localStorage ? 'localStorage' : 'callback';
      this.showNotification(`⚠️ Đã lưu qua ${method} (một phần)`, 'warning');
    } else {
      this.showNotification('❌ Không thể lưu thay đổi', 'error');
    }

    if (errors.length > 0) {
      console.warn('Save errors:', errors);
    }
  }

  /**
   * Show notification to user
   * @param {string} message - Notification message
   * @param {string} type - Notification type (success, warning, error)
   */
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `confluence-editor-notification ${type}`;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 6px;
      color: white;
      font-family: Arial, sans-serif;
      font-size: 14px;
      z-index: 10001;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: all 0.3s ease;
      max-width: 300px;
    `;

    // Set background color based on type
    const colors = {
      success: '#28a745',
      warning: '#ffc107',
      error: '#dc3545',
      info: '#17a2b8'
    };
    notification.style.background = colors[type] || colors.info;

    notification.textContent = message;
    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
          notification.remove();
        }, 300);
      }
    }, 3000);
  }

  /**
   * Start auto-save timer
   * @param {Function} saveFunction - Function to call for auto-save
   */
  startAutoSave(saveFunction) {
    this.stopAutoSave();
    
    this.autoSaveTimer = setInterval(() => {
      try {
        saveFunction();
        console.log('🔄 Auto-save completed');
      } catch (error) {
        console.error('❌ Auto-save failed:', error);
      }
    }, this.AUTO_SAVE_INTERVAL);

    console.log('⏰ Auto-save started (every 30 seconds)');
  }

  /**
   * Stop auto-save timer
   */
  stopAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
      console.log('⏹️ Auto-save stopped');
    }
  }

  /**
   * Check if there are unsaved changes in localStorage
   * @param {Object} currentContent - Current content to compare
   * @returns {boolean} True if there are unsaved changes
   */
  hasUnsavedChanges(currentContent) {
    const saved = this.loadFromLocalStorage();
    if (!saved) return false;

    try {
      const currentStr = JSON.stringify(currentContent);
      const savedStr = JSON.stringify(saved);
      return currentStr !== savedStr;
    } catch (error) {
      console.error('❌ Error comparing content:', error);
      return false;
    }
  }

  /**
   * Get backup info
   * @returns {Object|null} Backup information
   */
  getBackupInfo() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (!saved) return null;

      const backupData = JSON.parse(saved);
      return {
        timestamp: backupData.timestamp,
        age: Date.now() - backupData.timestamp,
        version: backupData.version
      };
    } catch (error) {
      return null;
    }
  }
}
