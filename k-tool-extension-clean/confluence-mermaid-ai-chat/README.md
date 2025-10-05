# Confluence Mermaid AI Chat Extension

Chrome extension để chat với AI khi click vào ảnh Mermaid trong Confluence.

## 🎯 Tính năng

- **🎯 Click-to-Chat**: Click vào Mermaid diagram để mở popup chat
- **🤖 AI Diagram Editing**: Mô tả thay đổi bằng ngôn ngữ tự nhiên
- **🔍 Smart Detection**: Tự động phát hiện các loại Mermaid diagram
- **💬 Real-time Chat**: Chat trực tiếp với AI về diagram
- **✅ Validation**: Kiểm tra input và error handling tốt

## 🚀 Cài đặt

### 1. Build extension

```bash
cd confluence-mermaid-ai-chat
npm install
npm run build
```

### 2. Load vào Chrome

1. Mở `chrome://extensions/`
2. Bật "Developer mode"
3. Click "Load unpacked"
4. Chọn thư mục `confluence-mermaid-ai-chat/dist`

## 🎯 Cách sử dụng

1. **Mở Confluence** hoặc trang có Mermaid diagrams
2. **Click vào Mermaid diagram** bất kỳ
3. **Popup chat xuất hiện** với AI assistant
4. **Nhập prompt** mô tả thay đổi mong muốn
5. **Click Send** để gửi request đến AI
6. **Nhận phản hồi** từ AI về cách chỉnh sửa

## 🔧 Cấu hình API

Extension sử dụng API server để xử lý AI requests:

```javascript
// src/shared/constants.js
const isLocal = true; // Set to false for production
const rootUrl = isLocal
  ? "http://localhost:5001"
  : "https://gendoc.thangnotes.dev";
```

### API Endpoints
- `POST /api/edit-diagram` - Chỉnh sửa Mermaid diagram

## 🏗️ Cấu trúc project

```
confluence-mermaid-ai-chat/
├── src/
│   ├── content/
│   │   ├── content.js          # Main content script
│   │   └── content.css         # Popup styles
│   ├── shared/
│   │   ├── api.js              # API client
│   │   └── constants.js        # Configuration
│   └── assets/
│       └── icon.png            # Extension icon
├── dist/                       # Built extension
├── manifest.json              # Extension manifest
├── package.json               # Dependencies
├── webpack.config.js          # Build config
└── README.md                  # This file
```

## 🎨 Supported Mermaid Types

Extension hỗ trợ tất cả các loại Mermaid diagram:

- **Flowchart**: `graph TD`, `flowchart TD`
- **Sequence Diagram**: `sequenceDiagram`
- **Class Diagram**: `classDiagram`
- **State Diagram**: `stateDiagram`
- **ER Diagram**: `erDiagram`
- **User Journey**: `journey`
- **Gantt Chart**: `gantt`
- **Pie Chart**: `pie`
- **Git Graph**: `gitgraph`
- **Mindmap**: `mindmap`
- **Timeline**: `timeline`
- **Sankey**: `sankey`

## 🔍 Detection Methods

Extension tự động phát hiện Mermaid diagrams qua:

1. **CSS Classes**: `.mermaid`, `.mermaid-diagram`
2. **SVG Elements**: `svg[id*='mermaid']`
3. **Confluence Macros**: `<ac:structured-macro ac:name="mermaid">`
4. **Script Tags**: `<script type="text/mermaid">`
5. **Code Blocks**: `<pre><code class="language-mermaid">`

## 🧪 Testing

### Test với demo page

Tạo file HTML test:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Mermaid AI Chat Test</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
</head>
<body>
    <div class="mermaid">
        graph TD
            A[Start] --> B{Decision}
            B -->|Yes| C[Process 1]
            B -->|No| D[Process 2]
            C --> E[End]
            D --> E
    </div>
    
    <script>
        mermaid.initialize({startOnLoad: true});
    </script>
</body>
</html>
```

### Debug Commands

```javascript
// In browser console
console.log("Extension loaded:", !!window.mermaidAIChat);

// Check for Mermaid elements
document.querySelectorAll('.mermaid, svg[id*="mermaid"]');
```

## 🔧 Development

### Build commands

```bash
# Development build with watch
npm run dev

# Production build
npm run build

# Clean dist folder
npm run clean
```

### File structure

- **content.js**: Main content script với MermaidAIChat class
- **content.css**: Styles cho popup chat interface
- **api.js**: API client với validation và error handling
- **constants.js**: Configuration và constants

## 🐛 Troubleshooting

### Extension không hoạt động
1. Kiểm tra extension enabled trong chrome://extensions/
2. Reload extension và refresh trang
3. Kiểm tra console có lỗi JavaScript không

### Không detect được Mermaid
1. Kiểm tra Mermaid diagrams được render đúng
2. Kiểm tra CSS classes và selectors
3. Kiểm tra console logs cho detection

### API không hoạt động
1. Kiểm tra API server đang chạy
2. Kiểm tra URL trong constants.js
3. Kiểm tra network tab cho API calls
4. Kiểm tra CORS settings

### Popup không hiện
1. Kiểm tra CSS file được load
2. Kiểm tra z-index conflicts
3. Kiểm tra popup positioning

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📞 Support

Nếu gặp vấn đề:

1. Kiểm tra console logs
2. Test với demo HTML file
3. Kiểm tra API server status
4. Create issue với detailed description
