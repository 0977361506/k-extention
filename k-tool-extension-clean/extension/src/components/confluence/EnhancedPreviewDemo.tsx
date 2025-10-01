import React, { useState, useEffect } from 'react';
import FullDocumentEditor from './FullDocumentEditor';
import styles from './EnhancedPreviewDemo.module.scss';

const EnhancedPreviewDemo: React.FC = () => {
  // Initialize notification system
  useEffect(() => {
    // Load notification scripts if not already loaded
    if (!(window as any).KToolNotification) {
      const script1 = document.createElement('script');
      script1.src = chrome.runtime.getURL('utils/NotificationManager.js');
      document.head.appendChild(script1);
      
      const script2 = document.createElement('script');
      script2.src = chrome.runtime.getURL('utils/AlertReplacer.js');
      document.head.appendChild(script2);
    }
  }, []);

  const [demoState, setDemoState] = useState({
    generatedContent: '',
    hasUnsavedChanges: false,
    currentView: 'preview'
  });

  const [sampleContent] = useState(`
<h1>🎯 Enhanced Preview with AI Text Selection Demo</h1>

<p>Đây là demo cho chức năng <strong>AI Text Selection</strong> trong Preview mode. Bạn có thể select bất kỳ đoạn text nào để chỉnh sửa bằng AI.</p>

<h2>📝 How to Use</h2>

<p>1. Chuyển sang tab <strong>Preview</strong> (tab hiện tại)</p>
<p>2. <mark>Select bất kỳ đoạn text nào</mark> trong content</p> 
<p>3. Click vào icon 💬 xuất hiện</p>
<p>4. Nhập yêu cầu chỉnh sửa trong chat box</p>
<p>5. AI sẽ suggest changes và bạn có thể apply trực tiếp</p>

<h2>🔧 Sample Content to Edit</h2>

<p>This is a simple paragraph that you can select and edit using AI. Try asking the AI to make it shorter, more formal, or convert it to bullet points.</p>

<p>Installation instructions: First download the file, then extract the contents, next run the installer, and finally restart your computer to complete the setup process.</p>

<h3>📊 Table Data</h3>

<p>Term definitions: API stands for Application Programming Interface, REST means Representational State Transfer, HTTP is HyperText Transfer Protocol, JSON represents JavaScript Object Notation.</p>

<h3>🎨 Content Examples</h3>

<p>Here are some examples of content that works well with AI editing:</p>

<ul>
<li>Long paragraphs that need to be shortened</li>
<li>Technical content that needs simplification</li>
<li>Lists that could be converted to tables</li>
<li>Content that needs translation or tone adjustment</li>
</ul>

<h2>🤖 AI Capabilities</h2>

<p>The AI can help you with various text editing tasks such as:</p>

<p>- Making text shorter or longer
- Changing writing style (formal, casual, technical)
- Converting between formats (paragraph to list, list to table)
- Improving clarity and readability
- Adding emphasis or formatting suggestions
- Translating content to different languages</p>

<ac:structured-macro ac:name="mermaid" ac:schema-version="1">
  <ac:parameter ac:name="code"><![CDATA[
graph TD
    A[Select Text] --> B[Chat Icon Appears]
    B --> C[Click Chat Icon]
    C --> D[AI Chat Opens]
    D --> E[Enter Edit Request]
    E --> F[AI Provides Suggestion]
    F --> G[Apply Changes]
    G --> H[Document Updated]
  ]]></ac:parameter>
</ac:structured-macro>

<h2>✨ Features</h2>

<table>
<tr>
<th>Feature</th>
<th>Description</th>
<th>Status</th>
</tr>
<tr>
<td>Text Selection</td>
<td>Select any text in preview mode</td>
<td>✅ Active</td>
</tr>
<tr>
<td>AI Chat</td>
<td>Chat with AI to edit selected text</td>
<td>✅ Active</td>
</tr>
<tr>
<td>Real-time Updates</td>
<td>Changes applied directly to document</td>
<td>✅ Active</td>
</tr>
<tr>
<td>Smart Replacement</td>
<td>Preserves XML structure when updating</td>
<td>✅ Active</td>
</tr>
</table>

<p><em>Tip: Try selecting different types of content like headings, paragraphs, lists, or table data to see how the AI can help improve them!</em></p>
  `);

  const handleContentChange = (newContent: string) => {
    console.log('Content changed:', newContent);
  };

  const handleSave = (content: string) => {
    console.log('Content saved:', content);
    
    // Use modern notification instead of alert
    if ((window as any).KToolNotificationUtils) {
      (window as any).KToolNotificationUtils.documentSaved('Nội dung đã được lưu thành công!');
    } else {
      // Fallback to manual notification creation
      const notify = (window as any).KToolNotification;
      if (notify) {
        notify.success(
          'Lưu thành công',
          'Tài liệu đã được cập nhật với nội dung mới.'
        );
      }
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>🎯 Enhanced Preview with AI Text Selection</h1>
        <p>Demo chức năng select text trong preview mode để chỉnh sửa bằng AI</p>
      </div>

      <div className={styles.content}>
        <FullDocumentEditor
          initialContent={sampleContent}
          title="AI Text Selection Demo Document"
          onContentChange={handleContentChange}
          onSave={handleSave}
          isEditable={true}
          state={demoState}
          updateState={setDemoState}
        />
      </div>

      <div className={styles.instructions}>
        <h3>🎯 Testing Instructions</h3>
        <ol>
          <li>Đảm bảo đang ở tab <strong>Preview</strong></li>
          <li>Select một đoạn text bất kỳ trong document</li>
          <li>Click vào icon 💬 xuất hiện bên cạnh selection</li>
          <li>Thử các lệnh như:
            <ul>
              <li>"Make this shorter"</li>
              <li>"Convert to bullet points"</li>
              <li>"Make it more formal"</li>
              <li>"Create a table"</li>
              <li>"Translate to English"</li>
            </ul>
          </li>
          <li>Click "Áp dụng thay đổi" để apply changes</li>
          <li>Kiểm tra document đã được update</li>
        </ol>
      </div>
    </div>
  );
};

export default EnhancedPreviewDemo;
