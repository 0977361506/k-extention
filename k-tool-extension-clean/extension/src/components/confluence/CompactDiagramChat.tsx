import React, { useState, useRef, useEffect } from 'react';
import styles from './CompactDiagramChat.module.scss';
import { EDIT_DIAGRAM_URL } from '../../enums/AppConstants';
import { Settings } from '../../popup/PopupSettings';
import { extensionSettings } from '../../enums/AppConstants';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface CompactDiagramChatProps {
  diagramCode: string;
  diagramType: string;
  content: string;
  onDiagramUpdate: (newCode: string, userRequest?: string) => void;
  isVisible: boolean;
  title?: string;
}

const CompactDiagramChat: React.FC<CompactDiagramChatProps> = ({
  diagramCode,
  diagramType,
  content,
  onDiagramUpdate,
  isVisible,
  title = "Diagram"
}) => {  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    apiKey: '',
    urlTemplate: '',
    customPrompt: '',
    documentUrl: '',
    databaseUrl: '',
    instructionUrl: '',
    isEnabled: true,
    selectedModel: 'sonar-pro'
  });
  const [undoHistory, setUndoHistory] = useState<Array<{
    originalCode: string;
    newCode: string;
    userRequest: string;
    timestamp: number;
  }>>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [scrollTimeout, setScrollTimeout] = useState<NodeJS.Timeout | null>(null);

  // Load settings từ Chrome storage khi component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const result = await chrome.storage.sync.get([extensionSettings]);
        if (result.extensionSettings) {
          setSettings(result.extensionSettings);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadSettings();
  }, []);

  // Enhanced scroll management for better UX
  useEffect(() => {
    // Detect user scrolling
    const handleScroll = () => {
      if (messagesContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
        setIsUserScrolling(!isAtBottom);
        
        // Clear timeout if exists
        if (scrollTimeout) {
          clearTimeout(scrollTimeout);
        }
        
        // Set timeout to reset scrolling state
        const timeout = setTimeout(() => {
          setIsUserScrolling(false);
        }, 1000);
        setScrollTimeout(timeout);
      }
    };

    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => {
        container.removeEventListener('scroll', handleScroll);
        if (scrollTimeout) {
          clearTimeout(scrollTimeout);
        }
      };
    }
  }, [scrollTimeout]);

  // Smart auto scroll - only when user is not manually scrolling
  useEffect(() => {
    if (!isUserScrolling && messages.length > 0) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'nearest'
        });
      }, 100);
    }
  }, [messages, isUserScrolling]);

  // Clean diagram code before sending to AI - enhanced cleaning
  const cleanDiagramCode = (code: string): string => {
    console.log('🧹 Cleaning input diagram code:', code.substring(0, 100));
    
    const cleaned = code
      .replace(/<br\s*\/?>/gi, '\n')     // Replace <br> with newlines
      .replace(/&nbsp;/gi, ' ')          // Replace &nbsp; with spaces
      .replace(/&lt;/gi, '<')            // Replace HTML entities
      .replace(/&gt;/gi, '>')
      .replace(/&amp;/gi, '&')
      .replace(/\\n/g, '\n')             // Replace literal \n with actual newlines
      .replace(/\n\s*\n/g, '\n')         // Remove duplicate newlines
      .trim();
    
    console.log('✅ Cleaned input:', cleaned.substring(0, 100));
    return cleaned;
  };

  // Clean AI response - ENHANCED for better format
  const cleanAIResponse = (response: string): string => {
    if (!response || !response.trim()) {
      console.log('⚠️ Empty response to clean');
      return '';
    }
    
    console.log('🧹 Cleaning AI response:', response.substring(0, 100));
    
    let cleaned = response
      .replace(/```mermaid\n?/gi, '')    // Remove markdown code blocks
      .replace(/```\n?/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')     // Replace <br> with newlines  
      .replace(/&nbsp;/gi, ' ')          // Replace &nbsp; with spaces
      .replace(/&lt;/gi, '<')            // Replace HTML entities
      .replace(/&gt;/gi, '>')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\\n/g, '\n')             // CRITICAL: Replace literal \n with actual newlines
      .trim();
    
    // Remove extra newlines and spaces but preserve structure
    cleaned = cleaned
      .split('\n')
      .map(line => line.trim())          // Trim each line
      .filter(line => line.length > 0)   // Remove empty lines
      .join('\n');                       // Join with single newlines
      
    console.log('✅ Final cleaned result:', cleaned.substring(0, 100));
    return cleaned;
  };

  // Validate Mermaid syntax (relaxed validation)
  const validateMermaidSyntax = (code: string): boolean => {
    if (!code || !code.trim()) {
      console.error('Empty or null diagram code');
      return false;
    }
    
    const lines = code.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      console.error('No content lines found');
      return false;
    }
    
    // Check first line for valid diagram type (relaxed check)
    const firstLine = lines[0].trim().toLowerCase();
    const validTypes = [
      'flowchart', 'graph', 'sequencediagram', 'classdiagram', 'classDiagram', 
      'gantt', 'pie', 'erdiagram', 'journey', 'gitgraph', 'mindmap', 
      'statediagram', 'state-diagram', 'requirementdiagram', 'c4context'
    ];
    const hasValidType = validTypes.some(type => firstLine.includes(type));
    
    if (!hasValidType) {
      console.warn('Unrecognized diagram type, but allowing:', firstLine);
      // Don't fail validation for unrecognized types - let Mermaid handle it
    }
    
    // Basic syntax check - only check for obvious breaking characters
    for (const line of lines) {
      // Check for characters that definitely break Mermaid
      if (line.includes('\\n') || line.includes('<br>')) {
        console.error('Invalid characters found in line:', line);
        return false;
      }
    }
    
    console.log('✅ Diagram validation passed');
    return true;
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    // Clean diagram code before sending
    const cleanedDiagramCode = cleanDiagramCode(diagramCode);

    // Add user message
    const newMessages = [...messages, { 
      role: 'user' as const, 
      content: userMessage,
      timestamp: Date.now()
    }];
    setMessages(newMessages);

    try {      const response = await fetch(EDIT_DIAGRAM_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content,
          diagram_code: cleanedDiagramCode,
          user_request: userMessage,
          selectedModel: settings.selectedModel
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API request failed');
      }

      const data = await response.json();
      
      if (data.success && data.edited_diagram) {
        // Clean AI response thoroughly
        const cleanedDiagram = cleanAIResponse(data.edited_diagram);
        
        // Validate syntax before applying
        if (cleanedDiagram && cleanedDiagram.trim() && validateMermaidSyntax(cleanedDiagram)) {
          // Save to undo history
          setUndoHistory(prev => [...prev, {
            originalCode: diagramCode,
            newCode: cleanedDiagram,
            userRequest: userMessage,
            timestamp: Date.now()
          }].slice(-5)); // Keep last 5 changes

          // Add success message
          const aiMessage = { 
            role: 'assistant' as const, 
            content: `✅ Updated: ${userMessage}`,
            timestamp: Date.now()
          };
          
          const updatedMessages = [...newMessages, aiMessage];
          setMessages(updatedMessages);
          
          // Apply changes to diagram
          onDiagramUpdate(cleanedDiagram, userMessage);
          
          // Show success notification
          showNotification('✅ Diagram updated!', 'success');
        } else {
          throw new Error('Invalid Mermaid syntax in AI response');
        }
      } else {
        throw new Error('Invalid response from API');
      }
    } catch (error) {
      console.error('Error editing diagram:', error);
      
      const errorMessage = { 
        role: 'assistant' as const, 
        content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now()
      };
      setMessages([...newMessages, errorMessage]);
      
      showNotification('❌ Edit failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUndo = () => {
    if (undoHistory.length === 0) return;
    
    const lastChange = undoHistory[undoHistory.length - 1];
    
    // Apply undo
    onDiagramUpdate(lastChange.originalCode);
    
    // Remove last item from history
    setUndoHistory(prev => prev.slice(0, -1));
    
    // Add undo message
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: '↶ Undone',
      timestamp: Date.now()
    }]);
    
    showNotification('↶ Undone', 'success');
  };

  const handleClearChat = () => {
    setMessages([]);
    setUndoHistory([]);
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const notification = document.createElement('div');
    notification.textContent = message;
    
    const colors = {
      success: { bg: '#28a745' },
      error: { bg: '#dc3545' },
      info: { bg: '#17a2b8' }
    };
    
    const color = colors[type];
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${color.bg};
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      z-index: 10000;
      font-size: 12px;
      animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideOutRight 0.3s ease-in forwards';
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isVisible) return null;

  return (
    <div className={styles.compactChat}>
      {/* Compact Header */}
      <div className={styles.header}>
        <span className={styles.title}>🤖 AI</span>
        <div className={styles.actions}>
          {undoHistory.length > 0 && (
            <button 
              className={styles.undoBtn}
              onClick={handleUndo}
              title={`Undo (${undoHistory.length})`}
            >
              ↶
            </button>
          )}
          <button 
            className={styles.clearBtn}
            onClick={handleClearChat}
            title="Clear chat"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Compact Messages with enhanced scroll management */}
      {messages.length > 0 && (
        <div 
          ref={messagesContainerRef}
          className={styles.messages}
          style={{ 
            scrollBehavior: isUserScrolling ? 'auto' : 'smooth',
            overflow: 'auto'
          }}
        >
          {messages.slice(-3).map((message, index) => ( // Show only last 3 messages
            <div key={index} className={`${styles.message} ${styles[message.role]}`}>
              <div 
                className={styles.content}
                dangerouslySetInnerHTML={{ __html: message.content }}
              />
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Compact Input */}
      <div className={styles.inputContainer}>
        <textarea
          ref={textareaRef}
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Describe changes..."
          className={styles.textarea}
          rows={2}
          disabled={isLoading}
        />
        <button 
          onClick={handleSendMessage}
          disabled={isLoading || !inputMessage.trim()}
          className={styles.sendBtn}
        >
          {isLoading ? '⏳' : '📤'}
        </button>
      </div>

      {/* Usage Tips */}
      <div className={styles.tips}>
        💡 Enter to send
      </div>
    </div>
  );
};

export default CompactDiagramChat;
