import React, { useState, useEffect } from 'react';
import FullDocumentEditor from './FullDocumentEditor';
import { AppState, DocumentVersion } from '../../types/types';
import { createPageFromGeneratedContent, getCurrentSpaceKey, extractPageIdFromUrl } from '../../api/api';
import { StorageManager } from '../../utils/storage';
import { VersionManager } from '../../utils/versionManager';
import styles from './EnhancedEditTab.module.scss';

interface EnhancedEditTabProps {
  state: AppState;
  updateState: (updates: Partial<AppState>) => void;
}

const EnhancedEditTab: React.FC<EnhancedEditTabProps> = ({ state, updateState }) => {
  const [pageTitle, setPageTitle] = useState('');
  const [currentStorageFormat, setCurrentStorageFormat] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (state.generatedContent) {
      try {
        const data = JSON.parse(state.generatedContent);
        const title = data.title || `Generated Document - ${new Date().toLocaleDateString()}`;
        setPageTitle(title);
        setCurrentStorageFormat(data.fullStorageFormat || '');
      } catch (e) {
        console.error("Failed to parse generated content:", e);
        setCurrentStorageFormat(state.generatedContent || '');
        setPageTitle(`Generated Document - ${new Date().toLocaleDateString()}`);
      }
    }
  }, [state.generatedContent]);

  const handleContentChange = (newContent: string) => {
    setCurrentStorageFormat(newContent);
    
    // Update the state with modified content
    try {
      const generatedData = JSON.parse(state.generatedContent || '{}');
      generatedData.fullStorageFormat = newContent;
      updateState({
        generatedContent: JSON.stringify(generatedData),
        hasUnsavedChanges: true
      });
    } catch (e) {
      // If it's not JSON, just update as plain text
      updateState({
        generatedContent: newContent,
        hasUnsavedChanges: true
      });
    }
  };

  const handleSaveVersion = async () => {
    if (!currentStorageFormat) {
      if ((window as any).KToolNotificationUtils) {
        (window as any).KToolNotificationUtils.validationError('Nội dung', 'Không có nội dung để lưu');
      }
      return;
    }

    try {
      setIsSaving(true);
      
      // Create new version
      const version: DocumentVersion = {
        id: VersionManager.generateVersionId(),
        title: pageTitle,
        content: state.generatedContent,
        createdAt: new Date().toISOString(),
        isCurrent: true
      };

      await VersionManager.saveVersion(version);
      
      // Update state to mark as saved
      updateState({
        hasUnsavedChanges: false,
        currentVersionId: version.id
      });

      if ((window as any).KToolNotificationUtils) {
        (window as any).KToolNotificationUtils.documentSaved('Tài liệu đã được lưu thành công!');
      }
      
    } catch (error) {
      console.error('❌ Error saving version:', error);
      if ((window as any).KToolNotificationUtils) {
        (window as any).KToolNotificationUtils.documentError(error, 'lưu tài liệu');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDocument = async (content: string) => {
    try {
      setIsCreating(true);
      const spaceKey = getCurrentSpaceKey();
      
      if (!spaceKey) {
        if ((window as any).KToolNotificationUtils) {
          (window as any).KToolNotificationUtils.error(
            'Không thể xác định Space Key',
            'Vui lòng đảm bảo bạn đang ở trong một Confluence space.\n\nHướng dẫn:\n1. Truy cập vào một Confluence space\n2. URL phải chứa /spaces/SPACEKEY/ hoặc /display/SPACEKEY/\n3. Đảm bảo trang đã load hoàn toàn\n4. Thử refresh trang và kiểm tra lại'
          );
        }
        return;
      }

      console.log('🔄 Creating page in space:', spaceKey);
      
      // Load settings to get the documentUrl (parent folder)
      const settings = await StorageManager.getSettings();
      let parentPageId: string | null = null;
      
      if (settings.documentUrl && settings.documentUrl.trim()) {
        parentPageId = extractPageIdFromUrl(settings.documentUrl);
        if (parentPageId) {
          console.log('📁 Using parent page ID from settings:', parentPageId);
        } else {
          console.warn('⚠️ Could not extract page ID from documentUrl:', settings.documentUrl);
        }
      }
      
      await createPageFromGeneratedContent(pageTitle, content, spaceKey, parentPageId || undefined);
      
      if ((window as any).KToolNotificationUtils) {
        (window as any).KToolNotificationUtils.documentCreated('Tài liệu đã được tạo thành công!');
      }
      
      // Navigate back to main after successful creation
      updateState({ currentView: 'main' });
      
    } catch (error) {
      console.error('❌ Error creating page:', error);
      
      if ((window as any).KToolNotificationUtils) {
        (window as any).KToolNotificationUtils.documentError(error, 'tạo trang');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreatePage = async () => {
    if (!currentStorageFormat) {
      if ((window as any).KToolNotificationUtils) {
        (window as any).KToolNotificationUtils.validationError('Nội dung', 'Không có nội dung để tạo trang');
      }
      return;
    }
    
    await handleSaveDocument(currentStorageFormat);
  };

  const handlePreview = () => {
    // Update the generated content with current edits
    try {
      const generatedData = JSON.parse(state.generatedContent || '{}');
      generatedData.fullStorageFormat = currentStorageFormat;
      updateState({
        generatedContent: JSON.stringify(generatedData),
        currentView: 'preview'
      });
    } catch (e) {
      updateState({
        generatedContent: currentStorageFormat,
        currentView: 'preview'
      });
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerInfo}>
            <h2 className={styles.headerTitle}>✏️ Enhanced Document Editor</h2>
            <p className={styles.headerDescription}>
              Edit document content, diagrams và preview trước khi tạo Confluence page
            </p>
          </div>
          
          <div className={styles.headerActions}>
            <button 
              onClick={handlePreview} 
              className={`${styles.actionButton} ${styles.previewButton}`}
            >
              👁️ Preview
            </button>
            
            <button 
              onClick={handleSaveVersion}
              disabled={isSaving}
              className={`${styles.actionButton} ${styles.saveButton} ${
                isSaving ? styles.disabled : ''
              }`}
            >
              {isSaving ? 'Saving...' : 'Save Version'}
            </button>
            
            <button 
              onClick={handleCreatePage} 
              disabled={isCreating || !currentStorageFormat} 
              className={`${styles.actionButton} ${styles.createButton} ${
                (isCreating || !currentStorageFormat) ? styles.disabled : ''
              }`}
            >
              {isCreating ? 'Creating...' : 'Create Confluence Page'}
            </button>
            
            <button 
              onClick={() => updateState({ currentView: 'main' })} 
              className={`${styles.actionButton} ${styles.backButton}`}
            >
              ← Back to Main
            </button>
          </div>
        </div>
      </div>

      {/* Full Document Editor */}
      {currentStorageFormat ? (
        <FullDocumentEditor
          initialContent={currentStorageFormat}
          title={pageTitle}
          onContentChange={handleContentChange}
          onSave={handleSaveDocument}
          isEditable={true}
          state={state}
          updateState={updateState}
        />
      ) : (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>✏️</div>
          <h3 className={styles.emptyTitle}>No Content to Edit</h3>
          <p className={styles.emptyDescription}>
            Vui lòng generate document content trước khi edit.
          </p>
          <button
            onClick={() => updateState({ currentView: 'main' })}
            className={`${styles.actionButton} ${styles.createButton}`}
          >
            ← Go Back to Generate Content
          </button>
        </div>
      )}
    </div>
  );
};

export default EnhancedEditTab;