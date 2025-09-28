// Chrome Storage Management
import { DEFAULT_SETTINGS, EXTENSION_SETTINGS_KEY } from "./constants.js";

export class StorageManager {
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
}
