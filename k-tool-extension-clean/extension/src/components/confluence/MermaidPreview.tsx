import React, { useRef, useEffect, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidPreviewProps {
  code: string;
  containerId?: string;
}

const MermaidPreview: React.FC<MermaidPreviewProps> = ({ 
  code, 
  containerId = `mermaid-preview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
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
  }, [code]);

  const renderDiagram = async () => {
    if (!containerRef.current || !code.trim()) {
      setIsLoading(false);
      return;
    }

    try {
      setError('');
      setIsLoading(true);
      
      // Clear previous content
      containerRef.current.innerHTML = '';
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Diagram rendering timeout')), 10000)
      );
      
      // Validate and render with timeout
      const renderPromise = (async () => {
        const isValid = await mermaid.parse(code.trim());
        if (isValid) {
          const svg = await mermaid.render(containerId, code.trim());
          return svg;
        }
        throw new Error('Invalid mermaid syntax');
      })();
      
      const svg = await Promise.race([renderPromise, timeoutPromise]);
      
      if (containerRef.current && typeof svg === 'string') {
        // Optimize SVG for better performance
        const optimizedSvg = svg
          .replace(/width="\d+"/, 'width="100%"')
          .replace(/height="\d+"/, 'height="auto"')
          .replace(/style="[^"]*max-width[^"]*"/, 'style="max-width: 100%; height: auto;"');
        
        containerRef.current.innerHTML = optimizedSvg;
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Invalid mermaid syntax';
      setError(errorMessage);
      if (containerRef.current) {
        containerRef.current.innerHTML = `
          <div style="
            padding: 12px; 
            background: #fef2f2; 
            border: 1px solid #fecaca; 
            border-radius: 4px; 
            color: #dc2626;
            font-family: monospace;
            font-size: 12px;
            text-align: center;
          ">
            <strong>📊 Diagram Error:</strong><br/>
            ${errorMessage.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
          </div>
        `;
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!code.trim()) {
    return (
      <div style={{
        padding: '20px',
        textAlign: 'center',
        color: '#6c757d',
        fontStyle: 'italic',
        background: '#f8f9fa',
        borderRadius: '4px',
        border: '1px solid #e9ecef'
      }}>
        No diagram code provided
      </div>
    );
  }

  return (
    <div style={{
      position: 'relative',
      background: 'white',
      borderRadius: '4px',
      overflow: 'hidden'
    }}>
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#6c757d',
          fontSize: '14px'
        }}>
          🔄 Rendering diagram...
        </div>
      )}
      
      {error && (
        <div style={{
          padding: '8px 12px',
          background: '#fff3e0',
          borderLeft: '4px solid #ff9800',
          fontSize: '12px',
          color: '#e65100'
        }}>
          <strong>⚠️ Warning:</strong> {error}
        </div>
      )}
      
      <div 
        ref={containerRef} 
        style={{ 
          textAlign: 'center',
          minHeight: isLoading ? '100px' : 'auto',
          width: '100%'
        }} 
      />
    </div>
  );
};

export default MermaidPreview;
