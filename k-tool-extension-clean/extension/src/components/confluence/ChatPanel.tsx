import React from 'react';
import ReactDOM from 'react-dom';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ChatPanelProps {
  isOpen: boolean;
  messages: ChatMessage[];
  inputMessage: string;
  isLoading: boolean;
  selectedText: string;
  position: { x: number; y: number };
  onClose: () => void;
  onSendMessage: () => void;
  onInputChange: (value: string) => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  onApplyChanges: (text: string) => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  isOpen,
  messages,
  inputMessage,
  isLoading,
  selectedText,
  position,
  onClose,
  onSendMessage,
  onInputChange,
  onKeyPress,
  onApplyChanges
}) => {
  if (!isOpen) return null;

  const chatPanelElement = (
    <div 
      className="ktool-chat-panel-portal"
      style={{
        position: 'fixed',
        left: `${Math.max(10, Math.min(position.x, window.innerWidth - 420))}px`,
        top: `${Math.max(10, Math.min(position.y + 50, window.innerHeight - 450))}px`,
        width: '400px',
        maxWidth: '90vw',
        maxHeight: '80vh',
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25), 0 8px 32px rgba(102, 126, 234, 0.15)',
        border: '2px solid rgba(102, 126, 234, 0.2)',
        overflow: 'hidden',
        zIndex: 2147483647, // Maximum z-index value
        display: 'block !important',
        opacity: '1 !important',
        transform: 'translateZ(0)',
        backdropFilter: 'blur(8px)',
        contain: 'layout style',
        isolation: 'isolate',
        pointerEvents: 'auto'
      }}
    >
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>🤖 AI Text Editor</h4>
        <button 
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            transition: 'background 0.2s ease'
          }}
          onClick={onClose}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'none';
          }}
        >
          ✕
        </button>
      </div>

      {/* Selected Text Info */}
      <div style={{
        padding: '12px 20px',
        background: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        fontSize: '13px',
        color: '#475569'
      }}>
        <strong>🎯 Đang chỉnh sửa:</strong> 
        <span style={{
          display: 'block',
          marginTop: '4px',
          fontStyle: 'italic',
          color: '#64748b',
          background: 'white',
          padding: '6px 10px',
          borderRadius: '6px',
          border: '1px solid #e2e8f0'
        }}>
          {selectedText.length > 50 
            ? selectedText.substring(0, 50) + '...' 
            : selectedText}
        </span>
        <div style={{
          marginTop: '8px',
          padding: '4px 8px',
          background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 25%, #FFD23F 50%, #06FFA5 75%, #4ECDC4 100%)',
          color: '#1a1a1a',
          fontSize: '11px',
          fontWeight: 600,
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          ✨ Text đã được highlight với màu rainbow gradient
        </div>
      </div>

      {/* Messages */}
      <div style={{
        maxHeight: '280px',
        overflowY: 'auto',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        background: '#f8fafc'
      }}>
        {messages.map((message, index) => (
          <div 
            key={index} 
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start'
            }}
          >
            <div style={{
              padding: '12px 16px',
              borderRadius: '12px',
              fontSize: '14px',
              lineHeight: '1.5',
              wordWrap: 'break-word',
              maxWidth: '90%',
              background: message.role === 'user' 
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'white',
              color: message.role === 'user' ? 'white' : '#374151',
              border: message.role === 'user' ? 'none' : '1px solid #e5e7eb',
              borderBottomRightRadius: message.role === 'user' ? '4px' : '12px',
              borderBottomLeftRadius: message.role === 'user' ? '12px' : '4px'
            }}>
              {message.content}
            </div>
            {message.role === 'assistant' && index === messages.length - 1 && !isLoading && message.content !== messages[0]?.content && (
              <button 
                style={{
                  alignSelf: 'flex-start',
                  padding: '12px 20px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  marginTop: '8px',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                }}
                onClick={() => onApplyChanges(message.content)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #059669, #047857)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                }}
              >
                ✅ Áp dụng thay đổi
              </button>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignSelf: 'flex-start'
          }}>
            <div style={{
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'white',
              border: '1px solid #e5e7eb',
              borderBottomLeftRadius: '4px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#6b7280',
                fontStyle: 'italic'
              }}>
                <span>🤖 Đang xử lý</span>
                <div style={{ display: 'flex', gap: '2px' }}>
                  <span style={{ opacity: 0.4 }}>.</span>
                  <span style={{ opacity: 0.4 }}>.</span>
                  <span style={{ opacity: 0.4 }}>.</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{
        display: 'flex',
        padding: '16px 20px',
        background: 'white',
        borderTop: '1px solid #e5e7eb',
        gap: '12px',
        alignItems: 'flex-end'
      }}>
        <textarea
          value={inputMessage}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyPress={onKeyPress}
          placeholder="Nhập yêu cầu chỉnh sửa văn bản..."
          rows={2}
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '10px 14px',
            border: '2px solid #e5e7eb',
            borderRadius: '10px',
            resize: 'none',
            fontSize: '14px',
            fontFamily: 'inherit',
            outline: 'none',
            transition: 'border-color 0.2s ease',
            background: isLoading ? '#f9fafb' : 'white',
            color: isLoading ? '#9ca3af' : 'inherit'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#667eea';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#e5e7eb';
          }}
        />
        <button 
          onClick={onSendMessage}
          disabled={isLoading || !inputMessage.trim()}
          style={{
            padding: '10px 12px',
            background: (isLoading || !inputMessage.trim()) 
              ? '#d1d5db' 
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '16px',
            cursor: (isLoading || !inputMessage.trim()) ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            minWidth: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            if (!isLoading && inputMessage.trim()) {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isLoading && inputMessage.trim()) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          📤
        </button>
      </div>
    </div>
  );

  // Create or get portal container
  let portalContainer = document.getElementById('ktool-chat-portal');
  if (!portalContainer) {
    portalContainer = document.createElement('div');
    portalContainer.id = 'ktool-chat-portal';
    portalContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 2147483647;
    `;
    document.body.appendChild(portalContainer);
  }

  return ReactDOM.createPortal(chatPanelElement, portalContainer);
};

export default ChatPanel;
