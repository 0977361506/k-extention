import React, { useEffect, useState, useRef } from 'react';
import ProgressIndicator from './ProgressIndicator';
import { AppState, ProgressStep, DocumentVersion } from '../../types/types';
import { fetchConfluenceContent, cloneTemplateForGeneration } from '../../api/api';
import { Settings } from '../../popup/PopupSettings';
import { extensionSettings, GEN_DOC_URL, GEN_DOC_STATUS_URL, GEN_DOC_RESULT_URL } from '../../enums/AppConstants';
import { VersionManager } from '../../utils/versionManager';

interface DevDocTabProps {
  state: AppState;
  updateState: (updates: Partial<AppState>) => void;
}

const DevDocTab: React.FC<DevDocTabProps> = ({ state, updateState }) => {  const [settings, setSettings] = useState<Settings>({
    apiKey: '',
    urlTemplate: '',
    customPrompt: '',
    documentUrl: '',
    databaseUrl: '',
    instructionUrl: '',
    isEnabled: true,
    selectedModel: 'sonar-pro'
  });
  const [progress, setProgress] = React.useState<ProgressStep[]>([]);
  const [timeoutReached, setTimeoutReached] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [availableVersions, setAvailableVersions] = useState<DocumentVersion[]>([]);
  const [showVersionList, setShowVersionList] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const elapsedIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    updateState({ baDocUrl: document.location.href });
    loadAvailableVersions();
  }, []);

  const loadAvailableVersions = async () => {
    try {
      const versions = await VersionManager.getVersions();
      setAvailableVersions(versions);
    } catch (error) {
      console.error('Error loading versions:', error);
    }
  };

  const handleLoadVersion = async (version: DocumentVersion) => {
    try {
      // Parse the content and restore state
      const contentData = JSON.parse(version.content);
      updateState({
        generatedContent: version.content,
        currentView: 'preview',
        hasUnsavedChanges: false,
        currentVersionId: version.id
      });
      setShowVersionList(false);
    } catch (error) {
      console.error('Error loading version:', error);
      setErrorMsg('❌ Lỗi khi tải phiên bản tài liệu!');
    }
  };

  const handleDeleteVersion = async (versionId: string) => {
    try {
      await VersionManager.deleteVersion(versionId);
      await loadAvailableVersions();
    } catch (error) {
      console.error('Error deleting version:', error);
      setErrorMsg('❌ Lỗi khi xóa phiên bản!');
    }
  };

  const getInitialSteps = (): ProgressStep[] => [
    { name: '📥 Đang lấy nội dung BA', status: 'pending' },
    { name: '📋 Đang clone template structure', status: 'pending' },
    { name: '🔍 Đang phân tích placeholders <<>>', status: 'pending' },
    { name: '🤖 AI đang fill placeholders', status: 'pending' },
    { name: '📄 Đang chuẩn bị preview', status: 'pending' },
    { name: '✅ Hoàn thành', status: 'pending' }
  ];

  const extractPlaceholders = (content: string): string[] => {
    console.log('🔍 Analyzing content for placeholders...');
    console.log('📄 Content length:', content.length);
    console.log('📄 Content preview (first 500 chars):', content.substring(0, 500));
    
    // Helper function to decode HTML entities
    const decodeHtmlEntities = (str: string): string => {
      return str
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
    };

    // First, try to decode HTML entities in the entire content
    const decodedContent = decodeHtmlEntities(content);
    console.log('📄 Decoded content preview:', decodedContent.substring(0, 500));
    
    // Multiple regex patterns to catch different formats
    const patterns = [
      /<<([^>]+)>>/g,                    // Standard: <<content>>
      /&lt;&lt;([^&]+)&gt;&gt;/g,        // HTML encoded: &lt;&lt;content&gt;&gt;
      /\u003c\u003c([^\u003e]+)\u003e\u003e/g, // Unicode encoded: <<content>>
    ];
    
    let allMatches: string[] = [];
    
    // Test patterns on both original and decoded content
    [content, decodedContent].forEach((testContent, contentIndex) => {
      console.log(`🔍 Testing on ${contentIndex === 0 ? 'original' : 'decoded'} content...`);
      
      patterns.forEach((regex, patternIndex) => {
        const matches = [...testContent.matchAll(regex)];
        console.log(`🎯 Pattern ${patternIndex + 1} found ${matches.length} matches:`, matches.map(m => m[0]));
        
        if (patternIndex === 1) {
          // For HTML encoded, decode back to normal format
          allMatches.push(...matches.map(match => `<<${match[1]}>>`));
        } else {
          allMatches.push(...matches.map(match => match[0]));
        }
      });
    });
    
    // Remove duplicates
    const uniquePlaceholders = [...new Set(allMatches)];
    console.log('✅ Unique placeholders found:', uniquePlaceholders);
    
    // Additional debugging: try to find any << >> patterns manually
    const simpleAngleBracketSearch = content.match(/<<[^>]*>>/g);
    const decodedAngleBracketSearch = decodedContent.match(/<<[^>]*>>/g);
    console.log('🔍 Simple << >> search in original:', simpleAngleBracketSearch);
    console.log('🔍 Simple << >> search in decoded:', decodedAngleBracketSearch);
    
    return uniquePlaceholders;
  };

  const extractPageIdFromUrl = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      const pageId = urlObj.searchParams.get('pageId');
      return pageId;
    } catch (error) {
      console.error('❌ Error parsing URL:', error);
      return null;
    }
  };

  // Resume polling if jobId in localStorage
  useEffect(() => {
    const savedJobId = localStorage.getItem('ktool_current_job_id');
    if (savedJobId && !state.generatedContent) {
      setJobId(savedJobId);
      setIsPolling(true);
      startPolling(savedJobId);
    }
    // eslint-disable-next-line
  }, []);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    };
  }, []);

  // Elapsed time counter
  useEffect(() => {
    if (isPolling) {
      elapsedIntervalRef.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedTime(0);
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
    }
  }, [isPolling]);

  const startPolling = (jobId: string, originalPayload?: any) => {
    setIsPolling(true);
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const statusRes = await fetch(`${GEN_DOC_STATUS_URL}?job_id=${jobId}`);
        const statusData = await statusRes.json();
        if (statusData.status === 'done' || statusData.status === 'error') {
          if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
          setIsPolling(false);
          localStorage.removeItem('ktool_current_job_id');
        }
        if (statusData.status === 'done') {
          // Lấy kết quả
          const resultRes = await fetch(`${GEN_DOC_RESULT_URL}?job_id=${jobId}`);
          const resultData = await resultRes.json();
          const result = resultData.result;
          if (!result.success) {
            setErrorMsg(result.error || 'Lỗi khi tạo tài liệu!');
            updateState({ isGenerating: false });
            return;
          }
          // Step 5: Prepare preview
          setProgress(prev => prev.map((step, index) => {
            if (index === 0) return { ...step, status: 'completed' as const };
            if (index === 1) return { ...step, status: 'completed' as const };
            if (index === 2) return { ...step, status: 'completed' as const };
            if (index === 3) return { ...step, status: 'completed' as const };
            if (index === 4) return { ...step, status: 'active' as const };
            return step;
          }));
          updateState({ 
            generatedContent: JSON.stringify({
              fullStorageFormat: result.full_storage_format,
              title: result.suggested_title || `K-tool generate - ${new Date().toLocaleDateString()}`,
              generatedAt: new Date().toISOString(),
              approach: 'placeholder_filling',
              analysisInfo: undefined,
              placeholders: undefined,
              originalTemplate: undefined,
              templateStructure: undefined
            })
          });
          setProgress(prev => prev.map((step, index) => {
            if (index === 5) return { ...step, status: 'active' as const };
            return { ...step, status: 'completed' as const };
          }));
          setTimeout(() => {
            setProgress(prev => prev.map(step => ({ ...step, status: 'completed' as const })));
            setTimeout(() => {
              updateState({ currentView: 'preview' });
              setProgress([]);
            }, 500);
          }, 1000);
          // MCP: Kiểm tra nếu AI yêu cầu thêm thông tin
          if (result.need_more_info || (result.full_storage_format && result.full_storage_format.includes('<<NEED_MORE_INFO'))) {
            // 1. Extract thông tin cần tìm từ placeholder hoặc trường đặc biệt
            let searchQuery = 'từ khóa bổ sung';
            const needInfoMatch = result.full_storage_format && result.full_storage_format.match(/<<NEED_MORE_INFO:?([^">]*)>>/);
            if (needInfoMatch && needInfoMatch[1]) {
              searchQuery = needInfoMatch[1].trim();
            }
            console.log('[MCP] AI yêu cầu thêm thông tin, sẽ tự động search:', searchQuery);

            // 2. Tự động search trên Confluence và crawl sâu hơn
            let additionalInfo = '';
            try {
              const searchResults = await fetch(`/rest/api/search?cql=text~"${encodeURIComponent(searchQuery)}"`, {
                headers: { 'Accept': 'application/json' }
              });
              const searchData = await searchResults.json();
              const topPage = searchData.results?.[0];
              let allContents = [];

              if (topPage && topPage.content && topPage.content.id) {
                // Fetch nội dung chi tiết của trang đầu tiên
                const pageId = topPage.content.id;
                const pageRes = await fetch(`/rest/api/content/${pageId}?expand=body.storage`, {
                  headers: { 'Accept': 'application/json' }
                });
                const pageData = await pageRes.json();
                const mainContent = pageData.body?.storage?.value || '';
                allContents.push(mainContent);

                // 3. Phân tích các link tài liệu khác trong trang này
                const parser = new DOMParser();
                const doc = parser.parseFromString(mainContent, 'text/html');
                const links = Array.from(doc.querySelectorAll('a'))
                  .map(a => a.getAttribute('href'))
                  .filter(href => href && href.includes('/pages/viewpage.action?pageId='));

                // 4. Lấy nội dung các trang được liên kết (giới hạn 3 trang)
                for (let i = 0; i < Math.min(links.length, 3); i++) {
                  const href = links[i];
                  const match = href.match(/pageId=(\d+)/);
                  if (match && match[1]) {
                    const linkedPageId = match[1];
                    const linkedRes = await fetch(`/rest/api/content/${linkedPageId}?expand=body.storage`, {
                      headers: { 'Accept': 'application/json' }
                    });
                    const linkedData = await linkedRes.json();
                    const linkedContent = linkedData.body?.storage?.value || '';
                    allContents.push(`--- Nội dung từ trang liên kết (${href}) ---\n${linkedContent}`);
                  }
                }
              }

              additionalInfo = allContents.join('\n\n');
              if (!additionalInfo) {
                additionalInfo = `Không tìm thấy thông tin liên quan cho: ${searchQuery}`;
              }
            } catch (err) {
              additionalInfo = `Lỗi khi tự động tìm thông tin: ${err}`;
            }

            // 5. Gửi lại cho AI
            const retryPayload = {
              ...(originalPayload || {}),
              additional_info: additionalInfo,
              mcp_step: ((originalPayload && originalPayload.mcp_step) || 1) + 1,
              job_id: jobId
            };
            setProgress(prev => prev.map((step, index) => {
              if (index === 4) return { ...step, status: 'active' as const };
              return { ...step, status: 'completed' as const };
            }));
            const retryRes = await fetch(GEN_DOC_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(retryPayload)
            });
            const retryJob = await retryRes.json();
            if (retryJob.job_id) {
              setJobId(retryJob.job_id);
              localStorage.setItem('ktool_current_job_id', retryJob.job_id);
              setIsPolling(true);
              startPolling(retryJob.job_id, retryPayload);
              return;
            } else {
              setErrorMsg(retryJob.error || 'Không nhận được job_id từ server khi gửi thêm thông tin!');
              updateState({ isGenerating: false });
              return;
            }
          }
        } else if (statusData.status === 'error') {
          // Đã clear interval phía trên
          const resultRes = await fetch(`${GEN_DOC_RESULT_URL}?job_id=${jobId}`);
          const resultData = await resultRes.json();
          const result = resultData.result;
          setErrorMsg(result.error || 'Lỗi khi tạo tài liệu!');
          updateState({ isGenerating: false });
        }
      } catch (err) {
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        setIsPolling(false);
        setErrorMsg('Lỗi kết nối tới server!');
        updateState({ isGenerating: false });
      }
    }, 5000);
  };

  const handleCancelJob = () => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    setIsPolling(false);
    setJobId(null);
    localStorage.removeItem('ktool_current_job_id');
    setErrorMsg('Đã hủy quá trình tạo tài liệu.');
    updateState({ isGenerating: false });
  };

  // Utility: Convert image URL to base64 (data URI) và lấy tên file từ URL
  function getFilenameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      return pathname.substring(pathname.lastIndexOf('/') + 1) || `image_${Date.now()}`;
    } catch {
      return `image_${Date.now()}`;
    }
  }

  async function urlToBase64(url: string): Promise<{base64: string|null, filename: string}> {
    try {
      const response = await fetch(url);
      if (!response.ok) return {base64: null, filename: getFilenameFromUrl(url)};
      const blob = await response.blob();
      const filename = getFilenameFromUrl(url);
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve({base64: reader.result as string, filename});
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn('urlToBase64 error:', e);
      return {base64: null, filename: getFilenameFromUrl(url)};
    }
  }

  // Utility: Extract all images (base64 or URL) from HTML string and convert all to base64, kèm tên file
  async function extractImagesFromHtml(html: string): Promise<{ src: string; alt?: string; filename?: string }[]> {
    const images: { src: string; alt?: string; filename?: string }[] = [];
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const imgTags = doc.querySelectorAll('img');
      for (const img of Array.from(imgTags)) {
        const src = img.getAttribute('src');
        let filename = undefined;
        if (src) {
          let base64src = src;
          if (!src.startsWith('data:image')) {
            // Convert URL to base64 và lấy tên file
            const {base64, filename: fname} = await urlToBase64(src);
            if (base64) {
              base64src = base64;
              filename = fname;
            } else continue; // skip if failed
          } else {
            // Nếu là base64, lấy tên từ alt hoặc đặt mặc định
            filename = img.getAttribute('alt') ? img.getAttribute('alt') + '.png' : `image_${Date.now()}.png`;
          }
          images.push({ src: base64src, alt: img.getAttribute('alt') || undefined, filename });
        }
      }
    } catch (e) {
      console.warn('extractImagesFromHtml error:', e);
    }
    return images;
  }

  const handleGenerateDevDoc = async () => {
    setErrorMsg('');
    if (!state.baDocUrl.trim()) {
      setErrorMsg('⚠️ Vui lòng nhập URL tài liệu từ BA!');
      return;
    }

    // Extract pageId from URL
    const pageId = extractPageIdFromUrl(state.baDocUrl);
    if (!pageId) {
      setErrorMsg('❌ URL không hợp lệ! Vui lòng kiểm tra lại URL Confluence page.');
      return;
    }

    updateState({ isGenerating: true });
    const initialSteps = getInitialSteps();
    setProgress(initialSteps);

    try {
      // Step 1: Fetch BA content
      setProgress(prev => prev.map((step, index) =>
        index === 0 ? { ...step, status: 'active' as const } : step
      ));

      console.log('🔍 Fetching content for pageId:', pageId);
      const baDocument = await fetchConfluenceContent(pageId);
      if (!baDocument) {
        updateState({ isGenerating: false });
        setProgress([]);
        return;
      }

      // Extract images from BA content (HTML) and convert all to base64
      const images = await extractImagesFromHtml(baDocument.content);
      console.log('🖼️ Extracted images (all base64):', images);

      // Get settings
      const settingsExtension = await chrome.storage.sync.get([extensionSettings]);
      const settings = settingsExtension.extensionSettings as Settings;

      if (!settings.urlTemplate) {
        setErrorMsg('⚠️ Vui lòng setting template của tài liệu!');
        updateState({ isGenerating: false });
        setProgress([]);
        return;
      }

      // Step 2: Clone template structure
      setProgress(prev => prev.map((step, index) => {
        if (index === 0) return { ...step, status: 'completed' as const };
        if (index === 1) return { ...step, status: 'active' as const };
        return step;
      }));

      console.log('🔄 Cloning template from:', settings.urlTemplate);
      const clonedTemplate = await cloneTemplateForGeneration(settings.urlTemplate);
      
      if (!clonedTemplate) {
        setErrorMsg('❌ Không thể clone template! Vui lòng kiểm tra URL template trong Settings.');
        updateState({ isGenerating: false });
        setProgress([]);
        return;
      }

      console.log('✅ Template cloned successfully:', clonedTemplate.title);
      
      // Debug: Log the raw template content
      console.log('🔍 Raw template content:');
      console.log('📄 Original Storage Format preview:', clonedTemplate.originalStorageFormat.substring(0, 1000));
      console.log('📄 Template Structure preview:', clonedTemplate.templateStructure.substring(0, 500));

      // Step 3: Analyze placeholders with << >>
      setProgress(prev => prev.map((step, index) => {
        if (index === 0) return { ...step, status: 'completed' as const };
        if (index === 1) return { ...step, status: 'completed' as const };
        if (index === 2) return { ...step, status: 'active' as const };
        return step;
      }));

      // Extract chỉ placeholders có dạng <<>>
      const placeholders = extractPlaceholders(clonedTemplate.originalStorageFormat);
      
      console.log('🔍 Found placeholders <<>>:', placeholders);

      if (placeholders.length === 0) {
        setErrorMsg('⚠️ Không tìm thấy placeholder nào có dạng <<Tên>>. Vui lòng kiểm tra template!');
        updateState({ isGenerating: false });
        setProgress([]);
        return;
      }

      // Get instructions
      let instructions = '';
      if (settings.instructionUrl) {
        const instructionPageId = extractPageIdFromUrl(settings.instructionUrl);
        if (instructionPageId) {
          console.log('🔍 Fetching instruction content for pageId:', instructionPageId);
          const instructionDoc = await fetchConfluenceContent(instructionPageId);
          instructions = instructionDoc?.content || '';
        } else {
          console.warn('⚠️ Invalid instruction URL:', settings.instructionUrl);
        }
      }

      // Step 4: AI Fill Placeholders (Gửi request nhận job_id)
      setProgress(prev => prev.map((step, index) => {
        if (index === 0) return { ...step, status: 'completed' as const };
        if (index === 1) return { ...step, status: 'completed' as const };
        if (index === 2) return { ...step, status: 'completed' as const };
        if (index === 3) return { ...step, status: 'active' as const };
        return step;
      }));

      const payload = {
        ba_content: baDocument.content,
        template_structure: clonedTemplate.templateStructure,
        original_storage_format: clonedTemplate.originalStorageFormat,
        instructions: instructions,
        additional_prompt: settings.customPrompt || '',
        placeholders: placeholders,
        selectedModel: settings.selectedModel,
        images
      };

      console.log('📤 Sending payload for placeholder filling:', {
        ba_content_length: payload.ba_content.length,
        template_structure_length: payload.template_structure.length,
        original_format_length: payload.original_storage_format.length,
        placeholders_found: placeholders.length,
        placeholders_list: placeholders
      });

      // Gửi request nhận job_id
      const response = await fetch(GEN_DOC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const jobRes = await response.json();
      if (!jobRes.job_id) {
        throw new Error(jobRes.error || 'Không nhận được job_id từ server!');
      }
      setJobId(jobRes.job_id);
      localStorage.setItem('ktool_current_job_id', jobRes.job_id);
      setIsPolling(true);
      startPolling(jobRes.job_id, payload);
    } catch (error) {
      setErrorMsg(`❌ Có lỗi xảy ra: ${error}`);
      updateState({ isGenerating: false });
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '98%',
    padding: '16px 20px',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    fontSize: '15px',
    transition: 'all 0.3s ease',
    background: 'linear-gradient(145deg, #ffffff, #f7fafc)',
    fontFamily: 'inherit'
  };

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: '16px 24px',
    border: 'none',
    borderRadius: '12px',
    cursor: state.isGenerating ? 'not-allowed' : 'pointer',
    fontWeight: 600,
    fontSize: '15px',
    transition: 'all 0.3s ease',
    background: state.isGenerating ? '#f7fafc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: state.isGenerating ? '#a0aec0' : 'white',
    boxShadow: state.isGenerating ? 'none' : '0 4px 15px rgba(102, 126, 234, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  };

  return (
    <div style={{
      padding: '24px',
      background: 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)',
      minHeight: '100vh'
    }}>
      {/* Input Section */}
      <div style={{
        background: 'white',
        padding: '24px',
        borderRadius: '12px',
        marginBottom: '24px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
        border: '1px solid #e2e8f0'
      }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '12px', 
          fontWeight: 600, 
          color: '#2d3748',
          fontSize: '16px'
        }}>
          📄 URL tài liệu từ Business Analyst:
        </label>
        <input
          type="text"
          defaultValue={document.location.href}
          onChange={(e) => updateState({ baDocUrl: e.target.value })}
          placeholder="Paste URL tài liệu BA..."
          style={{
            ...inputStyle,
            marginBottom: '16px'
          }}
        />
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleGenerateDevDoc}
            disabled={state.isGenerating || timeoutReached}
            style={buttonStyle}
            onMouseEnter={(e) => {
              if (!state.isGenerating && !timeoutReached) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!state.isGenerating && !timeoutReached) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
              }
            }}
          >
            {state.isGenerating ? (
              <>
                <span style={{ animation: 'spin 1s linear infinite' }}>⏳</span>
                AI đang phân tích tài liệu...
              </>
            ) : (
              <>
                🔧 Tạo tài liệu (Placeholder Filling)
              </>
            )}
          </button>
          {state.isGenerating && !timeoutReached && (
            <button
              onClick={handleCancelJob}
              style={{
                ...buttonStyle,
                background: 'linear-gradient(135deg, #f87171 0%, #ef4444 100%)',
                color: 'white',
                minWidth: 120
              }}
            >
              ❌ Cancel
            </button>
          )}
        </div>
        {/* Alert/thông báo thành công - chỉ hiển thị khi KHÔNG timeout */}
        {!timeoutReached && errorMsg && (
          <div style={{
            marginTop: '12px',
            background: 'rgba(255,0,0,0.08)',
            color: '#ff3333',
            padding: '10px 16px',
            borderRadius: '8px',
            fontWeight: 500,
            fontSize: '15px',
            border: '1px solid #ffb3b3',
            maxWidth: 600
          }}>{errorMsg}</div>
        )}
      </div>

      {/* Load Previous Document Section */}
      {availableVersions.length > 0 && (
        <div style={{
          background: 'white',
          padding: '24px',
          borderRadius: '12px',
          marginBottom: '24px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <label style={{ 
              fontWeight: 600, 
              color: '#2d3748',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              📚 Tài liệu đã lưu ({availableVersions.length})
            </label>
            <button
              onClick={() => setShowVersionList(!showVersionList)}
              style={{
                padding: '8px 16px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                background: 'white',
                color: '#4a5568',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                transition: 'all 0.2s ease'
              }}
            >
              {showVersionList ? 'Ẩn danh sách' : 'Xem danh sách'}
            </button>
          </div>
          
          {showVersionList && (
            <div style={{ display: 'grid', gap: '12px' }}>
              {availableVersions.map((version) => (
                <div key={version.id} style={{
                  padding: '16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  background: version.isCurrent ? '#f0fff4' : '#f7fafc',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: 600,
                      color: '#2d3748',
                      marginBottom: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      {version.title}
                      {version.isCurrent && (
                        <span style={{
                          background: '#48bb78',
                          color: 'white',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 500
                        }}>
                          Hiện tại
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: '#718096',
                      marginBottom: '8px'
                    }}>
                      Tạo lúc: {new Date(version.createdAt).toLocaleString('vi-VN')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleLoadVersion(version)}
                      style={{
                        padding: '8px 16px',
                        border: 'none',
                        borderRadius: '6px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 500,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      📖 Tải lại
                    </button>
                    <button
                      onClick={() => handleDeleteVersion(version.id)}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #fed7d7',
                        borderRadius: '6px',
                        background: 'white',
                        color: '#e53e3e',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 500,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Timeout Meme - ghi đè lên toàn bộ phần template/progress khi timeout */}
      {timeoutReached && (
        <div style={{ textAlign: 'center', marginTop: 40, zIndex: 10, position: 'relative' }}>
          <div style={{ fontSize: 20, color: '#ff3333', fontWeight: 600, marginBottom: 16 }}>
            😅 Quá trình tạo tài liệu mất quá lâu (&gt;10s). Hãy đợi thêm, hệ thống vẫn đang xử lý...
          </div>
        </div>
      )}
      {/* Khi timeout, ẩn hoàn toàn phần template, progress, info cards */}
      {!timeoutReached && progress.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <ProgressIndicator steps={progress} />
        </div>
      )}
      {/* Info Cards - hide when generating or timeout */}
      {!state.isGenerating && !timeoutReached && (
        <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: '1fr', marginBottom: '24px' }}>
          <div style={{ 
            padding: '24px', 
            background: 'linear-gradient(135deg, #f0fff4, #dcfce7)', 
            borderRadius: '12px', 
            fontSize: '14px', 
            color: '#166534', 
            border: '2px solid #bbf7d0',
            boxShadow: '0 4px 12px rgba(34, 197, 94, 0.1)'
          }}>
            <h3 style={{ 
              margin: '0 0 20px 0', 
              color: '#15803d', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              fontSize: '20px',
              fontWeight: '700'
            }}>
              🚀 New Approach: Smart Placeholder Filling
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.6)',
                padding: '16px',
                borderRadius: '8px'
              }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#15803d', fontSize: '16px' }}>✅ Ưu điểm:</h4>
                <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
                  <li>Chỉ fill vào placeholders có dạng <code>&lt;&lt;Tên&gt;&gt;</code></li>
                  <li>Giữ nguyên 100% structure template</li>
                  <li>AI tập trung vào nội dung cần thiết</li>
                  <li>Không làm hỏng formatting</li>
                  <li>Preview và Edit trước khi tạo page</li>
                </ul>
              </div>
              <div style={{
                background: 'rgba(255, 255, 255, 0.6)',
                padding: '16px',
                borderRadius: '8px'
              }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#15803d', fontSize: '16px' }}>🔄 Quy trình:</h4>
                <ol style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
                  <li>Lấy nội dung BA</li>
                  <li>Clone template nguyên bản</li>
                  <li>Phân tích placeholders <code>&lt;&lt;&gt;&gt;</code></li>
                  <li>AI fill chính xác placeholders</li>
                  <li>Preview với diagrams</li>
                  <li>Edit nếu cần</li>
                  <li>Tạo page hoàn chỉnh</li>
                </ol>
              </div>
            </div>
          </div>

          <div style={{ 
            padding: '20px', 
            background: 'linear-gradient(135deg, #fef3c7, #fde68a)', 
            borderRadius: '12px', 
            fontSize: '14px', 
            color: '#92400e',
            border: '2px solid #fde68a',
            boxShadow: '0 4px 12px rgba(251, 191, 36, 0.1)'
          }}>
            <h4 style={{ 
              margin: '0 0 16px 0', 
              color: '#92400e',
              fontSize: '18px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              💡 Lưu ý quan trọng:
            </h4>
            <ul style={{ margin: '0 0 16px 0', paddingLeft: '20px', lineHeight: '1.6' }}>
              <li>Template phải có placeholders dạng <code>&lt;&lt;Tên&gt;&gt;</code> (ví dụ: <code>&lt;&lt;Mô tả chức năng&gt;&gt;</code>)</li>
              <li>AI sẽ tự động tạo Mermaid diagrams cho placeholders có tên liên quan</li>
              <li>Sau khi generate sẽ chuyển sang Preview để xem và Edit để chỉnh sửa</li>
              <li>Chỉ những vị trí có <code>&lt;&lt;&gt;&gt;</code> mới được fill, phần còn lại giữ nguyên</li>
            </ul>
            
            <div style={{ 
              marginTop: '16px', 
              padding: '12px', 
              background: 'rgba(251, 191, 36, 0.3)', 
              borderRadius: '8px',
              border: '1px solid rgba(251, 191, 36, 0.5)'
            }}>
              <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                🔍 Debug tip:
              </strong>
              Nếu vẫn không tìm thấy placeholders, mở Developer Tools (F12) → Console để xem log chi tiết về việc phân tích template.
            </div>
          </div>
        </div>
      )}

      {isPolling && (
        <div style={{margin: '16px 0', padding: '16px', background: '#f0f4ff', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: 16}}>
          <span className="loadingSpinner" style={{marginRight: 12}} />
          <span>🤖 Đang xử lý AI... Đã chờ: <b>{elapsedTime}s</b></span>
          <button onClick={handleCancelJob} style={{marginLeft: 'auto', padding: '8px 16px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#333', cursor: 'pointer'}}>Hủy</button>
        </div>
      )}

      {errorMsg && (
        <div style={{margin: '16px 0', padding: '16px', background: '#fff0f0', borderRadius: '8px', color: '#d32f2f', fontWeight: 500}}>
          {errorMsg}
          <button onClick={() => setErrorMsg('')} style={{marginLeft: 16, padding: '4px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#333', cursor: 'pointer'}}>Đóng</button>
        </div>
      )}

      {!isPolling && !state.isGenerating && !errorMsg && (
        <div style={{margin: '16px 0', padding: '16px', background: '#e6fffa', borderRadius: '8px', color: '#15803d', fontWeight: 500}}>
          ✅ Sẵn sàng tạo tài liệu mới hoặc xem lại tài liệu đã tạo!
        </div>
      )}
    </div>
  );
};

// Thêm component fallback video/img
function VideoOrImageMeme() {
  const memeUrl = chrome.runtime.getURL('meme.webp');
  return (
    <img
      src={memeUrl}
      alt="animation"
    />
  );
}

export default DevDocTab;
