// katothang/k-tool-document/katothang-k-tool-document-68438769fa2a52d4917584802fa0754b0750cf51/extension/src/components/confluence/ConfluenceStoragePreview.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import mermaid from 'mermaid';

// ================================================================================= 
// MERMAID DIAGRAM COMPONENT (IMPROVED)
// =================================================================================
interface MermaidDiagramProps {
  initialChart: string;
  diagramId: string;
  isEditable?: boolean;
  onSave: (diagramId: string, newChart: string) => void;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({
  initialChart,
  diagramId,
  isEditable = false,
  onSave,
}) => {
  const mermaidRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(initialChart);
  const [error, setError] = useState<string>('');

  const renderDiagram = useCallback(async (code: string) => {
    if (!mermaidRef.current) return;
    try {
      setError('');
      // Important: Ensure the ID passed to mermaid.render is unique
      const uniqueId = `mermaid-graph-${diagramId}`;
      const  svg  = await mermaid.render(uniqueId, code);
      mermaidRef.current.innerHTML = svg;
    } catch (err: any) {
      const errorMessage = err.message || 'Invalid Mermaid syntax';
      setError(errorMessage);
      mermaidRef.current.innerHTML = `<div style="padding:16px;background:#fef2f2;border:1px solid #fecaca;color:#dc2626;font-family:monospace;font-size:12px;"><strong>Mermaid Error:</strong><br/>${errorMessage.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>`;
    }
  }, [diagramId]);

  useEffect(() => {
    if (!isEditing) {
      renderDiagram(initialChart);
    }
  }, [initialChart, isEditing, renderDiagram]);

  const handleSave = () => {
    onSave(diagramId, editValue);
    setIsEditing(false);
    renderDiagram(editValue);
  };

  if (isEditing) {
    return (
      <div style={{ border: '1px solid #ddd', borderRadius: '8px', margin: '12px 0' }}>
        <div style={{ background: '#f8f9fa', padding: '12px 16px', borderBottom: '1px solid #e9ecef', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 600 }}>📊 Edit Mermaid Diagram</span>
          <div>
            <button onClick={handleSave} style={{ marginRight: '8px', cursor: 'pointer', background: '#28a745', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px' }}>💾 Save</button>
            <button onClick={() => setIsEditing(false)} style={{ cursor: 'pointer', background: '#6c757d', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px' }}>❌ Cancel</button>
          </div>
        </div>
        <textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', height: '250px', border: 'none', padding: '16px', fontFamily: 'monospace', fontSize: '13px', resize: 'vertical' }}
        />
      </div>
    );
  }

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '8px', margin: '12px 0', position: 'relative' }}>
        {isEditable && (
             <button onClick={() => setIsEditing(true)} style={{ position: 'absolute', top: '8px', right: '8px', cursor: 'pointer', background: '#007bff', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '3px', fontSize: '11px', zIndex: 10 }}>✏️ Edit</button>
        )}
      <div ref={mermaidRef} style={{ padding: '16px', textAlign: 'center' }} />
    </div>
  );
};

// ================================================================================= 
// CONFLUENCE STORAGE PREVIEW COMPONENT (IMPROVED)
// =================================================================================
interface ConfluenceStoragePreviewProps {
  storageFormat: string;
  title?: string;
  isEditable?: boolean;
  onContentChange: (newContent: string) => void;
}

const ConfluenceStoragePreview: React.FC<ConfluenceStoragePreviewProps> = ({
  storageFormat,
  title = "Document Preview",
  isEditable = false,
  onContentChange,
}) => {
  const previewRef = useRef<HTMLDivElement>(null);
  // Using a map to keep track of React roots for unmounting
  const reactRootsRef = useRef(new Map());

  useEffect(() => {
    mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' });
  }, []);

  useEffect(() => {
    if (!previewRef.current) return;
    
    // Unmount previous React components to avoid memory leaks
    reactRootsRef.current.forEach(root => root.unmount());
    reactRootsRef.current.clear();
    
    // 1. Sanitize and style content, preparing placeholders for Mermaid
    const { styledContent, mermaidData } = addConfluenceStyles(storageFormat);
    previewRef.current.innerHTML = styledContent;

    // 2. Find and render Mermaid diagrams using React
    mermaidData.forEach(({ id, code }) => {
      const node = previewRef.current?.querySelector(`[data-diagram-id="${id}"]`);
      if (node instanceof HTMLElement) {
        const root = ReactDOM.createRoot(node);
        reactRootsRef.current.set(id, root);
        root.render(<MermaidDiagram 
          initialChart={code} 
          diagramId={id} 
          isEditable={isEditable} 
          onSave={handleMermaidSave} 
        />);
      }
    });

    // Cleanup function
    return () => {
      reactRootsRef.current.forEach(root => root.unmount());
    };
  }, [storageFormat, isEditable]);

  const addConfluenceStyles = (storage: string): { styledContent: string, mermaidData: Array<{id: string, code: string}> } => {
    let diagramIndex = 0;
    const mermaidData: Array<{id: string, code: string}> = [];
    
    const styledContent = storage.replace(
        /<ac:structured-macro[^>]*ac:name="mermaid"[^>]*>.*?<ac:parameter ac:name="code"><!\[CDATA\[(.*?)]]><\/ac:parameter>.*?<\/ac:structured-macro>|<ac:structured-macro[^>]*ac:name="mermaid"[^>]*>.*?<ac:parameter ac:name="code">(.*?)<\/ac:parameter>.*?<\/ac:structured-macro>/g,
        (match, cdataCode, directCode) => {
          const code = cdataCode || directCode || '';
          const diagramId = `ktool-mermaid-${Date.now()}-${diagramIndex++}`;
          mermaidData.push({ id: diagramId, code });
          // Create a placeholder div with all necessary data
          return `<div class="ktool-mermaid-container" data-diagram-id="${diagramId}" data-original-code="${encodeURIComponent(code)}"></div>`;
        }
      );
      
    return { styledContent, mermaidData };
  };
  
  const handleMermaidSave = (diagramId: string, newCode: string) => {
    if (!previewRef.current) return;
  
    const placeholderDiv = previewRef.current.querySelector(`[data-diagram-id="${diagramId}"]`);
    if (!placeholderDiv) return;
  
    const oldEncodedCode = placeholderDiv.getAttribute('data-original-code');
    if (oldEncodedCode === null) return;
    const oldCode = decodeURIComponent(oldEncodedCode);
  
    // Function to create a macro string (handles both CDATA and direct)
    const createMacro = (code: string) => `<ac:structured-macro ac:name="mermaid" ac:schema-version="1"><ac:parameter ac:name="code"><![CDATA[${code}]]></ac:parameter></ac:structured-macro>`;
    
    const oldMacro = createMacro(oldCode);
    const newMacro = createMacro(newCode);
    
    // Replace only the first occurrence of the old macro to avoid accidental replacements
    let alreadyReplaced = false;
    const newStorageFormat = storageFormat.replace(createMacro(oldCode), () => {
        if (!alreadyReplaced) {
            alreadyReplaced = true;
            return newMacro;
        }
        return oldMacro; // return original if it's not the one we're targeting
    });

    onContentChange(newStorageFormat);
  };

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>
      <div style={{ padding: '16px 20px', background: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
        <h2 style={{ margin: 0, fontSize: '18px' }}>{title}</h2>
      </div>
      <div ref={previewRef} style={{ padding: '24px', maxHeight: '600px', overflowY: 'auto' }} className="wiki-content" />
    </div>
  );
};

export default ConfluenceStoragePreview;