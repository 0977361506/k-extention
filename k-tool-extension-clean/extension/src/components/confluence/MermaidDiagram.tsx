import React, { useRef, useEffect, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  chart: string;
  isEditable?: boolean;
  onSave?: (newChart: string) => void;
  title?: string;
  showToolbar?: boolean;
  className?: string;
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ 
  chart, 
  isEditable = false, 
  onSave,
  title = "Mermaid Diagram",
  showToolbar = true,
  className = ""
}) => {
  const mermaidRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(chart);
  const [error, setError] = useState<string>('');
  const [diagramId] = useState(`mermaid-${Date.now()}-${Math.random()}`);

  useEffect(() => {
    // Initialize mermaid when component mounts
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true
      }
    });
  }, []);

  useEffect(() => {
    renderDiagram();
  }, [chart]);

  const renderDiagram = async () => {
    if (!mermaidRef.current || !chart.trim()) return;

    try {
      setError('');
      // Clear previous content
      mermaidRef.current.innerHTML = '';
      
      // Validate and render
      const isValid = await mermaid.parse(chart);
      if (isValid) {
        const svg  = await mermaid.render(diagramId, chart);
        mermaidRef.current.innerHTML = svg;
      }
    } catch (err: any) {
      console.error('Mermaid rendering error:', err);
      setError(err.message || 'Invalid mermaid syntax');
      mermaidRef.current.innerHTML = `
        <div style="
          padding: 16px; 
          background: #fef2f2; 
          border: 1px solid #fecaca; 
          border-radius: 4px; 
          color: #dc2626;
          font-family: monospace;
          font-size: 12px;
        ">
          <strong>Mermaid Error:</strong><br/>
          ${err.message || 'Invalid diagram syntax'}
        </div>
      `;
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditValue(chart);
  };

  const handleSave = () => {
    if (onSave) {
      onSave(editValue);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(chart);
    setIsEditing(false);
    setError('');
  };

  const handlePreview = async () => {
    try {
      setError('');
      const isValid = await mermaid.parse(editValue);
      if (isValid) {
        const svg  = await mermaid.render(`${diagramId}-preview`, editValue);
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = svg;
        }
      }
    } catch (err: any) {
      setError(err.message || 'Invalid mermaid syntax');
    }
  };

  if (isEditing) {
    return (
      <div style={{
        border: '1px solid #ddd',
        borderRadius: '8px',
        background: '#fff',
        margin: '12px 0'
      }}>
        {/* Edit Header */}
        <div style={{
          background: '#f8f9fa',
          padding: '12px 16px',
          borderBottom: '1px solid #e9ecef',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600 }}>📊 Edit Mermaid Diagram</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handlePreview}
              style={{
                padding: '6px 12px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              👁️ Preview
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: '6px 12px',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              💾 Save
            </button>
            <button
              onClick={handleCancel}
              style={{
                padding: '6px 12px',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              ❌ Cancel
            </button>
          </div>
        </div>

        {/* Editor */}
        <div style={{ display: 'flex', height: '400px' }}>
          {/* Code Editor */}
          <div style={{ flex: 1, borderRight: '1px solid #e9ecef' }}>
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                padding: '16px',
                fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                fontSize: '13px',
                resize: 'none',
                outline: 'none'
              }}
              placeholder="Enter mermaid diagram code here..."
            />
          </div>

          {/* Preview Panel */}
          <div style={{ flex: 1, padding: '16px', overflow: 'auto', background: '#fafafa' }}>
            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '8px' }}>
              Live Preview:
            </div>
            {error && (
              <div style={{
                padding: '8px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '4px',
                color: '#dc2626',
                fontSize: '12px',
                marginBottom: '12px'
              }}>
                {error}
              </div>
            )}
            <div ref={mermaidRef} style={{ width: '100%', textAlign: 'center' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      border: '1px solid #ddd',
      borderRadius: '8px',
      background: '#fff',
      margin: '12px 0',
      position: 'relative'
    }}>
      {/* Diagram Header */}
      <div style={{
        background: '#f8f9fa',
        padding: '8px 12px',
        borderBottom: '1px solid #e9ecef',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', color: '#6c757d' }}>📊 Mermaid Diagram</span>
        </div>
        {isEditable && (
          <button
            onClick={handleEdit}
            style={{
              padding: '4px 8px',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            ✏️ Edit
          </button>
        )}
      </div>

      {/* Diagram Content */}
      <div style={{ padding: '16px', textAlign: 'center' }}>
        {error && (
          <div style={{
            padding: '12px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '4px',
            color: '#dc2626',
            fontSize: '13px',
            marginBottom: '12px'
          }}>
            <strong>Diagram Error:</strong><br/>
            {error}
          </div>
        )}
        <div ref={mermaidRef} style={{ width: '100%' }} />
      </div>
    </div>
  );
};

export default MermaidDiagram;
