// katothang/k-tool-document/katothang-k-tool-document-68438769fa2a52d4917584802fa0754b0750cf51/extension/src/components/confluence/PreviewTab.tsx
import React, { useState, useEffect } from 'react';
import { AppState } from '../../types/types';
import { createPageFromGeneratedContent, getCurrentSpaceKey, extractPageIdFromUrl } from '../../api/api';
import { StorageManager } from '../../utils/storage';
import ConfluenceStoragePreview from './ConfluenceStoragePreview';
import '../../utils/NotificationInit.js';

interface PreviewTabProps {
  state: AppState;
  updateState: (updates: Partial<AppState>) => void;
}

const PreviewTab: React.FC<PreviewTabProps> = ({ state, updateState }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [pageTitle, setPageTitle] = useState('');
  const [currentStorageFormat, setCurrentStorageFormat] = useState('');
  const [originalTitle, setOriginalTitle] = useState('');

  useEffect(() => {
    if (state.generatedContent) {
      try {
        const data = JSON.parse(state.generatedContent);
        const title = data.title || `K-Tool Document AI generate  - ${new Date().toLocaleDateString()}`;
        setPageTitle(title);
        setCurrentStorageFormat(data.fullStorageFormat || '');
        setOriginalTitle(title);
      } catch (e) {
        console.error("Failed to parse generated content:", e);
        // If parsing fails, treat the whole string as content
        setCurrentStorageFormat(state.generatedContent || '<p>Error: Invalid content format received from server.</p>');
        setPageTitle(`Generated Document - ${new Date().toLocaleDateString()}`);
        setOriginalTitle('Preview');
      }
    }
  }, [state.generatedContent]);


  if (!state.generatedContent) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
        <h3>Không có dữ liệu để xem trước</h3>
        <p>Vui lòng quay lại tab tạo tài liệu để tạo nội dung.</p>
        <button 
          onClick={() => updateState({ currentView: 'main' })}
          style={{ padding: '12px 24px', background: '#0052cc', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          ← Quay lại
        </button>
      </div>
    );
  }

  const handleCreatePage = async () => {
    if (!currentStorageFormat) {
      window.KToolNotification?.show('Không có nội dung để tạo trang!', 'error');
      return;
    }
    const spaceKey = getCurrentSpaceKey();
    if (!spaceKey) {
      window.KToolNotification?.show('Không thể xác định Space Key! Vui lòng đảm bảo bạn đang ở trong một Confluence Space.', 'error');
      return;
    }
    if (!pageTitle.trim()) {
      window.KToolNotification?.show('Vui lòng nhập tiêu đề trang!', 'warning');
      return;
    }
    setIsCreating(true);
    try {
      // Load settings to get the documentUrl (parent folder)
      const settings = await StorageManager.getSettings();
      let parentPageId: string | null = null;
      
      if (settings.documentUrl && settings.documentUrl.trim()) {
        parentPageId = extractPageIdFromUrl(settings.documentUrl);
        if (parentPageId) {
          console.log('📁 Using parent page ID from settings:', parentPageId);
        } else {
          console.warn('⚠️ Could not extract page ID from documentUrl:', settings.documentUrl);
        }
      }

      await createPageFromGeneratedContent(pageTitle, currentStorageFormat, spaceKey, parentPageId || undefined);
      window.KToolNotification?.show('Trang đã được tạo thành công!', 'success');
      updateState({ currentView: 'main', generatedContent: '', baDocUrl: '' });
    } catch (error) {
      console.error('Error creating page:', error);
      window.KToolNotification?.show(`Lỗi khi tạo trang: ${error instanceof Error ? error.message : String(error)}`, 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleContentChange = (newContent: string) => {
    setCurrentStorageFormat(newContent);
  };

  return (
    <div>
      {/* Header Controls */}
      <div style={{ marginBottom: '20px', padding: '16px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Tiêu đề trang:</label>
          <input
            type="text"
            value={pageTitle}
            onChange={(e) => setPageTitle(e.target.value)}
            disabled={isCreating}
            style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={handleCreatePage} disabled={isCreating} style={{ padding: '10px 20px', background: isCreating ? '#ccc' : '#0052cc', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>
            {isCreating ? '⏳ Đang tạo...' : '📄 Tạo trang Confluence'}
          </button>
          <button onClick={() => updateState({ currentView: 'main' })} style={{ padding: '10px 20px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>
            ← Quay lại
          </button>
        </div>
      </div>
      
      {/* Preview Component */}
      <ConfluenceStoragePreview 
        storageFormat={currentStorageFormat}
        title={`Xem trước: ${originalTitle}`}
        isEditable={true}
        onContentChange={handleContentChange}
      />
    </div>
  );
};

export default PreviewTab;