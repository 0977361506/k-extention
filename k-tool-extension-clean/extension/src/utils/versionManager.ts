import { DocumentVersion } from '../types/types';

const VERSION_STORAGE_KEY = 'ktool_document_versions';
const MAX_VERSIONS = 2;

export class VersionManager {
  static async getVersions(): Promise<DocumentVersion[]> {
    try {
      const result = await chrome.storage.local.get([VERSION_STORAGE_KEY]);
      return result[VERSION_STORAGE_KEY] || [];
    } catch (error) {
      console.error('Error getting versions:', error);
      return [];
    }
  }

  static async saveVersion(version: DocumentVersion): Promise<void> {
    try {
      const versions = await this.getVersions();
      
      // Mark all existing versions as not current
      versions.forEach(v => v.isCurrent = false);
      
      // Add new version
      versions.unshift(version);
      
      // Keep only MAX_VERSIONS
      if (versions.length > MAX_VERSIONS) {
        versions.splice(MAX_VERSIONS);
      }
      
      await chrome.storage.local.set({ [VERSION_STORAGE_KEY]: versions });
      console.log('🔧 K-tool: Version saved successfully');
    } catch (error) {
      console.error('Error saving version:', error);
      throw error;
    }
  }

  static async getCurrentVersion(): Promise<DocumentVersion | null> {
    try {
      const versions = await this.getVersions();
      return versions.find(v => v.isCurrent) || null;
    } catch (error) {
      console.error('Error getting current version:', error);
      return null;
    }
  }

  static async loadVersion(versionId: string): Promise<DocumentVersion | null> {
    try {
      const versions = await this.getVersions();
      return versions.find(v => v.id === versionId) || null;
    } catch (error) {
      console.error('Error loading version:', error);
      return null;
    }
  }

  static async deleteVersion(versionId: string): Promise<void> {
    try {
      const versions = await this.getVersions();
      const filteredVersions = versions.filter(v => v.id !== versionId);
      await chrome.storage.local.set({ [VERSION_STORAGE_KEY]: filteredVersions });
      console.log('🔧 K-tool: Version deleted successfully');
    } catch (error) {
      console.error('Error deleting version:', error);
      throw error;
    }
  }

  static async clearAllVersions(): Promise<void> {
    try {
      await chrome.storage.local.remove([VERSION_STORAGE_KEY]);
      console.log('🔧 K-tool: All versions cleared');
    } catch (error) {
      console.error('Error clearing versions:', error);
      throw error;
    }
  }

  static generateVersionId(): string {
    return `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static async hasVersions(): Promise<boolean> {
    const versions = await this.getVersions();
    return versions.length > 0;
  }
} 