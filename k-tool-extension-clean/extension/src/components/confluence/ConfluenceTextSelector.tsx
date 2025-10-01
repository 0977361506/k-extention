import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './ConfluenceTextSelector.module.scss';
import { EDIT_TEXT_URL } from '../../enums/AppConstants';
import { Settings } from '../../popup/PopupSettings';
import { extensionSettings } from '../../enums/AppConstants';
import { IconButton } from '@mui/material';
import Draggable from 'react-draggable';

interface ConfluenceTextSelectorProps {
  children: React.ReactNode;
  onTextUpdate: (originalText: string, newText: string) => void;
  isEnabled?: boolean;
  confluenceFormat?: boolean;
  contentConfluence?: string; // Optional prop for content
  onUndo?: () => void; // Thêm prop Undo
  onAutoSave?: (updatedContent: string) => void; // Thêm prop để auto save
}

interface SelectionState {
  isVisible: boolean;
  selectedText: string;
  position: { x: number; y: number };
  range: Range | null;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const ConfluenceTextSelector: React.FC<ConfluenceTextSelectorProps> = ({
  children,
  onTextUpdate,
  isEnabled = true,
  confluenceFormat = true,
  contentConfluence = '',
  onUndo,
  onAutoSave
}) => {
  const [selectionState, setSelectionState] = useState<SelectionState>({
    isVisible: false,
    selectedText: '',
    position: { x: 0, y: 0 },
    range: null
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
  const chatMessagesRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const originalSelectionHtmlRef = useRef<string | null>(null);
  const [isMultiLine, setIsMultiLine] = useState(false);
  const highlightSpansRef = useRef<HTMLElement[]>([]);
  const lastReplacedFragmentRef = useRef<DocumentFragment | null>(null);
  const lastReplacedRangeRef = useRef<Range | null>(null);

  // Load settings
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

  // Enhanced text selection handler with extensive debugging
  const handleTextSelection = useCallback(() => {
    removeHighlight();
    if (!isEnabled || isChatOpen) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      setSelectionState(prev => ({ ...prev, isVisible: false }));
      setIsMultiLine(false);
      return;
    }
    const selectedText = selection.toString().trim();
    if (selectedText.length < 3) {
      setSelectionState(prev => ({ ...prev, isVisible: false }));
      setIsMultiLine(false);
      return;
    }
    const range = selection.getRangeAt(0);
    // Kiểm tra multi-line: startContainer và endContainer khác nhau hoặc có chứa block element
    let multiLine = false;
    if (range.startContainer !== range.endContainer) {
      multiLine = true;
    } else {
      // Nếu cùng node, kiểm tra có xuống dòng không
      const html = range.cloneContents().textContent || '';
      if (html.includes('\n')) multiLine = true;
    }
    setIsMultiLine(multiLine);
    // Check if selection is within our container (optional check)
    const container = containerRef.current;
    
    let isInContainer = true;
    if (container) {
      const commonAncestor = range.commonAncestorContainer;
      isInContainer = container.contains(commonAncestor) ||
                     container.contains(range.startContainer) ||
                     container.contains(range.endContainer) ||
                     commonAncestor === container;
      
      console.log('🔍 ConfluenceTextSelector: Container check:', {
        hasContainer: !!container,
        isInContainer,
        commonAncestor: commonAncestor.nodeName,
        startContainer: range.startContainer.nodeName,
        endContainer: range.endContainer.nodeName
      });
    }

    // Allow selections even outside our container for broader compatibility
    // if (!isInContainer) {
    //   console.log('🔍 ConfluenceTextSelector: Selection outside container');
    //   setSelectionState(prev => ({ ...prev, isVisible: false }));
    //   return;
    // }

    console.log('🔍 ConfluenceTextSelector: Range:', range);
    
    if (!range) {
      console.log('🔍 ConfluenceTextSelector: No range available');
      return;
    }

    // Smart position calculation for Confluence UI
    const rect = range.getBoundingClientRect();
    console.log('🔍 ConfluenceTextSelector: Range rect:', {
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
      width: rect.width,
      height: rect.height
    });
    
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY
    };

    console.log('🔍 ConfluenceTextSelector: Viewport:', viewport);

    // Calculate optimal position with more spacing
    let x = rect.right + viewport.scrollX + 15;
    let y = rect.top + viewport.scrollY;

    // Smart edge detection for Confluence layout
    const iconWidth = 50;
    const iconHeight = 50;
    
    if (x + iconWidth > viewport.width - 20) {
      x = rect.left + viewport.scrollX - iconWidth - 15;
      console.log('🔍 ConfluenceTextSelector: Adjusted X for right edge');
    }
    if (y + iconHeight > viewport.height - 20) {
      y = rect.bottom + viewport.scrollY - iconHeight - 15;
      console.log('🔍 ConfluenceTextSelector: Adjusted Y for bottom edge');
    }
    
    // Ensure minimum margins
    x = Math.max(15, Math.min(x, viewport.width - iconWidth - 15));
    y = Math.max(15, Math.min(y, viewport.height - iconHeight - 15));

    console.log('🔍 ConfluenceTextSelector: Final position:', { x, y });

    setSelectionState({
      isVisible: true,
      selectedText,
      position: { x, y },
      range: range.cloneRange()
    });
    
    console.log('🔍 ConfluenceTextSelector: ✅ Selection state updated successfully');
  }, [isEnabled, isChatOpen]);

  // Event listeners with improved debugging and selection preservation
  useEffect(() => {
    if (!isEnabled) {
      console.log('🔍 ConfluenceTextSelector: Disabled, not adding event listeners');
      return;
    }

    console.log('🔍 ConfluenceTextSelector: Adding event listeners');

    const handleMouseUp = (e: MouseEvent) => {
      console.log('🔍 ConfluenceTextSelector: Mouse up event', e.target);
      
      // Skip if clicking on our selection icon or chat panel
      const target = e.target as HTMLElement;
      if (target.closest('.confluenceTextSelector-selectionIcon') || 
          target.closest('.confluenceTextSelector-chatPanel')) {
        console.log('🔍 ConfluenceTextSelector: Ignoring click on own elements');
        return;
      }
      
      setTimeout(handleTextSelection, 50);
    };
    
    const handleSelectionChange = () => {
      console.log('🔍 ConfluenceTextSelector: Selection change event');
      
      // Skip if chat is open to preserve selection
      if (isChatOpen) {
        console.log('🔍 ConfluenceTextSelector: Chat is open, preserving selection');
        return;
      }
      
      setTimeout(handleTextSelection, 25);
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      console.log('🔍 ConfluenceTextSelector: Removing event listeners');
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [handleTextSelection, isEnabled, isChatOpen]);

  // Close chat when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chatRef.current && !chatRef.current.contains(event.target as Node)) {
        setIsChatOpen(false);
        setChatMessages([]);
        setInputMessage('');
      }
    };

    if (isChatOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isChatOpen]);

  // Auto scroll chat to bottom when open or new message
  useEffect(() => {
    if (isChatOpen && chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [isChatOpen, chatMessages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isChatOpen && chatInputRef.current) {
      chatInputRef.current.focus();
    }
  }, [isChatOpen]);

  // Khi chat panel mở, mới highlight vùng chọn
  useEffect(() => {
    if (isChatOpen && selectionState.range) {
      addConfluenceHighlight();
    } else {
      removeHighlight();
    }
  }, [isChatOpen, selectionState.range]);

  const handleOpenChat = (event?: React.MouseEvent) => {
    removeHighlight();
    window.getSelection()?.removeAllRanges();
    setIsChatOpen(true);
    setInputMessage('');
    setChatMessages([]);
    console.log('🔍 ConfluenceTextSelector: handleOpenChat called');
    console.log('🔍 ConfluenceTextSelector: Selected text:', `"${selectionState.selectedText}"`);
    
    // CRITICAL FIX: Prevent default behavior that clears text selection
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // Store current selection state before it gets cleared
    const currentSelection = window.getSelection();
    const preservedRange = selectionState.range;
    const preservedText = selectionState.selectedText;
    
    console.log('🔍 ConfluenceTextSelector: Preserving selection:', {
      hasRange: !!preservedRange,
      text: preservedText,
      currentSelectionText: currentSelection?.toString()
    });
    
    // Enhanced initial message for Confluence format
    const confluencePrompts = [
      "rút gọn và làm rõ nghĩa",
      "format thành heading (h1, h2, h3)",
      "chuyển thành bullet list",
      "chuyển thành numbered list", 
      "format thành table",
      "thêm emphasis (bold/italic)",
      "tạo code block",
      "thêm link hoặc reference"
    ];
    
    const examplePrompts = confluencePrompts.map(p => `• ${p}`).join('\n');
    
    const initialMessage = confluenceFormat 
      ? `🤖 **Confluence AI Editor**\n\nTôi sẽ giúp bạn chỉnh sửa đoạn văn bản này theo Confluence Storage Format:\n\n📝 **Selected text:**\n"${preservedText}"\n\n✨ **Gợi ý chỉnh sửa:**\n${examplePrompts}\n\n💬 Hãy mô tả cách bạn muốn chỉnh sửa:`
      : `🤖 **AI Text Editor**\n\nSelected: "${preservedText}"\n\nHãy cho tôi biết bạn muốn thay đổi gì?`;
    
    setChatMessages([{
      role: 'assistant',
      content: initialMessage
    }]);

    console.log('🔍 ConfluenceTextSelector: Chat opened with initial message');

    // Restore text selection after opening chat to maintain highlight
    if (preservedRange && currentSelection) {
      try {
        currentSelection.removeAllRanges();
        currentSelection.addRange(preservedRange.cloneRange());
        console.log('🔍 ConfluenceTextSelector: ✅ Text selection restored');
      } catch (error) {
        console.log('🔍 ConfluenceTextSelector: ⚠️ Could not restore selection:', error);
      }
    }

    // Add Confluence-optimized highlight
    addConfluenceHighlight();
    
    // Hide the selection icon when chat opens
    setSelectionState(prev => ({ ...prev, isVisible: false }));
  };

  function getTextNodesInRange(range: Range): Text[] {
    const textNodes: Text[] = [];
    let node = range.startContainer;
    let endNode = range.endContainer;
    // Nếu là element node, chuyển sang text node đầu tiên
    if (node.nodeType === Node.ELEMENT_NODE) {
      node = node.childNodes[range.startOffset] || node;
    }
    if (endNode.nodeType === Node.ELEMENT_NODE) {
      endNode = endNode.childNodes[range.endOffset] || endNode;
    }
    let foundStart = false;
    // Duyệt toàn bộ tree từ ancestor
    const walker = document.createTreeWalker(
      range.commonAncestorContainer,
      NodeFilter.SHOW_TEXT,
      null
    );
    let currentNode = walker.currentNode;
    while (currentNode) {
      if (currentNode === node) foundStart = true;
      if (foundStart) textNodes.push(currentNode as Text);
      if (currentNode === endNode) break;
      currentNode = walker.nextNode();
    }
    return textNodes;
  }

  const addConfluenceHighlight = () => {
    if (!selectionState.range) return;
    try {
      // Remove old highlight if any
      removeHighlight();
      highlightSpansRef.current = [];
      const range = selectionState.range.cloneRange();
      const textNodes = getTextNodesInRange(range);
      textNodes.forEach((textNode, idx) => {
        // Xác định phần text nằm trong selection
        let start = 0, end = textNode.length;
        if (textNode === range.startContainer) start = range.startOffset;
        if (textNode === range.endContainer) end = range.endOffset;
        if (start >= end) return;
        // Tách text node thành 3 phần: trước, highlight, sau
        const parent = textNode.parentNode;
        if (!parent) return;
        const before = textNode.textContent?.slice(0, start) || '';
        const selected = textNode.textContent?.slice(start, end) || '';
        const after = textNode.textContent?.slice(end) || '';
        const frag = document.createDocumentFragment();
        if (before) frag.appendChild(document.createTextNode(before));
        if (selected) {
          const span = document.createElement('span');
          span.className = 'confluence-highlight';
          span.style.cssText = 'background: #fff7b2 !important; border-radius: 3px; transition: background 0.2s;';
          span.textContent = selected;
          frag.appendChild(span);
          highlightSpansRef.current.push(span);
        }
        if (after) frag.appendChild(document.createTextNode(after));
        parent.replaceChild(frag, textNode);
      });
    } catch (error) {
      console.error('Error adding Confluence highlight:', error);
    }
  };

  const removeHighlight = () => {
    try {
      highlightSpansRef.current.forEach(span => {
        const parent = span.parentNode;
        if (!parent) return;
        parent.replaceChild(document.createTextNode(span.textContent || ''), span);
      });
      highlightSpansRef.current = [];
    } catch (error) {
      console.error('Error removing highlights:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    const newMessages = [...chatMessages, { 
      role: 'user' as const, 
      content: userMessage
    }];
    setChatMessages(newMessages);

    try {
      // Enhanced request payload for Confluence format
      const confluenceContext = confluenceFormat 
        ? `This text is part of a Confluence document and should maintain proper Confluence Storage Format structure. 
           Focus on improving clarity, formatting, and readability while preserving XML tags and structure.
           Common Confluence elements: <h1>, <h2>, <h3>, <p>, <strong>, <em>, <ul>, <ol>, <li>, <table>, <tr>, <td>, <th>, <br/>.
           Ensure the output is valid Confluence Storage Format XML.`
        : '';

      const requestBody = {
        selected_text: selectionState.selectedText,
        user_request: userMessage,
        context: contentConfluence,
        selectedModel: settings.selectedModel,
        confluence_format: confluenceFormat
      };

      const response = await fetch(EDIT_TEXT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success && data.edited_text) {
        const aiMessage = { 
          role: 'assistant' as const, 
          content: data.edited_text
        };
        
        setChatMessages([...newMessages, aiMessage]);
      } else {
        throw new Error('Invalid response format or missing edited_text');
      }
    } catch (error) {
      console.error('❌ Error calling Confluence AI API:', error);
      
      const errorMessage = { 
        role: 'assistant' as const, 
        content: `❌ **Lỗi xử lý Confluence format:**\n${error instanceof Error ? error.message : 'Unknown error'}\n\n🔄 Vui lòng thử lại hoặc điều chỉnh yêu cầu.`
      };
      setChatMessages([...newMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyChanges = async (newText: string) => {
    try {
      removeHighlight();
      let cleanNewText = newText.trim();
      if (confluenceFormat) {
        const allowedTags = [
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'strong', 'em', 'u', 'strike',
          'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'thead', 'tbody',
          'br', 'hr', 'a', 'img', 'code', 'pre', 'blockquote', 'div', 'span'
        ].join('|');
        const tagRegex = new RegExp(`<(?!/?(?:${allowedTags})\\b)[^>]*>`, 'gi');
        cleanNewText = cleanNewText.replace(tagRegex, '');
        cleanNewText = cleanNewText
          .replace(/<(\w+)([^>]*)>/g, (match, tag, attrs) => {
            const cleanAttrs = attrs.replace(/\s*(style|class|id|onclick|onload)="[^"]*"/gi, '');
            return `<${tag}${cleanAttrs}>`;
          });
      } else {
        cleanNewText = cleanNewText.replace(/<[^>]*>/g, '');
      }
      
      // Nếu multi-line: replace toàn bộ vùng chọn bằng block mới
      if (isMultiLine && selectionState.range) {
        const range = selectionState.range.cloneRange();
        // Lưu lại fragment và range gốc cho undo
        lastReplacedFragmentRef.current = range.cloneContents();
        lastReplacedRangeRef.current = range.cloneRange();
        range.deleteContents();
        // Tạo fragment từ HTML AI trả về
        const fragment = document.createRange().createContextualFragment(cleanNewText);
        range.insertNode(fragment);
        
        // Auto save after successful multi-line replacement
        if (onAutoSave) {
          try {
            console.log('💾 Auto saving after multi-line AI edit...');
            
            // Get the updated content from the document
            const updatedContent = document.querySelector('.ktool-preview-content')?.innerHTML || 
                                  document.querySelector('[data-ktool-content]')?.innerHTML ||
                                  document.body.innerHTML;
            
            // Call onAutoSave with updated content
            onAutoSave(updatedContent);
            
            console.log('✅ Auto save completed after multi-line AI edit');
            
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
              top: 80px;
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
              setTimeout(() => autoSaveNotification.remove(), 300);
            }, 3000);
            
          } catch (saveError) {
            console.error('❌ Auto save failed:', saveError);
          }
        }
        
        // Floating Undo/Cancel panel (z-index cực cao)
        const oldPanel = document.getElementById('confluence-undo-panel');
        if (oldPanel) oldPanel.remove();
        const undoPanel = document.createElement('div');
        undoPanel.id = 'confluence-undo-panel';
        undoPanel.style.cssText = `
          position: fixed;
          top: 50%;
          right: 32px;
          transform: translateY(-50%);
          z-index: 2147483647;
          background: #fffbe6;
          border: 1px solid #fbbf24;
          border-radius: 8px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.08);
          padding: 12px 20px;
          display: flex;
          gap: 12px;
          align-items: center;
        `;
        const undoBtn = document.createElement('button');
        undoBtn.textContent = '↩️ Undo';
        undoBtn.style.cssText = 'padding: 4px 16px; border-radius: 4px; border: 1px solid #ccc; background: #fff; color: #222; cursor: pointer; font-size: 15px; font-weight: 500;';
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '✖ Cancel';
        cancelBtn.style.cssText = 'padding: 4px 16px; border-radius: 4px; border: 1px solid #ccc; background: #f3f4f6; color: #666; cursor: pointer; font-size: 15px; font-weight: 500;';
        undoPanel.appendChild(undoBtn);
        undoPanel.appendChild(cancelBtn);
        document.body.appendChild(undoPanel);
        // Undo handler: gọi prop onUndo nếu có
        undoBtn.onclick = () => {
          if (typeof onUndo === 'function') {
            onUndo();
          }
          if (undoPanel.parentNode) undoPanel.parentNode.removeChild(undoPanel);
          lastReplacedFragmentRef.current = null;
          lastReplacedRangeRef.current = null;
        };
        // Cancel handler
        cancelBtn.onclick = () => {
          if (undoPanel.parentNode) undoPanel.parentNode.removeChild(undoPanel);
          lastReplacedFragmentRef.current = null;
          lastReplacedRangeRef.current = null;
        };
        // Success notification như cũ
        const notification = document.createElement('div');
        notification.innerHTML = `<div style=\"display: flex; align-items: center; gap: 12px;\"><div style=\"font-size: 24px;\">✅</div><div><div style=\"font-weight: 600; margin-bottom: 4px;\">Đã thay thế toàn bộ vùng chọn bằng kết quả AI!</div><div style=\"font-size: 12px; opacity: 0.8;\">Bạn có thể Undo nếu chưa ưng ý.</div></div></div>`;
        notification.style.cssText = `position: fixed; top: 20px; right: 20px; background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 16px 24px; border-radius: 12px; box-shadow: 0 8px 32px rgba(16, 185, 129, 0.3); z-index: 10000; font-size: 14px; font-weight: 500; max-width: 400px; line-height: 1.4; animation: slideInRight 0.3s ease-out;`;
        document.body.appendChild(notification);
        setTimeout(() => {
          notification.style.animation = 'slideOutRight 0.3s ease-in forwards';
          setTimeout(() => notification.remove(), 300);
        }, 4000);
        setIsChatOpen(false);
        setChatMessages([]);
        setInputMessage('');
        setSelectionState(prev => ({ ...prev, isVisible: false, selectedText: '', range: null }));
        return;
      }
      
      // Single-line: thay thế như cũ
      onTextUpdate(selectionState.selectedText, cleanNewText);
      
      // Auto save after successful single-line replacement
      if (onAutoSave) {
        try {
          console.log('💾 Auto saving after single-line AI edit...');
          
          // Get the updated content from the document
          const updatedContent = document.querySelector('.ktool-preview-content')?.innerHTML || 
                                document.querySelector('[data-ktool-content]')?.innerHTML ||
                                document.body.innerHTML;
          
          // Call onAutoSave with updated content
          onAutoSave(updatedContent);
          
          console.log('✅ Auto save completed after single-line AI edit');
          
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
            top: 80px;
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
            setTimeout(() => autoSaveNotification.remove(), 300);
          }, 3000);
          
        } catch (saveError) {
          console.error('❌ Auto save failed:', saveError);
        }
      }
      
      // ... notification như cũ ...
      const notification = document.createElement('div');
      notification.innerHTML = `
        <div style=\"display: flex; align-items: center; gap: 12px;\">
          <div style=\"font-size: 24px;\">✅</div>
          <div>
            <div style=\"font-weight: 600; margin-bottom: 4px;\">
              ${confluenceFormat ? 'Confluence format updated!' : 'Text updated successfully!'}
            </div>
            <div style=\"font-size: 12px; opacity: 0.8;\">
              \"${selectionState.selectedText.substring(0, 30)}${selectionState.selectedText.length > 30 ? '...' : ''}\" 
              → \"${cleanNewText.substring(0, 30)}${cleanNewText.length > 30 ? '...' : ''}\"
            </div>
          </div>
        </div>
      `;
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #00875A, #006644);
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0, 135, 90, 0.3);
        z-index: 10000;
        font-size: 14px;
        max-width: 400px;
        animation: slideInRight 0.3s ease-out;
      `;
      document.body.appendChild(notification);
      setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-in forwards';
        setTimeout(() => notification.remove(), 300);
      }, 4000);
      setIsChatOpen(false);
      setChatMessages([]);
      setInputMessage('');
      setSelectionState(prev => ({ ...prev, isVisible: false, selectedText: '', range: null }));
    } catch (error) {
      console.error('❌ Error applying Confluence changes:', error);
      // ... error notification như cũ ...
    }
  };

  const handleDeleteText = () => {
    console.log('🗑️ ConfluenceTextSelector: handleDeleteText called');
    
    try {
      // Remove highlight first
      removeHighlight();

      // Delete the selected text using the stored range
      if (selectionState.range) {
        const range = selectionState.range.cloneRange();
        
        try {
          range.deleteContents();
          console.log('✅ Text deleted using range method');
        } catch (rangeError) {
          console.warn('Range deletion failed, trying callback method:', rangeError);
          // Fallback to callback method
          onTextUpdate(selectionState.selectedText, '');
        }
      } else {
        // Fallback to callback method
        onTextUpdate(selectionState.selectedText, '');
      }

      // Clear selection after deletion
      window.getSelection()?.removeAllRanges();
      
      // Show success notification
      const notification = document.createElement('div');
      notification.textContent = `🗑️ Text deleted successfully! "${selectionState.selectedText.substring(0, 30)}${selectionState.selectedText.length > 30 ? '...' : ''}"`;
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #FF5630, #DE350B);
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(255, 86, 48, 0.3);
        z-index: 10000;
        font-size: 14px;
        font-weight: 500;
        max-width: 400px;
        animation: slideInRight 0.3s ease-out;
      `;
      
      document.body.appendChild(notification);
      setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-in forwards';
        setTimeout(() => notification.remove(), 300);
      }, 4000);

      // Reset state
      setIsChatOpen(false);
      setChatMessages([]);
      setInputMessage('');
      setSelectionState(prev => ({ 
        ...prev, 
        isVisible: false, 
        selectedText: '',
        range: null
      }));
      
    } catch (error) {
      console.error('❌ Error deleting text:', error);
      
      // Error notification
      const errorNotification = document.createElement('div');
      errorNotification.textContent = `❌ Error deleting text: ${error instanceof Error ? error.message : 'Unknown error'}`;
      errorNotification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #DE350B, #BF2600);
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(222, 53, 11, 0.3);
        z-index: 10000;
        font-size: 14px;
        max-width: 400px;
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

  const handleCloseChat = () => {
    removeHighlight();
    window.getSelection()?.removeAllRanges();
    setIsChatOpen(false);
    setChatMessages([]);
    setInputMessage('');
    setSelectionState(prev => ({ ...prev, isVisible: false, selectedText: '', range: null }));
  };

  return (
    <div ref={containerRef} className={styles.container}>
      {children}
      
      {/* Confluence-Optimized Selection Icon */}
      {selectionState.isVisible && !isChatOpen && (
        <div 
          className={`${styles.selectionIcon} confluenceTextSelector-selectionIcon`}
          style={{
            left: selectionState.position.x,
            top: selectionState.position.y,
          }}
          onMouseDown={e => e.preventDefault()}
          onMouseEnter={() => {
            const sel = window.getSelection();
            if (sel && (!sel.rangeCount || sel.isCollapsed) && selectionState.range) {
              sel.removeAllRanges();
              sel.addRange(selectionState.range);
            }
          }}
          onClick={handleOpenChat}
          title={confluenceFormat ? 'Edit with Confluence AI' : 'Edit with AI'}
        >
          <div className={styles.iconButton}>
            {confluenceFormat ? '🔧' : '💬'}
          </div>
          <div className={styles.tooltip}>
            {confluenceFormat ? 'Confluence AI Editor' : 'AI Text Editor'}
          </div>
        </div>
      )}

      {/* Enhanced Chat Panel for Confluence */}
      {isChatOpen && (
        <Draggable handle={`.${styles.chatHeader}`} cancel={`.${styles.closeButton}`}> 
          <div 
            ref={chatRef}
            className={`${styles.chatPanel} confluenceTextSelector-chatPanel`}
            style={{
              left: '40%',
              top: '20%',
              resize: 'both',
              overflow: 'auto',
              minWidth: 380,
              minHeight: 320,
              maxWidth: 900,
              maxHeight: 700
            }}
          >
            <div className={styles.chatHeader}>
              <div className={styles.headerContent}>
                <span className={styles.headerIcon}>
                  {confluenceFormat ? '🔧' : '🤖'}
                </span>
                <div>
                  <h4>{confluenceFormat ? 'Confluence AI Editor' : 'AI Text Editor'}</h4>
                  <p className={styles.headerSubtitle}>
                    {confluenceFormat ? 'Storage Format Optimizer' : 'Smart Text Assistant'}
                  </p>
                </div>
              </div>
              <button 
                className={styles.closeButton}
                onClick={handleCloseChat}
                title="Close chat"
              >
                ✕
              </button>
            </div>

            {/* Preview song song nếu có kết quả AI */}
            {chatMessages.length > 1 && chatMessages[chatMessages.length-1].role === 'assistant' && (
              <div style={{ display: 'flex', gap: 16, margin: '12px 0' }}>
                <div style={{ flex: 1, border: '1px solid #eee', borderRadius: 6, padding: 8, background: '#fafbfc' }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Trước khi sửa</div>
                  <div dangerouslySetInnerHTML={{ __html: selectionState.selectedText }} style={{ whiteSpace: 'pre-wrap', minHeight: 40 }} />
                </div>
                <div style={{ flex: 1, border: '1px solid #eee', borderRadius: 6, padding: 8, background: '#f6fff6' }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>Sau khi AI sửa</div>
                  <div dangerouslySetInnerHTML={{ __html: chatMessages[chatMessages.length-1].content }} style={{ whiteSpace: 'pre-wrap', minHeight: 40 }} />
                </div>
              </div>
            )}

            <div className={styles.selectedTextInfo}>
              <div className={styles.infoHeader}>
                <div className={styles.selectedTextLabel}>
                  <strong>🎯 Selected Text:</strong>
                  <button 
                    className={styles.inlineDeleteButton}
                    onClick={handleDeleteText}
                    title="Delete selected text"
                  >
                    🗑️
                  </button>
                </div>
                <span className={styles.textLength}>
                  {selectionState.selectedText.length} chars
                </span>
              </div>
              <div className={styles.selectedText}>
                "{selectionState.selectedText.length > 60 
                  ? selectionState.selectedText.substring(0, 60) + '...' 
                  : selectionState.selectedText}"
              </div>
            </div>

            <div className={styles.chatMessages} ref={chatMessagesRef}>
              {chatMessages.map((message, index) => (
                <div 
                  key={index} 
                  className={`${styles.message} ${message.role === 'user' ? styles.userMessage : styles.aiMessage}`}
                >
                  <div className={styles.messageContent}>
                    {message.content.split('\n').map((line, lineIndex) => (
                      <React.Fragment key={lineIndex}>
                        {line}
                        {lineIndex < message.content.split('\n').length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </div>
                  {message.role === 'assistant' && index === chatMessages.length - 1 && !isLoading && message.content !== chatMessages[0]?.content && (
                    <div className={styles.actionButtons}>
                      <button 
                        className={styles.applyButton}
                        onClick={() => handleApplyChanges(message.content)}
                        title={confluenceFormat ? 'Apply to Confluence document' : 'Apply changes'}
                      >
                        ✅ Apply to {confluenceFormat ? 'Confluence' : 'Document'}
                      </button>
                      <button 
                        className={styles.deleteButton}
                        onClick={handleDeleteText}
                        title="Delete selected text"
                      >
                        🗑️ Delete Text
                      </button>
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className={`${styles.message} ${styles.aiMessage}`}>
                  <div className={styles.loading}>
                    <div className={styles.loadingIcon}>🤖</div>
                    <div className={styles.loadingText}>
                      {confluenceFormat ? 'Processing Confluence format...' : 'AI is thinking...'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.chatInput}>
              <div className={styles.inputContainer}>
                <textarea
                  ref={chatInputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={confluenceFormat 
                    ? "Describe your Confluence formatting request (e.g., 'make this a heading', 'convert to bullet list', 'format as table')..."
                    : "Enter your text editing request..."
                  }
                  className={styles.inputField}
                  rows={2}
                  disabled={isLoading}
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputMessage.trim()}
                  className={styles.sendButton}
                  title="Send message"
                >
                  📤
                </button>
              </div>
              {confluenceFormat && (
                <div className={styles.quickActions}>
                  <span className={styles.quickActionsLabel}>Quick actions:</span>
                  <div className={styles.quickButtons}>
                    {['Heading', 'List', 'Table', 'Bold', 'Code'].map(action => (
                      <button
                        key={action}
                        className={styles.quickButton}
                        onClick={() => setInputMessage(`Format as ${action.toLowerCase()}`)}
                        disabled={isLoading}
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Draggable>
      )}
    </div>
  );
};

export default ConfluenceTextSelector;
