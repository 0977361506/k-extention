import React from 'react';

interface ConfluencePreviewProps {
  storageFormat: string;
}

const ConfluencePreview: React.FC<ConfluencePreviewProps> = ({ storageFormat }) => {
  const previewRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (previewRef.current) {
      // Convert Confluence storage format to displayable HTML
      const displayHtml = convertStorageToDisplay(storageFormat);
      previewRef.current.innerHTML = displayHtml;
    }
  }, [storageFormat]);

  const convertStorageToDisplay = (storage: string): string => {
    return storage
      // Convert Confluence macros to readable format
      .replace(/<ac:structured-macro[^>]*ac:name="([^"]*)"[^>]*>(.*?)<\/ac:structured-macro>/gs, 
        (match, macroName, content) => {
          switch (macroName) {
            case 'code':
              return `<pre style="background: #f5f5f5; padding: 12px; border-radius: 4px; overflow-x: auto;"><code>${content.replace(/<ac:parameter[^>]*>.*?<\/ac:parameter>/gs, '').replace(/<ac:plain-text-body[^>]*><!\[CDATA\[(.*?)\]\]><\/ac:plain-text-body>/gs, '$1')}</code></pre>`;
            case 'info':
              return `<div style="background: #e3f2fd; padding: 12px; border-radius: 4px; border-left: 4px solid #2196f3; margin: 12px 0;"><strong>ℹ️ Info:</strong> ${content.replace(/<ac:rich-text-body>(.*?)<\/ac:rich-text-body>/gs, '$1')}</div>`;
            case 'warning':
              return `<div style="background: #fff3e0; padding: 12px; border-radius: 4px; border-left: 4px solid #ff9800; margin: 12px 0;"><strong>⚠️ Warning:</strong> ${content.replace(/<ac:rich-text-body>(.*?)<\/ac:rich-text-body>/gs, '$1')}</div>`;
            case 'note':
              return `<div style="background: #f3e5f5; padding: 12px; border-radius: 4px; border-left: 4px solid #9c27b0; margin: 12px 0;"><strong>📝 Note:</strong> ${content.replace(/<ac:rich-text-body>(.*?)<\/ac:rich-text-body>/gs, '$1')}</div>`;
            case 'mermaid':
              const mermaidCode = content.replace(/<ac:parameter[^>]*>(.*?)<\/ac:parameter>/gs, '$1');
              return `<div style="background: #f9f9f9; padding: 16px; border-radius: 4px; margin: 12px 0; text-align: center;"><strong>📊 Mermaid Diagram:</strong><br/><code style="background: #fff; padding: 8px; display: block; margin-top: 8px;">${mermaidCode}</code></div>`;
            default:
              return `<div style="background: #f0f0f0; padding: 12px; border-radius: 4px; margin: 12px 0;"><strong>🔧 Macro [${macroName}]:</strong> ${content}</div>`;
          }
        })
      // Convert parameters
      .replace(/<ac:parameter[^>]*>(.*?)<\/ac:parameter>/gs, '')
      // Convert rich text body
      .replace(/<ac:rich-text-body>(.*?)<\/ac:rich-text-body>/gs, '$1')
      // Convert plain text body
      .replace(/<ac:plain-text-body[^>]*><!\[CDATA\[(.*?)\]\]><\/ac:plain-text-body>/gs, '$1')
      // Style tables
      .replace(/<table([^>]*)>/g, '<table$1 style="width: 100%; border-collapse: collapse; margin: 12px 0;">')
      .replace(/<th([^>]*)>/g, '<th$1 style="border: 1px solid #ddd; padding: 8px; background: #f5f5f5; font-weight: bold; text-align: left;">')
      .replace(/<td([^>]*)>/g, '<td$1 style="border: 1px solid #ddd; padding: 8px;">')
      // Style lists
      .replace(/<ul([^>]*)>/g, '<ul$1 style="margin: 12px 0; padding-left: 24px;">')
      .replace(/<ol([^>]*)>/g, '<ol$1 style="margin: 12px 0; padding-left: 24px;">')
      .replace(/<li([^>]*)>/g, '<li$1 style="margin: 4px 0;">')
      // Style headings
      .replace(/<h1([^>]*)>/g, '<h1$1 style="color: #333; border-bottom: 2px solid #ddd; padding-bottom: 8px; margin: 24px 0 16px 0;">')
      .replace(/<h2([^>]*)>/g, '<h2$1 style="color: #333; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin: 20px 0 12px 0;">')
      .replace(/<h3([^>]*)>/g, '<h3$1 style="color: #333; margin: 16px 0 8px 0;">')
      .replace(/<h4([^>]*)>/g, '<h4$1 style="color: #333; margin: 12px 0 6px 0;">')
      // Style paragraphs
      .replace(/<p([^>]*)>/g, '<p$1 style="margin: 8px 0; line-height: 1.6;">')
      // Style code blocks
      .replace(/<code([^>]*)>/g, '<code$1 style="background: #f5f5f5; padding: 2px 4px; border-radius: 2px; font-family: monospace;">')
      // Style strong/em
      .replace(/<strong([^>]*)>/g, '<strong$1 style="font-weight: bold;">')
      .replace(/<em([^>]*)>/g, '<em$1 style="font-style: italic;">');
  };

  return (
    <div 
      ref={previewRef}
      style={{
        padding: '20px',
        backgroundColor: '#fff',
        border: '1px solid #ddd',
        borderRadius: '8px',
        fontFamily: 'Arial, sans-serif',
        lineHeight: '1.6',
        maxHeight: '600px',
        overflowY: 'auto'
      }}
    />
  );
};

export default ConfluencePreview;
