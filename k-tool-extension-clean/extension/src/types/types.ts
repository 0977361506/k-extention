// Global Confluence types for extension
declare global {
  interface Window {
    AJS?: {
      Meta?: {
        get(key: string): string | null;
      };
    };
    Confluence?: {
      getContentId(): {
        spaceKey?: string;
        pageId?: string;
      } | null;
    };
  }
}

export type View = 'main' | 'preview' | 'edit' | 'advanced-edit' | 'basic-edit' | 'plain-text-edit' | 'settings';
export type Tab = 'simple' | 'dev-doc';
export type PreviewMode = 'preview' | 'edit';

export interface DocumentVersion {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface AppState {
    currentView: View;
    currentTab: Tab;
    previewMode: PreviewMode;
    generatedContent: string;
    isGenerating: boolean;
    baDocUrl: string;
    hasUnsavedChanges: boolean;
    currentVersionId?: string;
}

export interface ProgressStep {
    name: string;
    status: 'pending' | 'active' | 'completed';
}