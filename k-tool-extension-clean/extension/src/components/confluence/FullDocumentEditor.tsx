import React, { useState, useRef, useEffect } from 'react';
import DiagramEditor from './DiagramEditor';
import MermaidPreview from './MermaidPreview';
import DocumentStats from './DocumentStats';
import ExportOptions from './ExportOptions';
import ConfluenceTextSelector from './ConfluenceTextSelector';
import { replaceTextInStorageFormat } from '../../utils/textReplacement';
import { FontEncodingUtils } from '../../utils/fontUtils';
import mermaid from 'mermaid';
import styles from './FullDocumentEditor.module.scss';
import AdvancedEditTab from './AdvancedEditTab';

interface FullDocumentEditorProps {
  initialContent: string;
  title: string;
  onContentChange: (content: string) => void;
  onSave: (content: string) => void;
  isEditable?: boolean;
  state: any;
  updateState: (state: any) => void;
}

interface ExtractedDiagram {
  id: string;
  code: string;
  title: string;
  fullMatch: string;
  startIndex: number;
  endIndex: number;
}

const FullDocumentEditor: React.FC<FullDocumentEditorProps> = ({
  initialContent,
  title,
  onContentChange,
  onSave,
  isEditable = true,
  state,
  updateState
}) => {
  const [content, setContent] = useState(initialContent);
  const [activeTab, setActiveTab] = useState<'preview' | 'edit' | 'advanced-edit' | 'diagrams' | 'raw'>('preview');
  const [diagrams, setDiagrams] = useState<ExtractedDiagram[]>([]);
  const [isModified, setIsModified] = useState(false);
  const [convertedContent, setConvertedContent] = useState('');
  const previewRef = useRef<HTMLDivElement>(null);
  const [backupContent, setBackupContent] = useState<string | null>(null);

  useEffect(() => {
    setContent(initialContent);
    extractDiagrams(initialContent);
    setIsModified(false);
    // Cache converted content to prevent re-conversion on every render
    setConvertedContent(convertStorageToPreview(initialContent));
  }, [initialContent]);

  useEffect(() => {
    if (content !== initialContent) {
      setIsModified(true);
      onContentChange(content);
      extractDiagrams(content);
      // Update converted content cache
      setConvertedContent(convertStorageToPreview(content));
    }
  }, [content, initialContent, onContentChange]);

  // Add effect to render Mermaid diagrams in preview - optimized to prevent flickering
  useEffect(() => {
    if (activeTab === 'preview' && previewRef.current) {
      // Initialize mermaid with Vietnamese font support
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        fontFamily: FontEncodingUtils.getMermaidFontFamily(),
        themeVariables: {
          fontFamily: FontEncodingUtils.getMermaidFontFamily()
        }
      });

      // Apply Vietnamese font support to preview container
      FontEncodingUtils.applyVietnameseFontSupport(previewRef.current);

      const mermaidPlaceholders = previewRef.current.querySelectorAll('.mermaid-placeholder');
      
      mermaidPlaceholders.forEach(async (placeholder, index) => {
        const encodedCode = placeholder.getAttribute('data-code');
        if (encodedCode && !placeholder.querySelector('svg')) { // Only render if not already rendered
          try {
            const code = decodeURIComponent(encodedCode);
            const diagramId = `preview-diagram-${Date.now()}-${index}`;
            
            // Validate syntax first
            const isValid = await mermaid.parse(code);
            if (isValid) {
              const svg = await mermaid.render(diagramId, code);
              placeholder.innerHTML = `<div style="text-align: center; padding: 10px;">${svg}</div>`;
            } else {
              throw new Error('Invalid mermaid syntax');
            }
          } catch (error) {
            console.error('Error rendering mermaid preview:', error);
            const code = decodeURIComponent(encodedCode);
            placeholder.innerHTML = `
              <div style="padding: 12px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 4px; color: #dc2626;">
                <strong>📊 Diagram Preview Error</strong>
                <details style="margin-top: 8px;">
                  <summary style="cursor: pointer;">View Code</summary>
                  <pre style="background: #f8f9fa; padding: 8px; margin-top: 4px; border-radius: 4px; font-size: 12px; overflow: auto;">${code}</pre>
                </details>
              </div>
            `;
          }
        }
      });
    }
  }, [activeTab]); // Removed content dependency to prevent flickering

  // Function to handle text updates from AI
  const handleTextUpdate = (originalText: string, newText: string) => {
    // Lưu lại content gốc trước khi thay thế
    setBackupContent(content);
    console.log('🔄 Updating text in document:', { originalText, newText });
    
    // Use smart text replacement that preserves XML structure
    const updatedContent = replaceTextInStorageFormat(content, originalText, newText);
    
    if (updatedContent !== content) {
      setContent(updatedContent);
      setConvertedContent(convertStorageToPreview(updatedContent));
      console.log('✅ Text successfully updated in document');
      
    } else {
      console.warn('⚠️ Text replacement failed - text not found or no changes made');
      
      // Fallback: simple string replacement
      const fallbackContent = content.replace(originalText, newText);
      if (fallbackContent !== content) {
        setContent(fallbackContent);
        setConvertedContent(convertStorageToPreview(fallbackContent));
        console.log('✅ Text updated using fallback method');
      }
    }
  };

  // Function to handle auto save after AI edits
  const handleAutoSave = (updatedContent: string) => {
    console.log('💾 Auto saving after AI edit...');
    
    // Update content state with the updated content
    setContent(updatedContent);
    
    // Call the onSave callback to save the updated content
    onSave(updatedContent);
    
    // Mark as modified
    setIsModified(false); // Reset since we just saved
    
    console.log('✅ Auto save completed after AI edit');
  };

  const handleUndo = () => {
    if (backupContent) {
      setContent(backupContent);
      setBackupContent(null);
    }
  };

  const extractDiagrams = (storageContent: string) => {
    const mermaidRegex = /<ac:structured-macro ac:name="mermaid"[^>]*>([\s\S]*?)<\/ac:structured-macro>/g;
    const extractedDiagrams: ExtractedDiagram[] = [];
    
    let match;
    let index = 1;
    while ((match = mermaidRegex.exec(storageContent)) !== null) {
      const codeMatch = match[1].match(/<ac:parameter ac:name="code"[^>]*>([\s\S]*?)<\/ac:parameter>/);
      if (codeMatch) {
        // Handle both CDATA and plain text
        let code = codeMatch[1];
        if (code.includes('<![CDATA[')) {
          code = code.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
        }
        
        extractedDiagrams.push({
          id: `diagram-${index}-${Date.now()}`,
          code: code.trim(),
          title: `Diagram ${index}`,
          fullMatch: match[0],
          startIndex: match.index || 0,
          endIndex: (match.index || 0) + match[0].length
        });
        index++;
      }
    }
    
    setDiagrams(extractedDiagrams);
  };

  const updateDiagramCode = (diagramId: string, newCode: string) => {
    const diagram = diagrams.find(d => d.id === diagramId);
    if (!diagram) return;

    // Create new macro with updated code
    const newMacro = `<ac:structured-macro ac:name="mermaid" ac:schema-version="1"><ac:parameter ac:name="code"><![CDATA[${newCode}]]></ac:parameter></ac:structured-macro>`;
    
    // Replace in content
    const newContent = content.replace(diagram.fullMatch, newMacro);
    setContent(newContent);
    
    // Update diagrams state
    setDiagrams(prev => prev.map(d => 
      d.id === diagramId 
        ? { ...d, code: newCode, fullMatch: newMacro }
        : d
    ));
  };

  const convertStorageToPreview = (storageFormat: string): string => {
    return storageFormat
      // Convert headings
      .replace(/<h1[^>]*>(.*?)<\/h1>/g, '<h1 style="font-size: 24px; font-weight: 600; margin: 24px 0 16px 0; color: #172b4d; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">$1</h1>')
      .replace(/<h2[^>]*>(.*?)<\/h2>/g, '<h2 style="font-size: 20px; font-weight: 600; margin: 20px 0 12px 0; color: #172b4d;">$1</h2>')
      .replace(/<h3[^>]*>(.*?)<\/h3>/g, '<h3 style="font-size: 18px; font-weight: 600; margin: 16px 0 10px 0; color: #172b4d;">$1</h3>')
      
      // Convert paragraphs
      .replace(/<p[^>]*>(.*?)<\/p>/g, '<p style="margin: 8px 0; line-height: 1.6; color: #172b4d;">$1</p>')
      
      // Convert tables
      .replace(/<table[^>]*>/g, '<table style="width: 100%; border-collapse: collapse; margin: 16px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">')
      .replace(/<th[^>]*>/g, '<th style="background: #f4f5f7; padding: 12px; text-align: left; border: 1px solid #ddd; font-weight: 600;">')
      .replace(/<td[^>]*>/g, '<td style="padding: 12px; border: 1px solid #ddd; vertical-align: top;">')
      
      // Convert Mermaid macros to preview placeholders
      .replace(/<ac:structured-macro ac:name="mermaid"[^>]*>([\s\S]*?)<\/ac:structured-macro>/g, 
        (match, content, offset) => {
          const codeMatch = content.match(/<ac:parameter ac:name="code"[^>]*>([\s\S]*?)<\/ac:parameter>/);
          if (codeMatch) {
            let code = codeMatch[1];
            if (code.includes('<![CDATA[')) {
              code = code.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
            }
            
            const diagramIndex = diagrams.findIndex(d => d.startIndex <= offset && d.endIndex > offset) + 1;
            
            return `
              <div style="margin: 20px 0; padding: 16px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc;">
                <h4 style="margin: 0 0 12px 0; color: #495057; font-size: 14px;">📊 Mermaid Diagram ${diagramIndex}</h4>
                <div class="mermaid-placeholder" data-code="${encodeURIComponent(code.trim())}" style="text-align: center; padding: 20px; background: white; border-radius: 4px;">
                  <div style="color: #6c757d; font-style: italic;">Diagram will render here in preview mode</div>
                  <details style="margin-top: 12px;">
                    <summary style="cursor: pointer; color: #0052cc;">View Code</summary>
                    <pre style="background: #f1f3f4; padding: 8px; margin-top: 8px; border-radius: 4px; font-size: 12px; text-align: left; overflow: auto;">${code.trim()}</pre>
                  </details>
                </div>
              </div>
            `;
          }
          return match;
        }
      )
      
      // Convert other macros
      .replace(/<ac:structured-macro ac:name="([^"]+)"[^>]*>([\s\S]*?)<\/ac:structured-macro>/g, 
        '<div style="background: #e8f4fd; padding: 12px; border-radius: 4px; margin: 12px 0; border-left: 4px solid #0052cc;"><strong>📋 Macro [$1]:</strong> $2</div>'
      )
      
      // Clean up parameters
      .replace(/<ac:parameter[^>]*>(.*?)<\/ac:parameter>/g, '$1')
      .replace(/<ac:rich-text-body>(.*?)<\/ac:rich-text-body>/g, '$1')
      .replace(/<ac:plain-text-body>(.*?)<\/ac:plain-text-body>/g, '$1');
  };

  const renderTabs = () => (
    <div className={styles.tabs}>
      {[
        { key: 'preview', label: '👁️ Preview', icon: '👁️', description: 'Preview với AI Text Selection' },
        { key: 'edit', label: '✏️ Edit Content', icon: '✏️', description: 'Chỉnh sửa Storage Format' },
        { key: 'advanced-edit', label: 'Advanced Edit', icon: '', description: 'Rich Text Editor nâng cao' },
        { key: 'diagrams', label: `Diagrams (${diagrams.length})`, icon: '', description: 'Quản lý Mermaid Diagrams' },
        { key: 'raw', label: 'Raw Storage', icon: '', description: 'Xem Raw XML Format' }
      ].map(tab => (
        <button
          key={tab.key}
          onClick={() => setActiveTab(tab.key as any)}
          className={`${styles.tab} ${activeTab === tab.key ? styles.active : ''}`}
          title={tab.description}
        >
          {tab.label}
          {tab.key === 'preview' && isEditable && (
            <span className={styles.aiIndicator}>🤖</span>
          )}
        </button>
      ))}
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'preview':
        return (
          <div className={`${styles.tabContent} ${styles.preview}`}>
            <ConfluenceTextSelector
              onTextUpdate={handleTextUpdate}
              isEnabled={false}
              confluenceFormat={true}
              contentConfluence={content}
              onUndo={handleUndo}
              onAutoSave={handleAutoSave}
            >
              <div
                ref={previewRef}
                className={styles.previewContent}
                dangerouslySetInnerHTML={{ __html: convertedContent }}
              />
            </ConfluenceTextSelector>
          </div>
        );

      case 'edit':
        return (
          <div className={`${styles.tabContent} ${styles.edit}`}>
            <div className={styles.infoBox}>
              <h4>✏️ Rich Text Editor</h4>
              <p>
                Chỉnh sửa nội dung Confluence Storage Format. Hãy cẩn thận với XML syntax!
              </p>
            </div>
            
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className={styles.textarea}
              placeholder="Enter Confluence storage format here..."
              spellCheck={false}
            />
            
            <div className={styles.tipBox}>
              💡 <strong>Tip:</strong> Bạn có thể edit trực tiếp Confluence Storage Format ở đây. 
              Để edit diagrams một cách dễ dàng hơn, hãy chuyển sang tab "Diagrams".
            </div>
          </div>
        );

      case 'advanced-edit':
        return (
          <div className={`${styles.tabContent} ${styles.advancedEdit}`}>
            <AdvancedEditTab state={{
              ...state,
              currentView: 'advanced-edit',
              currentTab: 'dev-doc',
              previewMode: 'edit',
              generatedContent: JSON.stringify({
                title: title,
                fullStorageFormat: content,
                lastModified: new Date().toISOString()
              }),
              isGenerating: false,
              baDocUrl: '',
              hasUnsavedChanges: isModified,
            }} updateState={(updates) => {
              // Handle updates from AdvancedEditTab
              if (updates.generatedContent) {
                try {
                  const data = JSON.parse(updates.generatedContent);
                  const newContent = data.fullStorageFormat || data.content || '';
                  setContent(newContent);
                  setConvertedContent(convertStorageToPreview(newContent));
                  onContentChange(newContent);
                } catch (e) {
                  console.error('Error parsing advanced edit content:', e);
                }
              }
              updateState(updates);
            }} />
          </div>
        );

      case 'diagrams':
        return (
          <div className={`${styles.tabContent} ${styles.diagrams}`}>
            {diagrams.length === 0 ? (
              <div className={styles.noDiagrams}>
                <div className={styles.icon}>DIAGRAM</div>
                <h4>No Diagrams Found</h4>
                <p>
                  Tài liệu này không chứa Mermaid diagrams hoặc chưa được tạo.
                </p>
              </div>
            ) : (
              <div className={styles.diagramsList}>
                {diagrams.map((diagram, index) => (
                  <DiagramEditor
                    key={diagram.id}
                    content={content}
                    code={diagram.code}
                    onCodeChange={(newCode) => updateDiagramCode(diagram.id, newCode)}
                    title={`${diagram.title} (Position ${index + 1})`}
                    isEditable={isEditable}
                  />
                ))}
              </div>
            )}
          </div>
        );

      case 'raw':
        return (
          <div className={`${styles.tabContent} ${styles.raw}`}>
            <div className={styles.warningBox}>
              <h4>⚠️ Advanced: Raw Storage Format</h4>
              <p>
                Đây là raw Confluence Storage Format. Chỉ chỉnh sửa nếu bạn hiểu XML syntax và cấu trúc Confluence!
              </p>
            </div>
            
            <div className={styles.rawContainer}>
              <div className={styles.header}>
                Document Length: {content.length.toLocaleString()} characters
              </div>
              
              <pre className={styles.content}>
                {content}
              </pre>
            </div>
            
            <div className={styles.tipBox}>
              💡 <strong>Tip:</strong> Raw storage format chỉ để xem. Để edit, hãy sử dụng tab "Edit Content" hoặc "Diagrams".
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      {renderTabs()}
      {renderTabContent()}
      
      {/* Save Button */}
      {isModified && (
        <div style={{ padding: '16px 20px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <button
            onClick={() => onSave(content)}
            className={styles.saveButton}
          >
            Save Changes
          </button>
        </div>
      )}
    </div>
  );
};

export default FullDocumentEditor;
