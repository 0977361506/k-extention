import React, { useRef, useEffect, useState } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import mermaid from 'mermaid';

interface MermaidNodeViewProps {
  node: any;
  updateAttributes: (attributes: Record<string, any>) => void;
  selected: boolean;
}

export const MermaidNodeView: React.FC<MermaidNodeViewProps> = ({
  node,
  updateAttributes,
  selected,
}) => {
  const diagramRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [code, setCode] = useState(node.attrs.code || '');
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Initialize Mermaid
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'inherit',
    });
  }, []);

  useEffect(() => {
    if (diagramRef.current && !isEditing) {
      renderDiagram();
    }
  }, [node.attrs.code, isEditing]);

  const renderDiagram = async () => {
    if (!diagramRef.current || !node.attrs.code) return;

    try {
      setHasError(false);
      const diagramId = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Clear previous content
      diagramRef.current.innerHTML = '';
      
      // Validate and render the diagram
      const renderResult = await mermaid.render(diagramId, node.attrs.code);
      let svgContent: string;
      
      if (typeof renderResult === 'string') {
        svgContent = renderResult;
      } else if (renderResult && typeof renderResult === 'object' && 'svg' in renderResult) {
        svgContent = (renderResult as any).svg;
      } else {
        svgContent = String(renderResult);
      }
      
      diagramRef.current.innerHTML = svgContent;
      
    } catch (error) {
      console.error('Mermaid render error:', error);
      setHasError(true);
      diagramRef.current.innerHTML = `
        <div style="
          padding: 20px; 
          border: 2px dashed #ff6b6b; 
          border-radius: 8px; 
          background: #ffe0e0; 
          color: #d63031;
          text-align: center;
          font-family: monospace;
        ">
          <div style="font-weight: bold; margin-bottom: 8px;">❌ Diagram Error</div>
          <div style="font-size: 12px;">Invalid Mermaid syntax</div>
          <pre style="margin-top: 8px; font-size: 11px; text-align: left; white-space: pre-wrap;">${node.attrs.code}</pre>
        </div>
      `;
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setCode(node.attrs.code);
  };

  const handleSave = () => {
    updateAttributes({ code });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setCode(node.attrs.code);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave();
    }
  };

  return (
    <NodeViewWrapper className={`mermaid-diagram-wrapper ${selected ? 'selected' : ''}`}>
      <div 
        style={{
          border: selected ? '2px solid #0066cc' : '1px solid #e0e0e0',
          borderRadius: '8px',
          padding: '16px',
          margin: '8px 0',
          background: '#fafafa',
          position: 'relative',
        }}
      >
        {/* Toolbar */}
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          display: 'flex',
          gap: '4px',
          opacity: selected ? 1 : 0.5,
          transition: 'opacity 0.2s'
        }}>
          {!isEditing && (
            <button
              onClick={handleEdit}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                background: 'white',
                cursor: 'pointer',
              }}
            >
              ✏️ Edit
            </button>
          )}
        </div>

        {isEditing ? (
          <div>
            <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#666' }}>
              📊 Edit Mermaid Diagram
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{
                width: '100%',
                height: '150px',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                fontSize: '13px',
                resize: 'vertical',
              }}
              placeholder="Enter Mermaid diagram code..."
            />
            <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
              <button
                onClick={handleSave}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  border: 'none',
                  borderRadius: '4px',
                  background: '#0066cc',
                  color: 'white',
                  cursor: 'pointer',
                }}
              >
                ✅ Save
              </button>
              <button
                onClick={handleCancel}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                  background: 'white',
                  cursor: 'pointer',
                }}
              >
                ❌ Cancel
              </button>
            </div>
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#666' }}>
              💡 Tip: Press Ctrl+Enter to save, Esc to cancel
            </div>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#666' }}>
              📊 Mermaid Diagram
            </div>
            <div 
              ref={diagramRef}
              style={{
                minHeight: '100px',
                textAlign: 'center',
                background: 'white',
                borderRadius: '4px',
                padding: '16px',
              }}
              onDoubleClick={handleEdit}
            />
            {!hasError && (
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#666', textAlign: 'center' }}>
                💡 Double-click to edit diagram
              </div>
            )}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};
