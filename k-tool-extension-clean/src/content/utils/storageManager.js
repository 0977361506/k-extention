/**
 * Unified Storage Manager - Handles all storage operations
 * Supports Chrome storage, localStorage, content backup, and settings
 */

// Import constants from shared
import {
  DEFAULT_SETTINGS,
  EXTENSION_SETTINGS_KEY,
} from "../../shared/constants.js";

export class StorageManager {
  // Storage keys constants
  static STORAGE_KEYS = {
    CONFLUENCE_CONTENT_BACKUP: "confluence_content_backup",
    MERMAID_DIAGRAM_MAPPINGS: "mermaid_diagram_mappings",
    MERMAID_AI_FILENAME: "mermaid-ai-filename",
    MERMAID_DIAGRAM_INFO: "mermaid_diagram_info",
    CONFLUENCE_EDITOR_BACKUP: "confluence_editor_backup",
  };

  constructor() {
    this.STORAGE_KEY = "confluence_editor_backup";
    this.AUTO_SAVE_INTERVAL = 30000; // 30 seconds
    this.autoSaveTimer = null;
  }

  // ========== CHROME STORAGE METHODS (from shared/storage.js) ==========

  /**
   * Load settings from Chrome storage
   * @returns {Promise<Object>} Settings object
   */
  static async getSettings() {
    try {
      const result = await chrome.storage.sync.get([EXTENSION_SETTINGS_KEY]);
      return result[EXTENSION_SETTINGS_KEY] || DEFAULT_SETTINGS;
    } catch (error) {
      console.error("Error loading settings:", error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Save settings to Chrome storage
   * @param {Object} settings - Settings object to save
   * @returns {Promise<boolean>} Success status
   */
  static async saveSettings(settings) {
    try {
      await chrome.storage.sync.set({ [EXTENSION_SETTINGS_KEY]: settings });
      return true;
    } catch (error) {
      console.error("Error saving settings:", error);
      return false;
    }
  }

  /**
   * Update specific setting field
   * @param {string} field - Field name to update
   * @param {any} value - New value
   * @returns {Promise<boolean>} Success status
   */
  static async updateSetting(field, value) {
    try {
      const currentSettings = await this.getSettings();
      const updatedSettings = { ...currentSettings, [field]: value };
      return await this.saveSettings(updatedSettings);
    } catch (error) {
      console.error("Error updating setting:", error);
      return false;
    }
  }

  /**
   * Reset settings to default
   * @returns {Promise<boolean>} Success status
   */
  static async resetSettings() {
    try {
      await chrome.storage.sync.remove([EXTENSION_SETTINGS_KEY]);
      return true;
    } catch (error) {
      console.error("Error resetting settings:", error);
      return false;
    }
  }

  /**
   * Validate settings object
   * @param {Object} settings - Settings to validate
   * @returns {Object} Validation result with errors
   */
  static validateSettings(settings) {
    const errors = {};

    if (!settings.apiKey?.trim()) {
      errors.apiKey = "API Key là bắt buộc";
    }

    if (!settings.urlTemplate?.trim()) {
      errors.urlTemplate = "URL Template là bắt buộc";
    } else {
      const validationResult = this.validateConfluencePageLink(
        settings.urlTemplate
      );

      if (!validationResult.valid) {
        errors.urlTemplate =
          validationResult.error || "URL Template không hợp lệ.";
      }
    }
    if (!settings.documentUrl?.trim()) {
      errors.documentUrl = "URL thư mục lưu tài liệu là bắt buộc";
    } else if (!this.isValidUrl(settings.documentUrl)) {
      errors.documentUrl = "URL không hợp lệ";
    }

    if (!settings.databaseUrl?.trim()) {
      errors.databaseUrl = "URL thư mục database là bắt buộc";
    } else if (!this.isValidUrl(settings.databaseUrl)) {
      errors.databaseUrl = "URL không hợp lệ";
    }

    // if (!settings.customPrompt?.trim()) {
    //   errors.customPrompt = "Custom Prompt là bắt buộc";
    // } else if (settings.customPrompt.trim().length < 10) {
    //   errors.customPrompt = "Custom Prompt phải có ít nhất 10 ký tự";
    // }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * Get all settings keys
   * @returns {Array<string>} Array of setting keys
   */
  static getSettingKeys() {
    return Object.keys(DEFAULT_SETTINGS);
  }

  /**
   * Check if settings exist
   * @returns {Promise<boolean>} True if settings exist
   */
  static async hasSettings() {
    try {
      const result = await chrome.storage.sync.get([EXTENSION_SETTINGS_KEY]);
      return !!result[EXTENSION_SETTINGS_KEY];
    } catch (error) {
      console.error("Error checking settings existence:", error);
      return false;
    }
  }

  /**
   * Get specific setting value
   * @param {string} key - Setting key
   * @returns {Promise<any>} Setting value or default
   */
  static async getSetting(key) {
    try {
      const settings = await this.getSettings();
      return settings[key] !== undefined
        ? settings[key]
        : DEFAULT_SETTINGS[key];
    } catch (error) {
      console.error(`Error getting setting ${key}:`, error);
      return DEFAULT_SETTINGS[key];
    }
  }

  /**
   * Export settings to JSON
   * @returns {Promise<string>} JSON string of settings
   */
  static async exportSettings() {
    try {
      const settings = await this.getSettings();
      return JSON.stringify(settings, null, 2);
    } catch (error) {
      console.error("Error exporting settings:", error);
      throw error;
    }
  }

  /**
   * Import settings from JSON
   * @param {string} jsonString - JSON string of settings
   * @returns {Promise<boolean>} Success status
   */
  static async importSettings(jsonString) {
    try {
      const settings = JSON.parse(jsonString);
      const validation = this.validateSettings(settings);

      if (!validation.isValid) {
        throw new Error(validation.message);
      }

      return await this.saveSettings(settings);
    } catch (error) {
      console.error("Error importing settings:", error);
      return false;
    }
  }

  /**
   * Clear all extension data from Chrome storage
   * @returns {Promise<boolean>} Success status
   */
  static async clearAllChromeStorage() {
    try {
      await chrome.storage.sync.clear();
      await chrome.storage.local.clear();
      return true;
    } catch (error) {
      console.error("Error clearing Chrome storage:", error);
      return false;
    }
  }

  /**
   * Check if URL is valid
   * @param {string} url - URL to validate
   * @returns {boolean} Is valid URL
   */
  static isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate Confluence page link (có pageId)
   * @param {string} link - Link Confluence để kiểm tra
   * @returns {Object} { valid: boolean, error?: string, pageId?: string }
   */
  static validateConfluencePageLink(link) {
    const out = { valid: false, error: null, pageId: null };

    if (!link || typeof link !== "string" || !link.trim()) {
      out.error = "URL là bắt buộc";
      return out;
    }

    let u;
    try {
      u = new URL(link.trim());
    } catch {
      out.error = "URL không hợp lệ";
      return out;
    }

    // check pageId in query param
    const pageIdParam = u.searchParams.get("pageId");
    if (pageIdParam && /^\d+$/.test(pageIdParam)) {
      out.valid = true;
      out.pageId = pageIdParam;
      return out;
    }

    // check pageId in path (/pages/{id})
    const pathParts = u.pathname.split("/");
    const pagesIndex = pathParts.indexOf("pages");
    if (pagesIndex >= 0 && pathParts.length > pagesIndex + 1) {
      const candidate = pathParts[pagesIndex + 1];
      if (/^\d+$/.test(candidate)) {
        out.valid = true;
        out.pageId = candidate;
        return out;
      }
    }

    out.error = "Không tìm thấy pageId trong URL";
    return out;
  }

  // ========== CONTENT STORAGE METHODS (original) ==========

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
      showNotification = true,
    } = options;

    const results = {
      localStorage: false,
      callback: false,
      errors: [],
    };

    // 1. Save to localStorage as backup
    if (enableLocalStorage) {
      try {
        this.saveToLocalStorage(content);
        results.localStorage = true;
        console.log("✅ Content saved to localStorage");
      } catch (error) {
        console.error("❌ Failed to save to localStorage:", error);
        results.errors.push(`localStorage: ${error.message}`);
      }
    }

    // 2. Call external save callback
    if (enableCallback && saveCallback) {
      try {
        await this.callSaveCallback(saveCallback, content);
        results.callback = true;
        console.log("✅ Content saved via callback");
      } catch (error) {
        console.error("❌ Failed to save via callback:", error);
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
      version: "1.0",
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
        console.log("🗑️ Removing old localStorage backup");
        localStorage.removeItem(this.STORAGE_KEY);
        return null;
      }

      console.log("📦 Loaded content from localStorage backup");
      return backupData.content;
    } catch (error) {
      console.error("❌ Failed to load from localStorage:", error);
      return null;
    }
  }

  /**
   * Clear localStorage backup
   */
  clearLocalStorage() {
    localStorage.removeItem(this.STORAGE_KEY);
    console.log("🗑️ Cleared localStorage backup");
  }

  /**
   * Call external save callback
   * @param {Function} callback - Save callback function
   * @param {Object} content - Content to save
   */
  async callSaveCallback(callback, content) {
    if (typeof callback !== "function") {
      throw new Error("Save callback is not a function");
    }

    // Handle both sync and async callbacks
    const result = callback(content);
    if (result && typeof result.then === "function") {
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
      this.showNotification("✅ Đã lưu thay đổi thành công", "success");
    } else if (localStorage || callback) {
      const method = localStorage ? "localStorage" : "callback";
      this.showNotification(`⚠️ Đã lưu qua ${method} (một phần)`, "warning");
    } else {
      this.showNotification("❌ Không thể lưu thay đổi", "error");
    }

    if (errors.length > 0) {
      console.warn("Save errors:", errors);
    }
  }

  /**
   * Show notification to user
   * @param {string} message - Notification message
   * @param {string} type - Notification type (success, warning, error)
   */
  showNotification(message, type = "info") {
    // Create notification element
    const notification = document.createElement("div");
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
      success: "#28a745",
      warning: "#ffc107",
      error: "#dc3545",
      info: "#17a2b8",
    };
    notification.style.background = colors[type] || colors.info;

    notification.textContent = message;
    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.opacity = "0";
        notification.style.transform = "translateX(100%)";
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
        console.log("🔄 Auto-save completed");
      } catch (error) {
        console.error("❌ Auto-save failed:", error);
      }
    }, this.AUTO_SAVE_INTERVAL);

    console.log("⏰ Auto-save started (every 30 seconds)");
  }

  /**
   * Stop auto-save timer
   */
  stopAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
      console.log("⏹️ Auto-save stopped");
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
      console.error("❌ Error comparing content:", error);
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
        version: backupData.version,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get item from localStorage
   * @param {string} key - Storage key
   * @returns {Promise<any>} Stored value or null
   */
  async getItem(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`❌ Error getting item from localStorage (${key}):`, error);
      return null;
    }
  }

  /**
   * Set item to localStorage
   * @param {string} key - Storage key
   * @param {any} value - Value to store
   * @returns {Promise<void>}
   */
  async setItem(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`❌ Error setting item to localStorage (${key}):`, error);
      throw error;
    }
  }

  /**
   * Remove item from localStorage
   * @param {string} key - Storage key
   * @returns {Promise<void>}
   */
  async removeItem(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(
        `❌ Error removing item from localStorage (${key}):`,
        error
      );
      throw error;
    }
  }

  /**
   * Save Mermaid diagram mappings to localStorage
   * @param {Map} diagramsMap - Map of diagram ID to diagram data
   * @returns {boolean} Success status
   */
  saveMermaidDiagramMappings(diagramsMap) {
    try {
      if (!diagramsMap || diagramsMap.size === 0) {
        console.log("🗂️ No diagrams to save, clearing mappings");
        localStorage.removeItem(
          StorageManager.STORAGE_KEYS.MERMAID_DIAGRAM_MAPPINGS
        );
        return true;
      }

      // Convert Map to plain object for storage
      const mappingsObject = {};
      diagramsMap.forEach((diagramData, diagramId) => {
        mappingsObject[diagramId] = {
          title: diagramData.title,
          type: diagramData.type,
          content: diagramData.content,
          timestamp: Date.now(),
        };
      });

      localStorage.setItem(
        StorageManager.STORAGE_KEYS.MERMAID_DIAGRAM_MAPPINGS,
        JSON.stringify(mappingsObject)
      );

      console.log(
        `✅ Saved ${diagramsMap.size} Mermaid diagram mappings to localStorage`
      );
      return true;
    } catch (error) {
      console.error("❌ Error saving Mermaid diagram mappings:", error);
      return false;
    }
  }

  /**
   * Load Mermaid diagram mappings from localStorage
   * @returns {Map} Map of diagram ID to diagram data
   */
  getMermaidDiagramMappings() {
    try {
      const stored = localStorage.getItem(
        StorageManager.STORAGE_KEYS.MERMAID_DIAGRAM_MAPPINGS
      );
      if (!stored) {
        console.log("📊 No stored Mermaid diagram mappings found");
        return new Map();
      }

      const mappingsObject = JSON.parse(stored);
      const diagramsMap = new Map();

      // Convert plain object back to Map
      Object.entries(mappingsObject).forEach(([diagramId, diagramData]) => {
        diagramsMap.set(diagramId, diagramData);
      });

      console.log(
        `📊 Loaded ${diagramsMap.size} Mermaid diagram mappings from localStorage`
      );
      return diagramsMap;
    } catch (error) {
      console.error("❌ Error loading Mermaid diagram mappings:", error);
      return new Map();
    }
  }

  /**
   * Clear all K-Tool related localStorage keys
   * @returns {Promise<Object>} Result with cleared and failed keys
   */
  async clearAllKToolData() {
    const keysToRemove = Object.values(StorageManager.STORAGE_KEYS);
    const clearedKeys = [];
    const failedKeys = [];

    for (const key of keysToRemove) {
      try {
        await this.removeItem(key);
        clearedKeys.push(key);
      } catch (error) {
        failedKeys.push({ key, error: error.message });
      }
    }

    console.log("🧹 Cleared K-Tool localStorage keys:", clearedKeys);
    if (failedKeys.length > 0) {
      console.warn("⚠️ Failed to clear some keys:", failedKeys);
    }

    return { clearedKeys, failedKeys };
  }
}
