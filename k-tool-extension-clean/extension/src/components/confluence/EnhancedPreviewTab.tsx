import React, { useState, useEffect } from 'react';
import FullDocumentEditor from './FullDocumentEditor';
import FontDebugComponent from '../common/FontDebugComponent';
import { createPageFromGeneratedContent, getCurrentSpaceKey, extractPageIdFromUrl } from '../../api/api';
import { StorageManager } from '../../utils/storage';
import { AppState, DocumentVersion } from '../../types/types';
import { VersionManager } from '../../utils/versionManager';
import { FontEncodingUtils } from '../../utils/fontUtils';
import styles from './EnhancedPreviewTab.module.scss';
import '../../styles/vietnamese-font-support.scss';
import '../../utils/NotificationInit.js';

interface EnhancedPreviewTabProps {
  state: AppState;
  updateState: (updates: Partial<AppState>) => void;
}

const EnhancedPreviewTab: React.FC<EnhancedPreviewTabProps> = ({ state, updateState }) => {
  const [pageTitle, setPageTitle] = useState('');
  const [currentStorageFormat, setCurrentStorageFormat] = useState('');
  const [originalTitle, setOriginalTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showFontDebug, setShowFontDebug] = useState(false);

  useEffect(() => {
    if (state.generatedContent) {
      try {
        const data = JSON.parse(state.generatedContent);
        let title = data.title || `Generated Document - ${new Date().toLocaleDateString()}`;
        
        // Clean title for font compatibility
        title = FontEncodingUtils.cleanTextForConfluence(title);
        
        setPageTitle(title);
        setCurrentStorageFormat(data.fullStorageFormat || '');
        setOriginalTitle(title);
      } catch (e) {
        console.error("Failed to parse generated content:", e);
        const cleanContent = FontEncodingUtils.cleanTextForConfluence(state.generatedContent || '');
        setCurrentStorageFormat(cleanContent);
        setPageTitle(`Generated Document - ${new Date().toLocaleDateString()}`);
        setOriginalTitle('Preview');
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
      window.KToolNotification?.show('Không có nội dung để lưu', 'error');
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

      window.KToolNotification?.show('Tài liệu đã được lưu thành công!', 'success');
      
    } catch (error) {
      console.error('❌ Error saving version:', error);
      window.KToolNotification?.show(`Lỗi khi lưu tài liệu: ${error}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDocument = async (content: string) => {
    try {
      setIsCreating(true);
      const spaceKey = getCurrentSpaceKey();
      
      if (!spaceKey) {
        window.KToolNotification?.show('Không thể xác định space key. Vui lòng đảm bảo bạn đang ở trong một Confluence space.\n\nHướng dẫn:\n1. Truy cập vào một Confluence space\n2. URL phải chứa /spaces/SPACEKEY/ hoặc /display/SPACEKEY/\n3. Đảm bảo trang đã load hoàn toàn\n4. Thử refresh trang và kiểm tra lại', 'error');
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
      } else {
        console.log('ℹ️ No documentUrl configured in settings, creating page at root level');
      }
      
      await createPageFromGeneratedContent(pageTitle, content, spaceKey, parentPageId || undefined);
      
      window.KToolNotification?.show('Tài liệu đã được tạo thành công!', 'success');
      
    } catch (error) {
      console.error('❌ Error creating page:', error);
      window.KToolNotification?.show(`Lỗi khi tạo trang: ${error}`, 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreatePage = async () => {
    if (!currentStorageFormat) {
      window.KToolNotification?.show('Không có nội dung để tạo trang', 'error');
      return;
    }
    
    // Validate UTF-8 encoding before creating page
    if (!FontEncodingUtils.validateUtf8(currentStorageFormat)) {
      console.warn('⚠️ Content may have encoding issues, attempting to clean...');
    }
    
    await handleSaveDocument(currentStorageFormat);
  };

  return (
    <div className={`${styles.container} vietnamese-text`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerInfo}>
            <h2 className={styles.headerTitle}>👁️ Enhanced Document Preview & Editor</h2>
            <p className={styles.headerDescription}>
              Preview, edit content và diagrams trước khi tạo Confluence page
            </p>
          </div>
          
          <div className={styles.headerActions}>
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
              onClick={handleSaveVersion}
              disabled={isSaving}
              className={`${styles.actionButton} ${styles.saveButton} ${
                isSaving ? styles.disabled : ''
              }`}
            >
              {isSaving ? 'Saving...' : 'Save Version'}
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
          <div className={styles.emptyIcon}>DOC</div>
          <h3 className={styles.emptyTitle}>No Content to Preview</h3>
          <p className={styles.emptyDescription}>
            Vui lòng generate document content trước khi preview.
          </p>
          <button
            onClick={() => updateState({ currentView: 'main' })}
            className={`${styles.actionButton} ${styles.createButton}`}
          >
            ← Go Back to Generate Content
          </button>
        </div>
      )}
      
      {/* Font Debug Component */}
      <FontDebugComponent show={showFontDebug} />
    </div>
  );
};

export default EnhancedPreviewTab;