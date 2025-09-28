// K-Tool Extension Popup Script
import { StorageManager } from "../shared/storage.js";

class PopupManager {
  constructor() {
    this.isInitialLoad = true;
    this.saveTimeout = null;
    this.elements = {};
    this.init();
  }

  async init() {
    this.bindElements();
    this.bindEvents();
    await this.loadSettings();
    this.isInitialLoad = false;
  }

  bindElements() {
    // Form elements
    this.elements = {
      enabledSwitch: document.getElementById("enabledSwitch"),
      statusText: document.getElementById("statusText"),
      apiKey: document.getElementById("apiKey"),
      selectedModel: document.getElementById("selectedModel"),
      urlTemplate: document.getElementById("urlTemplate"),
      documentUrl: document.getElementById("documentUrl"),
      databaseUrl: document.getElementById("databaseUrl"),
      instructionUrl: document.getElementById("instructionUrl"),
      customPrompt: document.getElementById("customPrompt"),
      charCount: document.getElementById("charCount"),
      saveStatus: document.getElementById("saveStatus"),
      saveIcon: document.getElementById("saveIcon"),
      saveText: document.getElementById("saveText"),
      resetBtn: document.getElementById("resetBtn"),
    };
  }

  bindEvents() {
    // Enable/disable switch
    this.elements.enabledSwitch.addEventListener("change", (e) => {
      this.updateStatusText(e.target.checked);
      this.handleInputChange("isEnabled", e.target.checked);
    });

    // Form inputs
    const inputFields = [
      "apiKey",
      "selectedModel",
      "urlTemplate",
      "documentUrl",
      "databaseUrl",
      "instructionUrl",
      "customPrompt",
    ];
    inputFields.forEach((field) => {
      const element = this.elements[field];
      if (element) {
        element.addEventListener("input", (e) => {
          this.handleInputChange(field, e.target.value);
          this.clearError(field);

          // Update character count for custom prompt
          if (field === "customPrompt") {
            this.updateCharCount(e.target.value);
          }
        });
      }
    });

    // Reset button
    this.elements.resetBtn.addEventListener("click", () => {
      this.resetSettings();
    });

    // Auto-save when popup is about to close
    this.bindAutoSaveEvents();
  }

  bindAutoSaveEvents() {
    // Save when popup window is about to close
    window.addEventListener("beforeunload", () => {
      this.saveSettingsImmediately();
    });

    // Save when popup loses focus (user clicks outside)
    window.addEventListener("blur", () => {
      this.saveSettingsImmediately();
    });

    // Save when page visibility changes (popup closes)
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        this.saveSettingsImmediately();
      }
    });

    // Save when popup loses focus (alternative method)
    window.addEventListener("pagehide", () => {
      this.saveSettingsImmediately();
    });
  }

  async loadSettings() {
    try {
      const settings = await StorageManager.getSettings();

      // Update form fields
      this.elements.enabledSwitch.checked = settings.isEnabled;
      this.elements.apiKey.value = settings.apiKey || "";
      this.elements.selectedModel.value = settings.selectedModel || "sonar-pro";
      this.elements.urlTemplate.value = settings.urlTemplate || "";
      this.elements.documentUrl.value = settings.documentUrl || "";
      this.elements.databaseUrl.value = settings.databaseUrl || "";
      this.elements.instructionUrl.value = settings.instructionUrl || "";
      this.elements.customPrompt.value = settings.customPrompt || "";

      // Update UI
      this.updateStatusText(settings.isEnabled);
      this.updateCharCount(settings.customPrompt || "");
    } catch (error) {
      console.error("Error loading settings:", error);
      this.showSaveStatus("error", "Lỗi tải cài đặt");
    }
  }

  handleInputChange(field, value) {
    if (this.isInitialLoad) return;

    // Clear existing timeout
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    // Debounce save
    this.saveTimeout = setTimeout(async () => {
      await this.saveSettings();
    }, 1000);
  }

  async saveSettings() {
    try {
      this.showSaveStatus("saving", "Đang lưu...");

      const settings = {
        isEnabled: this.elements.enabledSwitch.checked,
        apiKey: this.elements.apiKey.value.trim(),
        selectedModel: this.elements.selectedModel.value,
        urlTemplate: this.elements.urlTemplate.value.trim(),
        documentUrl: this.elements.documentUrl.value.trim(),
        databaseUrl: this.elements.databaseUrl.value.trim(),
        instructionUrl: this.elements.instructionUrl.value.trim(),
        customPrompt: this.elements.customPrompt.value.trim(),
      };

      // Validate settings
      const validation = StorageManager.validateSettings(settings);
      if (!validation.isValid) {
        this.showValidationErrors(validation.errors);
        this.showSaveStatus("error", "Lỗi validation");
        return;
      }

      // Save settings
      const success = await StorageManager.saveSettings(settings);
      if (success) {
        this.showSaveStatus("saved", "Đã lưu");
        this.clearAllErrors();
      } else {
        this.showSaveStatus("error", "Lỗi lưu");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      this.showSaveStatus("error", "Lỗi lưu");
    }
  }

  // Save settings immediately without debounce or UI feedback
  async saveSettingsImmediately() {
    try {
      // Clear any pending save timeout
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = null;
      }

      const settings = {
        isEnabled: this.elements.enabledSwitch.checked,
        apiKey: this.elements.apiKey.value.trim(),
        selectedModel: this.elements.selectedModel.value,
        urlTemplate: this.elements.urlTemplate.value.trim(),
        documentUrl: this.elements.documentUrl.value.trim(),
        databaseUrl: this.elements.databaseUrl.value.trim(),
        instructionUrl: this.elements.instructionUrl.value.trim(),
        customPrompt: this.elements.customPrompt.value.trim(),
      };

      // Save settings without validation to ensure data is preserved
      // even if some fields are invalid
      await StorageManager.saveSettings(settings);
    } catch (error) {
      console.error("Error saving settings immediately:", error);
    }
  }

  async resetSettings() {
    if (confirm("Bạn có chắc muốn reset tất cả cài đặt về mặc định?")) {
      try {
        await StorageManager.resetSettings();
        await this.loadSettings();
        this.showSaveStatus("saved", "Đã reset");
      } catch (error) {
        console.error("Error resetting settings:", error);
        this.showSaveStatus("error", "Lỗi reset");
      }
    }
  }

  updateStatusText(isEnabled) {
    this.elements.statusText.textContent = isEnabled ? "Bật" : "Tắt";
    this.elements.statusText.style.color = isEnabled ? "#28a745" : "#6c757d";
  }

  updateCharCount(text) {
    const count = text.length;
    this.elements.charCount.textContent = `${count} ký tự`;

    // Color coding
    if (count < 10) {
      this.elements.charCount.style.color = "#dc3545";
    } else if (count < 50) {
      this.elements.charCount.style.color = "#ffc107";
    } else {
      this.elements.charCount.style.color = "#28a745";
    }
  }

  showSaveStatus(type, message) {
    const statusElement = this.elements.saveStatus;
    const iconElement = this.elements.saveIcon;
    const textElement = this.elements.saveText;

    // Remove existing classes
    statusElement.className = "save-status";
    iconElement.className = "save-icon";

    // Add new classes
    statusElement.classList.add(type);
    if (type === "saving") {
      iconElement.classList.add("spinning");
      iconElement.textContent = "⏳";
    } else if (type === "saved") {
      iconElement.textContent = "✅";
    } else if (type === "error") {
      iconElement.textContent = "❌";
    }

    textElement.textContent = message;
    statusElement.style.display = "flex";

    // Auto hide after delay
    if (type !== "saving") {
      setTimeout(() => {
        statusElement.style.display = "none";
      }, 3000);
    }
  }

  showValidationErrors(errors) {
    Object.keys(errors).forEach((field) => {
      this.showError(field, errors[field]);
    });
  }

  showError(field, message) {
    const inputElement = this.elements[field];
    const errorElement = document.getElementById(`${field}Error`);

    if (inputElement && errorElement) {
      inputElement.classList.add("error");
      errorElement.textContent = message;
      errorElement.classList.add("show");
    }
  }

  clearError(field) {
    const inputElement = this.elements[field];
    const errorElement = document.getElementById(`${field}Error`);

    if (inputElement && errorElement) {
      inputElement.classList.remove("error");
      errorElement.classList.remove("show");
    }
  }

  clearAllErrors() {
    const errorElements = document.querySelectorAll(".error-message");
    const inputElements = document.querySelectorAll(
      ".form-input, .form-select, .form-textarea"
    );

    errorElements.forEach((el) => el.classList.remove("show"));
    inputElements.forEach((el) => el.classList.remove("error"));
  }
}

// Initialize popup when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new PopupManager();
});
