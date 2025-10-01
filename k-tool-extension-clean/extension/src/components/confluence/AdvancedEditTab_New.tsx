import React, { useState, useEffect, useCallback, useMemo } from 'react';
import TurndownService from 'turndown';

// Import ReactQuill with proper typing
const ReactQuill = require('react-quill');
require('react-quill/dist/quill.snow.css');
import { AppState, DocumentVersion } from '../../types/types';
import { createPageFromGeneratedContent, getCurrentSpaceKey, extractPageIdFromUrl } from '../../api/api';
import { StorageManager } from '../../utils/storage';
import { VersionManager } from '../../utils/versionManager';
import '../../utils/NotificationInit.js';
import styles from './AdvancedEditTab.module.scss';

interface AdvancedEditTabProps {
  state: AppState;
  updateState: (updates: Partial<AppState>) => void;
}

const AdvancedEditTab: React.FC<AdvancedEditTabProps> = ({ state, updateState }) => {
  const [pageTitle, setPageTitle] = useState('');
  const [editorContent, setEditorContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageAlt, setImageAlt] = useState('');

  // Initialize TurndownService for HTML to Markdown conversion
  const turndownService = useMemo(() => {
    const service = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced'
    });
    
    // Custom table conversion rules
    service.addRule('table', {
      filter: 'table',
      replacement: (content) => {
        return '\n\n' + content + '\n\n';
      }
    });
    
    return service;
  }, []);

  // Quill modules configuration
  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'align': [] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        ['blockquote', 'code-block'],
        ['link', 'image'],
        ['clean'],
        ['table-insert', 'mermaid-insert']
      ],
      handlers: {
        'table-insert': () => setShowTableDialog(true),
        'image': () => setShowImageDialog(true)
      }
    },
    clipboard: {
      matchVisual: false,
    }
  }), []);

  // Quill formats
  const formats = [
    'header', 'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent', 'link', 'image', 'color', 'background',
    'align', 'code-block'
  ];

  // Convert HTML content from other tabs to Quill-compatible format
  const convertHtmlToQuill = useCallback((htmlContent: string) => {
    if (!htmlContent) return '';
    
    try {
      // Clean up the HTML and make it Quill-compatible
      let cleanedHtml = htmlContent;
      
      // Convert tables to simpler format that Quill can handle
      cleanedHtml = cleanedHtml.replace(/<table[^>]*>/gi, '<table>');
      cleanedHtml = cleanedHtml.replace(/<thead[^>]*>/gi, '<thead>');
      cleanedHtml = cleanedHtml.replace(/<tbody[^>]*>/gi, '<tbody>');
      cleanedHtml = cleanedHtml.replace(/<tr[^>]*>/gi, '<tr>');
      cleanedHtml = cleanedHtml.replace(/<td[^>]*>/gi, '<td>');
      cleanedHtml = cleanedHtml.replace(/<th[^>]*>/gi, '<th>');
      
      // Remove Mermaid diagrams (Quill doesn't support them directly)
      cleanedHtml = cleanedHtml.replace(/<div class="mermaid"[^>]*>[\s\S]*?<\/div>/gi, 
        '<p><strong>[Mermaid Diagram - Please recreate using table or text]</strong></p>');
      
      return cleanedHtml;
    } catch (error) {
      console.error('Error converting HTML:', error);
      return htmlContent;
    }
  }, []);

  // Extract title from content
  const extractTitleFromContent = useCallback((content: string) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    const firstHeading = tempDiv.querySelector('h1, h2, h3');
    return firstHeading?.textContent || `K-tool generate - ${new Date().toLocaleDateString()}`;
  }, []);

  // Update content when state changes
  useEffect(() => {
    if (state.generatedContent) {
      try {
        // Try to parse as JSON first (from Advanced Edit)
        const data = JSON.parse(state.generatedContent);
        const title = data.title || extractTitleFromContent(data.fullStorageFormat || data.content || '');
        setPageTitle(title);
        
        const content = convertHtmlToQuill(data.fullStorageFormat || data.content || '');
        setEditorContent(content);
      } catch (e) {
        // If not JSON, treat as HTML content from Preview/other tabs
        console.log("Converting HTML content to Quill format");
        
        const convertedContent = convertHtmlToQuill(state.generatedContent);
        setEditorContent(convertedContent);
        
        const title = extractTitleFromContent(state.generatedContent);
        setPageTitle(title);
      }
    } else {
      // Default content
      setPageTitle(`K-tool generate - ${new Date().toLocaleDateString()}`);
      setEditorContent('');
    }
  }, [state.generatedContent, convertHtmlToQuill, extractTitleFromContent]);

  // Handle editor content change
  const handleEditorChange = useCallback((content: string) => {
    setEditorContent(content);
    
    // Update state with new content
    updateState({
      generatedContent: JSON.stringify({
        title: pageTitle,
        fullStorageFormat: content,
        lastModified: new Date().toISOString()
      }),
      hasUnsavedChanges: true
    });
  }, [pageTitle, updateState]);

  // Handle title change
  const handleTitleChange = useCallback((newTitle: string) => {
    setPageTitle(newTitle);
    
    // Update state with new title
    updateState({
      generatedContent: JSON.stringify({
        title: newTitle,
        fullStorageFormat: editorContent,
        lastModified: new Date().toISOString()
      }),
      hasUnsavedChanges: true
    });
  }, [editorContent, updateState]);

  // Save version
  const handleSaveVersion = async () => {
    if (!editorContent || editorContent.trim() === '<p><br></p>') {
      window.KToolNotification?.show('Không có nội dung để lưu', 'error');
      return;
    }

    try {
      setIsSaving(true);
      
      const version: DocumentVersion = {
        id: VersionManager.generateVersionId(),
        title: pageTitle,
        content: JSON.stringify({
          title: pageTitle,
          fullStorageFormat: editorContent,
          lastModified: new Date().toISOString()
        }),
        createdAt: new Date().toISOString(),
        isCurrent: true
      };

      await VersionManager.saveVersion(version);
      
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

  // Create Confluence page
  const handleCreatePage = async () => {
    if (!editorContent || editorContent.trim() === '<p><br></p>') {
      window.KToolNotification?.show('Không có nội dung để tạo trang', 'error');
      return;
    }

    try {
      setIsCreating(true);
      const spaceKey = getCurrentSpaceKey();
      
      if (!spaceKey) {
        window.KToolNotification?.show('Không thể xác định space key. Vui lòng đảm bảo bạn đang ở trong một Confluence space.', 'error');
        return;
      }

      console.log('🔄 Creating page in space:', spaceKey);
      
      const settings = await StorageManager.getSettings();
      let parentPageId: string | null = null;
      
      if (settings.documentUrl && settings.documentUrl.trim()) {
        parentPageId = extractPageIdFromUrl(settings.documentUrl);
        if (parentPageId) {
          console.log('📁 Using parent page ID from settings:', parentPageId);
        }
      }
      
      await createPageFromGeneratedContent(pageTitle, editorContent, spaceKey, parentPageId || undefined);
      
      window.KToolNotification?.show('Tài liệu đã được tạo thành công!', 'success');
      updateState({ currentView: 'main' });
      
    } catch (error) {
      console.error('❌ Error creating page:', error);
      window.KToolNotification?.show(`Lỗi khi tạo trang: ${error}`, 'error');
    } finally {
      setIsCreating(false);
    }
  };

  // Insert table
  const insertTable = () => {
    if (tableRows > 0 && tableCols > 0) {
      let tableHtml = '<table style="border-collapse: collapse; width: 100%;">';
      
      // Header row
      tableHtml += '<tr>';
      for (let j = 0; j < tableCols; j++) {
        tableHtml += '<th style="border: 1px solid #ddd; padding: 8px; background-color: #f5f5f5;">Header ' + (j + 1) + '</th>';
      }
      tableHtml += '</tr>';
      
      // Data rows
      for (let i = 1; i < tableRows; i++) {
        tableHtml += '<tr>';
        for (let j = 0; j < tableCols; j++) {
          tableHtml += '<td style="border: 1px solid #ddd; padding: 8px;">Cell ' + (i + 1) + ',' + (j + 1) + '</td>';
        }
        tableHtml += '</tr>';
      }
      tableHtml += '</table><p><br></p>';
      
      // Insert at current cursor position
      const newContent = editorContent + tableHtml;
      setEditorContent(newContent);
      handleEditorChange(newContent);
    }
    
    setShowTableDialog(false);
    setTableRows(3);
    setTableCols(3);
  };

  // Insert image
  const insertImage = () => {
    if (imageUrl) {
      const imageHtml = `<img src="${imageUrl}" alt="${imageAlt || 'Image'}" style="max-width: 100%; height: auto;" /><p><br></p>`;
      const newContent = editorContent + imageHtml;
      setEditorContent(newContent);
      handleEditorChange(newContent);
    }
    
    setShowImageDialog(false);
    setImageUrl('');
    setImageAlt('');
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerInfo}>
            <h2 className={styles.headerTitle}>Advanced Rich Text Editor</h2>
            <p className={styles.headerDescription}>
              Professional editor với React Quill - tương thích hoàn toàn với Confluence
            </p>
          </div>
          
          <div className={styles.headerActions}>
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
              disabled={isCreating || !editorContent || editorContent.trim() === '<p><br></p>'} 
              className={`${styles.actionButton} ${styles.createButton} ${
                (isCreating || !editorContent || editorContent.trim() === '<p><br></p>') ? styles.disabled : ''
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

      {/* Page Title */}
      <div className={styles.titleSection}>
        <label className={styles.titleLabel}>Page Title:</label>
        <input
          type="text"
          value={pageTitle}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Enter page title..."
          className={styles.titleInput}
        />
      </div>

      {/* Custom Toolbar */}
      <div className={styles.customToolbar}>
        <button 
          onClick={() => setShowTableDialog(true)}
          className={styles.toolbarButton}
          title="Insert Table"
        >
          Table
        </button>
        
        <button 
          onClick={() => setShowImageDialog(true)}
          className={styles.toolbarButton}
          title="Insert Image"
        >
          Image
        </button>
      </div>

      {/* Editor */}
      <div className={styles.editorContainer}>
        <ReactQuill
          theme="snow"
          value={editorContent}
          onChange={handleEditorChange}
          modules={modules}
          formats={formats}
          className={styles.editor}
          placeholder="Start writing your document here..."
        />
      </div>

      {/* Table Dialog */}
      {showTableDialog && (
        <div className={styles.dialogOverlay}>
          <div className={styles.dialog}>
            <h3 className={styles.dialogTitle}>Insert Table</h3>
            <div className={styles.dialogContent}>
              <div className={styles.inputGroup}>
                <label>Rows:</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={tableRows}
                  onChange={(e) => setTableRows(parseInt(e.target.value) || 1)}
                  className={styles.dialogInput}
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Columns:</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={tableCols}
                  onChange={(e) => setTableCols(parseInt(e.target.value) || 1)}
                  className={styles.dialogInput}
                />
              </div>
            </div>
            <div className={styles.dialogActions}>
              <button onClick={insertTable} className={styles.dialogButton}>
                Insert Table
              </button>
              <button 
                onClick={() => setShowTableDialog(false)} 
                className={`${styles.dialogButton} ${styles.cancelButton}`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Dialog */}
      {showImageDialog && (
        <div className={styles.dialogOverlay}>
          <div className={styles.dialog}>
            <h3 className={styles.dialogTitle}>Insert Image</h3>
            <div className={styles.dialogContent}>
              <div className={styles.inputGroup}>
                <label>Image URL:</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className={styles.dialogInput}
                />
              </div>
              <div className={styles.inputGroup}>
                <label>Alt Text (optional):</label>
                <input
                  type="text"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  placeholder="Image description"
                  className={styles.dialogInput}
                />
              </div>
            </div>
            <div className={styles.dialogActions}>
              <button 
                onClick={insertImage} 
                disabled={!imageUrl}
                className={styles.dialogButton}
              >
                Insert Image
              </button>
              <button 
                onClick={() => setShowImageDialog(false)} 
                className={`${styles.dialogButton} ${styles.cancelButton}`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedEditTab;
