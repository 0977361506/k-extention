import React, { useState, useRef, useEffect } from 'react';
import mermaid from 'mermaid';
import CompactDiagramChat from './CompactDiagramChat';
import styles from './DiagramEditor.module.scss';

interface DiagramEditorProps {
  code: string;
  content: string
  onCodeChange: (code: string) => void;
  title?: string;
  showPreview?: boolean;
  isEditable?: boolean;
}

const DiagramEditor: React.FC<DiagramEditorProps> = ({
  code,
  content,
  onCodeChange,
  title = "Mermaid Diagram",
  showPreview = true,
  isEditable = true
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editCode, setEditCode] = useState(code);
  const [error, setError] = useState<string>('');
  const [activeView, setActiveView] = useState<'preview' | 'edit' | 'split'>('preview');
  const [showChatPanel, setShowChatPanel] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Drag functionality states
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [lastPanOffset, setLastPanOffset] = useState({ x: 0, y: 0 }); // Store last offset for smooth dragging
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  
  // Zoom functionality states
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isAutoFit, setIsAutoFit] = useState(true);
  const minZoom = 0.1;
  const maxZoom = 3;
  
  const previewRef = useRef<HTMLDivElement>(null);
  const diagramContainerRef = useRef<HTMLDivElement>(null);
  const diagramId = `diagram-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Detect diagram type from code
  const detectDiagramType = (diagramCode: string): string => {
    const firstLine = diagramCode.trim().split('\n')[0].toLowerCase();
    if (firstLine.includes('flowchart') || firstLine.includes('graph')) return 'flowchart';
    if (firstLine.includes('sequencediagram')) return 'sequence';
    if (firstLine.includes('classdiagram')) return 'class';
    if (firstLine.includes('statediagram')) return 'state';
    if (firstLine.includes('gantt')) return 'gantt';
    if (firstLine.includes('pie')) return 'pie';
    if (firstLine.includes('journey')) return 'journey';
    if (firstLine.includes('gitgraph')) return 'gitgraph';
    return 'flowchart'; // default
  };

  const diagramType = detectDiagramType(editCode);

  // Drag functionality for diagram
  const handleMouseDown = (e: React.MouseEvent) => {
    if (diagramContainerRef.current) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX,
        y: e.clientY
      });
      setLastPanOffset(panOffset); // Store current offset as base
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      
      setPanOffset({
        x: lastPanOffset.x + deltaX,
        y: lastPanOffset.y + deltaY
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // Touch support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (diagramContainerRef.current && e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({
        x: touch.clientX,
        y: touch.clientY
      });
      setLastPanOffset(panOffset); // Store current offset as base
      e.preventDefault();
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStart.x;
      const deltaY = touch.clientY - dragStart.y;
      
      setPanOffset({
        x: lastPanOffset.x + deltaX,
        y: lastPanOffset.y + deltaY
      });
      e.preventDefault();
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Add global mouse events for drag
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;
        
        setPanOffset({
          x: lastPanOffset.x + deltaX,
          y: lastPanOffset.y + deltaY
        });
      }
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches.length === 1) {
        const touch = e.touches[0];
        const deltaX = touch.clientX - dragStart.x;
        const deltaY = touch.clientY - dragStart.y;
        
        setPanOffset({
          x: lastPanOffset.x + deltaX,
          y: lastPanOffset.y + deltaY
        });
        e.preventDefault();
      }
    };

    const handleGlobalTouchEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
      document.addEventListener('touchend', handleGlobalTouchEnd);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
    };
  }, [isDragging, dragStart, lastPanOffset]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Reset diagram position with R key
      if (e.key === 'r' || e.key === 'R') {
        if (activeView !== 'edit' && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          handleResetDiagramPosition();
        }
      }
      
      // Zoom controls
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          handleZoomIn();
        } else if (e.key === '-') {
          e.preventDefault();
          handleZoomOut();
        } else if (e.key === '0') {
          e.preventDefault();
          handleZoomReset();
        } else if (e.key === 'f' || e.key === 'F') {
          e.preventDefault();
          handleAutoFit();
        }
      }
      
      // Arrow keys for fine movement when diagram is focused
      if (diagramContainerRef.current && document.activeElement === diagramContainerRef.current) {
        const moveAmount = 20;
        switch (e.key) {
          case 'ArrowLeft':
            e.preventDefault();
            setPanOffset(prev => ({ x: prev.x + moveAmount, y: prev.y }));
            break;
          case 'ArrowRight':
            e.preventDefault();
            setPanOffset(prev => ({ x: prev.x - moveAmount, y: prev.y }));
            break;
          case 'ArrowUp':
            e.preventDefault();
            setPanOffset(prev => ({ x: prev.x, y: prev.y + moveAmount }));
            break;
          case 'ArrowDown':
            e.preventDefault();
            setPanOffset(prev => ({ x: prev.x, y: prev.y - moveAmount }));
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeView]);

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
    setEditCode(code);
  }, [code]);

  useEffect(() => {
    if (activeView !== 'edit' && showPreview) {
      renderDiagram(editCode);
    }
  }, [editCode, activeView, showPreview]);

  // Auto-fit when component first loads or view changes to preview
  useEffect(() => {
    if ((activeView === 'preview' || activeView === 'split') && isAutoFit && editCode.trim()) {
      setTimeout(() => {
        handleAutoFit();
      }, 300);
    }
  }, [activeView, isAutoFit]);

  const renderDiagram = async (diagramCode: string) => {
    if (!previewRef.current || !diagramCode.trim()) {
      if (previewRef.current) {
        previewRef.current.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No diagram code to preview</div>';
      }
      return;
    }

    try {
      setError('');
      previewRef.current.innerHTML = '';
      
      const isValid = await mermaid.parse(diagramCode);
      if (isValid) {
        const svg = await mermaid.render(`${diagramId}-${Date.now()}`, diagramCode);
        previewRef.current.innerHTML = svg;
        
        // Reset pan position when diagram changes
        setPanOffset({ x: 0, y: 0 });
        setLastPanOffset({ x: 0, y: 0 });
        
        // Check scrollability after a short delay to let DOM update
        setTimeout(checkScrollable, 100);
        
        // Auto-fit new diagrams
        if (isAutoFit) {
          setTimeout(handleAutoFit, 200);
        }
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Invalid mermaid syntax';
      setError(errorMessage);
      if (previewRef.current) {
        previewRef.current.innerHTML = `
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
            ${errorMessage.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
          </div>
        `;
      }
    }
  };

  const handleSave = () => {
    onCodeChange(editCode);
    setIsEditing(false);
    setHasUnsavedChanges(false);
  };

  const handleCancel = () => {
    setEditCode(code);
    setIsEditing(false);
    setError('');
    setHasUnsavedChanges(false);
  };

  const handlePreview = () => {
    renderDiagram(editCode);
  };

  const handleDiagramUpdate = (newCode: string, userRequest?: string) => {
    setEditCode(newCode);
    setHasUnsavedChanges(true); // Mark as unsaved instead of auto-save
    
    // Keep the current view mode and chat panel state
    // Don't change activeView or showChatPanel
    
    // Re-render diagram immediately for preview
    setTimeout(() => {
      renderDiagram(newCode);
    }, 100);
    
    // Show success feedback
    setError('');
    
    // Log for debugging
    console.log('🎨 Diagram updated via AI (unsaved), keeping current view mode:', activeView, 'Chat panel:', showChatPanel);
  };

  const handleResetDiagramPosition = () => {
    setPanOffset({ x: 0, y: 0 });
    setLastPanOffset({ x: 0, y: 0 });
    
    // If not in auto-fit mode, also reset zoom
    if (!isAutoFit) {
      setZoomLevel(1);
    }
  };

  // Check if diagram needs indicators
  const checkScrollable = () => {
    if (diagramContainerRef.current && previewRef.current) {
      const container = diagramContainerRef.current;
      const content = previewRef.current;
      const svg = content.querySelector('svg');
      
      if (svg) {
        // Check if diagram is larger than container (even with zoom)
        const containerRect = container.getBoundingClientRect();
        const svgRect = svg.getBoundingClientRect();
        const needsIndicator = svgRect.width > containerRect.width || svgRect.height > containerRect.height;
        setShowScrollIndicator(needsIndicator);
      }
    }
  };

  // Monitor zoom/pan events
  const handleInteraction = () => {
    checkScrollable();
  };

  // Zoom functionality
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.1, maxZoom));
    setIsAutoFit(false);
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.1, minZoom));
    setIsAutoFit(false);
  };

  const handleZoomReset = () => {
    setZoomLevel(1);
    setIsAutoFit(false);
    handleResetDiagramPosition();
  };

  const handleAutoFit = () => {
    if (diagramContainerRef.current && previewRef.current) {
      const container = diagramContainerRef.current;
      const content = previewRef.current;
      const svg = content.querySelector('svg');
      
      if (svg) {
        // Get actual dimensions
        const containerWidth = container.clientWidth - 40; // Account for padding
        const containerHeight = container.clientHeight - 40; // Account for padding
        
        // Get SVG dimensions
        const svgWidth = svg.scrollWidth || svg.clientWidth || parseFloat(svg.getAttribute('width') || '0');
        const svgHeight = svg.scrollHeight || svg.clientHeight || parseFloat(svg.getAttribute('height') || '0');
        
        if (svgWidth > 0 && svgHeight > 0) {
          // Calculate zoom to fit both width and height with padding
          const scaleX = containerWidth / svgWidth;
          const scaleY = containerHeight / svgHeight;
          const scale = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 100%
          
          setZoomLevel(Math.max(scale, minZoom));
          setIsAutoFit(true);
          
          // Center the diagram by resetting pan
          setPanOffset({ x: 0, y: 0 });
          setLastPanOffset({ x: 0, y: 0 });
        }
      }
    }
  };

  // Handle wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoomLevel(prev => Math.max(minZoom, Math.min(maxZoom, prev + delta)));
      setIsAutoFit(false);
    }
  };

  const handleChatToggle = () => {
    setShowChatPanel(!showChatPanel);
    
    // Auto switch to split mode when opening chat
    if (!showChatPanel) {
      setActiveView('split');
      setTimeout(() => renderDiagram(editCode), 100);
    }
    // When closing chat, keep current view mode (don't auto switch back)
  };

  const renderToolbar = () => (
    <div className={styles.toolbar}>
      <div className={styles.titleGroup}>
        <span className={styles.title}>📊 {title}</span>
        {hasUnsavedChanges && (
          <span className={styles.unsavedIndicator}>
            ● (unsaved)
          </span>
        )}
        {error && (
          <span className={styles.errorBadge}>
            ⚠️ Syntax Error
          </span>
        )}
        <span className={styles.diagramType}>
          ({diagramType})
        </span>
      </div>
      
      {isEditable && (
        <div className={styles.controls}>
          {/* View Mode Buttons */}
          <div className={styles.viewModeButtons}>
            <button
              onClick={() => setActiveView('preview')}
              className={`${styles.viewButton} ${activeView === 'preview' ? styles.active : ''}`}
            >
              👁️ Preview
            </button>
            <button
              onClick={() => setActiveView('edit')}
              className={`${styles.viewButton} ${activeView === 'edit' ? styles.active : ''}`}
            >
              ✏️ Edit
            </button>
            <button
              onClick={() => setActiveView('split')}
              className={`${styles.viewButton} ${activeView === 'split' ? styles.active : ''}`}
            >
              📱 Split
            </button>
          </div>

          {/* Chat Toggle Button */}
          <div className={styles.chatControls}>
            <button
              onClick={handleChatToggle}
              className={`${styles.chatButton} ${showChatPanel ? styles.active : ''}`}
              title="Toggle AI Chat Assistant"
            >
              🤖 AI Chat
            </button>
          </div>

          {/* Action Buttons */}
          {activeView !== 'edit' && (
            <div className={styles.actionButtons}>
              <div className={styles.zoomControls}>
                <button
                  onClick={handleZoomOut}
                  className={`${styles.zoomButton}`}
                  title="Zoom Out (Ctrl + -)"
                  disabled={zoomLevel <= minZoom}
                >
                  🔍-
                </button>
                <span className={styles.zoomLevel}>
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  className={`${styles.zoomButton}`}
                  title="Zoom In (Ctrl + +)"
                  disabled={zoomLevel >= maxZoom}
                >
                  🔍+
                </button>
                <button
                  onClick={handleAutoFit}
                  className={`${styles.zoomButton} ${isAutoFit ? styles.active : ''}`}
                  title="Auto Fit (Ctrl + F)"
                >
                  📐
                </button>
              </div>
              <button
                onClick={handleResetDiagramPosition}
                className={`${styles.actionButton} ${styles.reset}`}
                title="Reset diagram position"
              >
                🏠 Reset
              </button>
              <button
                onClick={handlePreview}
                className={`${styles.actionButton} ${styles.refresh}`}
              >
                🔄 Refresh
              </button>
              <button
                onClick={handleSave}
                className={`${styles.actionButton} ${styles.save} ${hasUnsavedChanges ? styles.hasUnsaved : ''}`}
                title={hasUnsavedChanges ? "You have unsaved changes - Click to save" : "Save changes"}
              >
                💾 {hasUnsavedChanges ? 'Save*' : 'Save'}
              </button>
              <button
                onClick={handleCancel}
                className={`${styles.actionButton} ${styles.cancel}`}
              >
                ❌ Cancel
              </button>
            </div>
          )}
          {activeView === 'edit' && (
            <div className={styles.actionButtons}>
              <button
                onClick={handlePreview}
                className={`${styles.actionButton} ${styles.refresh}`}
              >
                🔄 Refresh
              </button>
              <button
                onClick={handleSave}
                className={`${styles.actionButton} ${styles.save} ${hasUnsavedChanges ? styles.hasUnsaved : ''}`}
                title={hasUnsavedChanges ? "You have unsaved changes - Click to save" : "Save changes"}
              >
                💾 {hasUnsavedChanges ? 'Save*' : 'Save'}
              </button>
              <button
                onClick={handleCancel}
                className={`${styles.actionButton} ${styles.cancel}`}
              >
                ❌ Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderEditor = () => (
    <div className={styles.editor}>
      <div className={styles.tip}>
        💡 Tip: Chỉnh sửa Mermaid code bên dưới. Syntax highlighting và auto-completion sẽ được thêm trong tương lai.
      </div>
      <textarea
        value={editCode}
        onChange={(e) => {
          setEditCode(e.target.value);
          setHasUnsavedChanges(e.target.value !== code);
        }}
        className={styles.textarea}
        placeholder="Enter mermaid diagram code here..."
        spellCheck={false}
      />
    </div>
  );

  const renderPreview = () => (
    <div className={`${styles.preview} ${activeView === 'preview' ? styles.standalone : ''}`}>
      <div 
        ref={diagramContainerRef}
        className={`${styles.diagramContainer} ${isDragging ? styles.dragging : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        tabIndex={0}
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      >
        <div 
          ref={previewRef} 
          className={styles.diagramContent}
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
            transformOrigin: 'top left',
          }}
        />
        {showScrollIndicator && (
          <div className={styles.scrollIndicator}>
            📐 Zoom: {Math.round(zoomLevel * 100)}% | Kéo để di chuyển
          </div>
        )}
      </div>
      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    switch (activeView) {
      case 'preview':
        return (
          <div className={`${styles.content} ${styles.preview}`}>
            {renderPreview()}
          </div>
        );
      
      case 'edit':
        return (
          <div className={`${styles.content} ${styles.edit}`}>
            {renderEditor()}
          </div>
        );
      
      case 'split':
        return (
          <div className={`${styles.content} ${styles.split}`}>
            <div className={styles.leftPanel}>
              {renderEditor()}
            </div>
            <div className={styles.rightPanel}>
              {renderPreview()}
            </div>
            {showChatPanel && (
              <div className={styles.chatPanel}>
                <CompactDiagramChat
                  content={content}
                  diagramCode={editCode}
                  diagramType={diagramType}
                  onDiagramUpdate={handleDiagramUpdate}
                  isVisible={showChatPanel}
                  title={title}
                />
              </div>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      {renderToolbar()}
      {renderContent()}
    </div>
  );
};

export default DiagramEditor;
