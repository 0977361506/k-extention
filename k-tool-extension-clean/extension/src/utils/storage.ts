export interface ExtensionSettings {
  apiKey: string;
  urlTemplate: string;
  customPrompt: string;
  documentUrl: string;
  databaseUrl: string;
  isEnabled: boolean;
}

export const defaultSettings: ExtensionSettings = {
  apiKey: '',
  urlTemplate: 'https://api.openai.com/v1/{endpoint}',
  customPrompt: 'Bạn là một trợ lý AI hữu ích. Hãy trả lời một cách chính xác và ngắn gọn.',
  documentUrl: '',
  databaseUrl: '',
  isEnabled: true
};

export class StorageManager {
  static async getSettings(): Promise<ExtensionSettings> {
    try {
      const result = await chrome.storage.sync.get(['extensionSettings']);
      return result.extensionSettings || defaultSettings;
    } catch (error) {
      console.error('Error getting settings:', error);
      return defaultSettings;
    }
  }

  static async saveSettings(settings: ExtensionSettings): Promise<void> {
    try {
      await chrome.storage.sync.set({ extensionSettings: settings });
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }

  static async isEnabled(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.isEnabled;
  }

  static async getUrls(): Promise<{documentUrl: string, databaseUrl: string}> {
    const settings = await this.getSettings();
    return {
      documentUrl: settings.documentUrl,
      databaseUrl: settings.databaseUrl
    };
  }
}
