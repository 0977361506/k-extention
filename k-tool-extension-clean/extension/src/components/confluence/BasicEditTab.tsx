import React, { useState, useEffect } from 'react';
import { AppState } from '../../types/types';
import styles from './BasicEditTab.module.scss';

interface BasicEditTabProps {
  state: AppState;
  updateState: (updates: Partial<AppState>) => void;
}

const BasicEditTab: React.FC<BasicEditTabProps> = ({ state, updateState }) => {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('Untitled Document');
  const [isModified, setIsModified] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    // Initialize content from generated content if available
    if (state.generatedContent) {
      try {
        const parsed = JSON.parse(state.generatedContent);
        if (parsed.fullStorageFormat) {
          setContent(parsed.fullStorageFormat);
        } else if (typeof state.generatedContent === 'string') {
          setContent(state.generatedContent);
        }
      } catch {
        setContent(state.generatedContent);
      }
    }
  }, [state.generatedContent]);

  useEffect(() => {
    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isModified) {
          handleSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModified]);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setIsModified(true);
  };

  const handleSave = () => {
    // Save to state/local storage
    const updatedContent = JSON.stringify({
      title,
      content,
      fullStorageFormat: content,
      lastModified: new Date().toISOString()
    });
    
    updateState({ generatedContent: updatedContent });
    setIsModified(false);
    setLastSaved(new Date());
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all content?')) {
      setContent('');
      setIsModified(true);
    }
  };

  const containerStyle = {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    minHeight: '100vh',
    padding: '0'
  };

  const headerStyle = {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '24px',
    borderRadius: '8px 8px 0 0',
    marginBottom: '0'
  };

  const editorContainerStyle = {
    background: 'white',
    borderRadius: '0 0 8px 8px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden'
  };

  const toolbarStyle = {
    background: '#f8fafc',
    padding: '12px 20px',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
    gap: '12px'
  };

  const buttonStyle = {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    background: isModified ? '#28a745' : '#6c757d',
    color: 'white'
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    background: '#dc3545',
    color: 'white'
  };

  const backButtonStyle = {
    ...buttonStyle,
    background: 'rgba(255,255,255,0.2)',
    color: 'white',
    border: '1px solid rgba(255,255,255,0.3)'
  };

  const textareaStyle = {
    width: '100%',
    minHeight: '500px',
    padding: '20px',
    border: 'none',
    outline: 'none',
    resize: 'vertical' as const,
    fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
    fontSize: '14px',
    lineHeight: '1.6',
    background: '#fafbfc',
    color: '#2d3748'
  };

  const statusStyle = {
    fontSize: '12px',
    color: '#6c757d',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerInfo}>
            <h2 className={styles.headerTitle}>
              Basic Text Editor
            </h2>
            <p className={styles.headerDescription}>
              Simple text editing with syntax highlighting and auto-save
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
        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.titleSection}>
            <div>
              <label className={styles.titleLabel}>
                Document Title:
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setIsModified(true);
                }}
                className={styles.titleInput}
                placeholder="Enter document title..."
              />
            </div>
            
            <div className={styles.statusInfo}>
              {isModified && <span className={styles.statusModified}>● Unsaved changes</span>}
              {lastSaved && !isModified && (
                <span className={styles.statusSaved}>
                  ✓ Last saved: {lastSaved.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
          
          <div className={styles.toolbarActions}>
            <button
              onClick={handleSave}
              disabled={!isModified}
              className={`${styles.actionButton} ${styles.saveButton}`}
            >
              Save
            </button>
            
            <button
              onClick={handleClear}
              className={`${styles.actionButton} ${styles.clearButton}`}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Text Editor */}
        <div className={styles.editorSection}>
          <textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Start typing your content here...

You can write:
- Plain text
- Markdown
- HTML
- Code snippets
- Or any other content

The editor will automatically save your changes."
            className={styles.textarea}
          />
          
          {/* Character Count */}
          <div className={styles.charCounter}>
            {content.length} characters
          </div>
        </div>
        {/* Footer Info */}
        <div className={styles.footer}>
          <div className={styles.footerTip}>
            💡 Tip: Use Ctrl+S (Cmd+S) to save quickly
          </div>
          <div className={styles.footerStats}>
            Lines: {content.split('\n').length} | Words: {content.split(/\s+/).filter(w => w.length > 0).length}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BasicEditTab;
