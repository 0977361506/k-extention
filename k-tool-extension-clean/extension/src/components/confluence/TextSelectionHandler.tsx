import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './TextSelectionHandler.module.scss';
import { EDIT_TEXT_URL } from '../../enums/AppConstants';
import { Settings } from '../../popup/PopupSettings';
import { extensionSettings } from '../../enums/AppConstants';
import { VersionManager } from '../../utils/versionManager';
import '../../utils/NotificationInit.js';

interface TextSelectionHandlerProps {
  children: React.ReactNode;
  onTextUpdate: (originalText: string, newText: string) => void;
  isEnabled?: boolean;
  onAutoSave?: (updatedContent: string) => void;
}

interface SelectionState {
  isVisible: boolean;
  selectedText: string;
  position: { x: number; y: number };
  range: Range | null;
  lastUpdateTime: number; // Add timestamp to prevent rapid updates
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const TextSelectionHandler: React.FC<TextSelectionHandlerProps> = ({
  children,
  onTextUpdate,
  isEnabled = true,
  onAutoSave
}) => {  const [selectionState, setSelectionState] = useState<SelectionState>({
    isVisible: false,
    selectedText: '',
    position: { x: 0, y: 0 },
    range: null,
    lastUpdateTime: 0
  });
  
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
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
    const containerRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const renderCountRef = useRef(0);

  // Debug: Track render cycles
  useEffect(() => {
    renderCountRef.current += 1;
    console.log(`🔄 RENDER #${renderCountRef.current}:`, {
      isChatOpen,
      selectionVisible: selectionState.isVisible,
      selectedText: selectionState.selectedText.substring(0, 30),
      messagesCount: chatMessages.length,
      timestamp: new Date().toISOString()
    });
    
    if (isChatOpen) {
      console.log('🎯 Chat should be open - checking render conditions');
      
      // Check if DOM element exists after render
      setTimeout(() => {
        const panel = document.querySelector('.ktool-chat-panel');
        const fallbackPanel = document.querySelector('[style*="position: fixed"][style*="top: 50%"]');
        console.log('🔍 Post-render DOM check:', {
          mainPanel: !!panel,
          fallbackPanel: !!fallbackPanel,
          chatRefCurrent: !!chatRef.current
        });
        
        if (panel) {
          console.log('✅ Main panel found, checking visibility');
          const rect = panel.getBoundingClientRect();
          const styles = window.getComputedStyle(panel);
          console.log('📐 Panel bounds and styles:', {
            rect,
            display: styles.display,
            visibility: styles.visibility,
            opacity: styles.opacity,
            zIndex: styles.zIndex
          });
        }
      }, 10);
    }
  }, [isChatOpen, selectionState.isVisible, chatMessages.length, selectionState.selectedText]);

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

  // Enhanced text selection với improved debouncing và performance optimization
  const handleTextSelection = useCallback(() => {
    const currentTime = Date.now();
    
    // Enhanced debouncing with dynamic intervals
    const timeSinceLastUpdate = currentTime - selectionState.lastUpdateTime;
    const minimumInterval = selectionState.isVisible ? 150 : 50; // Longer interval if icon is visible
    
    if (timeSinceLastUpdate < minimumInterval) {
      console.log('🚫 Skipping rapid selection update');
      return;
    }

    console.log('🔍 handleTextSelection called, isEnabled:', isEnabled);
    
    if (!isEnabled) {
      console.log('❌ Text selection disabled');
      setSelectionState(prev => ({ ...prev, isVisible: false, lastUpdateTime: currentTime }));
      return;
    }

    const selection = window.getSelection();
    console.log('📝 Selection:', {
      selection: !!selection,
      rangeCount: selection?.rangeCount,
      isCollapsed: selection?.isCollapsed,
      selectedText: selection?.toString()
    });

    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      console.log('❌ No valid selection');
      setSelectionState(prev => ({ ...prev, isVisible: false, lastUpdateTime: currentTime }));
      return;
    }

    const selectedText = selection.toString().trim();
    if (selectedText.length < 3) {
      console.log('❌ Selected text too short:', selectedText.length);
      setSelectionState(prev => ({ ...prev, isVisible: false, lastUpdateTime: currentTime }));
      return;
    }

    // Check if selection is within our container
    const range = selection.getRangeAt(0);
    const container = containerRef.current;
    
    console.log('🎯 Container check:', {
      hasContainer: !!container,
      rangeAncestor: range.commonAncestorContainer,
      containerTagName: container?.tagName,
      containerClass: container?.className
    });

    // More comprehensive container check
    let isInContainer = false;
    if (container) {
      isInContainer = container.contains(range.commonAncestorContainer) ||
                     container.contains(range.startContainer) ||
                     container.contains(range.endContainer);
      
      // Fallback: check if range intersects with container bounds
      if (!isInContainer) {
        const containerRect = container.getBoundingClientRect();
        const rangeRect = range.getBoundingClientRect();
        
        isInContainer = rangeRect.left >= containerRect.left &&
                       rangeRect.right <= containerRect.right &&
                       rangeRect.top >= containerRect.top &&
                       rangeRect.bottom <= containerRect.bottom;
        
        console.log('🎯 Fallback container check:', {
          containerRect,
          rangeRect,
          isInContainer
        });
      }
    } else {
      // If no container, allow selection (for testing)
      isInContainer = true;
      console.log('⚠️ No container ref, allowing selection');
    }

    if (!isInContainer) {
      console.log('❌ Selection not in container');
      setSelectionState(prev => ({ ...prev, isVisible: false, lastUpdateTime: currentTime }));
      return;
    }

    // Enhanced smart positioning algorithm với viewport awareness
    const rect = range.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    
    // Calculate optimal position based on available space
    const iconSize = 48;
    const margin = 15;
    const chatPanelWidth = 420;
    const chatPanelHeight = 450;
    
    let x = rect.right + margin;
    let y = rect.top;
    
    // Smart horizontal positioning
    const spaceRight = viewportWidth - rect.right;
    const spaceLeft = rect.left;
    const spaceTop = rect.top;
    const spaceBottom = viewportHeight - rect.bottom;
    
    // Choose best horizontal position
    if (spaceRight >= iconSize + margin) {
      x = rect.right + margin; // Default: right side
    } else if (spaceLeft >= iconSize + margin) {
      x = rect.left - iconSize - margin; // Left side if no right space
    } else {
      x = Math.max(margin, Math.min(rect.right, viewportWidth - iconSize - margin)); // Center fallback
    }
    
    // Smart vertical positioning
    if (spaceBottom >= iconSize + margin) {
      y = rect.top; // Default: top alignment
    } else if (spaceTop >= iconSize + margin) {
      y = rect.bottom - iconSize; // Bottom alignment if no bottom space
    } else {
      y = Math.max(margin, Math.min(rect.top, viewportHeight - iconSize - margin)); // Center fallback
    }
    
    // Ensure chat panel will fit when opened
    if (x + chatPanelWidth > viewportWidth && rect.left - chatPanelWidth > 0) {
      x = rect.left - iconSize - margin; // Move to left if chat panel won't fit
    }
    
    if (y + chatPanelHeight > viewportHeight && rect.top - chatPanelHeight > 0) {
      y = Math.max(margin, rect.top - chatPanelHeight + iconSize); // Move up if chat panel won't fit
    }
    
    // Final boundary checks với scroll compensation
    x = Math.max(margin, Math.min(x, viewportWidth - iconSize - margin));
    y = Math.max(margin, Math.min(y, viewportHeight - iconSize - margin));
    
    const position = { x, y };

    console.log('✅ Valid selection found:', {
      text: selectedText,
      position,
      rectBounds: rect,
      viewport: { width: viewportWidth, height: viewportHeight }
    });

    const now = Date.now();
    setSelectionState({
      isVisible: true,
      selectedText,
      position,
      range: range.cloneRange(),
      lastUpdateTime: now
    });
  }, [isEnabled, selectionState.lastUpdateTime]);

  // Add event listeners với optimized timing và throttling
  useEffect(() => {
    console.log('🎯 Setting up event listeners, isEnabled:', isEnabled);
    
    if (!isEnabled) return;

    let selectionTimeout: NodeJS.Timeout;
    let isProcessing = false;

    const handleMouseUp = (e: MouseEvent) => {
      console.log('🖱️ MouseUp event:', e.target);
      
      // Prevent multiple rapid calls
      if (isProcessing) return;
      
      // Clear any existing timeout
      if (selectionTimeout) clearTimeout(selectionTimeout);
      
      // Quick response for mouseup but not too aggressive
      selectionTimeout = setTimeout(() => {
        isProcessing = true;
        handleTextSelection();
        // Reset processing flag after a short delay
        setTimeout(() => { isProcessing = false; }, 150);
      }, 30);
    };

    const handleSelectionChange = () => {
      console.log('📝 SelectionChange event');
      
      // Skip if already processing
      if (isProcessing) return;
      
      // Clear any existing timeout to prevent multiple rapid calls
      if (selectionTimeout) clearTimeout(selectionTimeout);
      
      // Faster response for selection change
      selectionTimeout = setTimeout(() => {
        isProcessing = true;
        handleTextSelection();
        setTimeout(() => { isProcessing = false; }, 150);
      }, 15);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Handle selection via keyboard (shift + arrow keys)
      if (e.shiftKey || e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        console.log('⌨️ Keyboard selection event');
        
        if (isProcessing) return;
        if (selectionTimeout) clearTimeout(selectionTimeout);
        
        selectionTimeout = setTimeout(() => {
          isProcessing = true;
          handleTextSelection();
          setTimeout(() => { isProcessing = false; }, 150);
        }, 25);
      }
    };

    // Add listeners to document for global coverage
    document.addEventListener('mouseup', handleMouseUp, { passive: true });
    document.addEventListener('selectionchange', handleSelectionChange, { passive: true });
    document.addEventListener('keyup', handleKeyUp, { passive: true });
    
    // Also add to container for specific targeting
    const container = containerRef.current;
    if (container) {
      container.addEventListener('mouseup', handleMouseUp, { passive: true });
      console.log('✅ Added listeners to container');
    }

    return () => {
      // Clear timeout on cleanup
      if (selectionTimeout) clearTimeout(selectionTimeout);
      
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('keyup', handleKeyUp);
      if (container) {
        container.removeEventListener('mouseup', handleMouseUp);
      }
      console.log('🧹 Cleaned up event listeners');
    };
  }, [handleTextSelection, isEnabled]);

  // Handle click outside to close - Enhanced with selection clearing
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chatRef.current && !chatRef.current.contains(event.target as Node)) {
        console.log('🔴 Closing chat due to outside click - clearing selection');
        setIsChatOpen(false);
        setChatMessages([]);
        setInputMessage('');
        
        // Clear text selection and remove highlights
        removeSelectionHighlight();
        window.getSelection()?.removeAllRanges();
        setSelectionState(prev => ({ 
          ...prev, 
          isVisible: false, 
          selectedText: '',
          range: null,
          lastUpdateTime: Date.now()
        }));
      }
    };

    if (isChatOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isChatOpen]);

  const handleOpenChat = () => {
    console.log('🚀 Opening chat for text:', selectionState.selectedText);
    console.log('🎯 Current selection state:', selectionState);
    console.log('🎯 Current chat state:', { isChatOpen, chatMessages: chatMessages.length });
    
    // Force update chat state
    setIsChatOpen(true);
    console.log('✅ setIsChatOpen(true) called');
    
    setChatMessages([{
      role: 'assistant',
      content: `Tôi sẽ giúp bạn chỉnh sửa đoạn văn bản này: "${selectionState.selectedText}"\n\nHãy cho tôi biết bạn muốn thay đổi gì?`,
      timestamp: Date.now()
    }]);
    console.log('✅ Initial chat message set');
    
    // Force re-render by triggering a state update
    setTimeout(() => {
      console.log('🔄 Force re-render timeout triggered');
      setIsChatOpen(prev => {
        console.log('🔄 Force re-render: prev state:', prev, 'setting to true');
        return true;
      });
      
      // Check DOM elements
      const chatPanel = document.querySelector('.ktool-chat-panel');
      const chatPanelByClass = document.querySelector('[class*="chatPanel"]');
      console.log('🔍 DOM Check after timeout:', {
        chatPanel,
        chatPanelByClass,
        isChatOpen: true
      });
      
      if (chatPanel) {
        console.log('✅ Chat panel found in DOM:', chatPanel);
        const styles = window.getComputedStyle(chatPanel);
        console.log('🎨 Computed styles:', {
          display: styles.display,
          visibility: styles.visibility,
          opacity: styles.opacity,
          zIndex: styles.zIndex,
          position: styles.position
        });
      } else {
        console.log('❌ Chat panel NOT found in DOM');
      }
      
      addSelectionHighlight();
      console.log('✅ Highlighting applied after timeout');
    }, 100);
    
    console.log('✅ Chat should now be visible - checking state');
    console.log('🔍 isChatOpen will be:', true);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    const newMessages = [...chatMessages, { 
      role: 'user' as const, 
      content: userMessage,
      timestamp: Date.now()
    }];
    setChatMessages(newMessages);

    // Show enhanced loading feedback
    const loadingToast = document.createElement('div');
    loadingToast.textContent = '🤖 AI đang phân tích và xử lý văn bản...';
    loadingToast.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      padding: 12px 20px;
      border-radius: 25px;
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
      z-index: 1000000;
      font-size: 14px;
      animation: slideDown 0.3s ease-out;
    `;
    
    document.body.appendChild(loadingToast);

    try {      
      const response = await fetch(EDIT_TEXT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selected_text: selectionState.selectedText,
          user_request: userMessage,
          context: selectionState.selectedText,
          selectedModel: settings.selectedModel
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API request failed');
      }

      const data = await response.json();
      
      if (data.success && data.edited_text) {
        const aiMessage = { 
          role: 'assistant' as const, 
          content: data.edited_text,
          timestamp: Date.now()
        };
        
        const updatedMessages = [...newMessages, aiMessage];
        setChatMessages(updatedMessages);
        
        // Show success feedback
        loadingToast.textContent = '✅ AI đã hoàn thành chỉnh sửa!';
        loadingToast.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        setTimeout(() => loadingToast.remove(), 2000);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error calling AI API:', error);
      
      const errorMessage = { 
        role: 'assistant' as const, 
        content: `❌ Xin lỗi, đã xảy ra lỗi: ${error instanceof Error ? error.message : 'Unknown error'}. Vui lòng thử lại.`,
        timestamp: Date.now()
      };
      setChatMessages([...newMessages, errorMessage]);
      
      // Show error feedback
      loadingToast.textContent = '❌ Có lỗi xảy ra, vui lòng thử lại';
      loadingToast.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
      setTimeout(() => loadingToast.remove(), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyChanges = async (newText: string) => {
    console.log('🔄 Starting text replacement:', { 
      original: selectionState.selectedText, 
      new: newText,
      hasRange: !!selectionState.range 
    });

    // Clean the new text (remove extra HTML if present)
    const cleanNewText = newText.replace(/<[^>]*>/g, '').trim();
    
    try {
      // First, remove any highlights
      removeSelectionHighlight();

      // Apply changes using the range if available
      if (selectionState.range) {
        const range = selectionState.range.cloneRange();
        
        // Try to replace content directly in the range
        try {
          range.deleteContents();
          const textNode = document.createTextNode(cleanNewText);
          range.insertNode(textNode);
          
          // Clear selection after replacement
          window.getSelection()?.removeAllRanges();
          
          console.log('✅ Text replaced using range method');
        } catch (rangeError) {
          console.warn('Range replacement failed, trying fallback:', rangeError);
          // Fallback to callback method
          onTextUpdate(selectionState.selectedText, cleanNewText);
        }
      } else {
        // Fallback to callback method
        onTextUpdate(selectionState.selectedText, cleanNewText);
      }

      // Auto save after successful text update
      if (onAutoSave) {
        try {
          console.log('💾 Auto saving after AI edit...');
          
          // Get the updated content from the document
          const updatedContent = document.querySelector('.ktool-preview-content')?.innerHTML || 
                                document.querySelector('[data-ktool-content]')?.innerHTML ||
                                document.body.innerHTML;
          
          // Call onAutoSave with updated content
          onAutoSave(updatedContent);
          
          console.log('✅ Auto save completed after AI edit');
          
          // Show auto save notification
          const autoSaveNotification = document.createElement('div');
          autoSaveNotification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="font-size: 24px;">💾</div>
              <div>
                <div style="font-weight: 600; margin-bottom: 4px;">Tự động lưu sau khi AI chỉnh sửa!</div>
                <div style="font-size: 12px; opacity: 0.8;">Tài liệu đã được lưu với nội dung đã cập nhật.</div>
              </div>
            </div>
          `;
          autoSaveNotification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #17a2b8, #138496);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(23, 162, 184, 0.3);
            z-index: 10000;
            font-size: 14px;
            font-weight: 500;
            max-width: 400px;
            line-height: 1.4;
            animation: slideInRight 0.3s ease-out;
          `;
          document.body.appendChild(autoSaveNotification);
          setTimeout(() => {
            autoSaveNotification.style.animation = 'slideOutRight 0.3s ease-in forwards';
            setTimeout(() => autoSaveNotification.remove(), 3000);
          }, 3000);
          
        } catch (saveError) {
          console.error('❌ Auto save failed:', saveError);
          
          // Show error notification for auto save
          const errorNotification = document.createElement('div');
          errorNotification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="font-size: 24px;">⚠️</div>
              <div>
                <div style="font-weight: 600; margin-bottom: 4px;">Lỗi tự động lưu</div>
                <div style="font-size: 12px; opacity: 0.8;">Vui lòng lưu thủ công để bảo toàn thay đổi.</div>
              </div>
            </div>
          `;
          errorNotification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #ffc107, #e0a800);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(255, 193, 7, 0.3);
            z-index: 10000;
            font-size: 14px;
            font-weight: 500;
            max-width: 400px;
            line-height: 1.4;
            animation: slideInRight 0.3s ease-out;
          `;
          document.body.appendChild(errorNotification);
          setTimeout(() => {
            errorNotification.style.animation = 'slideOutRight 0.3s ease-in forwards';
            setTimeout(() => errorNotification.remove(), 4000);
          }, 4000);
        }
      }

      // Show enhanced success notification
      const notification = document.createElement('div');
      notification.textContent = `✅ Text updated successfully! "${selectionState.selectedText.substring(0, 30)}${selectionState.selectedText.length > 30 ? '...' : ''}" → "${cleanNewText.substring(0, 30)}${cleanNewText.length > 30 ? '...' : ''}"`;
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(16, 185, 129, 0.3);
        z-index: 10000;
        font-size: 14px;
        font-weight: 500;
        max-width: 400px;
        line-height: 1.4;
        animation: slideInRight 0.3s ease-out;
      `;
      
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-in forwards';
        setTimeout(() => notification.remove(), 300);
      }, 4000);

      // Close chat and reset selection
      setIsChatOpen(false);
      setChatMessages([]);
      setInputMessage('');
      setSelectionState(prev => ({ 
        ...prev, 
        isVisible: false, 
        selectedText: '',
        range: null,
        lastUpdateTime: Date.now()
      }));
      
    } catch (error) {
      console.error('❌ Error applying changes:', error);
      
      // Show error notification
      const errorNotification = document.createElement('div');
      errorNotification.textContent = `❌ Failed to update text: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errorNotification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #ef4444, #dc2626);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(239, 68, 68, 0.3);
        z-index: 10000;
        font-size: 14px;
        font-weight: 500;
        max-width: 400px;
        animation: slideInRight 0.3s ease-out;
      `;
      
      document.body.appendChild(errorNotification);
      setTimeout(() => errorNotification.remove(), 5000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Enhanced text highlighting với advanced animation effects
  const addSelectionHighlight = useCallback(() => {
    if (!selectionState.range) return;

    console.log('🌈 Adding enhanced selection highlight with advanced effects...');
    
    // Remove any existing highlights
    removeSelectionHighlight();

    try {
      const range = selectionState.range.cloneRange();
      const selection = window.getSelection();
      
      if (!selection || !range) return;

      // Add enhanced CSS animations if not already present
      if (!document.querySelector('style[data-ktool-enhanced-highlight]')) {
        const enhancedStyle = document.createElement('style');
        enhancedStyle.setAttribute('data-ktool-enhanced-highlight', 'true');
        enhancedStyle.textContent = `
          @keyframes rainbow-flow {
            0% { 
              background-position: 0% 50%;
              box-shadow: 0 0 15px rgba(255, 107, 53, 0.6);
            }
            25% { 
              background-position: 50% 50%;
              box-shadow: 0 0 20px rgba(247, 147, 30, 0.7);
            }
            50% { 
              background-position: 100% 50%;
              box-shadow: 0 0 25px rgba(255, 210, 63, 0.8);
            }
            75% { 
              background-position: 150% 50%;
              box-shadow: 0 0 20px rgba(6, 255, 165, 0.7);
            }
            100% { 
              background-position: 200% 50%;
              box-shadow: 0 0 15px rgba(78, 205, 196, 0.6);
            }
          }
          
          @keyframes text-glow {
            0%, 100% { 
              text-shadow: 0 1px 2px rgba(255,255,255,0.3), 0 0 10px rgba(102, 126, 234, 0.5);
            }
            50% { 
              text-shadow: 0 1px 2px rgba(255,255,255,0.5), 0 0 20px rgba(102, 126, 234, 0.8);
            }
          }
          
          @keyframes border-pulse {
            0%, 100% { 
              border-color: #FF6B35;
              border-width: 2px;
            }
            33% { 
              border-color: #FFD23F;
              border-width: 3px;
            }
            66% { 
              border-color: #06FFA5;
              border-width: 2px;
            }
          }
          
          .ktool-enhanced-highlight {
            background: linear-gradient(90deg, 
              #FF6B35 0%, #F7931E 20%, #FFD23F 40%, 
              #06FFA5 60%, #4ECDC4 80%, #667eea 100%) !important;
            background-size: 300% 100% !important;
            animation: rainbow-flow 3s ease-in-out infinite,
                       text-glow 2s ease-in-out infinite,
                       border-pulse 2s ease-in-out infinite !important;
            transition: all 0.3s ease !important;
          }
          
          .ktool-enhanced-highlight:hover {
            transform: scale(1.02) !important;
            background-size: 400% 100% !important;
            animation-duration: 1.5s, 1s, 1s !important;
          }
        `;
        document.head.appendChild(enhancedStyle);
      }

      // Create enhanced highlight spans for selected text
      const selectedContent = range.extractContents();
      const highlightSpan = document.createElement('span');
      highlightSpan.className = 'ktool-enhanced-highlight';
      highlightSpan.style.cssText = `
        color: #1a1a1a !important;
        font-weight: 700 !important;
        border: 2px solid #FF6B35 !important;
        border-radius: 8px !important;
        padding: 3px 6px !important;
        position: relative !important;
        display: inline !important;
        z-index: 1000 !important;
        cursor: pointer !important;
        user-select: none !important;
      `;
      
      highlightSpan.appendChild(selectedContent);
      range.insertNode(highlightSpan);
      
      // Store reference for cleanup
      highlightSpan.setAttribute('data-ktool-highlight', 'true');
      
      // Add click handler for enhanced interaction
      highlightSpan.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('✨ Enhanced highlight clicked - reopening chat');
        if (!isChatOpen) {
          setIsChatOpen(true);
        }
      });
      
      // Add tooltip for better UX
      highlightSpan.title = `🎯 Selected text: "${selectionState.selectedText.substring(0, 50)}${selectionState.selectedText.length > 50 ? '...' : ''}" - Click to edit`;
      
      console.log('✨ Enhanced selection highlighted with rainbow flow animation');
    } catch (error) {
      console.error('❌ Error adding enhanced highlight:', error);
    }
  }, [selectionState.range, selectionState.selectedText, isChatOpen]);

  const removeSelectionHighlight = useCallback(() => {
    try {
      const highlights = document.querySelectorAll('[data-ktool-highlight]');
      highlights.forEach(highlight => {
        const parent = highlight.parentNode;
        if (parent) {
          // Move children out of highlight span
          while (highlight.firstChild) {
            parent.insertBefore(highlight.firstChild, highlight);
          }
          // Remove the highlight span
          parent.removeChild(highlight);
        }
      });
      console.log('🧹 Selection highlights removed');
    } catch (error) {
      console.error('Error removing highlights:', error);
    }
  }, []);

  // Add highlighting when chat opens
  useEffect(() => {
    if (isChatOpen && selectionState.isVisible && selectionState.range) {
      addSelectionHighlight();
    } else {
      removeSelectionHighlight();
    }
  }, [isChatOpen, selectionState.isVisible, addSelectionHighlight, removeSelectionHighlight]);

  // Cleanup highlights on unmount
  useEffect(() => {
    return () => {
      removeSelectionHighlight();
    };
  }, [removeSelectionHighlight]);

  // Cleanup highlights when selection changes
  useEffect(() => {
    if (!selectionState.isVisible) {
      removeSelectionHighlight();
    }
  }, [selectionState.isVisible, removeSelectionHighlight]);

  // Debug effect to track chat state changes
  useEffect(() => {
    console.log('🔄 isChatOpen state changed:', isChatOpen);
    console.log('📊 Current render state:', {
      isChatOpen,
      selectionVisible: selectionState.isVisible,
      hasMessages: chatMessages.length,
      hasRange: !!selectionState.range
    });
  }, [isChatOpen, chatMessages.length, selectionState.isVisible]);

  // Force re-render when chat opens to ensure panel appears
  useEffect(() => {
    if (isChatOpen) {
      console.log('🔄 Chat opened - forcing DOM update...');
      
      // Force a DOM reflow to ensure panel renders
      setTimeout(() => {
        if (chatRef.current) {
          console.log('✅ Chat panel DOM element found:', chatRef.current);
          console.log('📊 Panel computed styles:', {
            display: window.getComputedStyle(chatRef.current).display,
            visibility: window.getComputedStyle(chatRef.current).visibility,
            zIndex: window.getComputedStyle(chatRef.current).zIndex,
            position: window.getComputedStyle(chatRef.current).position
          });
          
          // Force styles to ensure visibility
          chatRef.current.style.display = 'block';
          chatRef.current.style.visibility = 'visible';
          chatRef.current.style.zIndex = '999999';
          chatRef.current.style.position = 'fixed';
          
          console.log('🎨 Forced panel visibility styles applied');
        } else {
          console.error('❌ Chat panel DOM element not found after timeout!');
        }
      }, 50);
    }
  }, [isChatOpen]);

  // Enhanced keyboard shortcuts và accessibility features
  useEffect(() => {
    const handleKeyboardShortcuts = (e: KeyboardEvent) => {
      // Ctrl/Cmd + E: Quick edit selected text
      if ((e.ctrlKey || e.metaKey) && e.key === 'e' && selectionState.isVisible && !isChatOpen) {
        e.preventDefault();
        console.log('⌨️ Keyboard shortcut: Quick edit (Ctrl/Cmd + E)');
        handleOpenChat();
        return;
      }
      
      // Escape: Close chat panel and clear selection
      if (e.key === 'Escape' && isChatOpen) {
        e.preventDefault();
        console.log('⌨️ Keyboard shortcut: Close chat (Escape)');
        setIsChatOpen(false);
        setChatMessages([]);
        setInputMessage('');
        removeSelectionHighlight();
        
        // Clear text selection completely
        window.getSelection()?.removeAllRanges();
        setSelectionState(prev => ({ 
          ...prev, 
          isVisible: false, 
          selectedText: '',
          range: null,
          lastUpdateTime: Date.now()
        }));
        return;
      }
      
      // Ctrl/Cmd + Enter: Apply changes (when AI response is ready)
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && isChatOpen && chatMessages.length > 1) {
        e.preventDefault();
        const lastAiMessage = chatMessages.slice().reverse().find(msg => 
          msg.role === 'assistant' && msg.content !== chatMessages[0]?.content
        );
        if (lastAiMessage) {
          console.log('⌨️ Keyboard shortcut: Apply changes (Ctrl/Cmd + Enter)');
          handleApplyChanges(lastAiMessage.content);
        }
        return;
      }
      
      // Ctrl/Cmd + Shift + C: Copy selected text with formatting
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C' && selectionState.selectedText) {
        e.preventDefault();
        navigator.clipboard.writeText(selectionState.selectedText);
        console.log('⌨️ Keyboard shortcut: Copy selected text (Ctrl/Cmd + Shift + C)');
        
        // Show copy feedback
        const copyToast = document.createElement('div');
        copyToast.textContent = '📋 Text copied to clipboard!';
        copyToast.style.cssText = `
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(16, 185, 129, 0.3);
          z-index: 1000000;
          font-size: 14px;
          animation: slideInRight 0.3s ease-out;
        `;
        document.body.appendChild(copyToast);
        setTimeout(() => copyToast.remove(), 2000);
        return;
      }
    };

    if (isEnabled) {
      document.addEventListener('keydown', handleKeyboardShortcuts);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyboardShortcuts);
    };
  }, [isEnabled, selectionState, isChatOpen, chatMessages, handleOpenChat, handleApplyChanges, removeSelectionHighlight]);

  // Enhanced accessibility với ARIA labels và screen reader support
  const getAriaLabel = () => {
    if (selectionState.isVisible && !isChatOpen) {
      return `AI text editor available. Selected text: "${selectionState.selectedText.substring(0, 50)}${selectionState.selectedText.length > 50 ? '...' : ''}". Press Ctrl+E or click to open chat editor.`;
    }
    if (isChatOpen) {
      return `AI chat editor open. ${chatMessages.length} messages. Type your editing request or press Escape to close.`;
    }
    return 'AI text editor ready. Select text to begin editing.';
  };

  return (
    <div ref={containerRef} className={styles.container}>
      {children}
      
      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          top: '10px',
          left: '10px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '10px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 1000000,
          fontFamily: 'monospace'
        }}>
          <div>isChatOpen: {isChatOpen ? 'TRUE' : 'FALSE'}</div>
          <div>selectionVisible: {selectionState.isVisible ? 'TRUE' : 'FALSE'}</div>
          <div>selectedText: "{selectionState.selectedText.substring(0, 20)}..."</div>
          <div>chatMessages: {chatMessages.length}</div>
          <div>renderCount: {renderCountRef.current}</div>
          <button 
            onClick={() => {
              console.log('🧪 Force opening chat...');
              setSelectionState(prev => ({
                ...prev,
                isVisible: true,
                selectedText: 'Debug test text for troubleshooting',
                position: { x: 100, y: 100 }
              }));
              setIsChatOpen(true);
              setChatMessages([{
                role: 'assistant',
                content: 'Debug test message - if you see this, React rendering is working!',
                timestamp: Date.now()
              }]);
            }}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px',
              marginTop: '5px',
              display: 'block',
              width: '100%'
            }}
          >
            🧪 Force Open Chat
          </button>
          <button 
            onClick={() => {
              console.log('🧪 Testing DOM queries...');
              const panels = {
                byClass: document.querySelector('.ktool-chat-panel'),
                byModuleClass: document.querySelector('[class*="chatPanel"]'),
                byRef: chatRef.current,
                allFixed: document.querySelectorAll('[style*="position: fixed"]')
              };
              console.log('🔍 DOM Query Results:', panels);
              window.KToolNotification?.show(JSON.stringify({
                ktoolClass: !!panels.byClass,
                moduleClass: !!panels.byModuleClass,
                ref: !!panels.byRef,
                fixedElements: panels.allFixed.length
              }, null, 2), 'info');
            }}
            style={{
              background: '#0066cc',
              color: 'white',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '10px',
              marginTop: '2px',
              display: 'block',
              width: '100%'
            }}
          >
            🔍 Check DOM
          </button>
        </div>
      )}
      
      {/* Always show debug panel in production for testing */}
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '10px',
        borderRadius: '4px',
        fontSize: '12px',
        zIndex: 1000000,
        fontFamily: 'monospace',
        maxWidth: '200px'
      }}>
        <div style={{ color: '#00ff00' }}>🤖 TextSelection Debug</div>
        <div>Chat: {isChatOpen ? '✅ OPEN' : '❌ CLOSED'}</div>
        <div>Selection: {selectionState.isVisible ? '✅' : '❌'}</div>
        <div>Messages: {chatMessages.length}</div>
        <button 
          onClick={() => {
            console.log('🧪 PRODUCTION Force opening chat...');
            const debugText = 'Production debug test text';
            setSelectionState({
              isVisible: true,
              selectedText: debugText,
              position: { x: 150, y: 150 },
              range: null,
              lastUpdateTime: Date.now()
            });
            setIsChatOpen(true);
            setChatMessages([{
              role: 'assistant',
              content: `Production debug message for text: "${debugText}"`,
              timestamp: Date.now()
            }]);
            
            // Check DOM after timeout
            setTimeout(() => {
              const panel = document.querySelector('.ktool-chat-panel');
              const fallback = document.querySelector('[style*="position: fixed"][style*="top: 50%"]');
              console.log('🔍 Production DOM Check:', {
                mainPanel: !!panel,
                fallbackPanel: !!fallback,
                ref: !!chatRef.current
              });
            }, 100);
          }}
          style={{
            background: '#ff4444',
            color: 'white',
            border: 'none',
            padding: '4px 8px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '10px',
            marginTop: '5px',
            width: '100%'
          }}
        >
          🚀 Force Open
        </button>
      </div>
      
      {/* Enhanced Selection Icon với accessibility */}
      {selectionState.isVisible && !isChatOpen && (
        <div 
          className={styles.selectionIcon}
          style={{
            left: selectionState.position.x,
            top: selectionState.position.y,
          }}
          onClick={(e) => {
            console.log('🖱️ Chat icon clicked!', e);
            e.preventDefault();
            e.stopPropagation();
            handleOpenChat();
          }}
          role="button"
          tabIndex={0}
          aria-label={getAriaLabel()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleOpenChat();
            }
          }}
        >
          <div className={styles.iconButton}>
            💬
          </div>
          <div className={styles.tooltip}>
            💬 Chat với AI để chỉnh sửa văn bản
            <br />
            ✨ Text sẽ được highlight khi mở chat
            <br />
            ⌨️ Nhấn Ctrl+E hoặc click để mở
          </div>
        </div>
      )}

      {/* Enhanced AI Chat Panel với full accessibility support */}
      {isChatOpen ? (
        <div 
          ref={chatRef}
          className={`${styles.chatPanel} ktool-chat-panel`}
          style={{
            left: Math.max(10, Math.min(selectionState.position.x, window.innerWidth - 420)),
            top: Math.max(10, Math.min(selectionState.position.y + 50, window.innerHeight - 450)),
            position: 'fixed',
            zIndex: 999999,
            display: 'block',
            visibility: 'visible'
          }}
          role="dialog"
          aria-labelledby="chat-header"
          aria-describedby="selected-text-info"
          aria-modal="true"
        >
          <div className={styles.chatHeader}>
            <h4>🤖 AI Text Editor</h4>
            <button 
              className={styles.closeButton}
              onClick={() => {
                console.log('🔴 Closing chat panel via close button');
                removeSelectionHighlight(); // Remove highlights before closing
                setIsChatOpen(false);
                setChatMessages([]);
                setInputMessage('');
                
                // Clear text selection completely
                window.getSelection()?.removeAllRanges();
                setSelectionState(prev => ({ 
                  ...prev, 
                  isVisible: false, 
                  selectedText: '',
                  range: null,
                  lastUpdateTime: Date.now()
                }));
              }}
            >
              ✕
            </button>
          </div>

          <div className={styles.selectedTextInfo}>
            <strong>🎯 Đang chỉnh sửa:</strong> 
            <span className={styles.selectedText}>
              {selectionState.selectedText.length > 50 
                ? selectionState.selectedText.substring(0, 50) + '...' 
                : selectionState.selectedText}
            </span>
            <div className={styles.highlightStatus}>
              ✨ Text đã được highlight với màu rainbow gradient
            </div>
          </div>

          <div className={styles.chatMessages}>
            {chatMessages.map((message, index) => (
              <div 
                key={index} 
                className={`${styles.message} ${message.role === 'user' ? styles.userMessage : styles.aiMessage}`}
              >
                <div className={styles.messageContent}>
                  {message.content}
                </div>
                {message.role === 'assistant' && index === chatMessages.length - 1 && !isLoading && message.content !== chatMessages[0]?.content && (
                  <button 
                    className={styles.applyButton}
                    onClick={() => handleApplyChanges(message.content)}
                  >
                    ✅ Áp dụng thay đổi
                  </button>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className={`${styles.message} ${styles.aiMessage}`}>
                <div className={styles.loading}>
                  <span>🤖 Đang xử lý</span>
                  <div className={styles.loadingDots}>
                    <span>.</span>
                    <span>.</span>
                    <span>.</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className={styles.chatInput}>
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Nhập yêu cầu chỉnh sửa văn bản..."
              className={styles.inputField}
              rows={2}
              disabled={isLoading}
            />
            <button 
              onClick={handleSendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className={styles.sendButton}
            >
              📤
            </button>
          </div>
        </div>
      ) : null}
      
      {/* Fallback panel - always show when isChatOpen is true */}
      {isChatOpen && !chatRef.current && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '400px',
          background: 'white',
          border: '2px solid red',
          borderRadius: '8px',
          padding: '20px',
          zIndex: 1000000,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}>
          <h3>🚨 Chat Panel Debug</h3>
          <p>isChatOpen is TRUE but main panel not rendering!</p>
          <button onClick={() => setIsChatOpen(false)}>Close Debug Panel</button>
        </div>
      )}
    </div>
  );
};

export default TextSelectionHandler;
