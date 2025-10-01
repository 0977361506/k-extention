import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Editor } from '@tinymce/tinymce-react';
// Import TinyMCE directly into the bundle
import 'tinymce/tinymce';
// Import TinyMCE plugins
import 'tinymce/plugins/advlist';
import 'tinymce/plugins/autolink';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/link';
import 'tinymce/plugins/image';
import '../../utils/NotificationInit.js';
import 'tinymce/plugins/charmap';
import 'tinymce/plugins/preview';
import 'tinymce/plugins/anchor';
import 'tinymce/plugins/searchreplace';
import 'tinymce/plugins/visualblocks';
import 'tinymce/plugins/code';
import 'tinymce/plugins/fullscreen';
import 'tinymce/plugins/insertdatetime';
import 'tinymce/plugins/media';
import 'tinymce/plugins/table';
import 'tinymce/plugins/wordcount';
import 'tinymce/plugins/pagebreak';
import 'tinymce/plugins/nonbreaking';
import 'tinymce/plugins/codesample';
// Import TinyMCE theme
import 'tinymce/themes/silver';
// Import TinyMCE models
import 'tinymce/models/dom';
import 'tinymce/icons/default';
import 'tinymce/skins/ui/oxide/skin.min.css';
import 'tinymce/skins/ui/oxide/content.css';

import { AppState, DocumentVersion } from '../../types/types';
import { createPageFromGeneratedContent, getCurrentSpaceKey, extractPageIdFromUrl } from '../../api/api';
import { StorageManager } from '../../utils/storage';
import { VersionManager } from '../../utils/versionManager';
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
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [isContentLoaded, setIsContentLoaded] = useState(false);
  const editorRef = useRef<any>(null);

  // Initialize TinyMCE with proper resource loading
  useEffect(() => {
    // Ensure TinyMCE resources are available
    console.log('🔧 Initializing TinyMCE with bundled resources');
    
    // Set global TinyMCE configuration
    if (typeof window !== 'undefined') {
      (window as any).tinymce = (window as any).tinymce || {};
      const tinymce = (window as any).tinymce;
      
      // Set proper base URL to avoid loading issues
      tinymce.baseURL = chrome.runtime.getURL('');
      
      // Disable external loading attempts
      tinymce.DOM.loadCSS = () => {};
      tinymce.ScriptLoader.load = (url: string, callback?: Function) => {
        // Only allow loading from extension
        if (url.startsWith('chrome-extension://')) {
          return tinymce.ScriptLoader.load.call(this, url, callback);
        }
        // Prevent external loading
        if (callback) callback();
        return;
      };
    }
  }, []);

  // TinyMCE configuration - professional like WordPress/Confluence
  const editorConfig = {
    height: 600,
    skin: 'oxide',
    skin_url: chrome.runtime.getURL('skins/ui/oxide'),
    content_css: chrome.runtime.getURL('skins/ui/oxide/content.css'),
    icons: 'default',
    icons_url: chrome.runtime.getURL('icons/default/icons.js'),
    base_url: chrome.runtime.getURL(''),
    document_base_url: chrome.runtime.getURL(''),
    menubar: 'file edit view insert format tools table help',
    plugins: [
      'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
      'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
      'insertdatetime', 'media', 'table', 'wordcount',
      'pagebreak', 'nonbreaking', 'codesample'
    ],
    toolbar: [
      'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | link image media table',
      'align lineheight | numlist bullist indent outdent | emoticons charmap | removeformat | code codesample',
      'insertdatetime pagebreak | fullscreen preview help'
    ].join(' | '),
    content_style: `
      body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 14px; line-height: 1.6; color: #333; max-width: 900px; margin: 0 auto; padding: 20px; }
      h1, h2, h3, h4, h5, h6 { color: #2c3e50; margin-top: 24px; margin-bottom: 16px; }
      h1 { font-size: 2em; border-bottom: 2px solid #e1e4e8; padding-bottom: 8px; }
      h2 { font-size: 1.5em; border-bottom: 1px solid #e1e4e8; padding-bottom: 4px; }
      h3 { font-size: 1.25em; }
      table { border-collapse: collapse; width: 100%; margin: 16px 0; border: 1px solid #dfe2e5; }
      table th, table td { padding: 8px 12px; border: 1px solid #dfe2e5; text-align: left; }
      table th { background-color: #f6f8fa; font-weight: 600; }
      table tr:nth-child(even) { background-color: #f9f9f9; }
      blockquote { margin: 0; padding: 0 16px; color: #6a737d; border-left: 4px solid #dfe2e5; background-color: #f6f8fa; }
      code { background-color: #f6f8fa; border-radius: 3px; padding: 2px 4px; font-family: 'Monaco', 'Consolas', monospace; font-size: 0.9em; }
      pre { background-color: #f6f8fa; border-radius: 6px; padding: 16px; overflow: auto; border: 1px solid #e1e4e8; }
      img { max-width: 100%; height: auto; border-radius: 4px; margin: 8px 0; }
      .mce-content-body[data-mce-placeholder]:not(.mce-visualblocks)::before { color: #999; font-style: italic; }
    `,
    image_advtab: true,
    image_caption: true,
    quickbars_selection_toolbar: 'bold italic | quicklink h2 h3 blockquote quickimage quicktable',
    noneditable_noneditable_class: 'mceNonEditable',
    toolbar_mode: 'sliding' as const,
    contextmenu: 'link image table',
    placeholder: 'Start writing your professional document here...',
    paste_data_images: true,
    paste_as_text: false,
    paste_webkit_styles: 'all',
    paste_retain_style_properties: 'all',
    // Fix for input issues
    browser_spellcheck: true,
    entity_encoding: 'raw' as const,
    // Fix for content not being editable
    forced_root_block: 'p',
    forced_root_block_attrs: {},
    // XHTML validation settings for better Confluence compatibility
    element_format: 'xhtml' as 'xhtml',
    schema: 'html5',
    valid_elements: '*[*]',
    valid_children: '+body[style]',
    convert_urls: false,
    remove_script_host: false,
    relative_urls: false,
    fix_list_elements: true,
    cleanup_on_startup: true,
    trim_span_elements: true,
    verify_html: true,
    apply_source_formatting: true,
    invalid_elements: 'font',
    remove_linebreaks: false,
    preformatted: false,
    setup: (editor: any) => {
      console.log('🔧 Setting up TinyMCE editor');
      
      editor.on('PreInit', () => {
        console.log('🔧 TinyMCE editor PreInit');
      });
      
      editor.on('Init', () => {
        console.log('🔧 TinyMCE editor initialized successfully');
        setIsEditorReady(true);
        
        // Ensure editor is editable
        try {
          editor.setMode('design');
          console.log('🔧 Editor mode set to design');
          
          // Focus editor after initialization
          setTimeout(() => {
            editor.focus();
            console.log('🔧 Editor focused');
          }, 100);
        } catch (error) {
          console.error('Error during editor initialization:', error);
        }
      });
      
      editor.on('LoadContent', () => {
        console.log('🔧 TinyMCE content loaded');
      });
      
      editor.on('Change', () => {
        console.log('🔧 TinyMCE content changed');
      });
      
      editor.on('KeyUp', () => {
        console.log('🔧 TinyMCE key up');
      });
      
      // Custom button for Mermaid diagrams
      editor.ui.registry.addButton('mermaid', {
        text: 'Diagram',
        tooltip: 'Insert Mermaid Diagram',
        onAction: () => {
          editor.insertContent(`
            <div class="mermaid-container" style="border: 1px dashed #ccc; padding: 20px; margin: 16px 0; background-color: #f8f9fa;">
              <h4>🔗 Mermaid Diagram Placeholder</h4>
              <p><strong>Diagram Type:</strong> flowchart TD</p>
              <pre style="background: #f6f8fa; padding: 10px; border-radius: 4px;">
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Process 1]
    B -->|No| D[Process 2]
    C --> E[End]
    D --> E
              </pre>
              <p><em>Note: Replace this with actual Mermaid diagram when publishing to Confluence</em></p>
            </div>
          `);
        }
      });

      // Custom button for Confluence macros
      editor.ui.registry.addButton('confluence_macro', {
        text: 'Macro',
        tooltip: 'Insert Confluence Macro',
        onAction: () => {
          const macroType = prompt('Enter macro type (info, warning, note, tip, expand):') || 'info';
          const macroTitle = prompt('Enter macro title (optional):') || '';
          
          const macroContent = `
            <div class="confluence-macro ${macroType}" style="border: 1px solid #ddd; border-radius: 4px; margin: 16px 0; padding: 16px; background-color: ${
              macroType === 'info' ? '#e3f2fd' :
              macroType === 'warning' ? '#fff3e0' :
              macroType === 'note' ? '#f3e5f5' :
              macroType === 'tip' ? '#e8f5e8' : '#f5f5f5'
            };">
              ${macroTitle ? `<h4 style="margin-top: 0;">${macroTitle}</h4>` : ''}
              <p>Enter your ${macroType} content here...</p>
            </div>
          `;
          
          editor.insertContent(macroContent);
        }
      });

      // Add custom buttons to toolbar
      editor.ui.registry.addButton('customseparator', {
        text: ' | ',
        tooltip: 'Separator'
      });
    }
  };

  // Convert HTML content from other tabs  
  const convertHtmlToTinyMCE = useCallback((htmlContent: string) => {
    if (!htmlContent) return '';
    
    try {
      // Clean up the HTML - TinyMCE is more robust than ReactQuill
      let cleanedHtml = htmlContent;
      
      // Protect Mermaid diagrams from encoding - extract and preserve them
      const mermaidMacros: string[] = [];
      cleanedHtml = cleanedHtml.replace(/<ac:structured-macro[^>]*ac:name="mermaid"[^>]*>([\s\S]*?)<\/ac:structured-macro>/g, 
        (match, content) => {
          const codeMatch = content.match(/<ac:parameter[^>]*ac:name="code"[^>]*>([\s\S]*?)<\/ac:parameter>/);
          if (codeMatch) {
            let code = codeMatch[1];
            if (code.includes('<![CDATA[')) {
              code = code.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
            }
            // Store the original macro for later restoration
            mermaidMacros.push(match);
            return `<div class="mermaid-protected-placeholder" data-macro-index="${mermaidMacros.length - 1}" style="border: 2px dashed #007bff; padding: 20px; margin: 16px 0; background-color: #f8f9fa; border-radius: 8px;">
              <h4 style="margin: 0 0 12px 0; color: #007bff;">📊 Protected Mermaid Diagram</h4>
              <div style="background: #e3f2fd; padding: 12px; border-radius: 4px; font-family: monospace; font-size: 12px; white-space: pre-wrap; overflow-x: auto;">${code.trim()}</div>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #666;"><em>This diagram is protected from encoding. It will be restored when saving.</em></p>
            </div>`;
          }
          return match;
        });
      
      // Enhance tables with better styling
      cleanedHtml = cleanedHtml.replace(/<table[^>]*>/gi, 
        '<table style="border-collapse: collapse; width: 100%; margin: 16px 0; border: 1px solid #dfe2e5;">');
      
      cleanedHtml = cleanedHtml.replace(/<th[^>]*>/gi, 
        '<th style="padding: 8px 12px; border: 1px solid #dfe2e5; background-color: #f6f8fa; font-weight: 600;">');
      
      cleanedHtml = cleanedHtml.replace(/<td[^>]*>/gi, 
        '<td style="padding: 8px 12px; border: 1px solid #dfe2e5;">');
      
      // Convert other Mermaid diagrams to placeholder format
      cleanedHtml = cleanedHtml.replace(/<div class="mermaid"[^>]*>([\s\S]*?)<\/div>/gi, 
        (match, content) => `
          <div class="mermaid-container" style="border: 1px dashed #ccc; padding: 20px; margin: 16px 0; background-color: #f8f9fa;">
            <h4>🔗 Mermaid Diagram</h4>
            <pre style="background: #f6f8fa; padding: 10px; border-radius: 4px;">${content.trim()}</pre>
            <p><em>This will render as a diagram when published to Confluence</em></p>
          </div>
        `);
      
      // Store mermaid macros for later restoration
      (window as any).__mermaidMacros = mermaidMacros;
      
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
    return firstHeading?.textContent || `K-tool Document - ${new Date().toLocaleDateString()}`;
  }, []);

  // Update content when state changes - only on initial load or when coming from other tabs
  useEffect(() => {
    if (state.generatedContent && !isContentLoaded) {
      try {
        // Try to parse as JSON first (from Advanced Edit)
        const data = JSON.parse(state.generatedContent);
        const title = data.title || extractTitleFromContent(data.fullStorageFormat || data.content || '');
        setPageTitle(title);
        
        const content = convertHtmlToTinyMCE(data.fullStorageFormat || data.content || '');
        setEditorContent(content);
        setIsContentLoaded(true);
      } catch (e) {
        // If not JSON, treat as HTML content from Preview/other tabs
        console.log("Converting HTML content to TinyMCE format");
        
        const convertedContent = convertHtmlToTinyMCE(state.generatedContent);
        setEditorContent(convertedContent);
        
        const title = extractTitleFromContent(state.generatedContent);
        setPageTitle(title);
        setIsContentLoaded(true);
      }
    } else if (!state.generatedContent && !isContentLoaded) {
      // Default content only on initial load
      setPageTitle(`K-tool Document - ${new Date().toLocaleDateString()}`);
      setEditorContent('');
      setIsContentLoaded(true);
    }
  }, [state.generatedContent, convertHtmlToTinyMCE, extractTitleFromContent, isContentLoaded]);

  // Convert TinyMCE content back to Confluence format
  const convertTinyMCEToConfluence = (content: string): string => {
    let confluenceContent = content;
    // Restore protected Mermaid diagrams first
    const mermaidMacros = (window as any).__mermaidMacros || [];
    confluenceContent = confluenceContent.replace(
      /<div class="mermaid-protected-placeholder"[^>]*data-macro-index="(\d+)"[^>]*>[\s\S]*?<\/div>/gi,
      (match, index) => {
        const macroIndex = parseInt(index);
        return mermaidMacros[macroIndex] || match;
      }
    );
    // Fix common TinyMCE output issues for XHTML compliance
    confluenceContent = confluenceContent
      // Fix self-closing tags
      .replace(/<br>/gi, '<br/>')
      .replace(/<hr>/gi, '<hr/>')
      .replace(/<img([^>]*?)(?<!\/)\s*>/gi, '<img$1/>')
      // Fix empty paragraphs
      .replace(/<p><br\/><\/p>/gi, '<p>&nbsp;</p>')
      .replace(/<p>\s*<\/p>/gi, '<p>&nbsp;</p>')
      // Fix empty table cells
      .replace(/<td><\/td>/gi, '<td>&nbsp;</td>')
      .replace(/<th><\/th>/gi, '<th>&nbsp;</th>')
      // Convert mermaid placeholders back to Confluence macro format
      .replace(
        /<div class="mermaid-container"[^>]*>[\s\S]*?<pre[^>]*>([\s\S]*?)<\/pre>[\s\S]*?<\/div>/gi,
        (match, mermaidCode) => {
          const cleanCode = mermaidCode.trim();
          return `<ac:structured-macro ac:name="mermaid" ac:schema-version="1">
            <ac:parameter ac:name="code"><![CDATA[${cleanCode}]]></ac:parameter>
          </ac:structured-macro>`;
        }
      )
      // Convert custom macros to Confluence format
      .replace(
        /<div class="confluence-macro ([^"]+)"[^>]*>([\s\S]*?)<\/div>/gi,
        (match, macroType, content) => {
          const title = content.match(/<h4[^>]*>([^<]+)<\/h4>/);
          const body = content.replace(/<h4[^>]*>[^<]+<\/h4>/, '').trim();
          return `<ac:structured-macro ac:name="${macroType}" ac:schema-version="1">
            ${title ? `<ac:parameter ac:name="title">${title[1]}</ac:parameter>` : ''}
            <ac:rich-text-body>${body}</ac:rich-text-body>
          </ac:structured-macro>`;
        }
      );
    return confluenceContent;
  };

  // Handle editor content change
  const handleEditorChange = useCallback((content: string) => {
    console.log('🔧 Editor content changed:', content);
    setEditorContent(content);
    
    // Convert to Confluence format for storage
    const confluenceContent = convertTinyMCEToConfluence(content);
    
    // Update state with new content
    updateState({
      generatedContent: JSON.stringify({
        title: pageTitle,
        fullStorageFormat: confluenceContent,
        lastModified: new Date().toISOString()
      }),
      hasUnsavedChanges: true
    });
  }, [pageTitle, updateState, convertTinyMCEToConfluence]);

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

  // Force editor to be editable when ready
  useEffect(() => {
    if (isEditorReady && editorRef.current) {
      console.log('🔧 Ensuring editor is editable');
      try {
        editorRef.current.setMode('design');
        editorRef.current.focus();
      } catch (error) {
        console.error('Error setting editor mode:', error);
      }
    }
  }, [isEditorReady]);

  // Reset content when switching from other tabs
  useEffect(() => {
    const handleStorageChange = (changes: any) => {
      if (changes.generatedContent && isContentLoaded) {
        console.log('🔧 Content changed from other tabs, resetting...');
        setIsContentLoaded(false);
      }
    };

    // Listen for storage changes
    chrome.storage.onChanged.addListener(handleStorageChange);
    
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [isContentLoaded]);

  // Save version
  const handleSaveVersion = async () => {
    if (!editorContent || editorContent.trim() === '' || editorContent.trim() === '<p></p>') {
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
    if (!editorContent || editorContent.trim() === '' || editorContent.trim() === '<p></p>') {
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
      
      // Convert TinyMCE content back to Confluence format
      const confluenceContent = convertTinyMCEToConfluence(editorContent);
      
      console.log('📄 Content before sending to Confluence (first 500 chars):');
      console.log(confluenceContent.substring(0, 500));
      
      // Validate content before sending
      if (!confluenceContent || confluenceContent.trim() === '' || confluenceContent.trim() === '<p>&nbsp;</p>') {
        window.KToolNotification?.show('Nội dung không hợp lệ hoặc trống. Vui lòng kiểm tra lại.', 'error');
        return;
      }
      
      await createPageFromGeneratedContent(pageTitle, confluenceContent, spaceKey, parentPageId || undefined);
      
      window.KToolNotification?.show('Tài liệu đã được tạo thành công trên Confluence!', 'success');
      updateState({ currentView: 'main' });
      
    } catch (error) {
      console.error('❌ Error creating page:', error);
      window.KToolNotification?.show(`Lỗi khi tạo trang: ${error}`, 'error');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Page Title */}
      <div className={styles.titleSection}>
        <label className={styles.titleLabel}>Document Title:</label>
        <input
          type="text"
          value={pageTitle}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Enter document title..."
          className={styles.titleInput}
        />
      </div>

      {/* TinyMCE Editor */}
      <div className={styles.editorContainer}>
        {!isEditorReady && (
          <div className={styles.editorLoading}>
            <p>Loading editor...</p>
          </div>
        )}
        <Editor
          licenseKey="gpl"
          onInit={(evt, editor) => {
            editorRef.current = editor;
            console.log('🔧 Editor ref set:', editor);
          }}
          value={editorContent}
          onEditorChange={handleEditorChange}
          init={editorConfig as any}
        />
      </div>
    </div>
  );
};

export default AdvancedEditTab;
