# 📝 Confluence Editor Feature

## Tổng quan

Confluence Editor là tính năng mới được thêm vào K-Tool Extension, cho phép người dùng chỉnh sửa nội dung Confluence đã được sinh ra từ API, đặc biệt tập trung vào việc chỉnh sửa các Mermaid diagrams.

## Tính năng chính

### 1. Editor Interface
- **Popup overlay**: Giao diện editor mở trong popup toàn màn hình
- **Responsive design**: Tự động adapt với màn hình desktop và mobile
- **Split layout**: Sidebar + main content area
- **Toolbar**: Các công cụ chỉnh sửa cơ bản

### 2. Mermaid Diagram Management
- **Tự động phát hiện**: Quét và extract tất cả Mermaid diagrams từ content
- **Sidebar listing**: Hiển thị danh sách tất cả diagrams trong sidebar
- **Visual highlighting**: Highlight diagrams trong content với border và label
- **Quick edit**: Button edit trên mỗi diagram để chỉnh sửa nhanh
- **Live preview**: Render Mermaid diagrams real-time

### 3. Content Editing
- **HTML preview**: Hiển thị content dưới dạng HTML rendered
- **Storage format**: Làm việc với Confluence storage format
- **Undo/Redo**: Hỗ trợ undo/redo (TODO)
- **Content validation**: Kiểm tra tính hợp lệ của content (TODO)

### 4. Integration với K-Tool
- **Seamless integration**: Tích hợp mượt mà với K-Tool workflow
- **Save callback**: Callback để update content trong K-Tool
- **Auto-refresh**: Tự động refresh preview sau khi edit

## Cấu trúc file

### `src/content/confluenceEditor.js`
File chính chứa class `ConfluenceEditor`:

#### Core Methods:
- `init()`: Khởi tạo editor và setup styles
- `openEditor(content, options)`: Mở editor với content
- `closeEditor()`: Đóng editor và cleanup
- `setSaveCallback(callback)`: Set callback khi save

#### Content Management:
- `extractMermaidDiagrams()`: Extract Mermaid từ storage format
- `renderContent()`: Render content với Mermaid highlighting
- `updateMermaidDiagram(id, code)`: Update một diagram cụ thể

#### Mermaid Operations:
- `editMermaidDiagram(id)`: Mở editor cho diagram
- `addMermaidDiagram()`: Thêm diagram mới
- `selectMermaidDiagram(id)`: Select và scroll tới diagram

#### Utility Methods:
- `initializeMermaid()`: Khởi tạo Mermaid rendering
- `updateStatus(message)`: Update status message
- `saveChanges()`: Lưu thay đổi và callback

## Cách sử dụng

### 1. Trong K-Tool Workflow
1. Sinh tài liệu bằng K-Tool như bình thường
2. Trong tab Preview, click button **"✏️ Chỉnh sửa nội dung"**
3. Editor sẽ mở với nội dung đã sinh
4. Chỉnh sửa content và Mermaid diagrams
5. Click **"💾 Lưu thay đổi"** để apply changes

### 2. Trong Editor Interface

#### Sidebar:
- **🖼️ Mermaid Diagrams**: Danh sách tất cả diagrams
  - Click để scroll tới diagram
  - Hiển thị số thứ tự diagram
- **📋 Thao tác**: Các action nhanh
  - ➕ Thêm Mermaid
  - 🎨 Format nội dung
  - ✅ Kiểm tra lỗi

#### Main Content:
- **Preview area**: Hiển thị content với Mermaid rendered
- **Diagram containers**: Mỗi diagram được wrap trong container đặc biệt
- **Edit buttons**: Button "✏️ Edit" trên mỗi diagram

#### Toolbar:
- **↶ Undo / ↷ Redo**: Undo/redo changes (TODO)
- **Status**: Hiển thị trạng thái hiện tại

### 3. Chỉnh sửa Mermaid Diagrams
1. Click button "✏️ Edit" trên diagram
2. Popup sẽ hiện với mã Mermaid hiện tại
3. Chỉnh sửa mã Mermaid
4. Click OK để apply changes
5. Diagram sẽ được re-render ngay lập tức

## Tích hợp với Content.js

### Import và khởi tạo:
```javascript
import { ConfluenceEditor } from "./confluenceEditor.js";

class KToolContent {
  constructor() {
    // ...
    this.confluenceEditor = null;
  }

  async init() {
    // ...
    this.confluenceEditor = new ConfluenceEditor();
  }
}
```

### Thêm button Edit trong Preview:
```javascript
updatePreviewTab(content) {
  // Thêm button "✏️ Chỉnh sửa nội dung"
  const editContentBtn = previewTab.querySelector("#editContentBtn");
  editContentBtn.addEventListener("click", () => this.handleEditContent(content));
}
```

### Handler method:
```javascript
handleEditContent(content) {
  // Setup save callback
  this.confluenceEditor.setSaveCallback((updatedContent) => {
    this.generatedContent = updatedContent;
    this.updatePreviewTab(updatedContent);
    this.showNotification("Nội dung đã được cập nhật!", "success");
  });

  // Open editor
  this.confluenceEditor.openEditor(content, {
    title: "Chỉnh sửa tài liệu đã sinh",
    showMermaidTools: true
  });
}
```

## CSS Styles

### Main Classes:
- `.confluence-editor-overlay`: Popup overlay
- `.confluence-editor-container`: Main editor container
- `.confluence-editor-sidebar`: Left sidebar
- `.confluence-editor-main`: Main content area
- `.mermaid-diagram-container`: Wrapper cho mỗi diagram
- `.mermaid-edit-btn`: Button edit trên diagram

### Responsive:
- Desktop: Full layout với sidebar
- Mobile: Ẩn sidebar, full-width content

## Test

### File test: `test-confluence-editor.html`
File HTML test với:
- 3 test cases khác nhau
- Sample content với Mermaid diagrams
- Complex HTML content
- Empty content
- Debug controls

### Cách test:
1. Mở `test-confluence-editor.html` trong browser
2. Click các button test khác nhau
3. Kiểm tra editor mở và hoạt động
4. Test chỉnh sửa Mermaid diagrams
5. Sử dụng console commands để debug

### Console Commands:
```javascript
// Basic testing
testWithMermaidContent()
testWithComplexContent()
testWithEmptyContent()

// Advanced testing
window.confluenceEditor.openEditor(content, options)
window.confluenceEditor.closeEditor()
window.confluenceEditor.isOpen()

// K-Tool integration
window.ktoolContent.handleEditContent(content)
```

## Mermaid Integration

### Supported Formats:
```xml
<ac:structured-macro ac:name="code">
    <ac:parameter ac:name="language">mermaid</ac:parameter>
    <ac:plain-text-body><![CDATA[
graph TD
    A[Start] --> B[End]
    ]]></ac:plain-text-body>
</ac:structured-macro>
```

### Extraction Regex:
```javascript
const mermaidRegex = /<ac:structured-macro[^>]*ac:name="code"[^>]*>[\s\S]*?<ac:parameter[^>]*ac:name="language"[^>]*>mermaid<\/ac:parameter>[\s\S]*?<ac:plain-text-body><!\[CDATA\[([\s\S]*?)\]\]><\/ac:plain-text-body>[\s\S]*?<\/ac:structured-macro>/g;
```

### Diagram Object Structure:
```javascript
{
  id: "mermaid-0",
  code: "graph TD\n    A[Start] --> B[End]",
  originalMatch: "<ac:structured-macro...>",
  index: 0
}
```

## TODO - Future Enhancements

### 1. Advanced Editing
- Rich text editor cho HTML content
- Syntax highlighting cho Mermaid code
- Auto-completion cho Mermaid syntax
- Drag & drop để reorder diagrams

### 2. Collaboration
- Real-time collaboration
- Comment system
- Version history
- Change tracking

### 3. AI Integration
- AI-powered Mermaid editing (tích hợp với ImageAIEditor)
- Content suggestions
- Auto-formatting
- Error detection và suggestions

### 4. Export/Import
- Export individual diagrams
- Import diagrams từ files
- Batch operations
- Template system

## Performance

- **Lazy loading**: Chỉ load editor khi cần
- **Efficient DOM**: Minimal DOM manipulation
- **Memory management**: Proper cleanup khi close
- **Mermaid optimization**: Chỉ re-render khi cần thiết

## Browser Support

- Chrome 88+
- Firefox (modern versions)
- Edge (Chromium-based)
- Safari (với một số limitations)

## Security

- **Content sanitization**: Sanitize user input
- **XSS protection**: Prevent XSS attacks
- **CSP compliance**: Content Security Policy compliant
- **Safe HTML rendering**: Escape HTML khi cần thiết

## Debugging

### Console Logs:
- `📝 ConfluenceEditor initializing...`
- `✅ ConfluenceEditor ready`
- `📝 Opening Confluence Editor with content:`
- `🎨 Extracted Mermaid diagrams:`
- `✏️ Editing Mermaid diagram:`
- `💾 Saving changes...`

### Global Objects:
- `window.confluenceEditor`: Global editor instance
- `window.ktoolContent.confluenceEditor`: K-Tool integrated instance

### Debug Methods:
```javascript
// Check editor status
window.confluenceEditor.isOpen()
window.confluenceEditor.getCurrentContent()

// Manual operations
window.confluenceEditor.extractMermaidDiagrams()
window.confluenceEditor.renderContent()
window.confluenceEditor.initializeMermaid()
```
