import React, { useState, useEffect } from 'react';
import { AppState, DocumentVersion } from '../../types/types';
import { createPageFromGeneratedContent, getCurrentSpaceKey, extractPageIdFromUrl } from '../../api/api';
import { StorageManager } from '../../utils/storage';
import { VersionManager } from '../../utils/versionManager';
import styles from './PlainTextEditTab.module.scss';

interface PlainTextEditTabProps {
  state: AppState;
  updateState: (updates: Partial<AppState>) => void;
}

const PlainTextEditTab: React.FC<PlainTextEditTabProps> = ({ state, updateState }) => {
  const [plainTextContent, setPlainTextContent] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    if (state.generatedContent) {
      try {
        const data = JSON.parse(state.generatedContent);
        const title = data.title || `Generated Document - ${new Date().toLocaleDateString()}`;
        setPageTitle(title);
        setPlainTextContent(data.fullStorageFormat || '');
      } catch (e) {
        console.error("Failed to parse generated content:", e);
        setPlainTextContent(state.generatedContent || '');
        setPageTitle(`Generated Document - ${new Date().toLocaleDateString()}`);
      }
    }
  }, [state.generatedContent]);

  useEffect(() => {
    const words = plainTextContent.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
    setCharCount(plainTextContent.length);
  }, [plainTextContent]);

  const handleContentChange = (newContent: string) => {
    setPlainTextContent(newContent);
    updateState({
      hasUnsavedChanges: true
    });
  };

  const handleSaveVersion = async () => {
    if (!plainTextContent.trim()) {
      // Use notification instead of alert
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
        content: plainTextContent,
        createdAt: new Date().toISOString(),
        isCurrent: true
      };

      await VersionManager.saveVersion(version);
      
      // Update state to mark as saved
      updateState({
        hasUnsavedChanges: false,
        currentVersionId: version.id
      });

      // Use notification instead of alert
      if ((window as any).KToolNotificationUtils) {
        (window as any).KToolNotificationUtils.documentSaved('Tài liệu đã được lưu thành công!');
      }
      
    } catch (error) {
      console.error('❌ Error saving version:', error);
      // Use notification instead of alert
      if ((window as any).KToolNotificationUtils) {
        (window as any).KToolNotificationUtils.documentError(error, 'lưu tài liệu');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreatePage = async () => {
    if (!plainTextContent.trim()) {
      if ((window as any).KToolNotificationUtils) {
        (window as any).KToolNotificationUtils.validationError('Nội dung', 'Vui lòng nhập nội dung!');
      }
      return;
    }

    const spaceKey = getCurrentSpaceKey();
    if (!spaceKey) {
      if ((window as any).KToolNotificationUtils) {
        (window as any).KToolNotificationUtils.error(
          'Không thể xác định Space Key',
          'Vui lòng đảm bảo bạn đang ở trong một Confluence Space.'
        );
      }
      return;
    }

    if (!pageTitle.trim()) {
      if ((window as any).KToolNotificationUtils) {
        (window as any).KToolNotificationUtils.validationError('Tiêu đề', 'Vui lòng nhập tiêu đề trang!');
      }
      return;
    }

    setIsCreating(true);

    try {
      // Convert plain text to basic Confluence storage format
      const lines = plainTextContent.split('\n');
      const storageFormat = lines
        .map(line => {
          if (line.trim() === '') {
            return '<p><br/></p>';
          }
          return `<p>${line}</p>`;
        })
        .join('');

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

      await createPageFromGeneratedContent(pageTitle, storageFormat, spaceKey, parentPageId || undefined);
      
      if ((window as any).KToolNotificationUtils) {
        (window as any).KToolNotificationUtils.documentCreated('Trang đã được tạo thành công!');
      }
      
      updateState({ currentView: 'main', generatedContent: '', baDocUrl: '' });
    } catch (error) {
      console.error('Error creating page:', error);
      
      if ((window as any).KToolNotificationUtils) {
        (window as any).KToolNotificationUtils.documentError(
          error instanceof Error ? error.message : String(error),
          'tạo trang'
        );
      }
    } finally {
      setIsCreating(false);
    }
  };

  const insertText = (beforeText: string, afterText: string = '') => {
    const textarea = document.getElementById('plainTextArea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = plainTextContent.substring(start, end);
    
    const newText = plainTextContent.substring(0, start) + 
                   beforeText + selectedText + afterText + 
                   plainTextContent.substring(end);
    
    setPlainTextContent(newText);
    
    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + beforeText.length;
      textarea.selectionEnd = start + beforeText.length + selectedText.length;
    }, 0);
  };

  const toolbarButtonStyle: React.CSSProperties = {
    padding: '8px 12px',
    margin: '0 4px',
    background: '#f8f9fa',
    border: '1px solid #e9ecef',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s ease'
  };

  const textareaStyle: React.CSSProperties = {
    width: '100%',
    minHeight: '400px',
    padding: '16px',
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    lineHeight: '1.6',
    resize: 'vertical',
    outline: 'none'
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerInfo}>
            <h2 className={styles.headerTitle}>
              Plain Text Editor
            </h2>
            <p className={styles.headerDescription}>
              Simple text editing like Confluence's basic editor
            </p>
          </div>
          
          <div className={styles.headerActions}>
            <button 
              onClick={() => updateState({ currentView: 'main' })} 
              className={styles.backButton}
            >
              ← Back to Main
            </button>
          </div>
        </div>
      </div>

      {/* Editor Container */}
      <div className={styles.editorContainer}>
        {/* Page Title */}
        <div className={styles.titleSection}>
          <label className={styles.titleLabel}>
            Page Title:
          </label>
          <input
            type="text"
            value={pageTitle}
            onChange={(e) => setPageTitle(e.target.value)}
            placeholder="Enter page title..."
            className={styles.titleInput}
          />
        </div>

        {/* Simple Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.toolbarButtons}>
            <button
              onClick={() => insertText('**', '**')}
              className={styles.toolbarButton}
              title="Bold"
            >
              <strong>B</strong>
            </button>
            
            <button
              onClick={() => insertText('*', '*')}
              className={styles.toolbarButton}
              title="Italic"
            >
              <em>I</em>
            </button>

            <div className={styles.toolbarDivider} />

            <button
              onClick={() => insertText('# ', '')}
              className={styles.toolbarButton}
              title="Header 1"
            >
              H1
            </button>

            <button
              onClick={() => insertText('## ', '')}
              className={styles.toolbarButton}
              title="Header 2"
            >
              H2
            </button>

            <button
              onClick={() => insertText('### ', '')}
              className={styles.toolbarButton}
              title="Header 3"
            >
              H3
            </button>

            <div className={styles.toolbarDivider} />

            <button
              onClick={() => insertText('- ', '')}
              className={styles.toolbarButton}
              title="Bullet List"
            >
              • List
            </button>

            <button
              onClick={() => insertText('1. ', '')}
              className={styles.toolbarButton}
              title="Numbered List"
            >
              1. List
            </button>

            <div className={styles.toolbarDivider} />

            <button
              onClick={() => insertText('`', '`')}
              className={styles.toolbarButton}
              title="Inline Code"
            >
              {'</>'}
            </button>

            <button
              onClick={() => insertText('\n```\n', '\n```\n')}
              className={styles.toolbarButton}
              title="Code Block"
            >
              Code Block
            </button>
          </div>
        </div>

        {/* Text Editor */}
        <div className={styles.textEditor}>
          <textarea
            id="plainTextArea"
            value={plainTextContent}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Start typing your content here... You can use basic formatting like **bold**, *italic*, # headers, - lists, etc."
            className={styles.textarea}
          />
        </div>

        {/* Stats and Actions */}
        <div className={styles.statsActions}>
          <div className={styles.stats}>
            <span>Words: {wordCount}</span>
            <span>🔤 Characters: {charCount}</span>
          </div>

          <div className={styles.actionButtons}>
            <button
              onClick={() => setPlainTextContent('')}
              className={`${styles.actionButton} ${styles.clearButton}`}
            >
              🗑️ Clear
            </button>

            <button
              onClick={handleSaveVersion}
              disabled={isSaving || !plainTextContent.trim()}
              className={`${styles.actionButton} ${styles.saveButton}`}
            >
              {isSaving ? 'Saving...' : 'Save Version'}
            </button>

            <button
              onClick={handleCreatePage}
              disabled={isCreating || !plainTextContent.trim()}
              className={`${styles.actionButton} ${styles.createButton}`}
            >
              {isCreating ? 'Creating...' : 'Create Confluence Page'}
            </button>
          </div>
        </div>

        {/* Help Text */}
        <div className={styles.tipsSection}>
          <h4 className={styles.tipsTitle}>
            💡 Formatting Tips:
          </h4>
          <div className={styles.tipsContent}>
            <strong>Basic formatting:</strong> **bold**, *italic*, `code`, # Header 1, ## Header 2, ### Header 3<br/>
            <strong>Lists:</strong> Use "- " for bullet points, "1. " for numbered lists<br/>
            <strong>Code blocks:</strong> Wrap code in triple backticks ```<br/>
            <strong>Line breaks:</strong> Press Enter twice for new paragraphs
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlainTextEditTab;
