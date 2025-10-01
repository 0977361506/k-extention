import React, { useEffect, useState } from 'react';
import { FontEncodingUtils } from '../../utils/fontUtils';

interface FontDebugComponentProps {
  show?: boolean;
}

const FontDebugComponent: React.FC<FontDebugComponentProps> = ({ show = false }) => {
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    if (show) {
      // Run font tests
      const vietnameseTest = FontEncodingUtils.testVietnameseChars();
      const testText = 'Tiếng Việt: áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđĐ';
      const utf8Valid = FontEncodingUtils.validateUtf8(testText);
      const cleanedText = FontEncodingUtils.cleanTextForConfluence(testText);

      setDebugInfo({
        vietnameseTest,
        utf8Valid,
        testText,
        cleanedText,
        fontFamily: FontEncodingUtils.getMermaidFontFamily(),
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform
      });

      // Debug to console
      FontEncodingUtils.debugFontInfo();
    }
  }, [show]);

  if (!show || !debugInfo) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '8px',
      padding: '16px',
      maxWidth: '400px',
      fontSize: '12px',
      zIndex: 9999,
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    }}>
      <h4 style={{ margin: '0 0 12px 0', color: '#495057' }}>🔍 Font Debug Info</h4>
      
      <div style={{ marginBottom: '8px' }}>
        <strong>Vietnamese Test:</strong> 
        <span style={{ color: debugInfo.vietnameseTest ? '#28a745' : '#dc3545', marginLeft: '8px' }}>
          {debugInfo.vietnameseTest ? '✅ PASSED' : '❌ FAILED'}
        </span>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <strong>UTF-8 Valid:</strong> 
        <span style={{ color: debugInfo.utf8Valid ? '#28a745' : '#dc3545', marginLeft: '8px' }}>
          {debugInfo.utf8Valid ? '✅ YES' : '❌ NO'}
        </span>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <strong>Font Family:</strong>
        <div style={{ 
          fontSize: '10px', 
          background: '#e9ecef', 
          padding: '4px', 
          borderRadius: '4px',
          marginTop: '4px',
          wordBreak: 'break-all'
        }}>
          {debugInfo.fontFamily}
        </div>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <strong>Test Text:</strong>
        <div style={{ 
          fontFamily: debugInfo.fontFamily,
          fontSize: '14px',
          background: '#fff',
          padding: '8px',
          border: '1px solid #dee2e6',
          borderRadius: '4px',
          marginTop: '4px'
        }}>
          {debugInfo.testText}
        </div>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <strong>Cleaned Text:</strong>
        <div style={{ 
          fontSize: '10px',
          background: '#e9ecef',
          padding: '4px',
          borderRadius: '4px',
          marginTop: '4px',
          maxHeight: '60px',
          overflowY: 'auto'
        }}>
          {debugInfo.cleanedText}
        </div>
      </div>

      <div style={{ fontSize: '10px', color: '#6c757d' }}>
        <div><strong>Platform:</strong> {debugInfo.platform}</div>
        <div><strong>Language:</strong> {debugInfo.language}</div>
      </div>
    </div>
  );
};

export default FontDebugComponent;
