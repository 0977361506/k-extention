import React, { useState } from 'react';
import TextSelectionHandler from './TextSelectionHandler';
import { replaceTextInStorageFormat } from '../../utils/textReplacement';

const TextSelectionTest: React.FC = () => {
  const [content, setContent] = useState(`
    <h1>🧪 Text Selection Test Component</h1>
    <p>Đây là một test component để kiểm tra chức năng text selection và AI chat integration.</p>
    <p>
      Hãy thử select (bôi đen) bất kỳ đoạn text nào trong component này. 
      <strong>Chat icon (💬)</strong> sẽ xuất hiện khi bạn select ít nhất 3 ký tự.
    </p>
    <ul>
      <li>Test với text trong paragraph</li>
      <li>Test với text trong list items</li>
      <li>Test với <em>formatted text</em></li>
    </ul>
    <blockquote>
      Đây là một blockquote để test selection trên các element khác nhau.
      Text trong blockquote này cũng sẽ được test.
    </blockquote>
  `);

  const handleTextUpdate = (originalText: string, newText: string) => {
    console.log('🔄 Text update:', { originalText, newText });
    
    // Use smart text replacement
    const updatedContent = replaceTextInStorageFormat(content, originalText, newText);
    
    if (updatedContent !== content) {
      setContent(updatedContent);
      console.log('✅ Content updated successfully');
    } else {
      // Fallback: simple replacement
      const fallbackContent = content.replace(originalText, newText);
      if (fallbackContent !== content) {
        setContent(fallbackContent);
        console.log('✅ Content updated using fallback method');
      } else {
        console.warn('⚠️ Failed to update content');
      }
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      maxWidth: '800px', 
      margin: '0 auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '20px',
        borderRadius: '12px 12px 0 0',
        textAlign: 'center'
      }}>
        <h2>🚀 React Text Selection Handler Test</h2>
        <p>Component test để debug text selection functionality</p>
      </div>
      
      <div style={{
        background: '#e0f2fe',
        border: '1px solid #81d4fa',
        borderRadius: '0 0 12px 12px',
        padding: '16px',
        marginBottom: '20px',
        color: '#0277bd'
      }}>
        <strong>📋 Hướng dẫn:</strong><br/>
        1. Select bất kỳ text nào trong content area bên dưới<br/>
        2. Chat icon sẽ xuất hiện nếu selection hợp lệ<br/>
        3. Click vào chat icon để test AI chat functionality<br/>
        4. Check console để xem debug logs
      </div>

      <TextSelectionHandler
        onTextUpdate={handleTextUpdate}
        isEnabled={true}
      >
        <div style={{
          position: 'relative',
          border: '2px solid #007acc',
          borderRadius: '8px',
          padding: '30px',
          background: 'white',
          minHeight: '400px',
          lineHeight: '1.6'
        }}>
          <div 
            style={{ 
              position: 'absolute',
              top: '-15px',
              right: '20px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '500',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
            }}
          >
            🤖 AI Text Selection Active
          </div>
          
          <div dangerouslySetInnerHTML={{ __html: content }} />
        </div>
      </TextSelectionHandler>
      
      <div style={{
        marginTop: '20px',
        padding: '16px',
        background: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #e9ecef'
      }}>
        <h4>📊 Debug Info:</h4>
        <pre style={{ 
          fontSize: '12px', 
          color: '#666',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word'
        }}>
          Content Length: {content.length} characters
          {'\n'}Last Updated: {new Date().toLocaleTimeString()}
        </pre>
      </div>
    </div>
  );
};

export default TextSelectionTest;
