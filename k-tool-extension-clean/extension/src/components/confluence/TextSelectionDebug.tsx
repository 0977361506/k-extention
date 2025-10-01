import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../../utils/NotificationInit.js';

interface DebugInfo {
  hasSelection: boolean;
  selectedText: string;
  selectionLength: number;
  containerRef: boolean;
  position: { x: number; y: number };
  isInContainer: boolean;
  eventFired: string[];
}

const TextSelectionDebug: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    hasSelection: false,
    selectedText: '',
    selectionLength: 0,
    containerRef: false,
    position: { x: 0, y: 0 },
    isInContainer: false,
    eventFired: []
  });
  
  const [showIcon, setShowIcon] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateDebugInfo = useCallback(() => {
    const selection = window.getSelection();
    const selectedText = selection?.toString() || '';
    
    let position = { x: 0, y: 0 };
    let isInContainer = false;
    
    if (selection && !selection.isCollapsed && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      position = {
        x: rect.right + window.scrollX + 10,
        y: rect.top + window.scrollY
      };
      
      if (containerRef.current) {
        isInContainer = containerRef.current.contains(range.commonAncestorContainer) ||
                       containerRef.current.contains(range.startContainer) ||
                       containerRef.current.contains(range.endContainer);
      }
    }

    const newDebugInfo: DebugInfo = {
      hasSelection: !!selection && !selection.isCollapsed,
      selectedText,
      selectionLength: selectedText.length,
      containerRef: !!containerRef.current,
      position,
      isInContainer,
      eventFired: [...debugInfo.eventFired]
    };
    
    setDebugInfo(newDebugInfo);
    
    // Show icon if valid selection
    const shouldShowIcon = selectedText.length >= 3 && isInContainer;
    setShowIcon(shouldShowIcon);
    
    console.log('🔍 Debug Update:', newDebugInfo, 'Show Icon:', shouldShowIcon);
  }, [debugInfo.eventFired]);

  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      setDebugInfo(prev => ({
        ...prev,
        eventFired: [...prev.eventFired.slice(-4), 'mouseup'].slice(-5)
      }));
      setTimeout(updateDebugInfo, 100);
    };

    const handleSelectionChange = () => {
      setDebugInfo(prev => ({
        ...prev,
        eventFired: [...prev.eventFired.slice(-4), 'selectionchange'].slice(-5)
      }));
      setTimeout(updateDebugInfo, 50);
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [updateDebugInfo]);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h3>🐛 Text Selection Debug</h3>
      
      {/* Debug Info Panel */}
      <div style={{ 
        background: '#f5f5f5', 
        padding: '15px', 
        marginBottom: '20px',
        borderRadius: '8px',
        border: '1px solid #ddd'
      }}>
        <h4>Debug Information:</h4>
        <div>Has Selection: <strong style={{ color: debugInfo.hasSelection ? 'green' : 'red' }}>{debugInfo.hasSelection ? 'YES' : 'NO'}</strong></div>
        <div>Selected Text: <strong>"{debugInfo.selectedText}"</strong></div>
        <div>Text Length: <strong>{debugInfo.selectionLength}</strong></div>
        <div>Container Ref: <strong style={{ color: debugInfo.containerRef ? 'green' : 'red' }}>{debugInfo.containerRef ? 'SET' : 'NOT SET'}</strong></div>
        <div>Is In Container: <strong style={{ color: debugInfo.isInContainer ? 'green' : 'red' }}>{debugInfo.isInContainer ? 'YES' : 'NO'}</strong></div>
        <div>Position: <strong>x: {debugInfo.position.x}, y: {debugInfo.position.y}</strong></div>
        <div>Recent Events: <strong>{debugInfo.eventFired.join(', ')}</strong></div>
        <div>Show Icon: <strong style={{ color: showIcon ? 'green' : 'red' }}>{showIcon ? 'YES' : 'NO'}</strong></div>
      </div>

      {/* Test Content */}
      <div 
        ref={containerRef}
        style={{ 
          position: 'relative',
          background: 'white', 
          padding: '20px', 
          border: '2px solid #007acc',
          borderRadius: '8px',
          minHeight: '200px'
        }}
      >
        <h4>📝 Test Content (Select text below):</h4>
        <p>
          This is a sample paragraph for testing text selection. 
          Try selecting different parts of this text to see if the debug information updates correctly.
          The chat icon should appear when you select at least 3 characters within this container.
        </p>
        <p>
          Here is another paragraph with more content. 
          <strong>This bold text</strong> and <em>this italic text</em> should also be selectable.
          You can test with various types of content including lists:
        </p>
        <ul>
          <li>First list item for selection testing</li>
          <li>Second list item with more content</li>
          <li>Third item to complete the test</li>
        </ul>

        {/* Chat Icon - Debug Version */}
        {showIcon && (
          <div 
            style={{
              position: 'absolute',
              left: debugInfo.position.x,
              top: debugInfo.position.y,
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: '3px solid rgba(255, 255, 255, 0.9)',
              color: 'white',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
              zIndex: 1000,
              animation: 'none'
            }}
            onClick={() => {
              window.KToolNotification?.show(`Selected: "${debugInfo.selectedText}"`, 'info');
            }}
          >
            💬
          </div>
        )}
      </div>

      {/* Clear Selection Button */}
      <button 
        onClick={() => {
          window.getSelection()?.removeAllRanges();
          setShowIcon(false);
          setDebugInfo(prev => ({ ...prev, eventFired: [...prev.eventFired, 'cleared'] }));
        }}
        style={{
          marginTop: '10px',
          padding: '8px 16px',
          background: '#dc2626',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Clear Selection
      </button>
    </div>
  );
};

export default TextSelectionDebug;
